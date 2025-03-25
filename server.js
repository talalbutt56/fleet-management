require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const INIT_KEY = process.env.INIT_KEY || 'dev-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Models
const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  status: { type: String, enum: ['on-road', 'in-shop', 'out-of-service'], default: 'on-road' },
  km: { type: Number, required: true, min: 0 },
  oilChangeDue: { type: Number, required: true, min: 0 },
  safetyDue: { type: Date, required: true },
  drivers: { type: [String], required: true },
  comment: { type: String, default: '' }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['GM', 'SUPERVISOR', 'LEAD', 'operator'], required: true }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const User = mongoose.model('User', userSchema);

// Database Connection
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Atlas');
    
    // Create indexes
    await Vehicle.createIndexes();
    await User.createIndexes();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Real-time Updates
function setupSocketIO() {
  io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // Watch for database changes
  const changeStream = Vehicle.watch();
  changeStream.on('change', (change) => {
    io.emit('vehicle-update', change);
  });
}

// Authentication Middleware
async function authenticate(req, res, next) {
  if (req.path === '/api/auth' || req.path === '/api/init') return next();
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await User.findOne({ username: authHeader });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Routes
app.post('/api/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    res.json({
      username: user.username,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ name: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/init', async (req, res) => {
  try {
    if (req.headers.authorization !== `Bearer ${INIT_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Vehicle.deleteMany({});
    await User.deleteMany({});

    // Insert sample vehicles
    const vehicles = await Vehicle.insertMany([
      {
        name: "Bus 101",
        status: "on-road",
        km: 125000,
        oilChangeDue: 130000,
        safetyDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        drivers: ["John Smith", "Mike Johnson"]
      },
      {
        name: "Bus 102",
        status: "in-shop",
        km: 98000,
        oilChangeDue: 100000,
        safetyDue: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        drivers: ["Sarah Williams"],
        comment: "Engine maintenance"
      }
    ]);

    // Insert users
    const users = await User.insertMany([
      { username: "Cory Webb", password: "Voyago222!", role: "GM" },
      { username: "Talal Butt", password: "Samera0786", role: "SUPERVISOR" },
      { username: "Jim Morton", password: "Voyago123!", role: "LEAD" },
      { username: "Shawn Johnson", password: "Shawn123!", role: "operator" },
      { username: "Jeff Smith", password: "JeffS333!", role: "operator" }
    ]);

    res.json({ message: "Database initialized", vehicles: vehicles.length, users: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
async function startServer() {
  await connectDB();
  setupSocketIO();
  
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
