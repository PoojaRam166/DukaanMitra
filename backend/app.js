const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const billRoutes = require('./routes/billRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const salesRoutes = require('./routes/salesRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost, local network IPs, the exact CLIENT_URL, or ANY vercel.app domain (like previews)
    if (origin.includes('localhost') || 
        origin.match(/^http:\/\/(192\.168|10|172\.(1[6-9]|2[0-9]|3[0-1]))\./) ||
        origin === process.env.CLIENT_URL || 
        origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prevent browser favicon 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'DukaanMitra API is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DukaanMitra API is running 🚀'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
