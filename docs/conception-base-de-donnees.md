# Conception de la base de données — Boutique SOUKEYNA

**Étape 2 du cahier des charges** — Schéma PostgreSQL, index, contraintes d'unicité et règles d'atomicité.

| | |
|---|---|
| Version | 1.1 — PostgreSQL (remplace la v1.0 MongoDB) |
| Base | **PostgreSQL** + **Prisma ORM 7** (`@prisma/adapter-pg`) |
| Boutique | SOUKEYNA — Abidjan, FCFA, français |
| Schéma source | `prisma/schema.prisma` |

> **Décision d'architecture** : PostgreSQL remplace MongoDB (choix du propriétaire). Les transactions multi-tables sont natives (`prisma.$transaction`), les `UPDATE` conditionnels sont atomiques, et les contraintes d'unicité sont garanties par la base — les mêmes garanties que prévues au CDC.

---

## 1. Conventions

- Champs en français, cohérents avec le CDC (`statut`, `prix`, `reference`…).
- Montants en **entiers FCFA** (colonnes `Int`).
- Tables `snake_case` via `@@map`, colonnes camelCase.
- `createdAt`/`updatedAt` gérés par Prisma (`@default(now())`, `@updatedAt`).
- Données structurées variables → **JSONB** (`images`, `adresses`, `bannieres`, `payload`, `donnees`).
- Tableaux d'ids → **arrays Postgres** (`produitIds Int[]`, `categorieIds Int[]`).
- Les données client/prix figées dans les commandes sont des **colonnes copiées** : aucune modification ultérieure ne les affecte (CDC 9.5, 11.5).

---

## 2. Décisions de conception

| # | Sujet | Décision | Justification |
|---|-------|----------|---------------|
| D1 | Variantes | Table `product_variants` séparée (FK produit, cascade) + `aVariantes` bool sur le produit. Si `false` → `stock` sur `products` ; si `true` → `stock` sur la variante. | Table dédiée requise pour les UPDATE atomiques par variante ; articles simples sans variante possibles. |
| D2 | Catégories | Table `categories` auto-référencée (`parentId`), max 2 niveaux sous l'univers (contrôle applicatif) + `univers` enum. | CDC 4.6 : catégories dynamiques administrables. |
| D3 | Images | Colonne **JSONB** `products.images` (`publicId`, `url`, `alt`, `ordre`). | Une fiche produit = une ligne ; pas de jointure. |
| D4 | Promotions | `prixReduit` sur le produit **et** table `promotions` (`type: pourcentage\|montant`, `valeur`, `portee`, `produitIds[]`/`categorieIds[]`, `debut`, `fin`, `active`). Prix effectif **toujours recalculé côté serveur** (CDC 6.6). | Couvre CDC 6.1 (prix réduit) et 6.2 (ventes flash datées). |
| D5 | Comptes | Table `users` avec `role: client\|admin` — plusieurs admins. Invités : pas de ligne `users`, coordonnées figées dans `orders`. | CDC 8.2 + 14.3. |
| D6 | Panier | Tables `carts` + `cart_items`, invité via `cartId` (cookie) ou `userId`. **Pas de TTL Postgres** : purge planifiée `updatedAt > 30 j`. | Re-vérification stock/prix côté serveur à la commande. |
| D7 | Référence commande | Table `counters` + `UPDATE ... SET valeur = valeur + 1 RETURNING` → `SOU-AAAA-NNNNNN`. | Incrément atomique en une requête, zéro collision. |
| D8 | Paiements | Une ligne `payments` **par tentative** : `cleIdempotence` unique, `transactionJeko` unique (nullable — Postgres accepte plusieurs NULL), journal dans `payment_events`. | Idempotence webhook + audit complet (CDC 10.14). |
| D9 | Emails | `notifications.cleDedup` **unique** (ex. `bon_commande:SOU-2026-000123`). | Envoi unique garanti même si webhook en double (CDC 12.2). |
| D10 | Réservation stock | UPDATE conditionnel atomique à la commande + `reservationExpireLe` ; le cron libère par UPDATE conditionnel si non payée. | CDC 5.8 : jamais de lire-puis-écrire. |
| D11 | Paramètres | Table `settings` (ligne unique `cle='boutique'`) : nom SOUKEYNA, contacts, `bannieres` JSONB (CDC 7.1), rapport email. | CDC 7.8, 12.6, 13.8. |
| D12 | Rapports | Table `reports` = instantanés (type, période, `donnees` JSONB, `genereLe`). À la demande : calcul sans persistance possible. | CDC 13.8. |
| D13 | Intégrité historique | `order_lines.produitId` en FK `onDelete: Restrict` : un produit commandé ne se supprime pas (→ statut `desactive`). | Protège les données figées des commandes. |
| D14 | Recherche | `contains`/`mode: 'insensitive'` Prisma dans un premier temps ; extension `pg_trgm` envisageable si besoin. | Pas d'index texte natif Prisma — suffisant au démarrage. |

---

## 3. Tables (résumé)

| Table | Contenu | Index / unicités clés |
|---|---|---|
| `users` | comptes client/admin, hash bcrypt, blocage échecs | `email` unique, `role` |
| `categories` | arbre 2 niveaux + univers | `slug` unique, `(univers,parentId,ordre)` |
| `products` | fiches, prix, images JSONB, statut | `slug` unique, `(categorieId,statut)`, `(statut,createdAt)` |
| `product_variants` | taille/couleur/SKU + stock | `sku` unique, `produitId` |
| `communes` | 12 zones, tarifs FCFA | `nom` unique, `(active,ordre)` |
| `carts` | paniers invités/comptes | `cartId`, `userId` uniques, `updatedAt` (purge cron) |
| `cart_items` | lignes panier (sans prix) | `(cartId,produitId,varianteId)` unique* |
| `counters` | compteurs de références | `cle` PK |
| `orders` | commandes figées + statuts | `reference` unique, `(statutPaiement,reservationExpireLe)`, `(statut,createdAt)`, `clientEmail`, `livraisonCommuneId` |
| `order_lines` | lignes figées | `commandeId`, `produitId` |
| `payments` | tentatives de paiement | `cleIdempotence`, `transactionJeko` uniques, `(commandeId,statut)`, `(statut,createdAt)` |
| `payment_events` | journal paiements | `paymentId` |
| `promotions` | soldes/ventes flash | `(active,debut,fin)` |
| `notifications` | emails sortants | `cleDedup` unique, `(statut,createdAt)` |
| `reports` | instantanés rapports | `(type,periodeDebut)` |
| `audit_logs` | traçabilité admin | `(entiteType,entiteId)`, `createdAt` |
| `settings` | paramètres boutique | `cle` unique |

\* Postgres autorise plusieurs NULL dans un unique : la déduplication d'une ligne sans variante (`varianteId IS NULL`) est aussi gérée côté application.

**Enums** : `Role`, `Univers`, `StatutProduit`, `StatutCommande`, `StatutPaiement`, `MoyenPaiement`, `TypePromotion`, `PorteePromotion`, `TypeNotification`, `StatutNotification`, `TypeRapport`, `Granularite` — mêmes valeurs que `src/lib/constants.ts`.

---

## 4. Règles d'atomicité (implémentation Prisma)

### R1 — Réservation de stock (création de commande, CDC 5.8)
Dans `prisma.$transaction` : pour chaque ligne
```ts
// produit simple
const r = await tx.product.updateMany({
  where: { id, statut: 'publie', aVariantes: false, stock: { gte: qte } },
  data: { stock: { decrement: qte } },
});
// variante
const r = await tx.productVariant.updateMany({
  where: { id: vid, stock: { gte: qte } },
  data: { stock: { decrement: qte } },
});
if (r.count === 0) throw new Error('stock insuffisant'); // rollback auto
```
`UPDATE ... WHERE stock >= qte` est atomique — jamais de lire-puis-écrire.

### R2 — Libération de réservation (cron, CDC 10.11)
```ts
const liber = await tx.order.updateMany({
  where: { id, statut: 'en_attente_paiement', reservationExpireLe: { lt: new Date() } },
  data: { statut: 'annulee', statutPaiement: 'expire' },
});
if (liber.count === 1) { /* $increment du stock de chaque ligne, même transaction */ }
```

### R3 — Transitions de statut (CDC 10.10)
`updateMany` avec l'ancien statut dans le `where` + whitelist de transitions côté serveur. Une commande `payee` ne peut jamais revenir en arrière.

### R4 — Webhook Jèko idempotent (CDC 10.4, 10.10)
1. Vérifier signature (`JEKO_WEBHOOK_SECRET`, HMAC timing-safe).
2. Insert `payments` avec `transactionJeko` unique → erreur **P2002** = notification déjà traitée → enregistrer l'événement, rien d'autre.
3. Comparer `montant` reçu vs `order.total` → écart → `a_verifier` + alerte admin.
4. Transition conditionnelle + `bonEnvoyeLe` + `notifications.cleDedup` → **un seul email**.

### R5 — Anti double paiement côté serveur (CDC 10.10)
Avant d'initier : refus si `orders.statutPaiement ∈ {en_attente, confirme}` ou s'il existe un `payments.statut = 'en_attente'` non expiré pour la commande. Nouvelle tentative uniquement après `echoue|annule|expire`.

### R6 — Référence commande (D7)
```ts
const c = await tx.counter.update({
  where: { cle: `commande_${annee}` },
  data: { valeur: { increment: 1 } },
}); // SOU-2026-000{c.valeur} — upsert à la première commande de l'année
```

### R7 — Actions admin sensibles (CDC 10.13, 14.7)
`audit_logs` insert + opération métier dans la même `$transaction`. Motif obligatoire pour toute action sur un paiement.

---

## 5. Données initiales (seed `prisma/seed.ts`)

- **12 communes** avec tarifs (Cocody Z1 : 1000 → Grand-Bassam/Songon : 3000), upsert par `nom`.
- `settings` : ligne unique, `nomBoutique = "SOUKEYNA"`, contacts depuis `.env.local`.
- Admin initial si `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (bcrypt 12).

## 6. Prochaines actions

1. Renseigner `DATABASE_URL` dans `.env.local` (PostgreSQL local via `npx prisma dev`, ou hébergé : Neon/Supabase/VPS).
2. `npm run db:migrate` (crée les tables + `prisma/migrations/`).
3. `npm run seed`.
4. Étape suivante : authentification Auth.js ou catalogue.
