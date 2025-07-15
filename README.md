# Discord Lite

Une plateforme de chat texte et vocal en temps réel, inspirée de Discord, mais plus légère, avec une optimisation de la bande passante pour l'audio et un système d'authentification Google + JWT.

## 🎯 Objectif

Créer une plateforme de chat texte et vocal en temps réel, inspirée de Discord, mais plus légère, avec une optimisation de la bande passante pour l'audio et un système d'authentification Google + JWT. L'application doit être modulaire, extensible et bien structurée.

## 🧱 Stack utilisée

### Frontend
- Next.js (App Router, TypeScript)
- Tailwind CSS
- WebSocket (client)
- Auth Google via NextAuth.js
- JWT (session via `next-auth`)

### Backend
- Node.js + Express
- Socket.io (serveur WebSocket)
- MongoDB (base de données des utilisateurs / serveurs / messages)
- JWT
- Auth Google (optionnel si pas centralisé)

### Autres
- Docker + docker-compose
- Setup local via `setup.sh`
- Gestion de l'auth avec Google OAuth
- .env bien configuré avec les credentials Google

## 🔐 Variables d'environnement importantes

### Frontend (.env)
```
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
NEXTAUTH_SECRET=une_chaine_secrete_complexe
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://backend:4000
```

### Backend (.env)
```
MONGO_URI=mongodb://mongo:27017/discord-lite
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## ✅ Fonctionnalités réalisées

### Authentification
- [x] Auth Google via NextAuth.js
- [x] Auth classique email/mot de passe (register/login)
- [x] Hash des mots de passe (bcrypt)
- [x] Session JWT persistante
- [x] Page profil utilisateur
- [x] Déconnexion sécurisée
- [x] Pages dédiées `/login`, `/register`, `/profile`
- [x] Bouton "œil" pour afficher/masquer le mot de passe
- [x] Menu dynamique selon l'état de connexion
- [x] Redirections UX après login/register
- [x] Accessibilité et feedback utilisateur

### Backend API
- [x] API Express avec endpoint `/`
- [x] Routes `/auth/login` et `/auth/register`
- [x] Connexion MongoDB (Mongoose)
- [x] Configuration CORS
- [x] Socket.io serveur WebSocket
- [x] Stockage des messages dans MongoDB
- [x] Broadcast des messages à tous les clients
- [x] Historique des 50 derniers messages à la connexion

### Chat temps réel
- [x] Connexion WebSocket côté client (Socket.io)
- [x] Affichage de l'historique des messages
- [x] Affichage en temps réel des nouveaux messages
- [x] Formulaire d'envoi de message
- [x] Désactivation du chat si non connecté
- [x] UX moderne et responsive

### Système de salons (channels)
- [x] Création de salons texte (channels) via la sidebar
- [x] Liste dynamique des salons disponibles (affichage façon Discord)
- [x] Navigation entre les salons et affichage du chat correspondant
- [x] Historique des messages par salon
- [x] Style Discord pour la sidebar et la sélection des salons
- [ ] Permissions par salon (admin, membres, invités)
- [ ] Salons privés
- [ ] Gestion avancée des salons (suppression, renommage)
- [ ] Affichage des membres par salon
- [ ] Audio/vocal par salon

### Avatars et profils
- [x] Sélection d’un avatar parmi des images par défaut (page profil)
- [x] Bio personnalisée (modification et affichage dans le profil)
- [x] Statut personnalisable (en ligne, absent, occupé, invisible) avec pastille de couleur sur l’avatar
- [x] Synchronisation immédiate de l’avatar, de la bio et du statut dans le menu, le chat et la page profil après modification
- [x] Modal sécurisée pour confirmation du changement de profil (mot de passe requis)
- [x] Stockage de l’avatar, de la bio et du statut dans la base utilisateur et synchronisation via NextAuth/JWT
- [ ] Avatar personnalisé (upload ou via Google)
- [x] Page profil enrichie (date d’inscription)
- [ ] Statut en ligne/hors ligne/occupé

### Notifications
- [ ] Notification visuelle lors de nouveaux messages (badge, highlight)
- [ ] Notification sonore optionnelle
- [ ] Notification navigateur (Web Notification API)
- [ ] Mention @user avec notification ciblée

### Liste des membres connectés
- [ ] Affichage en temps réel des membres présents dans chaque salon
- [ ] Statut de connexion (en ligne, hors ligne, en train d’écrire…)

### Expérience de chat enrichie
- [ ] Système de reply/citation de message
- [ ] Édition et suppression de ses propres messages
- [ ] Réactions (emoji) sur les messages
- [ ] Détection et preview des liens (OpenGraph)
- [ ] Scroll automatique vers le dernier message (amélioré)

### Modération
- [ ] Rôles (admin, modérateur, membre)
- [ ] Bannissement/silence d’un utilisateur
- [ ] Suppression de messages par les modérateurs

### Mobile & Responsive
- [ ] Interface responsive mobile/tablette (PWA)

### Audio/Vocal
- [ ] Salons vocaux (WebRTC ou mediasoup)
- [ ] Affichage des utilisateurs en vocal
- [ ] Mute/unmute, gestion du volume
- [ ] Indicateur de prise de parole

### Gamification
- [ ] Système de niveaux/XP par activité
- [ ] Badges, succès, quêtes
- [ ] Classement des membres les plus actifs

### Fichiers & médias
- [ ] Envoi de fichiers/images dans le chat
- [ ] Preview d’images et de vidéos
- [ ] Limite de taille/configuration

### Recherche
- [ ] Recherche de messages par mot-clé
- [ ] Recherche d’utilisateurs ou de salons

### Historique & archivage
- [ ] Chargement progressif de l’historique (scroll infini)
- [ ] Archivage automatique des vieux salons/messages

## 📁 Structure du projet

```
discord-lite/
├── setup.sh
├── docker-compose.yml
├── frontend/ # Next.js
│   ├── Dockerfile
│   ├── .env
│   ├── app/
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── components/
│   │   │   ├── AuthButton.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── MenuLinks.tsx
│   │   │   ├── SessionProviderClient.tsx
│   │   │   └── Chat.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── profile/page.tsx
│   │   └── page.tsx
├── backend/ # Node.js + WebSocket
│   ├── Dockerfile
│   ├── .env
│   └── src/index.js
├── mongo/ # volume MongoDB
└── README.md
```

## 🚀 Installation et démarrage

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd discord-lite
   ```

2. **Configurer les variables d'environnement**
   - Copier `.env.example` vers `.env` dans `frontend/` et `backend/`
   - Remplir les variables Google OAuth et autres secrets

3. **Démarrer avec Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Accéder à l'application**
   - Frontend : http://localhost:3000
   - Backend API : http://localhost:4000
   - MongoDB : localhost:4567

## 🔐 Authentification

### Méthodes disponibles
- **Google OAuth** : Connexion via compte Google
- **Email/Mot de passe** : Inscription et connexion classique

### Fonctionnalités
- Inscription avec validation email
- Connexion sécurisée avec hash bcrypt
- Session JWT persistante
- Page profil utilisateur
- Déconnexion sécurisée

### Pages d'authentification
- `/login` : Connexion (Google + email/mot de passe)
- `/register` : Inscription (Google + email/mot de passe)
- `/profile` : Profil utilisateur (si connecté)

## 💡 Règles de développement

- Utiliser des composants propres, modulaires
- Commenter le code pour faciliter l'évolution
- Ne jamais exposer les secrets (exclure `.env`)
- Créer chaque fonctionnalité **par étape isolée**, avec un commit possible à la fin de chaque

## 🔧 Développement

### Commandes utiles
```bash
# Redémarrer un service spécifique
docker-compose restart frontend
docker-compose restart backend

# Voir les logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Reconstruire après modification
docker-compose up --build
```

### Debug
- **Frontend** : http://localhost:3000
- **Backend** : http://localhost:4000
- **MongoDB** : localhost:4567 (MongoDB Compass)
- **Logs** : `docker-compose logs -f [service]`

## 👤 Gestion des avatars, bio et statut

- Chaque utilisateur peut choisir un avatar parmi une liste d’images par défaut depuis la page `/profile`.
- La bio et le statut (en ligne, absent, occupé, invisible) sont modifiables et affichés dans le profil.
- Le statut s’affiche par une pastille colorée sur l’avatar dans le menu (vert = en ligne, jaune = absent, rouge = occupé, gris = invisible).
- Après modification, une modal s’ouvre pour demander le mot de passe (sécurité).
- L’avatar, la bio et le statut sont synchronisés instantanément dans toute l’interface (menu, chat, page profil) grâce à un refresh du JWT NextAuth.
- Le backend expose une route `/auth/user?email=...` pour permettre au frontend de récupérer les infos à jour à chaque connexion ou modification.
- Les données sont stockées dans la base MongoDB côté utilisateur.
- Le chat affiche l’avatar et le statut de chaque auteur de message (optimisé, pas de requête supplémentaire).

**À venir** : upload d’avatar personnalisé, date d’inscription, etc.