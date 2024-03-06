function isLoggedIn(req, res, next) {
  if (req.user != null) { next(); } else { res.redirect('/'); }
}

module.exports = {
  isLoggedIn,
};
