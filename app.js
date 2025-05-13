require('dotenv').config();
const express     = require('express');
const connectDB = require('./config/db');
const mongoose    = require('mongoose');
const session     = require('express-session');
const MongoStore  = require('connect-mongo');
const path        = require('path');
const http        = require('http');
const { Server }  = require('socket.io');
const authRoutes  = require('./routes/auth');
const farmerRoutes= require('./routes/farmer');
const bidderRoutes= require('./routes/bidder');
const adminRoutes = require('./routes/admin');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
connectDB();
// Default MongoDB URI if not provided in .env
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri-bid';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key';

// — MongoDB Connection —
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    // Don't exit the process, just log the error
  });

// — Middleware —
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
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

// — Routes —
app.use('/auth', authRoutes);
app.use('/farmer', farmerRoutes);
app.use('/bidder', bidderRoutes);
app.use('/admin', adminRoutes);
app.get('/', (req, res) => res.render('home', { user: req.session.user }));

// — Socket.IO Real-Time Bidding —
let currentAuction = { cropId: null, highestBid: 0, highestBidder: null, timer: 15 };
let timerInterval;

io.on('connection', socket => {
  socket.on('joinAuction', cropId => {
    socket.join(cropId);
    socket.emit('auctionUpdate', currentAuction);
  });
  socket.on('placeBid', ({ cropId, amount, userId, userName }) => {
    if (currentAuction.cropId === cropId && amount > currentAuction.highestBid) {
      currentAuction = {
        cropId,
        highestBid: amount,
        highestBidder: { id: userId, name: userName },
        timer: 15
      };
      io.to(cropId).emit('auctionUpdate', currentAuction);
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        currentAuction.timer--;
        io.to(cropId).emit('auctionUpdate', currentAuction);
        if (currentAuction.timer <= 0) {
          clearInterval(timerInterval);
          io.to(cropId).emit('auctionEnded', {
            winner: currentAuction.highestBidder,
            amount: currentAuction.highestBid
          });
          currentAuction = { cropId: null, highestBid: 0, highestBidder: null, timer: 15 };
        }
      }, 1000);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
