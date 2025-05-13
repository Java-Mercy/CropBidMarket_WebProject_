const express = require('express');
const Crop = require('../models/crop');
const Bid = require('../models/bid');
const { isAuthenticated, hasRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/listings', isAuthenticated, hasRole('bidder'), async (req, res) => {
  const crops = await Crop.find({ status: 'open' }).populate('farmer');
  res.render('bidder/listings', { user: req.session.user, crops });
});

router.get('/auction/:cropId', isAuthenticated, hasRole('bidder'), async (req, res) => {
  const crop = await Crop.findById(req.params.id).populate('farmer');
  if (!crop) {
    return res.redirect('/bidder/listings');
  }
  const now = new Date();
  if (crop.startTime && crop.startTime > now) {
    crop.status = 'upcoming';
  } else if (crop.status !== 'closed') {
    crop.status = 'open';
  }
  await crop.save();
  const bids = await Bid.find({ crop: crop._id }).populate('bidder').sort({ createdAt: -1 });
  res.render('bidder/auction', { user: req.session.user, crop, bids });
});

router.post('/place-bid/:cropId', isAuthenticated, hasRole('bidder'), async (req, res) => {
  const { amount } = req.body;
  const crop = await Crop.findById(req.params.cropId);
  if (crop.status !== 'open') {
    return res.redirect(`/bidder/auction/${req.params.cropId}`);
  }
  await Bid.create({
    crop: req.params.cropId,
    bidder: req.session.user._id,
    amount,
  });
  res.redirect(`/bidder/auction/${req.params.cropId}`);
});

module.exports = router;