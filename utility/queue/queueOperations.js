const Queue = require('bull');

const workerQueue = new Queue('worker', { redis: { portport: process.env.CLOUD_REDIS_PORT, host: process.env.CLOUD_REDIS_HOST, password: process.env.CLOUD_REDIS_PASSWORD } });

async function addForgottenPasswordEmailJob(accountId) {
  await workerQueue.add({ process: 'sendForgottenPasswordEmail', accountId });
}

async function addSendSigupEmail(accountId) {
  await workerQueue.add({ process: 'sendSignupEmail', accountId });
}

async function addSendPurchaseEmail(purchaseBasketId) {
  await workerQueue.add({ process: 'sendPurchaseEmail', purchaseBasketId });
}

async function addJob(process) {
  await workerQueue.add({ process });
}

module.exports = {
  addJob,
  addForgottenPasswordEmailJob,
  addSendSigupEmail,
  addSendPurchaseEmail,
};
