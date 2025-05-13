// routes/auth.js

// GET: Register page
- router.get('/register', (req, res) => {
  -   res.render('register', { error: null });
  - });
  + router.get('/register', (req, res) => {
  +   res.render('register', { error: null, user: req.session.user || null });
  + });
  
  // POST: Register logic
  router.post('/register', async (req, res) => {
    // ... existing code ...
  -   if (existing) return res.send('Email already exists');
  +   if (existing) return res.render('register', { error: 'Email already exists', user: req.session.user || null });
  
    // ... existing code ...
  -   res.redirect('/login');
  +   res.redirect('/auth/login');
  });
  
  // GET: Login page
  - router.get('/login', (req, res) => {
  -   res.render('login', { error: null });
  - });
  + router.get('/login', (req, res) => {
  +   res.render('login', { error: null, user: req.session.user || null });
  + });
  
  // POST: Login logic
  router.post('/login', async (req, res) => {
    // ... existing code ...
    if (!user) {
  -     return res.send('Invalid email');
  +     return res.render('login', { error: 'Invalid email', user: req.session.user || null });
    }
    if (!match) {
  -     return res.send('Wrong password');
  +     return res.render('login', { error: 'Wrong password', user: req.session.user || null });
    }
  
    req.session.user = user;
    res.redirect('/');
  });
  
  // GET: Logout
  router.get('/logout', (req, res) => {
    req.session.destroy(() => {
  -   res.redirect('/login');
  +   res.redirect('/auth/login');
    });
  });
  