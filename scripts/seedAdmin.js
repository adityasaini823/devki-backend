import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { connectToMongo } from '../config/db.js';

const seedAdmin = async () => {
  try {
    await connectToMongo();
    
    const adminEmail = 'admin@devki.com';
    const adminPassword = 'Admin@123';
    
    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail, role: 'admin' });
    
    if (admin) {
      console.log('Admin user already exists. Updating password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin.password = hashedPassword;
      admin.role = 'admin';
      await admin.save();
      console.log('Admin password updated successfully!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({
        first_name: 'Admin',
        last_name: 'User',
        mobile: '9999999999', // Dummy mobile for admin
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        address: 'Admin Address',
        city: 'Admin City',
        state: 'Admin State',
        pincode: '000000',
        country: 'India',
      });
      console.log('Admin user created successfully!');
    }
    
    console.log('Admin credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedAdmin();
