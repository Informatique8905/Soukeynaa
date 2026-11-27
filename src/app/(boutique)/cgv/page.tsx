import { PageLegale, SectionLegale } from "@/components/boutique/PageLegale";
import { getSettings } from "@/lib/settings";
import { BOUTIQUE, STOCK_RESERVATION_MINUTES } from "@/lib/constants";

export const metadata = { title: "Conditions générales de vente" };

export default async function CgvPage() {
  const settings = await getSettings();
  const tel = settings.telephone || BOUTIQUE.tel;
  const wa = settings.whatsapp || BOUTIQUE.whatsapp;

  return (
    <PageLegale titre="Conditions générales de vente">
      <SectionLegale titre="Objet">
        <p>
          Les présentes conditions régissent les ventes réalisées sur la
          boutique en ligne {settings.nomBoutique} (Abidjan, Côte d’Ivoire).
          Toute commande implique l’acceptation de ces conditions.
        </p>
      </SectionLegale>

      <SectionLegale titre="Produits et prix">
        <p>
          Les articles sont décrits et photographiés avec le plus grand soin.
          Les prix sont affichés en francs CFA (FCFA), toutes taxes comprises,
          hors frais de livraison indiqués avant la validation de la commande.
        </p>
      </SectionLegale>

      <SectionLegale titre="Commande">
        <p>
          La commande peut être passée avec ou sans compte client. Chaque
          commande reçoit une référence (SOU-…) et un récapitulatif envoyé par
          email. Le stock est réservé pendant {STOCK_RESERVATION_MINUTES}{" "}
          minutes : passé ce délai sans paiement, la commande peut être
          annulée.
        </p>
      </SectionLegale>

      <SectionLegale titre="Paiement">
        <p>
          Paiement en ligne sécurisé via Jèko (Wave, Orange Money, MTN Mobile
          Money, Moov Money, carte bancaire) ou paiement à la livraison. La
          commande payée en ligne est confirmée après validation du paiement
          par l’agrégateur.
        </p>
      </SectionLegale>

      <SectionLegale titre="Livraison">
        <p>
          Livraison sur Abidjan et environs, au tarif fixe affiché pour la
          commune choisie avant le paiement. Le délai de livraison est
          communiqué sur la page de suivi de la commande.
        </p>
      </SectionLegale>

      <SectionLegale titre="Retours et échanges">
        {/* TODO propriétaire : valider le délai de retour (CDC 18.5) */}
        <p>
          Les retours, échanges et réclamations sont gérés directement par
          appel ou message au {tel} (WhatsApp : {wa}), dans un délai de 7 jours
          suivant la réception. L’article doit être retourné dans son état
          d’origine, non porté et non utilisé. Après accord, un échange ou un
          remboursement est effectué selon le cas ; les frais de transport du
          retour restent à la charge du client, sauf erreur de la boutique ou
          article défectueux.
        </p>
      </SectionLegale>

      <SectionLegale titre="Réclamations et litiges">
        <p>
          Pour toute question ou réclamation : {tel} ({BOUTIQUE.horaires}) ou
          en boutique — {BOUTIQUE.adresse}. Le droit ivoirien est applicable.
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
