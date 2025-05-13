const express = require('express');
const Crop = require('../models/crop');
const { isAuthenticated, hasRole } = require('../middleware/authMiddleware');
const router = express.Router();

// Get upload middleware from app
const getUploadMiddleware = (req) => {
  return req.app.locals.upload.single('picture');
};

router.get('/crops', isAuthenticated, hasRole('farmer'), async (req, res) => {
  const crops = await Crop.find({ farmer: req.session.user._id });
  res.render('farmer/crops', { user: req.session.user, crops });
});

router.get('/create-crop', isAuthenticated, hasRole('farmer'), (req, res) => {
  res.render('farmer/create-crop', { user: req.session.user, error: null });
});

router.post('/create-crop', isAuthenticated, hasRole('farmer'), async (req, res) => {
  try {
    // Handle file upload
    const uploadMiddleware = getUploadMiddleware(req);
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { name, basePrice, startTime } = req.body;
    await Crop.create({
      name,
      basePrice,
      farmer: req.session.user._id,
      picture: req.file ? `/uploads/${req.file.filename}` : null,
      startTime: new Date(startTime),
    });
    res.redirect('/farmer/crops');
  } catch (err) {
    console.error('Create crop error:', err);
    res.render('farmer/create-crop', { 
      user: req.session.user, 
      error: 'Failed to create crop. Please try again.' 
    });
  }
});

router.get('/edit-crop/:id', isAuthenticated, hasRole('farmer'), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop || crop.farmer.toString() !== req.session.user._id.toString()) {
      return res.redirect('/farmer/crops');
    }
    res.render('farmer/edit-crop', { user: req.session.user, crop, error: null });
  } catch (err) {
    console.error('Edit crop error:', err);
    res.redirect('/farmer/crops');
  }
});

router.post('/edit-crop/:id', isAuthenticated, hasRole('farmer'), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop || crop.farmer.toString() !== req.session.user._id.toString()) {
      return res.redirect('/farmer/crops');
    }

    // Handle file upload
    const uploadMiddleware = getUploadMiddleware(req);
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { name, basePrice, startTime } = req.body;
    crop.name = name;
    crop.basePrice = basePrice;
    crop.startTime = new Date(startTime);
    if (req.file) crop.picture = `/uploads/${req.file.filename}`;
    await crop.save();
    res.redirect('/farmer/crops');
  } catch (err) {
    console.error('Update crop error:', err);
    res.render('farmer/edit-crop', { 
      user: req.session.user, 
      crop: await Crop.findById(req.params.id), 
      error: 'Failed to update crop. Please try again.' 
    });
  }
});

router.post('/delete-crop/:id', isAuthenticated, hasRole('farmer'), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop || crop.farmer.toString() !== req.session.user._id.toString()) {
      return res.redirect('/farmer/crops');
    }
    await Crop.deleteOne({ _id: req.params.id });
    res.redirect('/farmer/crops');
  } catch (err) {
    console.error('Delete crop error:', err);
    res.redirect('/farmer/crops');
  }
});

module.exports = router;