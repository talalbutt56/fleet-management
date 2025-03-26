require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kilometers: { type: Number, required: true },
  oilChangeDue: { type: Number, required: true },
  safetyDue: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['on road', 'in shop', 'out of service'],
    default: 'on road'
  },
  statusReason: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true }
});
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Auth Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (err) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      username: req.body.username,
      password: hashedPassword
    });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).send({ token });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) throw new Error('Invalid login credentials');
    
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) throw new Error('Invalid login credentials');
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.send({ token });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

// Vehicle Routes
app.get('/api/vehicles', authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user._id });
    res.send(vehicles);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/vehicles', authenticate, async (req, res) => {
  try {
    const vehicle = new Vehicle({
      ...req.body,
      userId: req.user._id,
      oilChangeDue: 5000, // Default 5000km until oil change
      safetyDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months from now
    });
    await vehicle.save();
    res.status(201).send(vehicle);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
