<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Projet

Boutique e-commerce mono-vendeur (Abidjan, Côte d'Ivoire, FCFA, français).
Spécification de référence : `Cahier_des_charges_ecommerce_v1.2.md` à la racine — toute implémentation doit s'y conformer (statuts, règles d'atomicité, anti-double-paiement).

### Stack
- Next.js 16 (App Router, Turbopack, `cacheComponents`) + React 19 + TypeScript
- Tailwind CSS 4, Framer Motion
- **PostgreSQL via Prisma ORM 7** (`src/lib/db.ts` → `getPrisma()`, adaptateur `@prisma/adapter-pg`)
- Auth.js (`next-auth`), Zod, Cloudinary, Resend/Brevo, bcryptjs
- Paiement : Jèko Checkout (clés dans `.env`, jamais côté client)

### Conventions
- Constantes métier (statuts commandes/paiements/produits, univers, rôles) : `src/lib/constants.ts`
- Variables d'environnement : `.env.example` → copier dans `.env.local`
- Palette : bordeaux, doré, crème ; mobile-first ; langue : français
- Structure : `src/app/(boutique)` (espace public), `src/app/admin` (espace admin), `src/app/api`, `src/models` (schémas Mongoose), `src/lib`, `src/components`

### Données
- Schéma de conception (Étape 2 du CDC) : `docs/conception-base-de-donnees.md` — décisions D1–D14 et règles d'atomicité R1–R7
- Schéma Prisma : `prisma/schema.prisma` (17 tables, enums, index) — champs en français, montants en FCFA entiers
- Client généré : `src/generated/prisma` (gitignored, regénéré par `prisma generate` / postinstall)
- Validation entrées : `src/lib/validation.ts` (Zod)
- Toute écriture stock/statut/paiement doit suivre les règles R1–R7 du doc de conception (updateMany conditionnel + $transaction, jamais de lire-puis-écrire)
- Erreur `P2002` = violation d'unicité (idempotence webhook/idempotence)

### Vérification
- `npm run build` — build production
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
- `npm run dev` — serveur de dev
- `npx prisma dev` — Postgres local temporaire (sans installation)
- `npm run db:migrate` — crée/applique les migrations (requiert DATABASE_URL)
- `npm run seed` — seed (communes, settings SOUKEYNA, admin) — requiert `.env.local`

### Workflow Git (préférence utilisateur)
- Après chaque série de modifications terminée et vérifiée : commit + `git push origin master` directement (déclenche le redéploiement), sans attendre confirmation.
