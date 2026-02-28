const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// LOAD ENVIRONMENT VARIABLES
dotenv.config();

// CONNECT TO DATABASE
connectDB();

// INITIALIZE EXPRESS APP
const app = express();

// MIDDLEWARE FOR JSON, URLENCODED DATA, AND CORS
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// DEFINE ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/example', require('./routes/exampleRoutes'));

// BASIC ROOT ROUTE ALIVE CHECK
app.get('/', (req, res) => {
    res.status(200).json({ message: 'PAWNA CAMPING API IS RUNNING...' });
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[ SUCCESS ] SERVER RUNNING IN ${process.env.NODE_ENV} MODE ON PORT ${PORT}`);
});
