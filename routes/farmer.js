const express = require('express');
const Crop = require('../models/crop');
const { isAuthenticated, hasRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/crops', isAuthenticated, hasRole('farmer'), async (req, res) => {
  const crops = await Crop.find({ farmer: req.session.user._id });
  res.render('farmer/crops', { user: req.session.user, crops });
});

router.get('/create-crop', isAuthenticated, hasRole('farmer'), (req, res) => {
  res.render('farmer/create-crop', { user: req.session.user });
});

router.post('/create-crop', isAuthenticated, hasRole('farmer'), async (req, res) => {
  const { name, basePrice } = req.body;
  await Crop.create({
    name,
    basePrice,
    farmer: req.session.user._id,
  });
  res.redirect('/farmer/crops');
});

module.exports = router;