const throng = require('throng');
const Queue = require("bull");
const emailOperations = require('./utilty/email/emailOperations');
// Connect to a local redis intance locally, and the Heroku-provided URL in production
const REDIS_URL = process.env.REDIS_URL /*process.env.STACKHERO_REDIS_URL_TLS*/ || "redis://127.0.0.1:6379";

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
const workers = process.env.WEB_CONCURRENCY || 2;

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network 
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
const maxJobsPerWorker = 15;

const isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) {
  require('dotenv').config(); // Load variables from .env file
}

const redisUrlParse = require('redis-url-parse');
const redisUrlParsed = redisUrlParse(REDIS_URL);
const { host, port, password } = redisUrlParsed;
const client = REDIS_URL.includes('rediss://')
  ? {
    redis: {
      port: Number(port),
      host,
      password,
      tls: {
        rejectUnauthorized: false,
      },
    },
  }
  : REDIS_URL;



const start = function () {
  // Connect to the named work queue

  var workerQueue = new Queue('worker', client);

  workerQueue.process(maxJobsPerWorker, async (job) => {

    if (job.data.process == 'sendFor|gottenPasswordEmail') {
      await emailOperations.sendForgottenPasswordEmail(job.data.accountId);
    } else if (job.data.process == 'sendSignupEmail') {
      await emailOperations.sendSigupEmail(job.data.accountId);
    } else if (job.data.process == 'sendPurchaseEmail') {
      await emailOperations.sendPurchaseEmail(job.data.purchaseBasketId);
    }

  }).catch(err => {

    console.log(err);
  });
}


// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });