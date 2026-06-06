const mongoose = require('mongoose');
const User = require('./models/User');
const Property = require('./models/Property');
const dotenv = require('dotenv');

dotenv.config();

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Reset manager password
        const managers = await User.find({ role: 'manager' });
        if (managers.length > 0) {
            for (let manager of managers) {
                manager.password = '1234';
                await manager.save();
                console.log(`Manager password reset to 1234 for ${manager.email}`);
            }
        } else {
            console.log('No manager found');
        }

        // 2. Delete all owners
        const result = await User.deleteMany({ role: 'owner' });
        console.log(`Deleted ${result.deletedCount} owners`);

        // 3. Unassign owners from properties
        const props = await Property.updateMany({ owner: { $ne: null } }, { owner: null });
        console.log(`Unassigned owner from ${props.modifiedCount} properties`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
