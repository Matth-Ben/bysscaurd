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
MONGO_URI=mongodb://mongo:4567/discord-lite
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## ✅ Étapes accomplies

### 🟩 Étape 2 : Authentification ✅
- ✅ Intégrer `next-auth` côté frontend
- ✅ Ajouter un provider Google OAuth
- ✅ Utiliser la stratégie `jwt`
- ✅ Ajouter un bouton de login dans l'interface
- ✅ Récupérer et stocker les infos utilisateur dans la session
- ✅ **BONUS** : Ajout de l'authentification classique (email/mot de passe)
- ✅ **BONUS** : Pages dédiées `/login` et `/register`
- ✅ **BONUS** : Bouton "œil" pour afficher/masquer les mots de passe
- ✅ **BONUS** : Page profil utilisateur `/profile`
- ✅ **BONUS** : Menu dynamique (connexion/déconnexion selon l'état)

### 🟩 Étape 3 : Backend API de base ✅
- ✅ Créer une API Express avec un endpoint `/`
- ✅ Ajouter `socket.io` et écouter les connexions
- ✅ Connecter à MongoDB (via `mongoose`)
- ✅ Ajouter une route `/auth/login` pour l'authentification classique
- ✅ Ajouter une route `/auth/register` pour l'inscription
- ✅ Configuration CORS pour le frontend
- ✅ Hash des mots de passe avec bcrypt

## 🚧 Étapes restantes

### 🟨 Étape 4 : WebSocket
- ⏳ Créer la logique client/serveur pour l'échange de messages en temps réel
- ⏳ Le frontend se connecte à `ws://localhost:4000` via Socket.io
- ⏳ Gérer les événements `message`, `connect`, `disconnect`

### 🟨 Étape 5 : Système de chat
- ⏳ Implémenter un salon par défaut
- ⏳ Stocker les messages dans MongoDB
- ⏳ Afficher les messages en live sur le frontend

### 🟨 Étape 6 : Audio (plus tard)
- ⏳ Intégrer WebRTC ou mediasoup
- ⏳ Optimiser la bande passante avec le codec `Opus`
- ⏳ Ajouter la détection de voix / mute / volume
- ⏳ Gérer l'ajout d'utilisateurs dans des rooms vocales

### 🟨 Étape 7 : Gamification (bonus)
- ⏳ Ajouter des niveaux, XP, badges
- ⏳ Ajouter des quêtes ou des objectifs
- ⏳ Sauvegarder la progression dans la base de données

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
│   │   │   └── SessionProviderClient.tsx
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