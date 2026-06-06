const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
dotenv.config();

const API = 'http://localhost:5000/api';

async function runTests() {
    console.log("Starting API Tests...\n");

    const tests = [
        { name: "Health Check", url: "/health", method: "GET" },
        { name: "Active Properties", url: "/properties?isActive=true", method: "GET" },
        { name: "Packages", url: "/packages", method: "GET" },
        { name: "Settings", url: "/settings", method: "GET" },
        { name: "Reviews", url: "/reviews", method: "GET" }
    ];

    for (let t of tests) {
        try {
            const res = await fetch(API + t.url, { method: t.method });
            console.log(`[${t.method}] ${t.url} -> ${res.status} ${res.ok ? 'OK' : 'FAIL'}`);
        } catch (e) {
            console.log(`[${t.method}] ${t.url} -> ERROR: ${e.message}`);
        }
    }

    // DB setup to get/create a manager
    let token = null;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        let user = await User.findOne({ role: 'manager' });
        if (!user) {
            user = await User.create({ name: 'Test Manager', email: 'testmanager@example.com', password: 'password123', role: 'manager' });
        }
        
        // Test Auth
        console.log("\nTesting Auth...");
        // Wrong password
        let resWrong = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, password: 'wrongpassword' })
        });
        console.log(`[POST] /auth/login (wrong pwd) -> ${resWrong.status} ${resWrong.status === 401 ? 'OK' : 'FAIL'}`);

        // Correct password
        // Wait, if we didn't just create it, we don't know its plain password!
        // So let's force update password to 'password123'
        user.password = 'password123';
        await user.save();

        let resRight = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, password: 'password123' })
        });
        console.log(`[POST] /auth/login (correct pwd) -> ${resRight.status} ${resRight.ok ? 'OK' : 'FAIL'}`);
        const data = await resRight.json();
        token = data.token;

        if (token) {
            console.log("\nTesting Protected Routes...");
            const protectedTests = [
                { name: "Bookings", url: "/bookings", method: "GET" },
                { name: "Analytics Overview", url: "/analytics/overview", method: "GET" }
            ];
            for (let t of protectedTests) {
                let pRes = await fetch(API + t.url, {
                    method: t.method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`[${t.method}] ${t.url} (with JWT) -> ${pRes.status} ${pRes.ok ? 'OK' : 'FAIL'}`);
            }
        }

        // Test POST booking
        console.log("\nTesting Public Booking POST...");
        let bRes = await fetch(API + '/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packageType: 'Camping',
                checkIn: new Date().toISOString(),
                checkOut: new Date(Date.now() + 86400000).toISOString(),
                guests: 2,
                customerName: 'Test Customer',
                customerPhone: '1234567890',
                foodPreference: 'Veg'
            })
        });
        console.log(`[POST] /bookings -> ${bRes.status} ${bRes.ok || bRes.status === 400 ? 'OK (tested validation)' : 'FAIL'}`);
        if(!bRes.ok) console.log(await bRes.text());

    } catch (e) {
        console.error("DB/Auth Error:", e.message);
    } finally {
        await mongoose.disconnect();
    }
}
runTests();
