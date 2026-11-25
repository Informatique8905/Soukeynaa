import { getSettings, bannieresDe } from "@/lib/settings";
import { enregistrerParametres } from "./actions";
import { BannieresForm } from "@/components/admin/BannieresForm";
import {
  CaseLibellee,
  Champ,
  EnTetePage,
  Panneau,
  bouton,
  champ,
} from "@/components/admin/ui";

export default async function PageParametres() {
  const settings = await getSettings();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <EnTetePage
        titre="Paramètres"
        description="Coordonnées affichées sur le site et dans les emails (CDC 7.8), bannières d'accueil (CDC 7.1) et rapport automatique (CDC 13.8)."
      />

      <form action={enregistrerParametres} className="flex flex-col gap-6">
        <Panneau titre="Boutique et contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Nom de la boutique">
              <input
                name="nomBoutique"
                required
                defaultValue={settings.nomBoutique}
                className={champ}
              />
            </Champ>
            <Champ label="Email de contact">
              <input
                name="emailContact"
                type="email"
                defaultValue={settings.emailContact}
                className={champ}
              />
            </Champ>
            <Champ label="Téléphone" aide="Affiché sur le site et pour les retours">
              <input
                name="telephone"
                defaultValue={settings.telephone}
                placeholder="+225 …"
                className={champ}
              />
            </Champ>
            <Champ label="WhatsApp">
              <input
                name="whatsapp"
                defaultValue={settings.whatsapp}
                placeholder="+225 …"
                className={champ}
              />
            </Champ>
            <Champ
              label="Seuil « stock faible »"
              aide="Utilisé dans le rapport de stock"
              className="max-w-40"
            >
              <input
                name="seuilStockFaible"
                type="number"
                min={0}
                defaultValue={settings.seuilStockFaible}
                className={champ}
              />
            </Champ>
          </div>
        </Panneau>

        <Panneau
          titre="Bannières de la page d'accueil"
          description="Affichées en haut de l'accueil, dans l'ordre de la liste (10 max). Sans bannière, la promo animée automatique reste affichée."
        >
          <BannieresForm initiales={bannieresDe(settings)} />
        </Panneau>

        <Panneau titre="Rapport automatique par email">
          <CaseLibellee
            name="rapportEmailActif"
            defaultChecked={settings.rapportEmailActif}
          >
            Envoyer un récapitulatif des ventes à chaque génération de rapport
            planifié
          </CaseLibellee>
          <Champ label="Destinataire" className="mt-4 max-w-sm">
            <input
              name="rapportEmailDestinataire"
              type="email"
              defaultValue={settings.rapportEmailDestinataire}
              placeholder="admin@exemple.ci"
              className={champ}
            />
          </Champ>
        </Panneau>

        <div className="sticky bottom-4 z-10 sm:static">
          <button className={bouton("primaire", "md", "w-full shadow-md sm:w-auto sm:shadow-sm")}>
            Enregistrer les paramètres
          </button>
        </div>
      </form>
    </div>
  );
}
