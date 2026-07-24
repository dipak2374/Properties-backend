const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');

// Import Models
const User = require('../models/User');
const Property = require('../models/Property');
const Category = require('../models/Category');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Must match the same hashing logic in authController.js
const hashPassword = (password) => {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
};

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/propertyhub';
    await connectDB(mongoUri);

    console.log('Clearing old data...');
    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      Category.deleteMany({}),
    ]);

    console.log('Creating demo users...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@propertyhub.com',
      password: hashPassword('Admin@123'),
      role: 'admin',
      phone: '+1 555-000-1234'
    });

    const seller = await User.create({
      name: 'Jane Doe',
      email: 'jane@realestate.com',
      password: hashPassword('Agent@123'),
      role: 'seller',
      phone: '+1 555-111-2222'
    });

    console.log('Creating categories...');
    const houseCat = await Category.create({ name: 'House', description: 'Single family homes', icon: 'home' });
    const aptCat = await Category.create({ name: 'Apartment', description: 'Modern apartments', icon: 'apartment' });
    const condoCat = await Category.create({ name: 'Condo', description: 'Luxury condominiums', icon: 'business' });

    console.log('Creating properties...');
    await Property.create([
      {
        title: 'Modern Family Home',
        description: 'Beautiful 4-bedroom house with a spacious backyard and modern amenities.',
        price: 550000,
        location: {
          address: '123 Maple Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          country: 'USA'
        },
        propertyType: 'House',
        status: 'Available',
        bedrooms: 4,
        bathrooms: 3,
        areaSqFt: 2500,
        yearBuilt: 2018,
        amenities: ['Pool', 'Garage', 'Garden', 'Smart Home'],
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
        owner: seller._id,
        category: houseCat._id
      },
      {
        title: 'Downtown Luxury Apartment',
        description: 'Stunning high-rise apartment with city skyline views and a rooftop pool.',
        price: 320000,
        location: {
          address: '456 Skyline Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        propertyType: 'Apartment',
        status: 'Available',
        bedrooms: 2,
        bathrooms: 2,
        areaSqFt: 1100,
        yearBuilt: 2021,
        amenities: ['Gym', 'Rooftop Pool', 'Concierge', 'Balcony'],
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
        owner: seller._id,
        category: aptCat._id
      },
      {
        title: 'Cozy Condo Near Beach',
        description: 'Perfect vacation home or rental property just blocks from the ocean.',
        price: 410000,
        location: {
          address: '789 Ocean Blvd',
          city: 'Miami',
          state: 'FL',
          zipCode: '33139',
          country: 'USA'
        },
        propertyType: 'Condo',
        status: 'Pending',
        bedrooms: 3,
        bathrooms: 2,
        areaSqFt: 1400,
        yearBuilt: 2015,
        amenities: ['Beach Access', 'Gym', 'Parking'],
        images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
        owner: seller._id,
        category: condoCat._id
      }
    ]);

    console.log('✅ Database Seeding Completed!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
