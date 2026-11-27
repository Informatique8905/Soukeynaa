"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart";
import { prixEffectif } from "@/lib/pricing";
import { checkoutSchema } from "@/lib/validation";
import { alerterAdmin, envoyerBonCommande } from "@/lib/email";
import { initierTentative } from "@/lib/paiement";
import { fcfa } from "@/lib/format";
import { autorise, ipClient } from "@/lib/ratelimit";
import { signerIdsCommandes, verifierIdsCommandes, COOKIE_COMMANDES } from "@/lib/ownership";

// Erreur métier : seul ce type de message est renvoyé au client — toute
// autre exception (Prisma, réseau…) devient un message générique et est
// loguée serveur, jamais exposée.
class ErreurMetier extends Error {}

const DELAI_RESERVATION_MIN = Number(
  process.env.STOCK_RESERVATION_MINUTES ?? 30
);

export type CheckoutResult = { erreur: string } | { ok: true; url?: string };

// Création de commande : tout ou rien — stock vérifié ET réservé dans la
// même transaction que la commande (CDC 5.8, 9.5). Un échec annule tout.
export async function creerCommande(input: unknown): Promise<CheckoutResult> {
  // Limitation : 5 commandes / heure / IP — chaque commande réserve du
  // stock et déclenche un email ; sans borne, un script vide le catalogue
  // et transforme la boutique en relais de spam.
  const ip = ipClient(await headers());
  if (!autorise(`commande:${ip}`, 5, 3600_000)) {
    return { erreur: "Trop de commandes — réessayez plus tard" };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { erreur: "Informations de commande invalides" };
  }
  const { client, livraison, modePaiement, moyenPaiement } = parsed.data;
  const aLaLivraison = modePaiement === "livraison";

  const prisma = getPrisma();
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { erreur: "Votre panier est vide" };
  }

  const commune = await prisma.commune.findUnique({
    where: { id: livraison.communeId },
  });
  if (!commune || !commune.active) {
    return { erreur: "Commune de livraison indisponible" };
  }

  let commandeCree: { reference: string; id: number };
  try {
    commandeCree = await prisma.$transaction(async (tx) => {
      // 1. Prix recalculés serveur + stock réservé par décrément conditionnel
      let sousTotal = 0;
      const lignes: {
        produitId: number;
        varianteId: number | null;
        nom: string;
        varianteLabel: string;
        quantite: number;
        prixUnitaire: number;
        total: number;
      }[] = [];

      for (const item of cart.items) {
        const produit = await tx.product.findUnique({
          where: { id: item.produitId },
          include: { variantes: true },
        });
        if (!produit || produit.statut !== "publie") {
          throw new ErreurMetier(`« ${produit?.nom ?? "Produit"} » n'est plus disponible`);
        }
        const variante = item.varianteId
          ? produit.variantes.find((v) => v.id === item.varianteId)
          : null;
        if (produit.aVariantes && !variante) {
          throw new ErreurMetier(`Variante introuvable pour « ${produit.nom} »`);
        }

        // Décrément atomique : échoue si stock < quantité (anti-survente)
        const conditionnel = produit.aVariantes
          ? await tx.productVariant.updateMany({
              where: { id: variante!.id, stock: { gte: item.quantite } },
              data: { stock: { decrement: item.quantite } },
            })
          : await tx.product.updateMany({
              where: { id: produit.id, stock: { gte: item.quantite } },
              data: { stock: { decrement: item.quantite } },
            });
        if (conditionnel.count === 0) {
          throw new ErreurMetier(`Stock insuffisant pour « ${produit.nom} »`);
        }

        const prix = await prixEffectif(produit, variante, tx);
        const total = prix * item.quantite;
        sousTotal += total;
        lignes.push({
          produitId: produit.id,
          varianteId: variante?.id ?? null,
          nom: produit.nom,
          varianteLabel:
            [variante?.taille, variante?.couleur].filter(Boolean).join(" / ") ||
            "",
          quantite: item.quantite,
          prixUnitaire: prix,
          total,
        });
      }

      // 2. Référence SOU-AAAA-NNNNNN via compteur atomique
      const annee = new Date().getFullYear();
      const compteur = await tx.counter.upsert({
        where: { cle: `commande_${annee}` },
        update: { valeur: { increment: 1 } },
        create: { cle: `commande_${annee}`, valeur: 1 },
      });
      const ref = `SOU-${annee}-${String(compteur.valeur).padStart(6, "0")}`;

      // 3. Commande : client + commune + tarif figés (CDC 9.5, 11.5)
      const cree = await tx.order.create({
        data: {
          reference: ref,
          clientUserId: userId,
          clientNom: client.nom,
          clientTelephone: client.telephone,
          clientEmail: client.email,
          livraisonCommuneId: commune.id,
          communeNom: commune.nom,
          communeTarif: commune.tarif,
          adresseLivraison: livraison.adresse,
          sousTotal,
          fraisLivraison: commune.tarif,
          total: sousTotal + commune.tarif,
          // À la livraison : directement en préparation, stock engagé
          // (pas d'expiration — le cron ne traite que en_attente_paiement)
          modePaiement,
          statut: aLaLivraison ? "en_preparation" : "en_attente_paiement",
          reservationExpireLe: new Date(
            Date.now() + DELAI_RESERVATION_MIN * 60_000
          ),
          lignes: { create: lignes },
        },
      });

      // 4. Panier vidé dans la même transaction
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // 5. Mémoriser l'adresse (et le téléphone si le compte n'en a pas) pour
      // pré-remplir la prochaine commande — pas de doublon d'adresse
      if (userId) {
        const u = await tx.user.findUnique({
          where: { id: userId },
          select: { adresses: true, telephone: true },
        });
        const enregistrees =
          (u?.adresses as { communeId: number; detail: string }[] | null) ?? [];
        const dejaEnregistree = enregistrees.some(
          (a) =>
            a.communeId === livraison.communeId &&
            a.detail.trim().toLowerCase() ===
              livraison.adresse.trim().toLowerCase()
        );
        const telephoneManquant = !u?.telephone?.trim();
        if (!dejaEnregistree || telephoneManquant) {
          await tx.user.update({
            where: { id: userId },
            data: {
              ...(dejaEnregistree
                ? {}
                : {
                    adresses: [
                      ...enregistrees,
                      {
                        communeId: livraison.communeId,
                        detail: livraison.adresse,
                      },
                    ],
                  }),
              ...(telephoneManquant ? { telephone: client.telephone } : {}),
            },
          });
        }
      }
      return { reference: ref, id: cree.id };
    });
  } catch (e) {
    if (!(e instanceof ErreurMetier)) {
      console.error("[commande] échec création", e);
    }
    return {
      erreur:
        e instanceof ErreurMetier
          ? e.message
          : "Erreur lors de la commande",
    };
  }

  const reference = commandeCree.reference;

  // Cookie panier invité : on le garde (panier recréé au prochain ajout)
  const store = await cookies();
  store.delete("soukeyna_cart");
  // Trace locale des commandes passées depuis ce navigateur : seuls les
  // visiteurs ayant réellement commandé (cookie, compte ou admin) voient les
  // coordonnées complètes sur /commande/[ref] — la référence est
  // séquentielle et sinon énumérable (CDC 14.5).
  const ids = verifierIdsCommandes(store.get(COOKIE_COMMANDES)?.value);
  ids.push(commandeCree.id);
  store.set(COOKIE_COMMANDES, signerIdsCommandes(ids), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 90 * 24 * 3600,
  });

  // Bon de commande + message de prise en charge : envoyé dès la création,
  // avant toute confirmation admin (non bloquant)
  envoyerBonCommande(commandeCree.id).catch(() => {});

  // À la livraison : alerte admin immédiate (non bloquant)
  if (aLaLivraison) {
    const c = await prisma.order.findUnique({
      where: { reference },
      select: { id: true, total: true, communeNom: true, clientNom: true },
    });
    if (c) {
      alerterAdmin(
        "alerte_admin_commande",
        `Nouvelle commande à la livraison ${reference}`,
        `<p>${c.clientNom}, ${c.communeNom}, ${fcfa(c.total)} à encaisser à la livraison.</p>`,
        c.id
      ).catch(() => {});
    }
  }

  if (aLaLivraison) {
    redirect(`/commande/${reference}?ok=1`);
  }

  // Paiement en ligne : initiation immédiate — le client part directement
  // sur la page du moyen choisi (Wave, OM, MTN…), sans écran intermédiaire.
  const tentative = await initierTentative({
    commandeId: commandeCree.id,
    moyenJeko: moyenPaiement ?? "wave",
  });
  if (tentative.ok) {
    return { ok: true, url: tentative.url };
  }
  // Initiation impossible (service indisponible…) : la page de suivi
  // permet de relancer le paiement avec BoutonPayer.
  redirect(`/commande/${reference}?moyen=${moyenPaiement ?? "wave"}`);
}
