const express = require('express');
require('express-async-errors');

const notProduction = process.env.NODE_ENV !== 'production';

if (notProduction) {
  require('dotenv').config(); // Load variables from .env file
}
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('pino')();
const passport = require('passport');
const session = require('express-session');
// const RedisStore = require('connect-redis').default;
const MemoryStore = require('memorystore')(session);
const redis = require('redis');
const bodyParser = require('body-parser');
const upload = require('express-fileupload');
const flash = require('connect-flash');
const indexRouter = require('./routes/index');
const companyInfo = require('./utilty/company/companyInfo');

require('./passport_setup')(passport);
// const REDIS_URL = process.env.REDIS_URL /* process.env.STACKHERO_REDIS_URL_TLS */ || 'redis://127.0.0.1:6379';
const app = express();

// const redisClient = redis.createClient({
//   url: REDIS_URL,
//   socket: {
//     tls: {
//       rejectUnauthorized: false,
//     },
//   },
// });



// redisClient.connect().catch((err) => {
//   logger.error(err);
// });
const models = require('./models');

let socket;

function setSocket(ioSocket) {
  socket = ioSocket;
}
models.sequelize.sync().then(() => {
  models.notification.afterCreate((instance) => {
    if (socket) socket.emit('notification', { notification: instance });
  });
}).catch((err) => {
  logger.error(err, 'Database connection to reece has failed!');
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(morgan('dev'));
app.use(upload());
app.use(bodyParser.json({
  verify(req, res, buf) {
    const url = req.originalUrl;
    if (url.startsWith('/stripe')) {
      req.rawBody = buf.toString();
    }
  },
}));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// this order is important
app.use(session(
  {
    secret: process.env.SECRET,
    saveUninitialized: false,
    resave: false,
    // store: new RedisStore({ client: redisClient }),
    store: new MemoryStore({ checkPeriod: 86400000 }),
  },
));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/', indexRouter);

app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res) => {
  res.status(error.status || 500);
  if (req.app.get('env') === 'production') {
    logger.error(error);
    return res.render('404', { user: req.user, companyDetails: companyInfo.getCompanyDetails() });
  }

  res.locals.message = error.message;
  res.locals.error = error;

  return res.render('error');
});

module.exports = {
  app,
  // redisClient,
  setSocket,
};
