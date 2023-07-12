const express = require('express');
require('dotenv').config();
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

const isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) {
  dotenv.config(); // Load variables from .env file
}

const app = express();

const models = require('./models');
models.sequelize.sync().then(function() {
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

app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    console.log(err)
    req.app.get('env') === 'development' ? res.render('error') : res.redirect('/404');
    
  });

module.exports = app;