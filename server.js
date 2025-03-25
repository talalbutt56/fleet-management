require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Initialize Express
const app = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleetmanagement';
const INIT_KEY = process.env.INIT_KEY || 'dev-key';

// Enhanced CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from client
app.use(express.static(path.join(__dirname, '../client/public')));

// Database Models
const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['on-road', 'in-shop', 'out-of-service'], 
    default: 'on-road' 
  },
  km: { type: Number, required: true, min: 0 },
  oilChangeDue: { type: Number, required: true, min: 0 },
  safetyDue: { type: Date, required: true },
  drivers: { type: [String], required: true },
  comment: { type: String, default: '' }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['GM', 'SUPERVISOR', 'LEAD', 'operator'], 
    required: true 
  }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const User = mongoose.model('User', userSchema);

// Database Connection
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// Socket.IO Setup
function setupSocketIO() {
  const changeStream = Vehicle.watch([], { fullDocument: 'updateLookup' });
  
  changeStream.on('change', (change) => {
    console.log('🔔 Database change detected');
    io.emit('vehicle-update', change);
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`⚡ Client disconnected: ${socket.id}`);
    });
  });
}

// Routes
app.post('/api/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim() });

    if (!user || user.password !== password.trim()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      username: user.username,
      role: user.role
    });

  } catch (err) {
    console.error('❌ Auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// [Include all other routes from your original code...]

// Initialize Database
app.post('/api/init', async (req, res) => {
  try {
    if (req.headers.authorization !== `Bearer ${INIT_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Vehicle.deleteMany({});
    await User.deleteMany({});

    const vehicles = await Vehicle.insertMany([
      // Your vehicle data...
    ]);

    const users = await User.insertMany([
      // Your user data...
    ]);

    res.json({ message: "Database initialized", vehicles, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
async function startServer() {
  await connectDB();
  setupSocketIO();
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 MongoDB connected: ${MONGODB_URI}`);
  });
}

startServer();
