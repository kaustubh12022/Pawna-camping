const mongoose = require('mongoose');

// MONGODB CONNECTION FUNCTION
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        // LOG SUCCESSFUL CONNECTION
        console.log(`[ SUCCESS ] MONGODB CONNECTED: ${conn.connection.host}`);
    } catch (error) {
        // LOG ERROR AND EXIT IF CONNECTION FAILS
        console.error(`[ ERROR ] MONGODB CONNECTION FAILED: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
