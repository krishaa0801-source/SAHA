// Promotes an existing account to role: 'admin'. The account must already
// exist (sign up normally through /signup first) — this script only
// flips the role, it never creates a login.
//
// Usage: node scripts/makeAdmin.js someone@example.com
//        (or: npm run make:admin -- someone@example.com)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../server/db');
const User = require('../server/models/User');

async function run() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/makeAdmin.js <email>');
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  if (!user) {
    console.error(`No account found for ${email}. Sign up with this email first, then re-run this script.`);
  } else {
    console.log(`${email} is now an admin.`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to promote user:', err);
  process.exit(1);
});
