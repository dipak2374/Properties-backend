const User = require('../models/User');
const Property = require('../models/Property');

exports.getProfile = (req, res) => {
  res.json({ user: null });
};

exports.listUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
    const agentIds = users
      .filter((user) => user.role === 'seller')
      .map((user) => user._id);

    const propertyCounts = agentIds.length > 0
      ? await Property.aggregate([
        { $match: { owner: { $in: agentIds } } },
        { $group: { _id: '$owner', count: { $sum: 1 } } },
      ])
      : [];
    const countByAgentId = new Map(propertyCounts.map((item) => [String(item._id), item.count]));

    res.json({
      users: users.map((user) => ({
        ...user,
        propertyCount: countByAgentId.get(String(user._id)) || 0,
      })),
    });
  } catch (error) {
    if (error.name === 'MongooseError' || error.name === 'MongoServerSelectionError') {
      return res.json({ users: [] });
    }

    return res.status(500).json({ message: 'Unable to list users' });
  }
};

exports.updateUserProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const { profilePicture } = req.body || {};

    if (typeof profilePicture !== 'string' || !profilePicture.trim()) {
      return res.status(400).json({ message: 'Profile picture URL is required' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { profilePicture: profilePicture.trim() },
      { new: true, runValidators: true }
    ).select('-password').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user, message: 'Profile picture updated successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(500).json({ message: 'Unable to update profile picture' });
  }
};
