# Annuaire Frères en Guerre (FEG)

Annuaire privé du groupe FEG. Chaque membre a un compte avec mot de passe, crée sa fiche (infos perso, parcours pro, engagement Israël et communautaire, texte libre) et consulte celles des autres. Le site comprend aussi une messagerie interne (avec relais WhatsApp) et un espace **Réalisations & projets**.

**Technologies** : Next.js (hébergé sur Vercel) + Supabase (comptes, base de données, photos). Les offres gratuites des deux suffisent pour démarrer.

---

## Mise en ligne en 4 étapes (environ 30 minutes)

### 1. Supabase : la base de données

1. Allez sur <https://supabase.com>, cliquez sur **New project**. Nom : `feg-annuaire`. Notez le mot de passe de la base. Pour la région, choisissez **Central EU (Frankfurt)**, la plus proche d'Israël.
2. Une fois le projet prêt, ouvrez **SQL Editor** puis **New query**. Collez **tout** le contenu du fichier `supabase/schema.sql` et cliquez sur **Run**. Le message attendu est « Success ».
3. Allez dans **Project Settings → API** (ou **API Keys**) et copiez :
   - **Project URL** : `https://xxxx.supabase.co`
   - la clé **anon / public** (ou *publishable*)

   ⚠️ Ne copiez jamais la clé `service_role` / *secret* dans le site.

### 2. GitHub : le code

1. Sur <https://github.com/new>, créez un dépôt nommé `feg-annuaire`. Choisissez **Private** et ne cochez rien d'autre.
2. Sur la page du dépôt vide, cliquez sur **uploading an existing file**.
3. Décompressez le zip et glissez **le contenu** du dossier `feg-annuaire` dans la page : les dossiers `app`, `components`, `lib`, `supabase` et tous les fichiers. Puis cliquez sur **Commit changes**.

   Le dossier `.gitignore` peut être caché sur Mac/Windows, ce n'est pas grave. En ligne de commande, c'est encore plus simple :

   ```bash
   cd feg-annuaire
   git init && git add . && git commit -m "Annuaire FEG"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/feg-annuaire.git
   git push -u origin main
   ```

### 3. Vercel : le site en ligne

1. Sur <https://vercel.com/new>, connectez votre compte GitHub et cliquez sur **Import** à côté de `feg-annuaire`.
2. Dans **Environment Variables**, ajoutez les trois variables suivantes :

   | Nom | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | la Project URL de l'étape 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé anon/public de l'étape 1 |
   | `NEXT_PUBLIC_WHATSAPP_GROUP_URL` | le lien d'invitation du groupe WhatsApp (WhatsApp → infos du groupe → *Inviter via un lien*) |

3. Cliquez sur **Deploy**. Au bout d'environ 1 minute, vous obtenez l'adresse du site, par exemple `https://feg-annuaire.vercel.app`.
4. Retournez dans Supabase, rubrique **Authentication → URL Configuration** :
   - **Site URL** : `https://feg-annuaire.vercel.app` (votre adresse)
   - **Redirect URLs** : ajoutez `https://feg-annuaire.vercel.app/**` et `http://localhost:3000/**`

### 4. Devenir administrateur

1. Sur le site, cliquez sur **Demander un accès** et inscrivez-vous.
2. Cliquez sur le lien de confirmation reçu par email.
3. Dans Supabase → **SQL Editor**, lancez la requête suivante (avec votre email) :

   ```sql
   update public.feg_profiles set status = 'approved', is_admin = true
   where email = 'votre.email@exemple.com';
   ```

4. Reconnectez-vous : l'onglet **Admin** apparaît. Postez ensuite le lien du site dans le groupe WhatsApp. Chaque membre demande son accès, et vous le validez dans **Admin**.

---

## Fonctionnement

- **Accès** :
  1. Le membre s'inscrit (avec le nom de son parrain) et confirme son email.
  2. Un admin valide sa demande.
  3. Tant que la demande n'est pas validée, il ne voit rien.
- **Annuaire** : recherche par nom, métier, ville, association ou compétence, et filtre par secteur.
- **Fiche** :
  - infos perso, avec un téléphone que le membre peut masquer ;
  - parcours pro, compétences, LinkedIn ;
  - engagements associatifs, texte libre, photo ;
  - boutons Message / WhatsApp / Email.
- **Messages** :
  - conversations privées ;
  - messages groupés à une sélection de membres ;
  - fil « Frères en Guerre — Tous », mis à jour en temps réel.
- **WhatsApp** : WhatsApp ne permet pas d'envoyer automatiquement depuis un site. Après l'envoi d'un message, le site propose donc un bouton WhatsApp par destinataire, avec le texte déjà rempli, ainsi qu'un bouton vers le groupe WhatsApp FEG.
- **Réalisations & projets** :
  - types de publication : Projet, Réalisation, Recherche partenaire ;
  - image et lien facultatifs ;
  - bouton « Je suis intéressé » et contact de l'auteur.
- **Admin** :
  - valider ou refuser les demandes ;
  - nommer d'autres admins ;
  - retirer l'accès à un membre.

## Sécurité

- Toutes les règles d'accès sont appliquées **dans la base** (Row Level Security de Supabase), pas seulement dans l'interface.
- Un membre ne peut ni modifier la fiche d'un autre, ni se donner lui-même le statut admin.
- Seuls les membres validés voient les fiches, les messages et les publications.
- Les photos sont stockées avec des adresses aléatoires difficiles à deviner. En revanche, quelqu'un qui possède l'adresse d'une photo peut l'ouvrir.

## Emails

Supabase envoie les emails de confirmation et de mot de passe oublié. Son service gratuit est limité à quelques emails par heure. Si beaucoup de membres s'inscrivent en même temps, branchez un SMTP gratuit comme [Resend](https://resend.com) dans **Authentication → Emails → SMTP Settings**. Vous pouvez aussi traduire les modèles d'emails en français dans **Authentication → Emails → Templates**.

## Développement local (facultatif)

```bash
cp .env.example .env.local   # puis remplir les valeurs
npm install
npm run dev                   # http://localhost:3000
```

Chaque `git push` sur GitHub met le site à jour automatiquement sur Vercel.
