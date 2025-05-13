require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmer');
const bidderRoutes = require('./routes/bidder');
const adminRoutes = require('./routes/admin');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri-bid';

mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  // Don't exit, just log the error
});

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    error: 'Something went wrong!',
    user: req.session.user || null
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/farmer', farmerRoutes);
app.use('/bidder', bidderRoutes);
app.use('/admin', adminRoutes);

app.get('/', async (req, res, next) => {
  try {
    const Crop = require('./models/crop');
    const crops = await Crop.find().populate('farmer');
    res.render('home', { 
      user: req.session.user, 
      crops, 
      notification: req.query.notification 
    });
  } catch (err) {
    next(err);
  }
});

// Socket.IO for real-time bidding
let currentAuction = { cropId: null, highestBid: 0, highestBidder: null, timer: 15 };
let timerInterval = null;

io.on('connection', (socket) => {
  socket.on('joinAuction', (cropId) => {
    socket.join(cropId);
    socket.emit('auctionUpdate', currentAuction);
  });

  socket.on('placeBid', ({ cropId, amount, userId, userName }) => {
    if (currentAuction.cropId === cropId && amount > currentAuction.highestBid) {
      currentAuction.highestBid = amount;
      currentAuction.highestBidder = { id: userId, name: userName };
      currentAuction.timer = 15;
      io.to(cropId).emit('auctionUpdate', currentAuction);
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        currentAuction.timer--;
        io.to(cropId).emit('auctionUpdate', currentAuction);
        if (currentAuction.timer <= 0) {
          clearInterval(timerInterval);
          io.to(cropId).emit('auctionEnded', {
            winner: currentAuction.highestBidder,
            amount: currentAuction.highestBid,
          });
          currentAuction = { cropId: null, highestBid: 0, highestBidder: null, timer: 15 };
        }
      }, 1000);
    }
  });
});

// Expose upload middleware
app.locals.upload = upload;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is in use, trying ${PORT + 1}`);
      server.listen(PORT + 1);
    } else {
      console.error('Server error:', err);
    }
  });