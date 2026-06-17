const mongoose = require('mongoose');

// MONGODB CONNECTION FUNCTION
const connectDB = async (retries = 5) => {
    while (retries) {
        try {
            const conn = await mongoose.connect(process.env.MONGODB_URI);
            console.log(`[ SUCCESS ] MONGODB CONNECTED: ${conn.connection.host}`);
            break;
        } catch (error) {
            console.error(`[ ERROR ] MONGODB CONNECTION FAILED: ${error.message}`);
            retries -= 1;
            if (retries === 0) {
                console.error(`[ FATAL ] Could not connect to MongoDB after multiple retries. Exiting.`);
                process.exit(1);
            }
            console.log(`[ INFO ] Retrying connection in 5 seconds... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
};

module.exports = connectDB;
