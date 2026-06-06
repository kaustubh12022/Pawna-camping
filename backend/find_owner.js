const mongoose = require('mongoose');
require('dotenv').config(); // Automatically finds .env in current dir
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const owners = await User.find({ role: 'owner' });
    console.log("OWNERS:", owners.map(o => o.email));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
