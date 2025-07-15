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
  avatar: { type: String, default: "/avatars/avatar1.png" }, // avatar par défaut
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

// Modèle Channel (salon)
const channelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const Channel = mongoose.models.Channel || mongoose.model("Channel", channelSchema);

// Modèle message simple (adapté pour channel)
const messageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  content: { type: String, required: true },
  channel: { type: String, required: true }, // nom du salon
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

// Route : liste des salons
app.get("/channels", async (req, res) => {
  const channels = await Channel.find().sort({ createdAt: 1 });
  res.json(channels);
});

// Route : création d'un salon
app.post("/channels", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nom du salon requis" });
  const exists = await Channel.findOne({ name });
  if (exists) return res.status(409).json({ error: "Ce nom de salon existe déjà" });
  const channel = await Channel.create({ name });
  res.status(201).json(channel);
});

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  // Rejoindre un salon
  socket.on("join_channel", async (channel) => {
    if (!channel) return;
    socket.join(channel);
    // Envoyer l'historique du salon
    const history = await Message.find({ channel }).sort({ timestamp: 1 }).limit(50);
    // Enrichir chaque message avec l'avatar de l'auteur
    const enrichedHistory = await Promise.all(history.map(async (msg) => {
      const user = await User.findOne({ name: msg.user });
      return {
        ...msg.toObject(),
        avatar: user?.avatar || "/avatars/avatar1.png"
      };
    }));
    socket.emit("message_history", enrichedHistory);
  });

  // Quitter un salon
  socket.on("leave_channel", (channel) => {
    if (channel) socket.leave(channel);
  });

  // Réception d'un message dans un salon
  socket.on("message", async (data) => {
    // data : { user, content, channel }
    if (!data || !data.user || !data.content || !data.channel) return;
    const msg = await Message.create({ user: data.user, content: data.content, channel: data.channel });
    // Enrichir le message avec l'avatar de l'auteur
    const user = await User.findOne({ name: data.user });
    const enrichedMsg = {
      ...msg.toObject(),
      avatar: user?.avatar || "/avatars/avatar1.png"
    };
    io.to(data.channel).emit("message", enrichedMsg); // broadcast dans le salon
  });

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
  const { email, password, name, avatar } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, nom et mot de passe requis" });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email déjà utilisé" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    name,
    password: hashedPassword,
    avatar: avatar || "/avatars/avatar1.png"
  });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, avatar: user.avatar });
});

// Route : mise à jour du profil utilisateur (avatar)
app.post("/auth/profile", async (req, res) => {
  const { email, avatar } = req.body;
  if (!email || !avatar) {
    return res.status(400).json({ error: "Email et avatar requis" });
  }
  const user = await User.findOneAndUpdate(
    { email },
    { avatar },
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé" });
  }
  res.json({ id: user._id, name: user.name, email: user.email, avatar: user.avatar });
});

// Route : récupérer un utilisateur par email (pour avatar à jour)
app.get("/auth/user", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requis" });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
  res.json({ name: user.name, email: user.email, avatar: user.avatar });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Backend démarré sur le port ${PORT}`));
