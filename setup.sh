#!/bin/sh

echo "🛠 Création du frontend (Next.js)..."

# Créer dossier frontend s'il n'existe pas
[ -d frontend ] || mkdir frontend
cd frontend || exit 1

# Vérifie s'il existe déjà un projet Next.js
if [ -f "package.json" ]; then
  echo "⚠️  Un projet Next.js existe déjà dans /frontend. Installation ignorée."
else
  echo "📦 Initialisation de Next.js..."

  npx create-next-app@latest . \
    --use-npm \
    --typescript \
    --tailwind \
    --no-eslint \
    --no-src-dir \
    --app \
    --force

  echo "✅ Next.js installé."
fi

# Vérifie Dockerfile
if [ -f Dockerfile ]; then
  echo "📦 Dockerfile déjà présent dans /frontend."
else
  echo "📝 Création du Dockerfile pour Next.js..."
  cat <<EOF > Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
EOF
  echo "✅ Dockerfile frontend généré."
fi

echo ""
echo "🛠 Création du backend (Node.js)..."

cd ../

# Créer dossier backend s'il n'existe pas
[ -d backend ] || mkdir backend
cd backend || exit 1

# Vérifie si un backend existe déjà
if [ -f "package.json" ]; then
  echo "⚠️  Backend déjà initialisé. Installation ignorée."
else
  echo "📦 Initialisation backend..."

  npm init -y
  npm install express socket.io mongoose jsonwebtoken cors dotenv

  mkdir -p src
  cat <<EOF > src/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:4567/discord-lite");

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

app.get("/", (req, res) => res.send("API en ligne 🚀"));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(\`✅ Backend démarré sur le port \${PORT}\`));
EOF

  echo "✅ Backend Node.js initialisé."
fi

# Vérifie Dockerfile backend
if [ -f Dockerfile ]; then
  echo "📦 Dockerfile déjà présent dans /backend."
else
  echo "📝 Création du Dockerfile pour backend..."
  cat <<EOF > Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000
CMD ["node", "src/index.js"]
EOF
  echo "✅ Dockerfile backend généré."
fi

echo ""
echo "✅ Setup complet terminé 🎉"