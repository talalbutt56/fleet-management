require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // or your frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kilometers: { type: Number, required: true },
  oilChangeDue: { type: Date, required: true },
  safetyDue: { type: Date, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['on road', 'in shop', 'out of service'],
    default: 'on road'
  },
  userId: { type: mongoose.Schema.Types.ObjectId
