const Property = require('../models/Property');
const Category = require('../models/Category');

exports.listProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate('owner', 'name email phone').populate('category', 'name').sort({ createdAt: -1 }).lean();
    res.json({ properties });
  } catch (error) {
    console.error('listProperties error:', error);
    return res.status(500).json({ message: 'Unable to list properties', error: error.message });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).populate('owner', 'name email phone').populate('category', 'name').lean();
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json({ property });
  } catch (error) {
    // Invalid ObjectId format will throw a CastError
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Property not found' });
    }
    console.error('getPropertyById error:', error);
    return res.status(500).json({ message: 'Unable to fetch property', error: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    return res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'Property not found' });
    }
    return res.status(500).json({ message: 'Unable to delete property', error: error.message });
  }
};

exports.createProperty = async (req, res) => {
  try {
    const { title, description, price, location, propertyType, listingType, status, bedrooms, bathrooms, areaSqFt, yearBuilt, amenities, images, category, owner } = req.body || {};

    if (!title || !description || typeof price !== 'number') {
      return res.status(400).json({ message: 'Title, description, and numeric price are required' });
    }

    const property = await Property.create({
      title,
      description,
      price,
      location,
      propertyType,
      listingType,
      status,
      bedrooms,
      bathrooms,
      areaSqFt,
      yearBuilt,
      amenities,
      images,
      category,
      owner,
    });
    
    return res.status(201).json({ property, message: 'Property created successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to create property', error: error.message });
  }
};
