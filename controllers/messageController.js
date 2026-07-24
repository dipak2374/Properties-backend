const Message = require('../models/Message');

exports.listMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'name email profilePicture')
      .populate('receiver', 'name email profilePicture')
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ messages });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to list messages', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, sender, receiver, property } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!sender || !receiver) {
      return res.status(400).json({ message: 'Sender ID and Receiver ID are required' });
    }

    const message = await Message.create({
      content: content.trim(),
      sender,
      receiver,
      property
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email profilePicture')
      .populate('receiver', 'name email profilePicture')
      .populate('property', 'title')
      .lean();

    return res.status(201).json({ message: populatedMessage, success: true });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to send message', error: error.message });
  }
};
