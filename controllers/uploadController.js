exports.uploadPropertyImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const filePath = `/uploads/property-images/${req.file.filename}`;
    return res.status(201).json({ url: filePath, message: 'File uploaded' });
  } catch (error) {
    return res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};
