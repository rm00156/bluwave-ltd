function isCustomer(req, res, next) {
  const account = req.user;

  if (account.accountTypeFk === 2) {
    next();
  } else {
    res.redirect('/admin_dashboard');
  }
}

function isNotGuest(req, res, next) {
  const account = req.user;

  if (account.guestFl === false) {
    next();
  } else {
    res.redirect('/');
  }
}

module.exports = {
  isCustomer,
  isNotGuest,
};
