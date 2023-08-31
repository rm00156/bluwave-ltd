const express = require('express');
require('express-async-errors');
const notProduction = process.env.NODE_ENV != 'production';

if (notProduction) {
  require('dotenv').config(); // Load variables from .env file
}
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const indexRouter = require('./routes/index');
const bodyParser = require('body-parser');
const upload = require('express-fileupload');
const flash = require('connect-flash');
require('./passport_setup')(passport);

const app = express();

const models = require('./models');
const companyInfo = require('./utilty/company/companyInfo');
let socket;

function setSocket(ioSocket) {
  socket = ioSocket;
}
models.sequelize.sync().then(function() {

  models.notification.afterCreate((instance, options) => {
    socket.emit('notification', {notification: instance});
  })
}).catch(function(err) {

    console.log(err, "Database connection to reece has failed!")
  
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(upload());
app.use(bodyParser.json({
verify: function (req, res, buf) {
    var url = req.originalUrl;
    if (url.startsWith('/stripe')) {
        req.rawBody = buf.toString()
    }
}
}));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// this order is important
app.use(session(
  {secret: process.env.SECRET,
  saveUninitialized:false,
  resave:false,
  store: new MemoryStore({checkPeriod:86400000})
})
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/', indexRouter);

app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  if (req.app.get('env') === 'production') {
    return res.render('404',{user:req.user, companyDetails: companyInfo.getCompanyDetails()});
  } 

  res.locals.message = error.message;
  res.locals.error = error;
  
  return res.render('error');
});



module.exports = {
  app,
  setSocket
}