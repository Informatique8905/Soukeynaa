import Link from "next/link";
import { PageLegale, SectionLegale } from "@/components/boutique/PageLegale";
import { getSettings } from "@/lib/settings";
import { getPrisma } from "@/lib/db";
import { BOUTIQUE } from "@/lib/constants";
import { fcfa } from "@/lib/format";

export const metadata = { title: "Livraison & retours" };

export default async function LivraisonRetoursPage() {
  const [settings, communes] = await Promise.all([
    getSettings(),
    getPrisma().commune.findMany({
      where: { active: true },
      orderBy: { ordre: "asc" },
      select: { nom: true, tarif: true },
    }),
  ]);
  const tel = settings.telephone || BOUTIQUE.tel;
  const wa = settings.whatsapp || BOUTIQUE.whatsapp;

  return (
    <PageLegale titre="Livraison & retours">
      <SectionLegale titre="Zones et tarifs">
        <p>
          Livraison sur Abidjan et environs, au tarif fixe de la commune
          choisie lors de la commande :
        </p>
        <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {communes.map((c) => (
            <li key={c.nom} className="flex justify-between gap-2">
              <span>{c.nom}</span>
              <span className="font-semibold text-noir">{fcfa(c.tarif)}</span>
            </li>
          ))}
        </ul>
      </SectionLegale>

      <SectionLegale titre="Délais et suivi">
        <p>
          Le délai de livraison est communiqué sur la page de suivi de votre
          commande, accessible depuis{" "}
          <Link href="/commandes" className="font-semibold text-vert">
            Vos commandes
          </Link>{" "}
          ou grâce à la référence reçue par email (SOU-…).
        </p>
      </SectionLegale>

      <SectionLegale titre="Paiement">
        <p>
          Payez en ligne de façon sécurisée (Wave, Orange Money, MTN Mobile
          Money, Moov Money, carte bancaire) ou directement à la livraison.
        </p>
      </SectionLegale>

      <SectionLegale titre="Retours et échanges">
        <p>
          Un souci avec votre article ? Contactez-nous par appel ou WhatsApp
          au {tel}
          {wa !== tel ? " (WhatsApp : " + wa + ")" : ""}, ou passez à la
          boutique — {BOUTIQUE.adresse}, ouvert {BOUTIQUE.horaires}. L’article
          doit être dans son état d’origine ; après accord, échange ou
          remboursement selon le cas (voir{" "}
          <Link href="/cgv" className="font-semibold text-vert">
            conditions de vente
          </Link>
          ).
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
