const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('./models/User');
    const owner = await User.findOne({ role: 'owner' });
    const manager = await User.findOne({ role: 'manager' });
    console.log("OWNER EMAIL:", owner ? owner.email : "Not found");
    console.log("MANAGER EMAIL:", manager ? manager.email : "Not found");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
