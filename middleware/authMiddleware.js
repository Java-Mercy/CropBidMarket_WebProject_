const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
  };
  
  const hasRole = (role) => (req, res, next) => {
    if (req.session.user.roles.includes(role)) return next();
    res.redirect('/');
  };
  
  module.exports = { isAuthenticated, hasRole };