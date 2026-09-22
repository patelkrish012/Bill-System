const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { initDatabase } = require('./database/db');
const { seedDatabase } = require('./database/seed');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize & seed DB if needed
initDatabase();
seedDatabase();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for logo and uploads
app.use('/assets', express.static(path.join(__dirname, '..')));
app.use('/krish_logo.png', express.static(path.join(__dirname, '..', 'krish_logo.png')));
app.use('/krish_logo_transparent.png', express.static(path.join(__dirname, '..', 'krish_logo_transparent.png')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/items', require('./routes/items'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/backup', require('./routes/backup'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'KRISH AGRICULTURE Billing & ERP Management System',
    timestamp: new Date().toISOString()
  });
});

// Serve Frontend Static Assets in Production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`KRISH AGRICULTURE Server running on http://localhost:${PORT}`);
  console.log(`Database connected & seeded successfully.`);
  console.log(`Default Admin: admin / Admin@123`);
  console.log(`Default Staff: staff / Staff@123`);
  console.log(`Default GSTIN: 24AVCPP4549E1ZN`);
  console.log(`====================================================`);
});

module.exports = app;
