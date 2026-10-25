This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## BlackWaves Finances

L’espace bureau propose six entrées :

- **Vue d’ensemble** : synthèse du suivi des mouvements, prévisionnel, écarts et évolution mensuelle.
- **Budget & factures** : lignes budgétaires, engagements, paiements, documents, fusion et archives.
- **Mouvements** : recherche, saisie guidée ou libre et justificatifs du suivi budgétaire.
- **Prévisionnel** : préparation des montants par saison et catégorie, puis enregistrement explicite.
- **Écarts budgétaires** : rapprochement du prévisionnel et des mouvements, avec export PDF.
- **Analyse par saison** : historique des recettes, dépenses et répartitions.

### Données et conventions

Les tables `budget_lignes` / `budget_previsionnel` et le module `asso2_finance_*`
restent deux suivis distincts. Un backfill historique existe : leurs totaux ne
doivent donc pas être additionnés. Les écrans indiquent leur périmètre et les
exports conservent leur périmètre propre.

Le résultat correspond aux recettes moins les dépenses ; ce n’est pas le solde
bancaire. L’écart en euros correspond au réalisé moins le prévu : une hausse
est favorable pour une recette, défavorable pour une dépense. Le pourcentage
d’écart n’est pas défini lorsque le prévu est nul.

L’enregistrement du prévisionnel conserve les identifiants et commentaires des
lignes existantes. Un poste exclu du prévisionnel positif mais déjà rattaché à un
mouvement reste enregistré à zéro pour ne pas perdre son association.

L’import accepte les fichiers et la prise de photo selon les formulaires
existants ; aucune extraction OCR n’est disponible. Les montants doivent être
saisis et validés par l’utilisateur. Le module Budget & factures ne signe les
liens privés des justificatifs qu’à l’ouverture du détail, sans télécharger les
fichiers pour afficher la liste. Les préférences de navigation sont mémorisées
dans la session du navigateur, pas les pièces jointes ni les données financières.

### Vérifications locales

Les commandes existantes sont `npm run lint`, `npx tsc --noEmit --incremental false`
et `npm run build`. Aucun script de tests automatisés n’est configuré.
La validation des mutations, du stockage et des droits nécessite un environnement
Supabase de test configuré ; des variables factices ne permettent que de compiler
ou de vérifier les états d’interface sans backend.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
