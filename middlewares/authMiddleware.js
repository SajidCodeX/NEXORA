function isAuthenticated(req, res, next) {
    if (req.session.userId) {
      next();
    } else {
      res.redirect("/auth/login");
    }
  }
  
  module.exports = { isAuthenticated };
  