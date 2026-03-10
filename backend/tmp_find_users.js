require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function findUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}, 'name email role');
        console.log('=== REGISTERED USERS ===');
        users.forEach(u => console.log(`Role: ${u.role} | Email: ${u.email} | Name: ${u.name}`));
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

findUsers();
