const Queue = require('bull');
const REDIS_URL = process.env.REDIS_URL /*process.env.STACKHERO_REDIS_URL_TLS*/ || 'redis://127.0.0.1:6379';

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
const workerQueue = new Queue('worker', client);

exports.addForgottenPasswordEmailJob = async function (accountId) {
  await workerQueue.add({ process: 'sendForgottenPasswordEmail', accountId: accountId });
}

exports.addSendSigupEmail = async function (accountId) {
  await workerQueue.add({ process: 'sendSignupEmail', accountId: accountId });
}

exports.addSendPurchaseEmail = async function (purchaseBasketId) {
  await workerQueue.add({ process: 'sendPurchaseEmail', purchaseBasketId: purchaseBasketId });
}
