import { PageLegale, SectionLegale } from "@/components/boutique/PageLegale";
import { getSettings } from "@/lib/settings";
import { BOUTIQUE } from "@/lib/constants";

export const metadata = { title: "Politique de confidentialité" };

export default async function ConfidentialitePage() {
  const settings = await getSettings();
  const tel = settings.telephone || BOUTIQUE.tel;
  const email = BOUTIQUE.email;

  return (
    <PageLegale titre="Politique de confidentialité">
      <SectionLegale titre="Responsable du traitement">
        <p>
          {settings.nomBoutique} — {BOUTIQUE.adresse}. Contact : {tel}
          {email ? " — " + email : ""}.
        </p>
      </SectionLegale>

      <SectionLegale titre="Données collectées">
        <p>
          Nom, numéro de téléphone, adresse email, adresse de livraison,
          commune, contenu des commandes et historique d’achat. Ces données
          sont fournies volontairement lors de la commande ou de la création
          de compte.
        </p>
      </SectionLegale>

      <SectionLegale titre="Finalités">
        <p>
          Préparation et livraison des commandes, suivi, paiement, envoi du
          bon de commande par email, gestion des retours et relation client.
          Les données ne sont ni vendues ni utilisées à des fins
          publicitaires.
        </p>
      </SectionLegale>

      <SectionLegale titre="Prestataires">
        <p>
          Paiement en ligne : Jèko (les données de carte sont traitées
          exclusivement par l’agrégateur). Images : Cloudinary. Emails :
          prestataire d’envoi de la boutique. Base de données : PostgreSQL
          managé.
        </p>
      </SectionLegale>

      <SectionLegale titre="Cookies">
        <p>
          Seuls des cookies techniques sont utilisés : panier, session de
          connexion et liste signée des commandes passées depuis votre
          navigateur. Aucun cookie publicitaire ni de suivi tiers.
        </p>
      </SectionLegale>

      <SectionLegale titre="Conservation et sécurité">
        <p>
          Les données de commande sont conservées pour la durée nécessaire à
          la gestion commerciale et aux obligations légales. L’accès est
          limité à l’administrateur ; les communications sont chiffrées
          (HTTPS).
        </p>
      </SectionLegale>

      <SectionLegale titre="Vos droits">
        <p>
          Conformément à la loi ivoirienne n°2013-450 relative à la protection
          des données à caractère personnel, vous disposez d’un droit
          d’accès, de rectification et de suppression de vos données. Pour
          l’exercer : {tel}
          {email ? " ou " + email : ""}.
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
