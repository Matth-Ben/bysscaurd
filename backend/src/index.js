import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/discord-lite");

// Modèle utilisateur simple
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  password: { type: String, required: true }, // hashé
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

app.get("/", (req, res) => res.send("API en ligne 🚀"));

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Tentative de connexion:", email, password); // Ajoute ce log
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  const user = await User.findOne({ email });
  if (!user) {
    console.log("Utilisateur non trouvé");
    return res.status(401).json({ error: "Utilisateur non trouvé" });
  }
  const valid = await bcrypt.compare(password, user.password);
  console.log("Résultat bcrypt:", valid);
  if (!valid) {
    console.log("Mot de passe incorrect");
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  res.json({ id: user._id, name: user.name, email: user.email });
});

app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, nom et mot de passe requis" });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email déjà utilisé" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name, password: hashedPassword });
  res.status(201).json({ id: user._id, name: user.name, email: user.email });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Backend démarré sur le port ${PORT}`));
