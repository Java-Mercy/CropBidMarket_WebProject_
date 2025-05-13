const express = require('express');
const Bid = require('../models/bid');
const { isAuthenticated, hasRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/dashboard', isAuthenticated, hasRole('admin'), async (req, res) => {
  const bids = await Bid.find().populate('crop').populate('bidder');
  res.render('admin/dashboard', { user: req.session.user, bids });
});

module.exports = router;