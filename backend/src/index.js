import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

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

// Configuration multer pour l'upload d'avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Configuration multer pour l'upload d'icônes de salon
const channelIconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/channels';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'icon-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadChannelIcon = multer({
  storage: channelIconStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Servir les fichiers uploadés statiquement
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/discord-lite");

// Modèle utilisateur avec rôles
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  password: { type: String, required: true }, // hashé
  avatar: { type: String, default: "/avatars/avatar1.png" }, // avatar par défaut
  bio: { type: String, default: "" },
  status: { type: String, default: "online" },
  role: { type: String, enum: ['admin', 'moderator', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

// Modèle Channel (salon) dynamique avec owner, rôles et membres
const channelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  owner: { type: String, required: true }, // email du propriétaire
  icon: { type: String, default: "/icons/default.png" }, // icône par défaut
  roles: {
    type: Object,
    default: {
      Admin: {
        canDeleteChannel: true,
        canManageUsers: true,
        canDeleteMessages: true,
        canBanUsers: true,
        canManageRoles: true
      },
      Modérateur: {
        canDeleteChannel: false,
        canManageUsers: true,
        canDeleteMessages: true,
        canBanUsers: false,
        canManageRoles: false
      },
      Utilisateur: {
        canDeleteChannel: false,
        canManageUsers: false,
        canDeleteMessages: false,
        canBanUsers: false,
        canManageRoles: false
      }
    }
  },
  members: {
    type: [
      {
        email: { type: String, required: true },
        role: { type: String, required: true }
      }
    ],
    default: []
  },
  inviteToken: { type: String, default: "" },
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

// Nouvelle fonction utilitaire pour vérifier les permissions dynamiques
const checkPermission = async (userEmail, channelName, permission) => {
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return false;

  // Owner a tous les droits
  if (channel.owner === userEmail) return true;

  // Chercher le membre
  const member = channel.members.find(m => m.email === userEmail);
  if (!member) return false;

  // Chercher les permissions du rôle
  const rolePerms = channel.roles[member.role];
  if (!rolePerms) return false;

  return !!rolePerms[permission];
};

// Utilitaire pour obtenir le rôle d'un membre dans un salon
const getUserChannelRole = async (userEmail, channelName) => {
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return null;
  if (channel.owner === userEmail) return "Admin";
  const member = channel.members.find(m => m.email === userEmail);
  return member ? member.role : null;
};

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  // Stocker l'email de l'utilisateur connecté
  let userEmail = null;

  // Authentifier l'utilisateur
  socket.on("authenticate", async (email) => {
    userEmail = email;
    if (email) {
      // Mettre à jour le statut en ligne
      await User.findOneAndUpdate({ email }, { status: "online" });
      socket.broadcast.emit("user_status_changed", { email, status: "online" });
    }
  });

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

  // Écouter la suppression de messages
  socket.on("message_deleted", async (data) => {
    // data : { messageId, channel }
    if (!data || !data.messageId || !data.channel) return;
    io.to(data.channel).emit("message_deleted", { messageId: data.messageId });
  });

  // Mise à jour du statut utilisateur
  socket.on("update_status", async (status) => {
    if (!userEmail) return;
    await User.findOneAndUpdate({ email: userEmail }, { status });
    socket.broadcast.emit("user_status_changed", { email: userEmail, status });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
    if (userEmail) {
      // Mettre à jour le statut hors ligne
      User.findOneAndUpdate({ email: userEmail }, { status: "offline" }).then(() => {
        socket.broadcast.emit("user_status_changed", { email: userEmail, status: "offline" });
      });
    }
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

// Route : mise à jour du profil utilisateur (avatar, bio, status)
app.post("/auth/profile", async (req, res) => {
  const { email, avatar, bio, status } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email requis" });
  }
  const update = {};
  if (avatar) update.avatar = avatar;
  if (bio !== undefined) update.bio = bio;
  if (status !== undefined) update.status = status;
  const user = await User.findOneAndUpdate(
    { email },
    update,
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé" });
  }
  res.json({ id: user._id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, status: user.status, createdAt: user.createdAt });
});

// Route : récupérer un utilisateur par email (pour avatar à jour)
app.get("/auth/user", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requis" });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
  res.json({ name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, status: user.status, createdAt: user.createdAt });
});

// Route temporaire : corriger les avatars existants
app.post("/auth/fix-avatars", async (req, res) => {
  try {
    const users = await User.find({ avatar: { $regex: '^/uploads/' } });
    for (const user of users) {
      user.avatar = `http://localhost:4000${user.avatar}`;
      await user.save();
    }
    res.json({ message: `${users.length} avatars corrigés` });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la correction des avatars" });
  }
});

// Route : upload d'un avatar
app.post("/auth/upload-avatar", upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier trouvé" });
  }
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Clean up the uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting uploaded file:", err);
      }
    });
    return res.status(404).json({ error: "Utilisateur non trouvé" });
  }
  const avatarPath = `http://localhost:4000/uploads/avatars/${req.file.filename}`;
  user.avatar = avatarPath;
  await user.save();
  res.json({ message: "Avatar uploadé avec succès", avatar: user.avatar });
});

// Route : récupérer les permissions d'un salon (dynamique)
app.get("/channels/:channelName/permissions", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });

  // Rôle dynamique
  let userRole = null;
  if (channel.owner === userEmail) userRole = "Admin";
  else {
    const member = channel.members.find(m => m.email === userEmail);
    userRole = member ? member.role : null;
  }
  // Permissions dynamiques
  let userPermissions = userRole ? channel.roles[userRole] : {};
  const isOwner = channel.owner === userEmail;

  res.json({
    channel: channel.name,
    userRole,
    permissions: userPermissions,
    allRoles: channel.roles,
    isOwner,
    members: channel.members,
    channelIcon: channel.icon || "http://localhost:3000/icons/default.png"
  });
});

// Route : récupérer les membres d'un salon avec leurs informations complètes
app.get("/channels/:channelName/members", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });

  // Vérifier que l'utilisateur est membre du salon
  const isMember = channel.owner === userEmail || channel.members.find(m => m.email === userEmail);
  if (!isMember) return res.status(403).json({ error: "Accès refusé" });

  // Récupérer les informations complètes des membres
  const membersWithDetails = await Promise.all(
    channel.members.map(async (member) => {
      const user = await User.findOne({ email: member.email });
      return {
        email: member.email,
        role: member.role,
        name: user ? user.name : null,
        avatar: user ? user.avatar : null,
        status: user ? user.status : "offline"
      };
    })
  );

  // Ajouter le propriétaire s'il n'est pas déjà dans la liste des membres
  const ownerUser = await User.findOne({ email: channel.owner });
  const ownerMember = {
    email: channel.owner,
    role: "Admin",
    name: ownerUser ? ownerUser.name : null,
    avatar: ownerUser ? ownerUser.avatar : null,
    status: ownerUser ? ownerUser.status : "offline"
  };

  // S'assurer que le propriétaire est dans la liste
  const allMembers = membersWithDetails.some(m => m.email === channel.owner) 
    ? membersWithDetails 
    : [ownerMember, ...membersWithDetails];

  res.json({ members: allMembers });
});

// Route : créer un rôle
app.post("/channels/:channelName/roles", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail, roleName, permissions } = req.body;
  if (!userEmail || !roleName || !permissions) return res.status(400).json({ error: "Champs requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut créer un rôle" });
  if (channel.roles[roleName]) return res.status(409).json({ error: "Ce rôle existe déjà" });
  channel.roles[roleName] = permissions;
  await channel.save();
  res.json(channel.roles);
});

// Route : modifier un rôle
app.put("/channels/:channelName/roles/:roleName", async (req, res) => {
  const { channelName, roleName } = req.params;
  const { userEmail, permissions } = req.body;
  if (!userEmail || !permissions) return res.status(400).json({ error: "Champs requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut modifier un rôle" });
  if (!channel.roles[roleName]) return res.status(404).json({ error: "Rôle non trouvé" });
  channel.roles[roleName] = permissions;
  await channel.save();
  res.json(channel.roles);
});

// Route : supprimer un rôle
app.delete("/channels/:channelName/roles/:roleName", async (req, res) => {
  const { channelName, roleName } = req.params;
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut supprimer un rôle" });
  if (!channel.roles[roleName]) return res.status(404).json({ error: "Rôle non trouvé" });
  // Ne pas supprimer les rôles de base
  if (["Admin", "Modérateur", "Utilisateur"].includes(roleName)) return res.status(403).json({ error: "Impossible de supprimer un rôle de base" });
  delete channel.roles[roleName];
  // Mettre à jour les membres qui avaient ce rôle
  channel.members = channel.members.map(m => m.role === roleName ? { ...m, role: "Utilisateur" } : m);
  await channel.save();
  res.json(channel.roles);
});

// Route : ajouter un membre
app.post("/channels/:channelName/members", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail, memberEmail, role } = req.body;
  if (!userEmail || !memberEmail) return res.status(400).json({ error: "Champs requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut ajouter un membre" });
  if (channel.members.find(m => m.email === memberEmail)) return res.status(409).json({ error: "Membre déjà présent" });
  const roleToAssign = role && channel.roles[role] ? role : "Utilisateur";
  channel.members.push({ email: memberEmail, role: roleToAssign });
  await channel.save();
  res.json(channel.members);
});

// Route : changer le rôle d'un membre
app.put("/channels/:channelName/members/:memberEmail", async (req, res) => {
  const { channelName, memberEmail } = req.params;
  const { userEmail, role } = req.body;
  if (!userEmail || !role) return res.status(400).json({ error: "Champs requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut changer le rôle d'un membre" });
  if (!channel.roles[role]) return res.status(404).json({ error: "Rôle non trouvé" });
  const member = channel.members.find(m => m.email === memberEmail);
  if (!member) return res.status(404).json({ error: "Membre non trouvé" });
  member.role = role;
  await channel.save();
  res.json(channel.members);
});

// Route : retirer un membre
app.delete("/channels/:channelName/members/:memberEmail", async (req, res) => {
  const { channelName, memberEmail } = req.params;
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut retirer un membre" });
  channel.members = channel.members.filter(m => m.email !== memberEmail);
  await channel.save();
  res.json(channel.members);
});

// Route : création d'un salon
app.post("/channels", async (req, res) => {
  const { name, description, createdBy } = req.body;
  if (!name) return res.status(400).json({ error: "Nom du salon requis" });
  if (!createdBy) return res.status(400).json({ error: "Créateur requis" });

  const exists = await Channel.findOne({ name });
  if (exists) return res.status(409).json({ error: "Ce nom de salon existe déjà" });

  // Initialisation des rôles par défaut
  const defaultRoles = {
    Admin: {
      canDeleteChannel: true,
      canManageUsers: true,
      canDeleteMessages: true,
      canBanUsers: true,
      canManageRoles: true
    },
    Modérateur: {
      canDeleteChannel: false,
      canManageUsers: true,
      canDeleteMessages: true,
      canBanUsers: false,
      canManageRoles: false
    },
    Utilisateur: {
      canDeleteChannel: false,
      canManageUsers: false,
      canDeleteMessages: false,
      canBanUsers: false,
      canManageRoles: false
    }
  };

  const channel = await Channel.create({
    name,
    description: description || "",
    owner: createdBy,
    roles: defaultRoles,
    members: [{ email: createdBy, role: "Admin" }],
  });
  res.status(201).json(channel);
});

// Route : liste des salons (visibles uniquement par les membres)
app.get("/channels", async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  const channels = await Channel.find({
    $or: [
      { owner: userEmail },
      { "members.email": userEmail }
    ]
  }).sort({ createdAt: 1 });
  res.json(channels.map(c => ({
    _id: c._id,
    name: c.name,
    description: c.description,
    owner: c.owner,
    createdAt: c.createdAt,
    icon: c.icon // <-- AJOUTER CECI
  })));
});

// Route : inviter un utilisateur dans un salon (par email ou pseudo)
app.post("/channels/:channelName/invite", async (req, res) => {
  const { channelName } = req.params;
  let { userEmail, inviteEmail, inviteName, role } = req.body;
  if (!userEmail || (!inviteEmail && !inviteName)) return res.status(400).json({ error: "Champs requis (inviteEmail ou inviteName)" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  // Seul le owner ou un membre avec la permission peut inviter
  if (channel.owner !== userEmail) {
    const member = channel.members.find(m => m.email === userEmail);
    if (!member) return res.status(403).json({ error: "Accès refusé" });
    const rolePerms = channel.roles[member.role];
    if (!rolePerms || !rolePerms.canManageUsers) return res.status(403).json({ error: "Permission refusée" });
  }
  // Si inviteName est fourni, chercher l'utilisateur
  if (!inviteEmail && inviteName) {
    const user = await User.findOne({ name: inviteName });
    if (!user) return res.status(404).json({ error: "Aucun utilisateur avec ce pseudo" });
    inviteEmail = user.email;
  }
  if (channel.members.find(m => m.email === inviteEmail)) return res.status(409).json({ error: "Membre déjà présent" });
  const roleToAssign = role && channel.roles[role] ? role : "Utilisateur";
  channel.members.push({ email: inviteEmail, role: roleToAssign });
  await channel.save();
  res.json(channel.members);
});

// Route : générer ou retourner le lien d’invitation d’un channel
app.get("/channels/:channelName/invite-link", async (req, res) => {
  const { channelName } = req.params;
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (!channel.inviteToken) {
    // Générer un token unique
    channel.inviteToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await channel.save();
  }
  const url = `http://localhost:3000/join/${channel.inviteToken}`;
  res.json({ inviteLink: url });
});

// Route : rejoindre un channel via un lien d’invitation
app.post("/channels/join/:inviteToken", async (req, res) => {
  const { inviteToken } = req.params;
  const { userEmail } = req.body;
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  const channel = await Channel.findOne({ inviteToken });
  if (!channel) return res.status(404).json({ error: "Lien d’invitation invalide" });
  if (channel.members.find(m => m.email === userEmail)) {
    return res.status(409).json({ error: "Déjà membre du salon" });
  }
  channel.members.push({ email: userEmail, role: "Utilisateur" });
  await channel.save();
  res.json({ message: "Ajouté au salon", channel: channel.name });
});

// Route : supprimer un salon (admin uniquement)
app.delete("/channels/:channelName", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut supprimer ce salon" });
  await Channel.deleteOne({ name: channelName });
  res.json({ message: "Salon supprimé" });
});

// Route : quitter un salon (pour un membre)
app.post("/channels/:channelName/leave", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail } = req.body;
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner === userEmail) return res.status(403).json({ error: "Le propriétaire ne peut pas quitter le salon. Supprimez-le à la place." });
  const before = channel.members.length;
  channel.members = channel.members.filter(m => m.email !== userEmail);
  if (channel.members.length === before) return res.status(404).json({ error: "Vous n’êtes pas membre de ce salon" });
  await channel.save();
  res.json({ message: "Vous avez quitté le salon" });
});

// Route : modifier le nom et l’icône d’un salon (admin uniquement)
app.patch("/channels/:channelName", (req, res, next) => {
  uploadChannelIcon.single('icon')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "L’icône est trop volumineuse (max 5 Mo)" });
      }
      if (err.message && err.message.includes('Seules les images')) {
        return res.status(400).json({ error: "Seuls les fichiers images sont autorisés" });
      }
      return res.status(400).json({ error: "Erreur lors de l’upload de l’icône" });
    }
    next();
  });
}, async (req, res) => {
  const { channelName } = req.params;
  const { userEmail, newName } = req.body;
  const iconFile = req.file;
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
  if (channel.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut modifier ce salon" });
  // Changement de nom
  if (newName && newName !== channel.name) {
    const exists = await Channel.findOne({ name: newName });
    if (exists) return res.status(409).json({ error: "Ce nom de salon existe déjà" });
    channel.name = newName;
  }
  // Changement d’icône
  if (iconFile) {
    channel.icon = `/uploads/channels/${iconFile.filename}`;
  }
  await channel.save();
  res.json({ message: "Salon mis à jour", channel });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Backend démarré sur le port ${PORT}`));
