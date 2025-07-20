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
import axios from "axios";
import { load } from "cheerio";

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

// Modèle Server (serveur) avec salons multiples
const serverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  owner: { type: String, required: true }, // email du propriétaire
  icon: { type: String, default: "/icons/default.png" }, // icône par défaut
  members: {
    type: [
      {
        email: { type: String, required: true },
        role: { type: String, required: true, default: "Utilisateur" }
      }
    ],
    default: []
  },
  inviteToken: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const ServerModel = mongoose.models.Server || mongoose.model("Server", serverSchema);

// Modèle Channel (salon) appartenant à un serveur
const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  type: { type: String, enum: ['text', 'voice'], default: 'text' },
  position: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  allowedRoles: [{ type: String }], // rôles autorisés si privé
  createdAt: { type: Date, default: Date.now },
});
const Channel = mongoose.models.Channel || mongoose.model("Channel", channelSchema);

// Modèle message enrichi avec réponses, réactions et édition
const messageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  content: { type: String, required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true }, // ID du salon
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true }, // ID du serveur
  timestamp: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // Message auquel on répond
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: String }], // emails des utilisateurs qui ont réagi
    count: { type: Number, default: 0 }
  }],
  isEdited: { type: Boolean, default: false }
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
      
      // Faire rejoindre automatiquement tous les salons auxquels l'utilisateur a accès
      const userChannels = await Channel.find({
        $or: [
          { owner: email },
          { "members.email": email }
        ]
      });
      
      console.log(`User ${email} has access to channels:`, userChannels.map(c => c.name));
      
      for (const channel of userChannels) {
        socket.join(channel.name);
        console.log(`User ${email} auto-joined channel: ${channel.name}`);
        
        // Notifier les autres membres du salon que l'utilisateur est en ligne
        socket.to(channel.name).emit("user_joined_channel", { 
          email, 
          status: "online",
          channel: channel.name 
        });
      }
      
      // Notifier tous les utilisateurs du changement de statut
      socket.broadcast.emit("user_status_changed", { email, status: "online" });
    }
  });

  // Rejoindre un salon
  socket.on("join_channel", async (data) => {
    const { channelId, serverId } = typeof data === 'string' ? { channelId: data } : data;
    if (!channelId || !serverId) return;
    
    const roomName = `channel_${channelId}`;
    console.log("User joining channel:", channelId, "in server:", serverId, "Socket ID:", socket.id);
    socket.join(roomName);
    console.log("User joined channel:", roomName, "Total clients in room:", io.sockets.adapter.rooms.get(roomName)?.size || 0);
    
    // Envoyer l'historique du salon (50 plus récents)
    const history = await Message.find({ channelId })
      .sort({ timestamp: -1 })
      .limit(50)
      .sort({ timestamp: 1 }); // Re-trier pour avoir l'ordre chronologique
    
    console.log("Messages trouvés en BDD pour", channelId, ":", history.length);
    
    const enrichedHistory = await Promise.all(history.map(async (msg) => {
      const user = await User.findOne({ name: msg.user });
      return {
        ...msg.toObject(),
        avatar: user?.avatar || "/avatars/avatar1.png"
      };
    }));
    
    // Vérifier s'il y a plus de messages
    const totalCount = await Message.countDocuments({ channelId });
    const hasMore = totalCount > 50;
    
    socket.emit("message_history", {
      messages: enrichedHistory,
      hasMore,
      totalCount,
      currentPage: 0
    });
    
    console.log("Historique envoyé:", enrichedHistory.length, "messages pour le salon:", channelId, "hasMore:", hasMore);
  });

  // Quitter un salon
  socket.on("leave_channel", (data) => {
    const { channelId } = typeof data === 'string' ? { channelId: data } : data;
    if (channelId) {
      const roomName = `channel_${channelId}`;
      socket.leave(roomName);
    }
  });

  // Demander l'historique des messages d'un salon
  socket.on("get_message_history", async (data) => {
    const { channelId, page = 0, limit = 50 } = typeof data === 'string' ? { channelId: data } : data;
    if (!channelId) return;
    console.log("Demande d'historique pour le salon:", channelId, "page:", page, "limit:", limit);
    
    try {
      const skip = page * limit;
      const history = await Message.find({ channelId })
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limit);
      
      console.log("Messages trouvés en BDD pour", channelId, ":", history.length, "skip:", skip);
      
      // Enrichir chaque message avec l'avatar de l'auteur
      const enrichedHistory = await Promise.all(history.map(async (msg) => {
        const user = await User.findOne({ name: msg.user });
        return {
          ...msg.toObject(),
          avatar: user?.avatar || "/avatars/avatar1.png"
        };
      }));
      
      // Vérifier s'il y a plus de messages
      const totalCount = await Message.countDocuments({ channelId });
      const hasMore = skip + limit < totalCount;
      
      socket.emit("message_history", {
        messages: enrichedHistory,
        hasMore,
        totalCount,
        currentPage: page
      });
      
      console.log("Historique envoyé:", enrichedHistory.length, "messages pour le salon:", channelId, "hasMore:", hasMore);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
    }
  });

  // Réception d'un message dans un salon
  socket.on("message", async (data) => {
    // data : { user, content, channelId, serverId, replyTo? }
    if (!data || !data.user || !data.content || !data.channelId || !data.serverId) return;
    console.log("Message reçu du client:", data);
    
    const roomName = `channel_${data.channelId}`;
    console.log("Nombre de clients dans la room", roomName, ":", io.sockets.adapter.rooms.get(roomName)?.size || 0);
    
    try {
      const messageData = { 
        user: data.user, 
        content: data.content, 
        channelId: data.channelId,
        serverId: data.serverId
      };
      
      // Ajouter replyTo si présent
      if (data.replyTo) {
        messageData.replyTo = data.replyTo;
        console.log("Message en réponse à:", data.replyTo);
      }
      
      const msg = await Message.create(messageData);
      console.log("✅ Message enregistré en BDD:", msg._id, "pour le salon:", data.channelId);
      
      // Enrichir le message avec l'avatar de l'auteur
      const user = await User.findOne({ name: data.user });
      const enrichedMsg = {
        ...msg.toObject(),
        avatar: user?.avatar || "/avatars/avatar1.png"
      };
      console.log("Broadcasting message to channel:", roomName);
      console.log("Clients in room:", io.sockets.adapter.rooms.get(roomName)?.size || 0);
      io.to(roomName).emit("message", enrichedMsg); // broadcast dans le salon
    } catch (error) {
      console.error("❌ Erreur lors de l'enregistrement du message:", error);
    }
  });

  // Écouter la suppression de messages
  socket.on("message_deleted", async (data) => {
    // data : { messageId, channel }
    if (!data || !data.messageId || !data.channel) return;
    
    try {
      const message = await Message.findById(data.messageId);
      if (!message) return;
      
      // Vérifier les permissions (propriétaire du message ou modérateur/admin)
      const canDelete = message.user === userEmail || await checkPermission(userEmail, data.channel, 'canDeleteMessages');
      if (!canDelete) return;
      
      await Message.findByIdAndDelete(data.messageId);
      io.to(data.channel).emit("message_deleted", { messageId: data.messageId });
    } catch (error) {
      console.error("Erreur lors de la suppression du message:", error);
    }
  });

  // Écouter l'édition de messages
  socket.on("message_edited", async (data) => {
    // data : { messageId, content, channel }
    if (!data || !data.messageId || !data.content || !data.channel) return;
    
    try {
      const message = await Message.findById(data.messageId);
      if (!message) {
        console.log("Message non trouvé:", data.messageId);
        return;
      }
      
      // Vérifier que l'utilisateur est bien l'auteur du message
      // Le message stocke le nom d'utilisateur, pas l'email
      const user = await User.findOne({ email: userEmail });
      if (!user || message.user !== user.name) {
        console.log("Utilisateur non autorisé à modifier ce message:", userEmail, "vs", message.user);
        return;
      }
      
      console.log("Modification du message:", data.messageId, "par", userEmail);
      
      message.content = data.content;
      message.editedAt = new Date();
      message.isEdited = true;
      await message.save();
      
      // Enrichir le message avec l'avatar
      const enrichedMessage = {
        ...message.toObject(),
        avatar: user?.avatar || "/avatars/avatar1.png"
      };
      
      console.log("Message mis à jour, envoi aux clients du salon:", data.channel);
      io.to(data.channel).emit("message_updated", enrichedMessage);
    } catch (error) {
      console.error("Erreur lors de l'édition du message:", error);
    }
  });

  // Écouter les réactions aux messages
  socket.on("message_reaction", async (data) => {
    // data : { messageId, emoji, channel, action: 'add' | 'remove' }
    if (!data || !data.messageId || !data.emoji || !data.channel) return;
    
    try {
      const message = await Message.findById(data.messageId);
      if (!message) return;
      
      const action = data.action || 'add';
      
      if (action === 'add') {
        // Ajouter la réaction
        let reaction = message.reactions.find(r => r.emoji === data.emoji);
        if (reaction) {
          if (!reaction.users.includes(userEmail)) {
            reaction.users.push(userEmail);
            reaction.count = reaction.users.length;
          }
        } else {
          message.reactions.push({
            emoji: data.emoji,
            users: [userEmail],
            count: 1
          });
        }
      } else if (action === 'remove') {
        // Retirer la réaction
        const reaction = message.reactions.find(r => r.emoji === data.emoji);
        if (reaction) {
          reaction.users = reaction.users.filter(email => email !== userEmail);
          reaction.count = reaction.users.length;
          
          // Supprimer la réaction si plus personne ne l'utilise
          if (reaction.count === 0) {
            message.reactions = message.reactions.filter(r => r.emoji !== data.emoji);
          }
        }
      }
      
      await message.save();
      
      // Enrichir le message avec l'avatar
      const user = await User.findOne({ name: message.user });
      const enrichedMessage = {
        ...message.toObject(),
        avatar: user?.avatar || "/avatars/avatar1.png"
      };
      
      io.to(data.channel).emit("message_updated", enrichedMessage);
    } catch (error) {
      console.error("Erreur lors de la gestion de la réaction:", error);
    }
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
      User.findOneAndUpdate({ email: userEmail }, { status: "offline" }).then(async () => {
        // Notifier tous les utilisateurs du changement de statut
        socket.broadcast.emit("user_status_changed", { email: userEmail, status: "offline" });
        
        // Notifier les salons que l'utilisateur a quitté
        const userChannels = await Channel.find({
          $or: [
            { owner: userEmail },
            { "members.email": userEmail }
          ]
        });
        
        for (const channel of userChannels) {
          socket.to(channel.name).emit("user_left_channel", { 
            email: userEmail, 
            status: "offline",
            channel: channel.name 
          });
        }
      });
    }
  });
});

app.get("/", (req, res) => res.send("API en ligne 🚀"));

// Routes pour les serveurs
app.post("/servers", async (req, res) => {
  const { name, description, ownerEmail } = req.body;
  if (!name || !ownerEmail) {
    return res.status(400).json({ error: "Nom et propriétaire requis" });
  }

  try {
    const server = await ServerModel.create({
      name,
      description: description || "",
      owner: ownerEmail,
      members: [{ email: ownerEmail, role: "Admin" }]
    });

    // Créer automatiquement un salon général
    await Channel.create({
      name: "général",
      description: "Salon général du serveur",
      serverId: server._id,
      position: 0
    });

    res.status(201).json(server);
  } catch (error) {
    console.error("Erreur lors de la création du serveur:", error);
    res.status(500).json({ error: "Erreur lors de la création du serveur" });
  }
});

// Récupérer les serveurs d'un utilisateur
app.get("/servers", async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).json({ error: "Email utilisateur requis" });
  }

  try {
    const servers = await ServerModel.find({
      $or: [
        { owner: userEmail },
        { "members.email": userEmail }
      ]
    }).sort({ createdAt: 1 });

    res.json(servers);
  } catch (error) {
    console.error("Erreur lors de la récupération des serveurs:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des serveurs" });
  }
});

// Récupérer un serveur avec ses salons
app.get("/servers/:serverId", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: "Email utilisateur requis" });
  }

  try {
    const server = await ServerModel.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: "Serveur non trouvé" });
    }

    // Vérifier que l'utilisateur est membre
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    // Récupérer les salons du serveur
    const channels = await Channel.find({ serverId }).sort({ position: 1, createdAt: 1 });

    res.json({
      server,
      channels
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du serveur:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du serveur" });
  }
});

// Route : récupérer les salons d'un serveur (avec filtrage des canaux privés basé sur le serveur)
app.get("/servers/:serverId/channels", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    // Déterminer le rôle de l'utilisateur dans le serveur
    let userRole = "Utilisateur";
    if (server.owner === userEmail) {
      userRole = "Admin";
    } else {
      const member = server.members.find(m => m.email === userEmail);
      if (member) {
        userRole = member.role;
      }
    }
    
    // Récupérer tous les canaux du serveur
    const allChannels = await Channel.find({ serverId }).sort({ position: 1 });
    
    // Filtrer les canaux privés selon le rôle dans le serveur
    const accessibleChannels = allChannels.filter(channel => {
      if (!channel.isPrivate) {
        return true; // Canal public, accessible à tous les membres du serveur
      }
      
      // Canal privé, vérifier si le rôle de l'utilisateur dans le serveur est autorisé
      return channel.allowedRoles.includes(userRole);
    });
    
    res.json(accessibleChannels);
  } catch (error) {
    console.error("Erreur lors de la récupération des salons:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des salons" });
  }
});

// Créer un salon dans un serveur
app.post("/servers/:serverId/channels", async (req, res) => {
  const { serverId } = req.params;
  const { name, description, type = "text", userEmail, isPrivate = false, allowedRoles = [] } = req.body;

  if (!name || !userEmail) {
    return res.status(400).json({ error: "Nom et utilisateur requis" });
  }

  try {
    const server = await ServerModel.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: "Serveur non trouvé" });
    }

    // Vérifier les permissions basées sur le serveur (propriétaire ou admin/modo)
    const isOwner = server.owner === userEmail;
    const member = server.members.find(m => m.email === userEmail);
    const canCreate = isOwner || (member && (member.role === "Admin" || member.role === "Modérateur"));

    if (!canCreate) {
      return res.status(403).json({ error: "Permission refusée - Seuls les admins et modérateurs peuvent créer des canaux" });
    }

    // Vérifier les permissions pour créer un canal privé (basées sur le serveur)
    if (isPrivate && !isOwner && member?.role !== "Admin") {
      return res.status(403).json({ error: "Seuls les admins du serveur peuvent créer des canaux privés" });
    }

    // Vérifier que le nom n'existe pas déjà dans ce serveur
    const existingChannel = await Channel.findOne({ serverId, name });
    if (existingChannel) {
      return res.status(409).json({ error: "Un salon avec ce nom existe déjà" });
    }

    // Trouver la position la plus élevée
    const lastChannel = await Channel.findOne({ serverId }).sort({ position: -1 });
    const position = lastChannel ? lastChannel.position + 1 : 0;

    const channel = await Channel.create({
      name,
      description: description || "",
      serverId,
      type,
      position,
      isPrivate,
      allowedRoles: isPrivate ? allowedRoles : []
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error("Erreur lors de la création du salon:", error);
    res.status(500).json({ error: "Erreur lors de la création du salon" });
  }
});

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

// Route : récupérer les membres connectés d'un salon
app.get("/channels/:channelName/online-members", async (req, res) => {
  const { channelName } = req.params;
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  const channel = await Channel.findOne({ name: channelName });
  if (!channel) return res.status(404).json({ error: "Salon non trouvé" });

  // Vérifier que l'utilisateur est membre du salon
  const isMember = channel.owner === userEmail || channel.members.find(m => m.email === userEmail);
  if (!isMember) return res.status(403).json({ error: "Accès refusé" });

  // Récupérer les utilisateurs en ligne dans ce salon
  const onlineUsers = await User.find({ 
    status: "online",
    $or: [
      { email: channel.owner },
      { email: { $in: channel.members.map(m => m.email) } }
    ]
  });

  // Formater les données des utilisateurs en ligne
  const onlineMembers = onlineUsers.map(user => {
    const member = channel.members.find(m => m.email === user.email);
    const role = user.email === channel.owner ? "Admin" : (member ? member.role : "Utilisateur");
    
    return {
      email: user.email,
      role: role,
      name: user.name,
      avatar: user.avatar,
      status: user.status
    };
  });

  // Calculer le nombre total de membres (propriétaire + membres)
  const totalMembers = channel.members.some(m => m.email === channel.owner) 
    ? channel.members.length 
    : channel.members.length + 1;

  res.json({ 
    onlineMembers,
    totalOnline: onlineMembers.length,
    totalMembers: totalMembers
  });
});

// Route : créer un rôle dans un serveur
app.post("/servers/:serverId/roles", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail, roleName, permissions } = req.body;
  
  if (!userEmail || !roleName || !permissions) return res.status(400).json({ error: "Champs requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire peut créer des rôles
    if (server.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut créer un rôle" });
    
    // Vérifier si le rôle existe déjà
    if (server.roles && server.roles[roleName]) return res.status(409).json({ error: "Ce rôle existe déjà" });
    
    // Initialiser les rôles si nécessaire
    if (!server.roles) server.roles = {};
    
    server.roles[roleName] = permissions;
    await server.save();
    
    res.json(server.roles);
  } catch (error) {
    console.error("Erreur lors de la création du rôle:", error);
    res.status(500).json({ error: "Erreur lors de la création du rôle" });
  }
});

// Route : modifier un rôle dans un serveur
app.put("/servers/:serverId/roles/:roleName", async (req, res) => {
  const { serverId, roleName } = req.params;
  const { userEmail, permissions } = req.body;
  
  if (!userEmail || !permissions) return res.status(400).json({ error: "Champs requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire peut modifier des rôles
    if (server.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut modifier un rôle" });
    
    if (!server.roles || !server.roles[roleName]) return res.status(404).json({ error: "Rôle non trouvé" });
    
    server.roles[roleName] = permissions;
    await server.save();
    
    res.json(server.roles);
  } catch (error) {
    console.error("Erreur lors de la modification du rôle:", error);
    res.status(500).json({ error: "Erreur lors de la modification du rôle" });
  }
});

// Route : supprimer un rôle dans un serveur
app.delete("/servers/:serverId/roles/:roleName", async (req, res) => {
  const { serverId, roleName } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire peut supprimer des rôles
    if (server.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut supprimer un rôle" });
    
    if (!server.roles || !server.roles[roleName]) return res.status(404).json({ error: "Rôle non trouvé" });
    
    // Ne pas supprimer les rôles de base
    if (["Admin", "Modérateur", "Utilisateur"].includes(roleName)) return res.status(403).json({ error: "Impossible de supprimer un rôle de base" });
    
    delete server.roles[roleName];
    
    // Mettre à jour les membres qui avaient ce rôle
    server.members = server.members.map(m => m.role === roleName ? { ...m, role: "Utilisateur" } : m);
    await server.save();
    
    res.json(server.roles);
  } catch (error) {
    console.error("Erreur lors de la suppression du rôle:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du rôle" });
  }
});

// Route : changer le rôle d'un membre dans un serveur
app.put("/servers/:serverId/members/:memberEmail", async (req, res) => {
  const { serverId, memberEmail } = req.params;
  const { userEmail, role } = req.body;
  
  if (!userEmail || !role) return res.status(400).json({ error: "Champs requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire peut changer les rôles
    if (server.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut changer le rôle d'un membre" });
    
    // Vérifier si le rôle existe
    if (server.roles && !server.roles[role]) return res.status(404).json({ error: "Rôle non trouvé" });
    
    const member = server.members.find(m => m.email === memberEmail);
    if (!member) return res.status(404).json({ error: "Membre non trouvé" });
    
    member.role = role;
    await server.save();
    
    res.json(server.members);
  } catch (error) {
    console.error("Erreur lors du changement de rôle:", error);
    res.status(500).json({ error: "Erreur lors du changement de rôle" });
  }
});

// Route : retirer un membre du serveur
app.delete("/servers/:serverId/members/:memberEmail", async (req, res) => {
  const { serverId, memberEmail } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire peut retirer des membres
    if (server.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut retirer un membre" });
    
    // Ne pas pouvoir se retirer soi-même
    if (memberEmail === userEmail) return res.status(403).json({ error: "Vous ne pouvez pas vous retirer vous-même" });
    
    server.members = server.members.filter(m => m.email !== memberEmail);
    await server.save();
    
    res.json({ message: "Membre retiré avec succès" });
  } catch (error) {
    console.error("Erreur lors du retrait du membre:", error);
    res.status(500).json({ error: "Erreur lors du retrait du membre" });
  }
});

// Route : inviter un utilisateur dans un serveur
app.post("/servers/:serverId/invite", async (req, res) => {
  const { serverId } = req.params;
  let { userEmail, inviteEmail, inviteName, role } = req.body;
  
  if (!userEmail || (!inviteEmail && !inviteName)) return res.status(400).json({ error: "Champs requis (inviteEmail ou inviteName)" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire ou un admin peut inviter
    if (server.owner !== userEmail) {
      const member = server.members.find(m => m.email === userEmail);
      if (!member || member.role !== "Admin") return res.status(403).json({ error: "Accès refusé" });
    }
    
    // Si inviteName est fourni, chercher l'utilisateur
    if (!inviteEmail && inviteName) {
      const user = await User.findOne({ name: inviteName });
      if (!user) return res.status(404).json({ error: "Aucun utilisateur avec ce pseudo" });
      inviteEmail = user.email;
    }
    
    // Vérifier si l'utilisateur est déjà membre
    if (server.owner === inviteEmail || server.members.find(m => m.email === inviteEmail)) {
      return res.status(409).json({ error: "Utilisateur déjà membre" });
    }
    
    const roleToAssign = role && server.roles && server.roles[role] ? role : "Utilisateur";
    server.members.push({ email: inviteEmail, role: roleToAssign });
    await server.save();
    
    res.json(server.members);
  } catch (error) {
    console.error("Erreur lors de l'invitation:", error);
    res.status(500).json({ error: "Erreur lors de l'invitation" });
  }
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

// Route : récupérer les membres en ligne d'un serveur
app.get("/servers/:serverId/online-members", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    // Récupérer tous les membres du serveur avec leur statut (éviter les doublons)
    const allMembers = [];
    
    // Ajouter le propriétaire
    allMembers.push({ email: server.owner, role: "Admin" });
    
    // Ajouter les autres membres (en évitant le propriétaire s'il est déjà dans la liste)
    server.members.forEach(member => {
      if (member.email !== server.owner) {
        allMembers.push(member);
      }
    });
    
    // Récupérer les informations utilisateur pour chaque membre
    const membersWithDetails = await Promise.all(
      allMembers.map(async (member) => {
        const user = await User.findOne({ email: member.email });
        return {
          email: member.email,
          name: user?.name || member.email.split('@')[0],
          avatar: user?.avatar || "/avatars/avatar1.png",
          role: member.role,
          status: user?.status || "offline"
        };
      })
    );
    
    const onlineMembers = membersWithDetails.filter(m => m.status === "online");
    const totalOnline = onlineMembers.length;
    const totalMembers = membersWithDetails.length;
    
    res.json({
      onlineMembers: membersWithDetails, // Tous les membres avec leur statut
      totalOnline,
      totalMembers
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des membres:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des membres" });
  }
});

// Route : récupérer les permissions d'un utilisateur dans un serveur
app.get("/servers/:serverId/permissions", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    // Déterminer le rôle de l'utilisateur
    let userRole = "Utilisateur";
    if (server.owner === userEmail) {
      userRole = "Admin";
    } else {
      const member = server.members.find(m => m.email === userEmail);
      if (member) {
        userRole = member.role;
      }
    }
    
    // Définir les permissions selon le rôle
    const permissions = {
      canSendMessages: true,
      canDeleteMessages: userRole === "Admin" || userRole === "Modérateur",
      canEditMessages: true, // L'utilisateur peut toujours éditer ses propres messages
      canManageChannels: userRole === "Admin",
      canManageMembers: userRole === "Admin" || userRole === "Modérateur",
      canViewMembers: true,
      canCreatePrivateChannels: userRole === "Admin" || userRole === "Modérateur",
      canManageRoles: userRole === "Admin",
      canInviteUsers: userRole === "Admin" || userRole === "Modérateur"
    };
    
    res.json({
      permissions,
      userRole,
      serverName: server.name,
      isServerAdmin: userRole === "Admin" || userRole === "Modérateur",
      isOwner: server.owner === userEmail
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des permissions" });
  }
});

// Route : récupérer les permissions d'un utilisateur dans un salon (basées sur le serveur)
app.get("/channels/:channelId/permissions", async (req, res) => {
  const { channelId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
    
    // Vérifier que l'utilisateur a accès au serveur
    const server = await ServerModel.findById(channel.serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    // Vérifier l'accès au canal privé
    if (channel.isPrivate) {
      const userRole = server.owner === userEmail ? "Admin" : 
        server.members.find(m => m.email === userEmail)?.role || "Utilisateur";
      
      if (!channel.allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "Accès refusé à ce canal privé" });
      }
    }
    
    // Déterminer le rôle de l'utilisateur dans le serveur
    let userRole = "Utilisateur";
    if (server.owner === userEmail) {
      userRole = "Admin";
    } else {
      const member = server.members.find(m => m.email === userEmail);
      if (member) {
        userRole = member.role;
      }
    }
    
    // Les permissions sont basées sur le serveur, pas sur le canal
    const permissions = {
      canSendMessages: true,
      canDeleteMessages: userRole === "Admin" || userRole === "Modérateur",
      canEditMessages: true, // L'utilisateur peut toujours éditer ses propres messages
      canManageChannels: userRole === "Admin",
      canManageMembers: userRole === "Admin" || userRole === "Modérateur",
      canViewMembers: true
    };
    
    res.json({
      permissions,
      userRole,
      channelName: channel.name,
      isChannelAdmin: userRole === "Admin" || userRole === "Modérateur",
      isOwner: server.owner === userEmail,
      isPrivate: channel.isPrivate,
      allowedRoles: channel.allowedRoles
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des permissions" });
  }
});

// Route : récupérer les membres d'un serveur
app.get("/servers/:serverId/members", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    // Récupérer tous les membres du serveur (éviter les doublons)
    const allMembers = [];
    
    // Ajouter le propriétaire
    allMembers.push({ email: server.owner, role: "Admin" });
    
    // Ajouter les autres membres (en évitant le propriétaire s'il est déjà dans la liste)
    server.members.forEach(member => {
      if (member.email !== server.owner) {
        allMembers.push(member);
      }
    });
    
    // Récupérer les informations utilisateur pour chaque membre
    const membersWithDetails = await Promise.all(
      allMembers.map(async (member) => {
        const user = await User.findOne({ email: member.email });
        return {
          email: member.email,
          name: user?.name || member.email.split('@')[0],
          avatar: user?.avatar || "/avatars/avatar1.png",
          role: member.role,
          status: user?.status || "offline"
        };
      })
    );
    
    res.json({
      members: membersWithDetails,
      totalMembers: membersWithDetails.length
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des membres:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des membres" });
  }
});

// Route : récupérer les membres d'un salon
app.get("/channels/:channelId/members", async (req, res) => {
  const { channelId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
    
    // Vérifier que l'utilisateur a accès au serveur
    const server = await ServerModel.findById(channel.serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    // Récupérer tous les membres du serveur (éviter les doublons)
    const allMembers = [];
    
    // Ajouter le propriétaire
    allMembers.push({ email: server.owner, role: "Admin" });
    
    // Ajouter les autres membres (en évitant le propriétaire s'il est déjà dans la liste)
    server.members.forEach(member => {
      if (member.email !== server.owner) {
        allMembers.push(member);
      }
    });
    
    // Récupérer les informations utilisateur pour chaque membre
    const membersWithDetails = await Promise.all(
      allMembers.map(async (member) => {
        const user = await User.findOne({ email: member.email });
        return {
          email: member.email,
          name: user?.name || member.email.split('@')[0],
          avatar: user?.avatar || "/avatars/avatar1.png",
          role: member.role,
          status: user?.status || "offline"
        };
      })
    );
    
    res.json({
      members: membersWithDetails,
      totalMembers: membersWithDetails.length
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des membres:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des membres" });
  }
});

// Route : récupérer les messages d'un salon
app.get("/channels/:channelId/messages", async (req, res) => {
  const { channelId } = req.params;
  const { userEmail, page = 0, limit = 50 } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email utilisateur requis" });
  
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Salon non trouvé" });
    
    // Vérifier que l'utilisateur a accès au serveur
    const server = await ServerModel.findById(channel.serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    const isMember = server.owner === userEmail || server.members.some(m => m.email === userEmail);
    if (!isMember) return res.status(403).json({ error: "Accès refusé" });
    
    const skip = parseInt(page) * parseInt(limit);
    const messages = await Message.find({ channelId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ timestamp: 1 });
    
    const totalCount = await Message.countDocuments({ channelId });
    const hasMore = skip + parseInt(limit) < totalCount;
    
    res.json({
      messages,
      hasMore,
      totalCount,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des messages" });
  }
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
// Route : générer ou retourner le lien d'invitation d'un serveur
app.get("/servers/:serverId/invite-link", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Vérifier les permissions
    if (server.owner !== userEmail) {
      const member = server.members.find(m => m.email === userEmail);
      if (!member || member.role !== "Admin") return res.status(403).json({ error: "Accès refusé" });
    }
    
    if (!server.inviteToken) {
      // Générer un token unique
      server.inviteToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      await server.save();
    }
    
    const url = `http://localhost:3000/join/${server.inviteToken}`;
    res.json({ inviteLink: url });
  } catch (error) {
    console.error("Erreur lors de la génération du lien d'invitation:", error);
    res.status(500).json({ error: "Erreur lors de la génération du lien d'invitation" });
  }
});

// Route : supprimer un serveur
app.delete("/servers/:serverId", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Seul le propriétaire peut supprimer le serveur
    if (server.owner !== userEmail) return res.status(403).json({ error: "Seul le propriétaire peut supprimer le serveur" });
    
    // Supprimer tous les canaux du serveur
    await Channel.deleteMany({ serverId });
    
    // Supprimer tous les messages du serveur
    await Message.deleteMany({ serverId });
    
    // Supprimer le serveur
    await ServerModel.findByIdAndDelete(serverId);
    
    res.json({ message: "Serveur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du serveur:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du serveur" });
  }
});

// Route : quitter un serveur
app.post("/servers/:serverId/leave", async (req, res) => {
  const { serverId } = req.params;
  const { userEmail } = req.query;
  
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  
  try {
    const server = await ServerModel.findById(serverId);
    if (!server) return res.status(404).json({ error: "Serveur non trouvé" });
    
    // Le propriétaire ne peut pas quitter son propre serveur
    if (server.owner === userEmail) return res.status(403).json({ error: "Le propriétaire ne peut pas quitter son propre serveur" });
    
    // Retirer l'utilisateur de la liste des membres
    server.members = server.members.filter(m => m.email !== userEmail);
    await server.save();
    
    res.json({ message: "Vous avez quitté le serveur avec succès" });
  } catch (error) {
    console.error("Erreur lors de la sortie du serveur:", error);
    res.status(500).json({ error: "Erreur lors de la sortie du serveur" });
  }
});

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

// Route : récupérer les métadonnées OpenGraph d'un lien
app.get("/link-preview", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL requise" });
  }

  try {
    // Vérifier que l'URL est valide
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: "URL invalide" });
    }

    // Récupérer le contenu de la page
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = load(html);

    // Extraire les métadonnées OpenGraph
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('title').text() || 
                  $('meta[name="title"]').attr('content') || '';

    const description = $('meta[property="og:description"]').attr('content') || 
                       $('meta[name="description"]').attr('content') || '';

    const image = $('meta[property="og:image"]').attr('content') || 
                  $('meta[property="twitter:image"]').attr('content') || '';

    const siteName = $('meta[property="og:site_name"]').attr('content') || 
                     urlObj.hostname;

    // Convertir les URLs relatives en absolues
    const absoluteImage = image ? new URL(image, url).href : '';
    const absoluteSiteName = siteName.startsWith('http') ? new URL(siteName, url).hostname : siteName;

    res.json({
      title: title.trim(),
      description: description.trim(),
      image: absoluteImage,
      url: url,
      siteName: absoluteSiteName
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la preview:', error);
    res.status(500).json({ error: "Impossible de récupérer les métadonnées du lien" });
  }
});

// Route : rejoindre un serveur via un lien d'invitation
app.post("/servers/join/:inviteToken", async (req, res) => {
  const { inviteToken } = req.params;
  const { userEmail } = req.body;
  
  if (!userEmail) return res.status(400).json({ error: "Email requis" });
  
  try {
    const server = await ServerModel.findOne({ inviteToken });
    if (!server) return res.status(404).json({ error: "Lien d'invitation invalide" });
    
    // Vérifier si l'utilisateur est déjà membre
    if (server.owner === userEmail || server.members.find(m => m.email === userEmail)) {
      return res.status(409).json({ error: "Déjà membre du serveur" });
    }
    
    // Ajouter l'utilisateur comme membre avec le rôle par défaut
    server.members.push({ email: userEmail, role: "Utilisateur" });
    await server.save();
    
    res.json({ message: "Ajouté au serveur", server: server.name });
  } catch (error) {
    console.error("Erreur lors de la jointure du serveur:", error);
    res.status(500).json({ error: "Erreur lors de la jointure du serveur" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Backend démarré sur le port ${PORT}`));
