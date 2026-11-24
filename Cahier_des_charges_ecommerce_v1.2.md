# CAHIER DES CHARGES FONCTIONNEL ET TECHNIQUE

## Conception et développement d'une boutique e-commerce
**Abidjan – Côte d'Ivoire**

| | |
|---|---|
| **Version** | 1.2 – Soumis à validation |
| **Date** | 23 novembre 2026 |
| **Modèle** | Boutique mono-vendeur |
| **Zone initiale** | Abidjan, Côte d'Ivoire |
| **Devise** | Franc CFA (FCFA) |
| **Langue** | Français |
| **Agrégateur de paiement** | Jèko (Jèko Checkout) |
| **Stack technique** | Next.js (React) · Node.js · PostgreSQL (Prisma) |

*Document de référence destiné à formaliser les besoins validés avant la conception de la base de données.*

---

## Journal des modifications (v1.0 → v1.2)

| # | Modification |
|---|---|
| 1 | Choix des technologies : Next.js (React), MongoDB Atlas + Mongoose, Auth.js, Cloudinary, service d'emails, Tailwind CSS, Framer Motion (section 15). |
| 2 | Agrégateur de paiement retenu : **Jèko** (section 10). |
| 3 | Ajout d'une section de **protection contre le double paiement** et de gestion des anomalies de paiement (section 10.8 à 10.14). |
| 4 | Gestion du stock par **mises à jour atomiques** pour éviter la survente (section 5.8). |
| 5 | Les **retours** sont gérés directement par appel ou message avec l'administrateur (section 9.7). |
| 6 | Tarifs de livraison par commune d'Abidjan entièrement stockés en base de données (section 11). |
| 7 | Ajout des **rapports automatiques et imprimables** pour l'administrateur (section 13.8). |
| 8 | Base de données adaptée à MongoDB : schéma de collections à la place du script SQL (sections 15.2 et 19). |
| 9 | Protection contre les injections NoSQL, en plus des autres attaques courantes (section 14.4). |
| 10 | **Base de données : PostgreSQL + Prisma ORM** remplacent MongoDB Atlas + Mongoose, sur décision du propriétaire (sections 15.1, 15.2, 14.4, 14.8, 18.8, 19). Les garanties d'atomicité, de transactions et d'unicité sont conservées. |

---

## Sommaire

1. Présentation du projet
2. Objectifs
3. Architecture générale et espaces
4. Organisation du catalogue
5. Gestion des produits, variantes et stocks
6. Prix, réductions et promotions
7. Expérience utilisateur et navigation
8. Comptes clients et commande sans compte
9. Processus de commande et retours
10. Paiements en ligne et prévention du double paiement
11. Livraison et communes d'Abidjan
12. Emails et notifications
13. Espace administrateur et rapports
14. Sécurité et protection des données
15. Exigences techniques et technologies utilisées
16. Scénario complet d'achat
17. Tests et critères de réception
18. Points à fournir ou à confirmer par le propriétaire
19. Étapes du projet après validation
20. Validation

---

## 1. Présentation du projet

### 1.1 Contexte
Le projet porte sur la conception et le développement d'une boutique e-commerce destinée à commercialiser en ligne les articles d'une boutique unique. La solution permettra aux clients de découvrir les produits, de constituer un panier, de commander et de payer en ligne. Elle donnera au responsable de la boutique les outils nécessaires pour administrer le catalogue, les stocks, les commandes, les paiements, les promotions et les livraisons, et pour obtenir des rapports d'activité.

### 1.2 Nature de la solution
Il s'agira d'une application web responsive, accessible depuis un smartphone, une tablette ou un ordinateur. La conception sera **mobile-first**, car les clients utiliseront principalement leur téléphone. L'administration devra également être utilisable sur téléphone et ordinateur.

### 1.3 Modèle commercial
La plateforme sera mono-vendeur : une seule boutique commercialise les articles. Il n'est pas prévu de créer des espaces pour des vendeurs tiers ni un système de marketplace.

---

## 2. Objectifs

### 2.1 Objectif général
Mettre en place une boutique en ligne moderne, agréable, simple d'utilisation, sécurisée et évolutive, adaptée au commerce de détail à Abidjan.

### 2.2 Objectifs spécifiques
- Présenter les produits et leurs caractéristiques de manière claire ;
- organiser les articles en univers, catégories et sous-catégories administrables ;
- permettre la sélection des tailles et couleurs lorsqu'elles existent ;
- suivre les stocks des produits et de leurs variantes, sans risque de survente ;
- autoriser les commandes avec ou sans compte client ;
- intégrer les moyens de paiement retenus au moyen de l'agrégateur Jèko ;
- garantir qu'une commande ne puisse jamais être payée deux fois ;
- calculer automatiquement les frais de livraison par commune ;
- envoyer le bon de commande et les informations de livraison par email ;
- permettre à l'administrateur de gérer l'activité depuis un espace sécurisé ;
- fournir à l'administrateur des rapports automatiques, consultables et imprimables.

---

## 3. Architecture générale et espaces

### 3.1 Espace utilisateur
Un espace public unique sera proposé aux visiteurs et aux clients. Il regroupera la page d'accueil, les catégories, le catalogue, les fiches produits, le panier, le processus de commande, le paiement et les informations de contact de la boutique.

### 3.2 Espace administrateur
Un espace séparé et protégé sera réservé à l'administration de la boutique. Il permettra de gérer les contenus et opérations commerciales. Les pages et fonctions d'administration ne devront pas être accessibles aux visiteurs non autorisés.

### 3.3 Application unique
Les deux espaces feront partie de la même plateforme web (projet Next.js) et utiliseront une base de données centralisée. Il n'est donc pas nécessaire de développer deux applications mobiles distinctes.

---

## 4. Organisation du catalogue

### 4.1 Univers principaux
Le menu principal de l'espace utilisateur présentera quatre rubriques : **ENFANTS, HOMMES, FEMMES et ACCESSOIRES**.

### 4.2 Univers Enfants
Les sous-catégories pourront notamment inclure les vêtements, pantalons, chemises, ensembles, boubous, chaussures, sacs, cartables, jouets et autres articles destinés aux enfants.

### 4.3 Univers Hommes
Les sous-catégories pourront notamment inclure les boubous traditionnels, boubous marocains, ensembles, chemises, pantalons, vêtements, chaussures, sacs, montres, chaînes, bijoux et autres accessoires.

### 4.4 Univers Femmes
Les sous-catégories pourront notamment inclure les robes, boubous, ensembles, vêtements, chaussures, sandales, sacs, montres, chaînes, bijoux, lunettes et autres accessoires.

### 4.5 Univers Accessoires
Cette rubrique pourra regrouper des jouets, bijoux, montres, chaînes, lunettes, savons, produits de beauté et divers articles. Elle devra pouvoir accueillir de nouveaux types de produits, même s'ils ne correspondent pas directement aux univers Enfants, Hommes ou Femmes (par exemple des trépieds et d'autres articles divers).

### 4.6 Catégories dynamiques
Les catégories et sous-catégories ne devront pas être figées dans le code. L'administrateur pourra en créer, modifier, réorganiser, activer ou désactiver depuis l'administration, afin de faire évoluer librement l'offre de la boutique.

### 4.7 Affectation des produits
Un produit sera rattaché à une catégorie ou sous-catégorie. La structure devra permettre de faire évoluer le classement des produits sans développement supplémentaire.

---

## 5. Gestion des produits, variantes et stocks

### 5.1 Informations d'un produit
Chaque fiche produit devra pouvoir contenir un nom, une description, un prix de vente, une ou plusieurs images, une catégorie, un statut de publication et, selon le produit, des caractéristiques complémentaires.

### 5.2 Photos
L'administrateur pourra ajouter plusieurs photos à un même produit. Le site devra les présenter clairement sur la fiche produit et les optimiser pour un affichage fluide sur mobile (hébergement et optimisation via Cloudinary).

### 5.3 Variantes
Les produits concernés pourront être déclinés selon la taille et/ou la couleur. Le client devra pouvoir choisir les options disponibles avant d'ajouter l'article au panier.

### 5.4 Stock par variante
Lorsque plusieurs tailles ou couleurs existent, le stock devra pouvoir être suivi par combinaison de variantes. L'administrateur pourra consulter et mettre à jour les quantités disponibles.

### 5.5 Poids et caractéristiques
Le poids du produit fait partie des informations envisagées pour la fiche article et devra pouvoir être renseigné lorsque nécessaire. Son utilisation dans le calcul de livraison n'est pas retenue : le principe validé est un **tarif fixe selon la commune**.

### 5.6 Statuts
Les statuts prévus sont : **Publié** (visible sur la boutique), **Brouillon** (en préparation, non visible aux clients) et **Désactivé** (retiré de la vente ou masqué).

### 5.7 Administration des produits
L'administrateur pourra ajouter, consulter, modifier, publier, dépublier ou désactiver un produit, gérer ses images, son prix, ses variantes et ses quantités.

### 5.8 Intégrité du stock (anti-survente)
- La décrémentation du stock devra se faire par une **opération atomique et conditionnelle** en base de données (retirer la quantité uniquement si le stock disponible est suffisant). Le système ne doit jamais lire le stock pour le réécrire ensuite.
- Deux clients ne doivent jamais pouvoir acheter le dernier exemplaire d'un même article.
- Un produit ou une variante dont le stock est à zéro doit être signalé comme indisponible et ne pas pouvoir être ajouté à une commande.
- Le stock est **réservé** à la création de la commande en attente de paiement, puis **confirmé** au paiement. Une réservation non payée expire après un délai paramétrable (par exemple 30 minutes) et le stock est alors remis en vente automatiquement.
- Toute modification manuelle de stock par l'administrateur est journalisée (voir 14.7).

---

## 6. Prix, réductions et promotions

### 6.1 Prix
Chaque produit disposera d'un prix normal. L'administrateur pourra, lorsqu'il le souhaite, définir un prix réduit pour un article.

### 6.2 Promotions
L'administrateur décidera librement des articles concernés et du montant ou pourcentage de réduction. Il pourra mettre en place des soldes, des réductions ponctuelles et des ventes flash.

### 6.3 Affichage
Lorsqu'une promotion est active, le site devra mettre en évidence le prix promotionnel et permettre au client de distinguer le prix initial du prix réduit.

### 6.4 Absence de codes promotionnels
Aucun système de code promo ou coupon n'est demandé dans le périmètre retenu. Les réductions sont créées et administrées directement depuis l'espace administrateur.

### 6.5 Contrôle
L'administrateur devra pouvoir activer, modifier et arrêter une réduction ou une vente flash. Les règles précises de dates, d'horaires et de durée des ventes flash seront définies lors du paramétrage fonctionnel.

### 6.6 Prix côté serveur
Le prix payé est toujours **recalculé côté serveur** à partir de la base de données. Aucun montant envoyé par le navigateur n'est accepté comme référence.

---

## 7. Expérience utilisateur et navigation

### 7.1 Accueil
La page d'accueil devra présenter clairement la boutique, les univers Enfants, Hommes, Femmes et Accessoires, ainsi que les nouveautés et les promotions en cours. Elle pourra mettre en avant des sélections de produits et des bannières administrables.

### 7.2 Recherche et navigation
Le visiteur devra pouvoir parcourir les univers et catégories et accéder aux fiches produits. Une recherche de produits est prévue. Les filtres détaillés (prix, taille, couleur, disponibilité, etc.) seront définis lors de la conception des écrans.

### 7.3 Fiche produit
La fiche produit affichera les photos, le nom, la description, le prix, la réduction éventuelle, les options de taille et de couleur lorsqu'elles existent, ainsi que la disponibilité et l'action d'ajout au panier.

### 7.4 Panier
Le panier récapitulera les articles sélectionnés, leurs variantes, les quantités et les montants. Le client pourra modifier les quantités ou retirer un article avant de poursuivre.

### 7.5 Identité visuelle
L'orientation graphique retenue est un style traditionnel moderne, inspiré des tissus et motifs traditionnels, sans s'éloigner de l'objectif principal de vente de vêtements, chaussures, sacs, jouets et accessoires. La palette envisagée est **bordeaux, doré et crème**, avec des motifs africains subtils.

### 7.6 Animations
Le site devra intégrer de belles animations, notamment pour valoriser les promotions, nouveautés et ventes flash. Elles devront rester fluides, élégantes et légères, sans gêner la navigation ni ralentir le site.

### 7.7 Mobile-first
Les pages, menus, boutons, formulaires, fiches produits, panier et paiement devront être conçus en priorité pour les smartphones. L'affichage devra ensuite s'adapter aux tablettes et ordinateurs.

### 7.8 Contact boutique
Le téléphone et le contact WhatsApp de la boutique seront visibles dans l'en-tête ou le pied de page, sur la page de confirmation de commande et dans les emails, afin de faciliter les échanges (questions, retours, réclamations).

---

## 8. Comptes clients et commande sans compte

### 8.1 Création de compte facultative
Le client pourra créer un compte, mais cette création ne sera pas obligatoire pour commander.

### 8.2 Commande en invité
Un visiteur devra pouvoir effectuer un achat sans inscription. Le formulaire de commande recueillera les informations nécessaires au traitement et à la livraison.

### 8.3 Informations demandées
Pour une commande en invité, les informations retenues comprennent au minimum le nom du client, son numéro de téléphone, son adresse email et son adresse de livraison, notamment sa commune. Des indications complémentaires d'adresse pourront être demandées pour faciliter la remise du colis.

### 8.4 Email obligatoire
L'adresse email sera demandée même pour une commande sans compte, afin d'envoyer le bon de commande et les notifications prévues.

### 8.5 Compte client
Les clients qui choisissent de s'inscrire pourront disposer d'un espace personnel (historique de commandes, coordonnées enregistrées). Les fonctionnalités détaillées au-delà de l'inscription et de l'identification seront confirmées lors de la conception.

---

## 9. Processus de commande et retours

### 9.1 Constitution du panier
Le client sélectionne les produits, leurs variantes et les quantités, puis consulte le récapitulatif de son panier.

### 9.2 Coordonnées et livraison
Le client renseigne ses coordonnées et choisit sa commune de livraison dans la liste proposée. Il complète son adresse afin que la boutique ou le livreur puisse le joindre et localiser le lieu de remise.

### 9.3 Calcul du total
Le système calcule le montant des articles et ajoute automatiquement les frais de livraison associés à la commune sélectionnée. Le total à payer doit être clairement affiché avant le paiement.

### 9.4 Vérification avant paiement
Le client doit pouvoir vérifier les articles, variantes, quantités, coordonnées, commune, frais de livraison et montant total avant de procéder au paiement.

### 9.5 Enregistrement
La commande et ses lignes sont enregistrées avec les informations nécessaires à son suivi. Elles contiennent une **copie figée** du nom du produit, du prix unitaire, de la variante, de la quantité et du montant de livraison au moment de l'achat. Une modification ultérieure d'un prix ou d'un tarif communal ne change pas les commandes déjà passées.

### 9.6 Bon de commande
Le bon ou récapitulatif de commande reprend au minimum la référence de commande, la date, les produits, variantes, quantités, prix, frais de livraison et total, ainsi que les coordonnées de livraison.

### 9.7 Gestion des retours et échanges
- Les retours, échanges et réclamations sont gérés **directement par appel téléphonique ou par message** entre le client et l'administrateur. Aucun module de retour en ligne n'est développé.
- Les coordonnées de contact sont affichées sur le site, sur la page de confirmation et dans les emails (voir 7.8).
- L'administrateur dispose d'un champ **« note interne »** sur chaque commande pour consigner les décisions prises (retour accepté, échange, geste commercial, etc.).
- Les règles de retour (délai, état de l'article, frais de transport, remboursement ou échange) seront rédigées dans les conditions générales de vente (voir 18.5).
- Si un remboursement est décidé, il est effectué manuellement par le propriétaire, puis le statut de la commande est mis à jour par l'administrateur avec journalisation.

---

## 10. Paiements en ligne et prévention du double paiement

### 10.1 Agrégateur
Le paiement est intégré par l'intermédiaire de l'agrégateur **Jèko** (solution Jèko Checkout / API), permettant de proposer plusieurs moyens de règlement au sein du même parcours de commande.

### 10.2 Moyens souhaités
Wave, Orange Money, MTN Mobile Money, Moov Money et carte bancaire (Visa, Mastercard), sous réserve de confirmation par Jèko pour l'intégration du site e-commerce (voir 18.4).

### 10.3 Parcours de paiement
Après vérification du récapitulatif, le client choisit un moyen de paiement et est dirigé vers le parcours sécurisé de l'agrégateur. Le système récupère ensuite le résultat de la transaction.

### 10.4 Confirmation fiable
Le paiement n'est considéré comme confirmé qu'après vérification du retour fiable de l'agrégateur, par **notification serveur-à-serveur (webhook)** dont la **signature est vérifiée**. Le montant et la référence reçus sont comparés à ceux de la commande. Un simple affichage de succès dans le navigateur ne suffit pas.

### 10.5 Statuts de paiement
Le système distingue au minimum les statuts suivants :
- `en_attente` : paiement initié, résultat non reçu ;
- `confirme` : paiement validé par l'agrégateur ;
- `echoue` : paiement refusé ;
- `annule` : abandonné par le client ;
- `expire` : délai dépassé sans paiement ;
- `a_verifier` : anomalie nécessitant un contrôle de l'administrateur (voir 10.12).

### 10.6 Traitement de commande
La commande n'est considérée comme payée et prête pour le traitement qu'après confirmation du paiement par l'agrégateur.

### 10.7 Données bancaires
La boutique ne conserve jamais les numéros complets de carte bancaire ni les codes confidentiels. Ces données sont traitées par les composants sécurisés du prestataire.

### 10.8 Règle fondamentale : un seul paiement par commande
Une commande ne peut être payée **qu'une seule fois**. Le système met en œuvre simultanément les protections suivantes.

### 10.9 Protection côté client
- Le bouton « Payer » est désactivé dès le premier clic et affiche un état de chargement, pour éviter les doubles clics.
- Après le départ vers l'agrégateur, la page de commande n'affiche plus de bouton de paiement pour une commande déjà payée ou en cours de paiement.
- Si le client revient en arrière ou rafraîchit la page, il voit l'état réel de sa commande (en attente, payée, échouée), et non un nouveau formulaire de paiement pour une commande déjà payée.

### 10.10 Protection côté serveur
- **Clé d'idempotence** : chaque tentative de paiement possède une référence unique liée à la commande. Une même requête de paiement envoyée deux fois ne crée qu'une seule transaction.
- **Verrou par commande** : lorsqu'un paiement est en cours pour une commande, toute nouvelle demande de paiement pour cette même commande est refusée ou redirigée vers la transaction existante tant que celle-ci n'est pas terminée (échec, annulation ou expiration).
- **Transitions de statut contrôlées** : une commande `payee` ne peut jamais revenir à `en_attente` ni être payée de nouveau. Les changements de statut se font par mises à jour conditionnelles (par exemple « passer à payée uniquement si le statut actuel est en attente »).
- **Nouvelle tentative autorisée uniquement après échec** : le client ne peut relancer un paiement que si la précédente tentative est `echouee`, `annulee` ou `expiree`.
- **Webhook idempotent** : si l'agrégateur envoie plusieurs fois la même notification, elle n'est traitée qu'une fois (identifiant de transaction unique, contrainte d'unicité en base). Les notifications en double sont enregistrées mais n'ont aucun effet (pas de second email, pas de second décompte de stock).
- **Vérification du montant** : un paiement dont le montant ne correspond pas exactement au total de la commande n'est pas validé automatiquement et passe en `a_verifier`.

### 10.11 Réconciliation automatique
- Une tâche planifiée vérifie régulièrement auprès de Jèko le statut des paiements restés `en_attente` au-delà d'un délai défini, afin de rattraper les notifications manquées ou retardées.
- Les paiements non finalisés dans le délai d'expiration passent en `expire` et le stock réservé est libéré.

### 10.12 Détection et traitement des anomalies
Si malgré ces protections un **second paiement** est reçu pour une commande déjà payée (cas exceptionnel, par exemple deux transactions lancées depuis deux appareils) :
- il est enregistré en statut `a_verifier` et **n'est pas** compté comme une seconde commande ;
- l'administrateur est alerté (tableau de bord et email) ;
- l'administrateur contacte le client, puis effectue le remboursement manuellement selon les procédures de Jèko ;
- l'événement est journalisé.
Le même traitement s'applique à un paiement reçu après expiration ou pour une commande annulée.

### 10.13 Contrôle administrateur
L'administration ne doit pas pouvoir transformer arbitrairement un paiement non confirmé en paiement confirmé. Toute action manuelle exceptionnelle (par exemple valider un paiement après vérification sur le portail Jèko) exige un motif et est journalisée avec l'identité de l'administrateur.

### 10.14 Journal des paiements
Chaque événement de paiement (initiation, notification reçue, signature vérifiée ou invalide, changement de statut, anomalie) est enregistré avec date, heure et référence, afin de faciliter le diagnostic et la réconciliation.

---

## 11. Livraison et communes d'Abidjan

### 11.1 Communes préenregistrées
Toutes les communes d'Abidjan retenues pour la zone de livraison sont préenregistrées dans la base de données. Le client sélectionne sa commune dans une liste, sans la saisir librement.

### 11.2 Tarif fixe par commune
Chaque commune dispose d'un prix de livraison fixe en FCFA, renseigné dans la base de données par le propriétaire (collection `communes` : nom, tarif, active).

### 11.3 Calcul automatique
Lors de la validation de la commande, le système identifie la commune choisie, récupère son tarif **côté serveur** et l'ajoute automatiquement au montant des articles. Le client voit le prix de livraison et le total à payer avant de payer.

### 11.4 Gestion des tarifs
L'administrateur peut renseigner et modifier le tarif de chaque commune, et activer ou désactiver une commune depuis l'administration. Les tarifs sont gérés en base de données et non écrits en dur dans le programme.

### 11.5 Conservation du tarif historique
Le montant de livraison effectivement appliqué est enregistré dans la commande. Une modification ultérieure du tarif communal ne recalcule pas les anciennes commandes.

### 11.6 Délai par commande
Après réception de la commande payée, l'administrateur renseigne le délai ou la date prévisionnelle de livraison pour cette commande (par exemple dans deux ou trois jours).

### 11.7 Communication du délai
Le délai renseigné est communiqué au client par email. Le système ne promet jamais automatiquement un délai standard sans validation de l'administrateur.

### 11.8 Suivi opérationnel
L'administration permet de suivre l'état de la commande et de sa livraison. Statuts proposés : `en_attente_paiement`, `payee`, `en_preparation`, `expediee`, `livree`, `annulee`. Les modalités de preuve de livraison seront arrêtées pendant la conception fonctionnelle détaillée.

---

## 12. Emails et notifications

### 12.1 Canal retenu
Les notifications sont envoyées par email. Aucun envoi par SMS ou WhatsApp n'est retenu à ce stade.

### 12.2 Bon de commande
Après confirmation du paiement, le client reçoit par email son bon ou récapitulatif de commande. L'email est envoyé **une seule fois** par commande, même si l'agrégateur envoie plusieurs notifications.

### 12.3 Notification du délai
Lorsque l'administrateur a renseigné le délai prévisionnel de livraison, le client reçoit un email contenant cette information.

### 12.4 Autres événements
Des emails complémentaires (commande expédiée, livrée, annulation) pourront être définis dans les règles détaillées. Leur contenu et leur déclenchement seront validés avant réalisation.

### 12.5 Alertes administrateur
L'administrateur reçoit un email lors d'une nouvelle commande payée et lors d'une anomalie de paiement (voir 10.12).

### 12.6 Configuration
L'envoi des emails nécessite une adresse d'expédition et un service d'envoi (Resend ou Brevo) configurés. Les identifiants et paramètres techniques seront fournis ou créés par le propriétaire.

---

## 13. Espace administrateur et rapports

### 13.1 Tableau de bord
L'administration propose une interface centralisée donnant accès aux principales fonctions de gestion. Les indicateurs affichés (commandes du jour, ventes, produits en rupture, paiements à vérifier) seront précisés lors de la conception des écrans.

### 13.2 Produits et catégories
Créer, modifier, publier, dépublier ou désactiver les produits ; gérer les images, prix, descriptions, tailles, couleurs et stocks ; créer et organiser les catégories et sous-catégories.

### 13.3 Promotions
Créer, modifier, activer et arrêter les réductions, soldes et ventes flash, sans code promotionnel.

### 13.4 Commandes
Consulter les commandes, leurs lignes, les coordonnées du client, la commune, les frais de livraison, le montant total, le statut du paiement et la note interne.

### 13.5 Livraison
Renseigner pour chaque commande le délai ou la date prévisionnelle de livraison et déclencher l'email correspondant. Gérer les communes préenregistrées et leurs tarifs.

### 13.6 Paiements
Consulter le statut des transactions retourné par Jèko, le journal des paiements et les paiements en `a_verifier`. Aucune validation arbitraire n'est possible (voir 10.13).

### 13.7 Utilisation multi-écran
L'espace administrateur est utilisable depuis un ordinateur et depuis un téléphone, avec une interface adaptée à la taille de l'écran.

### 13.8 Rapports automatiques et impression

**Rapports disponibles**

| Rapport | Contenu |
|---|---|
| **Ventes** | Nombre de commandes payées, chiffre d'affaires en FCFA, panier moyen, détail par jour. |
| **Produits** | Produits les plus vendus, ventes par catégorie et par univers (Enfants, Hommes, Femmes, Accessoires). |
| **Stock** | Articles en rupture ou à stock faible, valeur du stock, mouvements de stock. |
| **Livraisons** | Commandes par commune, frais de livraison perçus, commandes en attente de livraison. |
| **Paiements** | Transactions par moyen de paiement (Wave, Orange Money, MTN, Moov, carte), échecs, annulations, anomalies à vérifier. |
| **Promotions** | Ventes réalisées pendant les promotions et ventes flash. |

**Périodes** : journalier, hebdomadaire, mensuel, et période personnalisée (date de début et de fin).

**Génération automatique**
- Les rapports journaliers, hebdomadaires et mensuels sont **générés automatiquement** par une tâche planifiée.
- L'administrateur peut les consulter à tout moment depuis son espace, et en générer un à la demande pour la période de son choix.
- Un rapport récapitulatif peut être envoyé automatiquement par email à l'administrateur (activable ou désactivable dans les paramètres).

**Impression et export**
- Chaque rapport dispose d'un bouton **Imprimer**, avec une mise en page prévue pour l'impression (format A4, en-tête avec nom de la boutique, période, date de génération, totaux).
- Chaque rapport peut être **enregistré en PDF** via l'impression du navigateur.
- Un export **CSV/Excel** des commandes et des ventes sera proposé pour la comptabilité.
- Les rapports sont consultables et imprimables depuis un ordinateur comme depuis un téléphone.

**Règles de calcul**
- Seules les commandes dont le paiement est `confirme` entrent dans le chiffre d'affaires.
- Les montants affichés reposent sur les valeurs figées dans les commandes (voir 9.5).

---

## 14. Sécurité et protection des données

### 14.1 HTTPS
Le site fonctionne en HTTPS avec un certificat TLS valide afin de chiffrer les échanges entre les utilisateurs et la plateforme.

### 14.2 Authentification
L'accès administrateur est protégé par identifiant et mot de passe. Les mots de passe ne sont jamais stockés en clair ; ils sont hachés avec un algorithme adapté (bcrypt ou argon2). Le blocage temporaire après plusieurs tentatives échouées est prévu.

### 14.3 Contrôle d'accès
Les fonctions d'administration sont protégées **côté serveur** avec un système de rôles (client, administrateur). Un visiteur ou un client ne peut pas accéder aux fonctions réservées en modifiant une URL ou une requête.

### 14.4 Protection applicative
Validation des données côté serveur (Zod et schéma Prisma), protection contre les **injections SQL** (requêtes paramétrées via Prisma), les scripts malveillants (XSS), les falsifications de requêtes (CSRF), les attaques courantes sur les sessions et la limitation du nombre de requêtes (rate limiting) sur les routes sensibles.

### 14.5 Données personnelles
Les données collectées (nom, téléphone, email et adresse de livraison) sont limitées aux besoins de la commande, protégées et accessibles uniquement aux personnes habilitées.

### 14.6 Paiement
Les clés d'API et secrets Jèko sont conservés dans des variables d'environnement côté serveur et ne sont jamais exposés dans le code client. Les données sensibles de carte sont gérées par l'agrégateur.

### 14.7 Journalisation
Les opérations importantes de l'administration (changements de tarifs, de prix, de stocks, de statuts de commande et actions sur les paiements) sont tracées avec la date, l'heure et l'auteur.

### 14.8 Sauvegardes
Sauvegardes automatiques de la base PostgreSQL activées dès le départ (selon l'hébergeur retenu), et sauvegarde des images produits (Cloudinary). Les modalités de fréquence, de conservation et de restauration sont fixées avant la mise en production.

### 14.9 Confidentialité et conformité
Le propriétaire valide les mentions légales, conditions générales de vente, politique de confidentialité et règles de conservation des données applicables à son activité.

---

## 15. Exigences techniques et technologies utilisées

### 15.1 Architecture et technologies retenues

| Domaine | Technologie |
|---|---|
| Framework web (front et back) | **Next.js** (basé sur React), TypeScript recommandé |
| Interface | **Tailwind CSS**, composants réutilisables |
| Animations | **Framer Motion** |
| Serveur / API | Routes API Next.js (Node.js) |
| Base de données | **PostgreSQL** (hébergement à confirmer : Neon, Supabase ou VPS) |
| Accès aux données | **Prisma ORM** |
| Validation | **Zod** (et contraintes du schéma Prisma) |
| Authentification | **Auth.js** (rôles client / administrateur, mots de passe hachés) |
| Paiement | **Jèko Checkout** (API et webhook) |
| Images | **Cloudinary** |
| Emails | **Resend** ou **Brevo** |
| Tâches planifiées | Cron (rapports automatiques, réconciliation des paiements, expiration des réservations de stock) |
| Rapports imprimables | Pages HTML avec feuille de style d'impression (CSS print) et export PDF/CSV |
| Hébergement | À confirmer (par exemple Vercel ou VPS) avec nom de domaine et HTTPS |

La solution distingue l'interface utilisateur, l'espace administrateur, la logique métier et la couche d'accès aux données.

### 15.2 Base de données (PostgreSQL)
Tables principales : `users` (rôles), `categories` (arbre auto-référencé), `products`, `product_variants` (stock par variante), `communes` (tarifs), `carts` + `cart_items`, `counters` (références), `orders` + `order_lines` (lignes figées), `payments` + `payment_events` (transactions et journal), `promotions`, `notifications`, `reports`, `audit_logs` et `settings`.

**Règles d'implémentation**
- Mises à jour atomiques et conditionnelles pour le stock (voir 5.8) et pour les statuts de commande et de paiement (voir 10.10) : `UPDATE ... WHERE stock >= quantité`.
- **Transactions SQL** (multi-tables) pour les opérations liées : création de la commande, réservation du stock et création du paiement.
- **Contraintes d'unicité** sur la référence de commande, l'identifiant de transaction Jèko et la clé d'idempotence.
- **Index** sur le slug produit, la catégorie, le statut, la référence de commande, la date de commande et la commune.
- Copie figée des prix, noms de produits et frais de livraison dans chaque commande.
- Schéma détaillé : `docs/conception-base-de-donnees.md`.

### 15.3 Performance
Les images sont optimisées, les pages adaptées aux connexions mobiles et les requêtes de données conçues pour éviter les lenteurs inutiles (pagination, index, chargement différé des images).

### 15.4 Compatibilité
Le site est testé sur les navigateurs récents et sur les formats d'écran courants, en particulier les smartphones.

### 15.5 Maintenabilité
Code structuré, typé et documenté de manière suffisante pour faciliter les corrections, la maintenance et les évolutions. Fichier d'exemple des variables d'environnement fourni.

### 15.6 Environnements
Un environnement de **test** (avec sandbox Jèko) et un environnement de **production** distincts, avec leurs propres clés et bases de données.

---

## 16. Scénario complet d'achat

1. Le client arrive sur le site depuis son téléphone ou son ordinateur.
2. Il choisit l'univers Enfants, Hommes, Femmes ou Accessoires, puis consulte les catégories et produits.
3. Il ouvre une fiche produit, consulte les images et informations, sélectionne la taille et/ou la couleur si nécessaire, puis ajoute le produit au panier.
4. Il vérifie le panier et poursuit la commande avec son compte ou sans créer de compte.
5. Il renseigne son nom, son numéro de téléphone, son email et son adresse, puis choisit une commune d'Abidjan préenregistrée.
6. Le système récupère automatiquement le tarif de livraison de la commune et affiche le montant total à payer. Le stock est réservé pour la durée prévue.
7. Le client vérifie le récapitulatif et clique une seule fois sur « Payer » ; le bouton se désactive aussitôt. Il choisit Wave, Orange Money, MTN Money, Moov Money ou carte bancaire, selon les moyens activés par Jèko.
8. Jèko traite la transaction et notifie le serveur (webhook signé). Le système vérifie la signature, le montant et l'absence de paiement déjà confirmé, puis met à jour le statut du paiement une seule fois.
9. Le bon de commande est envoyé par email au client. La commande payée apparaît dans l'espace administrateur pour traitement.
10. L'administrateur prépare la commande, renseigne le délai prévisionnel de livraison et le client reçoit cette information par email.
11. En cas de retour ou de réclamation, le client contacte la boutique par appel ou message ; l'administrateur consigne la décision dans la note interne de la commande.
12. L'administrateur consulte et imprime les rapports de vente, de stock, de livraison et de paiement.

---

## 17. Tests et critères de réception

### 17.1 Catalogue
Création et modification des univers, catégories, sous-catégories et produits, ajout de plusieurs images, sélection des variantes et gestion des stocks.

### 17.2 Promotions
Une réduction décidée par l'administrateur s'affiche correctement, le prix normal et le prix réduit sont compréhensibles et aucun code promo n'est exigé.

### 17.3 Commande
Parcours avec compte et parcours invité, champs obligatoires, panier et récapitulatif avant paiement.

### 17.4 Livraison
Les communes préenregistrées sont proposées, le bon tarif est appliqué automatiquement et le tarif appliqué reste conservé sur la commande après modification du tarif communal.

### 17.5 Stock
- Deux clients commandent simultanément le dernier exemplaire : un seul y parvient.
- Une réservation non payée expire et libère le stock.

### 17.6 Paiement et double paiement
- Les moyens réellement disponibles chez Jèko sont testés (succès, échec, annulation, expiration).
- **Double clic** sur « Payer » : une seule transaction est créée.
- **Rafraîchissement ou retour arrière** pendant le paiement : aucun second paiement n'est possible sur la même commande.
- **Webhook reçu deux fois** : traité une seule fois (un seul email, un seul changement de statut).
- **Webhook avec signature invalide ou montant incorrect** : rejeté ou placé en `a_verifier`.
- **Paiement lancé depuis deux appareils** sur la même commande : le second est bloqué ou signalé en anomalie.
- **Notification manquée** : la réconciliation automatique récupère le statut correct.
- Une commande non payée n'est jamais traitée comme payée.

### 17.7 Emails
Envoi unique du bon de commande, de l'email contenant le délai de livraison et des alertes administrateur.

### 17.8 Retours
Les coordonnées de contact sont visibles aux endroits prévus et la note interne de commande est enregistrée.

### 17.9 Rapports
- Les rapports automatiques sont générés aux périodes prévues.
- Les totaux correspondent aux commandes payées.
- L'impression A4 est lisible et l'export PDF/CSV fonctionne, sur ordinateur et sur téléphone.

### 17.10 Sécurité
HTTPS, protections d'accès administrateur, contrôle des données reçues (dont injections SQL), limitation des requêtes et non-exposition des secrets de paiement.

### 17.11 Affichage
Vérification des pages principales sur smartphone, tablette et ordinateur, ainsi que de la fluidité des animations.

---

## 18. Points à fournir ou à confirmer par le propriétaire

### 18.1 Identité de la boutique
Nom commercial définitif, logo, coordonnées (téléphone et WhatsApp affichés pour les retours), adresse email de contact et contenus de présentation.

### 18.2 Catalogue de départ
Liste des premiers produits, descriptions, photos, prix, variantes et quantités de stock.

### 18.3 Communes et tarifs
Liste définitive des communes à préenregistrer et montant fixe de livraison pour chacune.

### 18.4 Agrégateur Jèko
À confirmer directement avec Jèko avant le développement :
- ouverture d'un compte marchand et contrat ;
- disponibilité de l'intégration **Jèko Checkout (API)** pour un site e-commerce ;
- **notification serveur-à-serveur (webhook)** et méthode de vérification de signature ;
- **environnement de test (sandbox)** ;
- moyens de paiement activés (Wave, Orange Money, MTN, Moov, Visa, Mastercard) ;
- frais par transaction et délais de reversement ;
- gestion des paiements expirés ou abandonnés, et procédure de remboursement.

### 18.5 Conditions de vente et retours
Règles de retour, échange, remboursement et annulation (les retours étant traités par appel ou message), et conditions générales de vente.

### 18.6 Délais de livraison
Format de saisie du délai par l'administrateur et règles de communication au client.

### 18.7 Rapports
Confirmation des rapports souhaités en priorité, de la fréquence d'envoi par email et de l'adresse destinataire.

### 18.8 Hébergement et exploitation
Nom de domaine, hébergement, hébergement base PostgreSQL (Neon, Supabase ou VPS), compte Cloudinary, service d'envoi d'emails, adresse email d'envoi, comptes techniques et modalités de maintenance.

---

## 19. Étapes du projet après validation

### Étape 1 – Validation
Le propriétaire relit et valide le présent cahier des charges. Les corrections éventuelles sont intégrées avant le démarrage de la conception technique.

### Étape 2 – Conception de la base de données
Réalisation du dictionnaire de données, du modèle conceptuel (MCD) et du **schéma des tables PostgreSQL** (relations, index, contraintes d'unicité, règles d'atomicité).

### Étape 3 – Conception des interfaces
Maquettes des pages utilisateur, administrateur et des modèles de rapports imprimables, puis validation.

### Étape 4 – Développement
Développement par modules : catalogue, panier et commande, livraison par commune, paiement Jèko avec protections anti-double paiement, emails, administration, rapports.

### Étape 5 – Tests et recette
Tests fonctionnels, paiements (dont tous les scénarios de la section 17.6), emails, livraison, sécurité, rapports et affichage responsive, en environnement de test Jèko.

### Étape 6 – Mise en production
Déploiement après configuration de l'hébergement, du domaine, du HTTPS, des emails, de Jèko en production, des tâches planifiées et des sauvegardes.

---

## 20. Validation

### Objet de la validation
La signature confirme que le propriétaire a pris connaissance des besoins décrits et valide le périmètre fonctionnel présenté. Les points expressément indiqués comme restant à confirmer doivent être arrêtés avant leur réalisation.

### Suite du projet
La conception détaillée de la base de données commencera après validation du présent cahier des charges. Toute modification importante du périmètre devra être documentée et approuvée.

---

## Signatures de validation

Le présent cahier des charges est soumis à la lecture et à la validation du propriétaire de la boutique.

| POUR LE PROPRIÉTAIRE | POUR LE RESPONSABLE DU PROJET |
|---|---|
| Nom et prénom : ______________________ | Nom et prénom : ______________________ |
| Date : ______________________________ | Date : ______________________________ |
| Signature : __________________________ | Signature : __________________________ |

*Version 1.2 – Document soumis à validation*
