const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  propertyType: { type: String, enum: ['House', 'Apartment', 'Condo', 'Townhouse', 'Land', 'Commercial'], default: 'House' },
  listingType: { type: String, enum: ['Sale', 'Rent', 'Lease', 'PG'], default: 'Sale' },
  status: { type: String, enum: ['Available', 'Pending', 'Sold', 'Rented'], default: 'Available' },
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  areaSqFt: { type: Number, default: 0 },
  yearBuilt: Number,
  amenities: [String],
  images: [String],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
