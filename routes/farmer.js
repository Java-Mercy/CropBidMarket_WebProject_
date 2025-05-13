const express = require('express');
const Crop = require('../models/crop');
const { isAuthenticated, hasRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/crops', isAuthenticated, hasRole('farmer'), async (req, res) => {
  const crops = await Crop.find({ farmer: req.session.user._id });
  res.render('farmer/crops', { user: req.session.user, crops });
});

router.get('/create-crop', isAuthenticated, hasRole('farmer'), (req, res) => {
  res.render('farmer/create-crop', { user: req.session.user, error: null });
});

router.post('/create-crop', isAuthenticated, hasRole('farmer'), req.app.locals.upload.single('picture'), async (req, res) => {
  const { name, basePrice, startTime } = req.body;
  try {
    await Crop.create({
      name,
      basePrice,
      farmer: req.session.user._id,
      picture: req.file ? `/uploads/${req.file.filename}` : null,
      startTime: new Date(startTime),
    });
    res.redirect('/farmer/crops');
  } catch (err) {
    res.render('farmer/create-crop', { user: req.session.user, error: 'Failed to create crop' });
  }
});

router.get('/edit-crop/:id', isAuthenticated, hasRole('farmer'), async (req, res) => {
  const crop = await Crop.findById(req.params.id);
  if (crop.farmer.toString() !== req.session.user._id.toString()) {
    return res.redirect('/farmer/crops');
  }
  res.render('farmer/edit-crop', { user: req.session.user, crop, error: null });
});

router.post('/edit-crop/:id', isAuthenticated, hasRole('farmer'), req.app.locals.upload.single('picture'), async (req, res) => {
  const { name, basePrice, startTime } = req.body;
  const crop = await Crop.findById(req.params.id);
  if (crop.farmer.toString() !== req.session.user._id.toString()) {
    return res.redirect('/farmer/crops');
  }
  try {
    crop.name = name;
    crop.basePrice = basePrice;
    crop.startTime = new Date(startTime);
    if (req.file) crop.picture = `/uploads/${req.file.filename}`;
    await crop.save();
    res.redirect('/farmer/crops');
  } catch (err) {
    res.render('farmer/edit-crop', { user: req.session.user, crop, error: 'Failed to update crop' });
  }
});

router.post('/delete-crop/:id', isAuthenticated, hasRole('farmer'), async (req, res) => {
  const crop = await Crop.findById(req.params.id);
  if (crop.farmer.toString() !== req.session.user._id.toString()) {
    return res.redirect('/farmer/crops');
  }
  await Crop.deleteOne({ _id: req.params.id });
  res.redirect('/farmer/crops');
});

module.exports = router;