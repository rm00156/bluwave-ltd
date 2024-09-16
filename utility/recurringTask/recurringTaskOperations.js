const logger = require('pino')();
const nodeSchedule = require('node-schedule');
const queueOperations = process.env.NODE_ENV === 'test' ? null : require('../queue/queueOperations');

async function updateBasketItemsAfterSaleAndPromoCodeExpiry() {
  const rule = new nodeSchedule.RecurrenceRule();
  rule.hour = 0;
  rule.minute = 0;
  return nodeSchedule.scheduleJob(rule, async () => {
    await queueOperations.addJob('salePromoCodeExpiry');
    logger.info('Sale and Promo Code Expiry Recurring task running');
  });
}

async function setUpRecurringTasks() {
  if (process.env.NODE_ENV !== 'test') {
    await updateBasketItemsAfterSaleAndPromoCodeExpiry();
  }
}

module.exports = {
  setUpRecurringTasks,
};
