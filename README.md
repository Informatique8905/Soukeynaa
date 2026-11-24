# SOUKEYNA — Boutique e-commerce

Boutique en ligne mono-vendeur basée à **Abidjan (Côte d'Ivoire)** : vêtements et accessoires (univers Enfants, Hommes, Femmes, Accessoires), prix en **FCFA**, interface en **français**, pensée **mobile-first**.

La référence fonctionnelle est le cahier des charges [`Cahier_des_charges_ecommerce_v1.2.md`](Cahier_des_charges_ecommerce_v1.2.md). Le schéma de base de données et les règles d'atomicité sont décrits dans [`docs/conception-base-de-donnees.md`](docs/conception-base-de-donnees.md).

## Fonctionnalités

### Espace boutique (`src/app/(boutique)`)

- Accueil avec bannières, sélections et promotions.
- Navigation par univers (`/[univers]`) et par catégorie (`/categorie/[slug]`).
- Recherche de produits (`/recherche`).
- Fiche produit avec variantes (taille, couleur) et stock par variante (`/produit/[slug]`).
- Panier invité (cookie) ou connecté (`/panier`).
- Commande avec ou sans compte : coordonnées, commune de livraison, frais calculés automatiquement (`/commander`).
- Paiement en ligne (Jèko Checkout) ou paiement à la livraison.
- Suivi d'une commande par sa référence `SOU-AAAA-NNNNNN` (`/commande/[reference]`, `/commandes`).
- Compte client (`/compte`), connexion et inscription (`/connexion`, `/inscription`).

### Espace administrateur (`src/app/admin`)

- Tableau de bord (ventes, commandes, graphiques).
- Produits : création, modification, variantes, photos Cloudinary, statuts `publie` / `brouillon` / `desactive`.
- Catégories dynamiques (2 niveaux sous chaque univers).
- Promotions datées (pourcentage ou montant, par produit ou par catégorie).
- Commandes : changement de statut, délai de livraison, note interne.
- Communes d'Abidjan et tarifs de livraison.
- Paiements : revue des paiements `a_verifier`, résolution avec motif obligatoire (journalisée).
- Rapports et export CSV des commandes payées (`/admin/rapports/export`).

L'accès à `/admin` est réservé au rôle `admin`, vérifié côté serveur (`src/proxy.ts` et `requireAdmin()` dans chaque action).

## Règles métier clés

| Règle | Mise en œuvre |
|---|---|
| Anti-survente | Réservation du stock par `updateMany` conditionnel (`stock >= quantité`) dans une `$transaction` |
| Expiration des réservations | Stock restitué et commande annulée après `STOCK_RESERVATION_MINUTES` sans paiement |
| Prix | Toujours recalculé côté serveur (prix réduit + promotions actives) |
| Un seul paiement par commande | Refus d'initier un paiement si une tentative `en_attente` / `a_verifier` existe ou si la commande est payée |
| Webhook Jèko | Seule source de vérité du paiement : signature HMAC vérifiée, idempotence par `transactionJeko` unique, contrôle du montant |
| Transitions de statut | Liste blanche ; un paiement `confirme` n'est jamais réécrit |
| Emails | Un seul bon de commande par commande (`notifications.cleDedup` unique) |
| Données figées | Prix, noms et frais de livraison copiés dans la commande |
| Actions admin sensibles | Écriture dans `audit_logs` dans la même transaction |

Ces règles correspondent aux règles R1–R7 de [`docs/conception-base-de-donnees.md`](docs/conception-base-de-donnees.md).

## Stack technique

- **Next.js 16** (App Router, Turbopack, `cacheComponents`), **React 19**, **TypeScript**
- **Tailwind CSS 4**, Framer Motion, GSAP, Radix UI, Recharts
- **PostgreSQL** via **Prisma ORM 7** (`@prisma/adapter-pg`, client généré dans `src/generated/prisma`)
- **Auth.js** (`next-auth` v5, identifiants e-mail + mot de passe, bcrypt, blocage après 5 échecs pendant 15 min)
- **Zod** pour la validation des entrées (`src/lib/validation.ts`)
- **Cloudinary** pour les images (upload signé depuis l'admin)
- **Resend** pour les e-mails (bon de commande, changement de statut, alertes admin)
- **Jèko Checkout** pour le paiement en ligne

## Structure

```
.
├── Cahier_des_charges_ecommerce_v1.2.md   cahier des charges (référence)
├── docs/                                  conception BDD, notes de design
├── prisma/
│   ├── schema.prisma                      17 tables, enums, index
│   ├── migrations/
│   └── seed.ts                            communes, paramètres boutique, admin
├── prisma7.config.ts                      config Prisma (charge .env.local puis .env)
├── scripts/verify-db.ts                   vérification rapide de la base
└── src/
    ├── app/
    │   ├── (auth)/          connexion, inscription
    │   ├── (boutique)/      espace public
    │   ├── admin/           espace administrateur
    │   └── api/             auth, paiement (initier, webhook), cron, upload admin
    ├── components/          admin/, boutique/, motion/, ui/
    ├── lib/                 db, cart, pricing, stock, paiement, email, audit, validation, constants
    ├── auth.ts              configuration Auth.js
    └── proxy.ts             protection des routes /admin et /compte
```

## Installation

Prérequis : Node.js 20 ou plus, une base PostgreSQL.

```bash
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env.local  # puis renseigner les variables
npm run db:migrate          # crée les tables
npm run seed                # 12 communes, paramètres SOUKEYNA, admin initial
npm run dev                 # http://localhost:3000
```

Sans PostgreSQL installé, `npx prisma dev` démarre une base locale temporaire.

## Variables d'environnement

Toutes les variables sont documentées dans [`.env.example`](.env.example). Les secrets ne doivent jamais être commités (`.env*` est ignoré par Git).

| Groupe | Variables |
|---|---|
| Base de données | `DATABASE_URL` |
| Authentification | `AUTH_SECRET` (générer avec `npx auth secret`), `AUTH_URL`, `AUTH_TRUST_HOST` |
| Paiement Jèko | `JEKO_API_KEY`, `JEKO_API_SECRET`, `JEKO_WEBHOOK_SECRET`, `JEKO_API_BASE_URL` |
| Images | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| E-mails | `RESEND_API_KEY`, `BREVO_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` |
| Tâches planifiées | `CRON_SECRET` |
| Boutique | `STOCK_RESERVATION_MINUTES` (30 par défaut), `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_SHOP_PHONE`, `NEXT_PUBLIC_SHOP_WHATSAPP` |
| Seed | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |

## Tâches planifiées

Deux routes doivent être appelées périodiquement (cron de l'hébergeur ou planificateur) avec l'en-tête `Authorization: Bearer $CRON_SECRET` :

| Route | Rôle |
|---|---|
| `GET /api/cron/liberer-reservations` | Annule les commandes non payées dont la réservation a expiré et restitue le stock |
| `GET /api/cron/reconcilier` | Passe en `a_verifier` les paiements restés `en_attente` trop longtemps et alerte l'admin |

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarrage du build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification des types (après un `build` ou `npx next typegen`) |
| `npm run db:migrate` | Crée / applique les migrations (`prisma migrate dev`) |
| `npm run seed` | Données initiales |
| `npx tsx scripts/verify-db.ts` | Affiche les communes et le nom de la boutique |

## Points à confirmer

- **Jèko** : l'URL d'initiation, l'en-tête et le schéma de signature du webhook, les noms de statuts et l'endpoint de réconciliation sont provisoires (`src/lib/paiement.ts`, `src/app/api/paiement/webhook/route.ts`, `src/app/api/cron/reconcilier/route.ts`). Ils doivent être alignés sur la documentation officielle Jèko avant la mise en production.
- **Hébergement** : application et base PostgreSQL (Vercel, VPS, Neon, Supabase…), nom de domaine et HTTPS.
- **Contenus** : identité de la boutique, catalogue de départ, conditions de vente et de retour (section 18 du cahier des charges).
