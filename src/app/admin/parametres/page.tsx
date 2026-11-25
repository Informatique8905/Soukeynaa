import { getSettings, bannieresDe } from "@/lib/settings";
import { enregistrerParametres } from "./actions";
import { BannieresForm } from "@/components/admin/BannieresForm";

export default async function PageParametres() {
  const settings = await getSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-vert">Paramètres boutique</h1>
      <p className="mt-2 text-sm opacity-70">
        Coordonnées affichées sur le site et dans les emails (CDC 7.8),
        bannières d&apos;accueil (CDC 7.1) et rapport automatique (CDC 13.8).
      </p>

      <form action={enregistrerParametres} className="mt-6 space-y-6">
        <section className="rounded border bg-white p-4 text-sm">
          <h2 className="font-semibold">Boutique & contact</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Nom de la boutique
              <input
                name="nomBoutique"
                required
                defaultValue={settings.nomBoutique}
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1">
              Email de contact
              <input
                name="emailContact"
                type="email"
                defaultValue={settings.emailContact}
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1">
              Téléphone (affiché, retours)
              <input
                name="telephone"
                defaultValue={settings.telephone}
                placeholder="+225 …"
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1">
              WhatsApp
              <input
                name="whatsapp"
                defaultValue={settings.whatsapp}
                placeholder="+225 …"
                className="rounded border px-2 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1">
              Seuil « stock faible »
              <input
                name="seuilStockFaible"
                type="number"
                min={0}
                defaultValue={settings.seuilStockFaible}
                className="w-28 rounded border px-2 py-1.5"
              />
            </label>
          </div>
        </section>

        <section className="rounded border bg-white p-4 text-sm">
          <h2 className="font-semibold">Bannières de la page d&apos;accueil</h2>
          <p className="mt-1 text-xs opacity-60">
            Affichées en haut de l&apos;accueil, dans l&apos;ordre de la liste
            (max 10). Sans bannière, la promo animée automatique reste affichée.
          </p>
          <div className="mt-3">
            <BannieresForm initiales={bannieresDe(settings)} />
          </div>
        </section>

        <section className="rounded border bg-white p-4 text-sm">
          <h2 className="font-semibold">Rapport automatique par email</h2>
          <label className="mt-3 flex items-center gap-2">
            <input
              name="rapportEmailActif"
              type="checkbox"
              defaultChecked={settings.rapportEmailActif}
            />
            Envoyer un récapitulatif des ventes à chaque génération de rapport
            planifié
          </label>
          <label className="mt-3 flex max-w-sm flex-col gap-1">
            Destinataire
            <input
              name="rapportEmailDestinataire"
              type="email"
              defaultValue={settings.rapportEmailDestinataire}
              placeholder="admin@exemple.ci"
              className="rounded border px-2 py-1.5"
            />
          </label>
        </section>

        <button className="rounded-full bg-vert px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-vert-fonce">
          Enregistrer les paramètres
        </button>
      </form>
    </div>
  );
}
