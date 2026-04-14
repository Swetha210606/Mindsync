const express = require("express");
const mongoose = require("mongoose");
mongoose.set('bufferCommands', false);
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// ─── DATABASE ─────────────────────────────────────────────────────
mongoose.connect("mongodb://localhost:27017/mindsync", {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  family: 4
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err.message));

// ─── MODELS ───────────────────────────────────────────────────────
const User = require("./models/User");
const Booking = require("./models/Booking");
const Mood = require("./models/Mood");

// ─── ROUTES ───────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const moodRoutes = require("./routes/moodRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const groupRoutes = require("./routes/groupRoutes");
const chatRoutes = require("./routes/chatRoutes");
const ratingRoutes = require("./routes/ratingRoutes");

// Add with other app.use statements
app.use("/api", ratingRoutes);
app.use("/api", chatRoutes);
app.use("/api", authRoutes);
app.use("/api", moodRoutes);
app.use("/api", bookingRoutes);
app.use("/api", groupRoutes);

// ─── ADMIN ROUTES (Fixed: now under /api/admin/) ──────────────────

// Get all pending therapists/interns (not verified)
app.get("/api/admin/pending", async (req, res) => {
  try {
    const pending = await User.find({ 
      role: { $in: ["therapist", "intern"] },
      isVerified: false 
    }).select("-password").sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    console.error("Pending error:", err.message);
    res.status(500).json({ message: "Error fetching pending users" });
  }
});

// Get all users
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Users error:", err.message);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get all bookings
app.get("/api/admin/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('patientId', 'name email')
      .populate('therapistId', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error("Bookings error:", err.message);
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

// Verify therapist/intern
app.put("/api/admin/verify/:userId", async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: true },
      { new: true }
    ).select("-password");
    if (!result) return res.status(404).json({ message: "User not found" });
    console.log("✅ Verified:", result.name);
    res.json({ message: "Verified successfully", user: result });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Reject (set isVerified to false)
app.put("/api/admin/reject/:userId", async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: false },
      { new: true }
    ).select("-password");
    if (!result) return res.status(404).json({ message: "User not found" });
    console.log("⚠️ Rejected:", result.name);
    res.json({ message: "Rejected successfully", user: result });
  } catch (err) {
    console.error("Reject error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Delete user
app.delete("/api/admin/user/:userId", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.userId);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    console.log("🗑️ Deleted:", deleted.name);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── CHAT HISTORY ROUTES (New Feature) ────────────────────────────

// Save chat message
app.post("/api/chat/save", async (req, res) => {
  try {
    const { userId, message, response, timestamp } = req.body;
    
    // Update user's chat history
    await User.findByIdAndUpdate(
      userId,
      { 
        $push: { 
          chatHistory: { 
            message, 
            response, 
            timestamp: timestamp || new Date() 
          } 
        } 
      }
    );
    
    res.json({ success: true, message: "Chat saved" });
  } catch (err) {
    console.error("Chat save error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get user's chat history
app.get("/api/chat/history/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('chatHistory');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.chatHistory || []);
  } catch (err) {
    console.error("Chat history error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Clear chat history
app.delete("/api/chat/clear/:userId", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { chatHistory: [] });
    res.json({ success: true, message: "Chat history cleared" });
  } catch (err) {
    console.error("Clear chat error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── CRISIS DETECTION (New Feature) ───────────────────────────────
const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end my life", "want to die", 
  "better off dead", "no reason to live", "self harm", 
  "cut myself", "overdose", "hang myself"
];

app.post("/api/chat/detect-crisis", async (req, res) => {
  try {
    const { message, userId } = req.body;
    const lowerMsg = message.toLowerCase();
    
    const isCrisis = CRISIS_KEYWORDS.some(keyword => lowerMsg.includes(keyword));
    
    if (isCrisis && userId) {
      // Log crisis alert
      console.log("🚨 CRISIS DETECTED for user:", userId);
      
      // Update user with crisis flag
      await User.findByIdAndUpdate(userId, { 
        crisisFlag: true,
        lastCrisisAt: new Date(),
        $push: { crisisLogs: { message, timestamp: new Date() } }
      });
    }
    
    res.json({ 
      isCrisis,
      helplineNumbers: isCrisis ? [
        { name: "National Suicide Prevention", number: "988" },
        { name: "Crisis Text Line", number: "741741" },
        { name: "Emergency", number: "911" }
      ] : []
    });
  } catch (err) {
    console.error("Crisis detection error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── TEST ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ MindSync API is Running");
});

// ─── VIDEO CALL SIGNALING ──────────────────────────────────────────
const rooms = {};

const cleanRoom = (roomId) => {
  if (!rooms[roomId]) return;
  rooms[roomId] = rooms[roomId].filter(u => {
    const sock = io.sockets.sockets.get(u.socketId);
    return sock && sock.connected;
  });
  if (rooms[roomId].length === 0) delete rooms[roomId];
};

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    cleanRoom(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];

    const alreadyIn = rooms[roomId].find(u => u.socketId === socket.id);
    if (alreadyIn) return;

    if (rooms[roomId].length >= 2) {
      socket.emit("room-full");
      return;
    }

    socket.join(roomId);
    rooms[roomId].push({ socketId: socket.id, name: userName });
    console.log(`👥 ${userName} joined room ${roomId} (${rooms[roomId].length}/2)`);

    const existingUsers = rooms[roomId].filter(u => u.socketId !== socket.id);
    socket.emit("room-users", existingUsers);
    socket.to(roomId).emit("user-joined", { userId: socket.id, userName });
  });

  socket.on("offer", ({ offer, roomId }) => {
    console.log("📡 Offer from", socket.id);
    socket.to(roomId).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    console.log("📡 Answer from", socket.id);
    socket.to(roomId).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("chat-message", ({ roomId, message, userName }) => {
    io.to(roomId).emit("chat-message", {
      message, userName,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on("leave-room", ({ roomId }) => {
    socket.to(roomId).emit("user-left", { userId: socket.id });
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
    socket.leave(roomId);
    console.log(`👋 ${socket.id} left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    Object.keys(rooms).forEach(roomId => {
      if (rooms[roomId]?.find(u => u.socketId === socket.id)) {
        socket.to(roomId).emit("user-left", { userId: socket.id });
        rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    });
  });
});

// ─── START SERVER ──────────────────────────────────────────────────
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});