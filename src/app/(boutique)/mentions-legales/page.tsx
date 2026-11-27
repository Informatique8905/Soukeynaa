import { PageLegale, SectionLegale } from "@/components/boutique/PageLegale";
import { getSettings } from "@/lib/settings";
import { BOUTIQUE } from "@/lib/constants";

export const metadata = { title: "Mentions légales" };

export default async function MentionsLegalesPage() {
  const settings = await getSettings();
  const tel = settings.telephone || BOUTIQUE.tel;
  const email = BOUTIQUE.email;

  return (
    <PageLegale titre="Mentions légales">
      <SectionLegale titre="Éditeur du site">
        <p>
          {settings.nomBoutique} — boutique en ligne de vêtements, chaussures,
          sacs et accessoires (vente en propre, mono-vendeur).
        </p>
        <p>Adresse : {BOUTIQUE.adresse}</p>
        <p>Téléphone / WhatsApp : {tel}</p>
        {email && <p>Email : {email}</p>}
        <p>Ouverture : {BOUTIQUE.horaires}</p>
        <p>Immatriculation (RCCM) : à compléter par le propriétaire.</p>
      </SectionLegale>

      <SectionLegale titre="Directeur de la publication">
        <p>Le propriétaire de la boutique {settings.nomBoutique}.</p>
      </SectionLegale>

      <SectionLegale titre="Hébergement">
        <p>
          Site et base de données hébergés par les prestataires techniques
          retenus par la boutique (hébergeur applicatif, base PostgreSQL,
          images sur Cloudinary).
        </p>
      </SectionLegale>

      <SectionLegale titre="Propriété intellectuelle">
        <p>
          Le logo, les textes, les visuels et l’ensemble des contenus du site
          sont la propriété de {settings.nomBoutique}. Toute reproduction ou
          utilisation sans autorisation préalable est interdite.
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
