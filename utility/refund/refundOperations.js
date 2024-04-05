const models = require('../../models');

async function getRefundsForOrder(orderId) {
  return models.sequelize.query('select r.*, DATE_FORMAT(r.createdDttm, "%Y-%m-%d %H:%i:%s") as createdDt, rt.type from refunds r '
                        + ' inner join refundTypes rt on r.refundTypeFk = rt.id '
                        + ' where r.purchaseBasketFk = :orderId '
                        + ' and r.deleteFl = false ', { replacements: { orderId }, type: models.sequelize.QueryTypes.SELECT });
}

async function isRefundPossibleForOrder(refunds, totalOrderAmount) {
  const fullRefund = refunds.filter((r) => r.type === 'Full Refund');
  if (fullRefund.length > 0) return false;

  const partialRefunds = refunds.filter((r) => r.type === 'Partial');
  let totalPartialRefunds = 0;
  partialRefunds.forEach((pr) => {
    const amount = parseFloat(pr.amount);
    totalPartialRefunds += amount;
  });

  if (totalOrderAmount <= (totalPartialRefunds / 100)) return false;

  return true;
}

async function getRefundTypes() {
  return models.refundType.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function createRefund(orderId, refundTypeId, refundAmount) {
  return models.refund.create({
    refundTypeFk: refundTypeId,
    createdDttm: Date.now(),
    amount: refundAmount,
    purchaseBasketFk: orderId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getMaxRefundPossibleForOrder(refunds, totalOrderAmount) {
  const fullRefund = refunds.filter((r) => r.type === 'Full Refund');
  if (fullRefund.length > 0) return 0;

  const partialRefunds = refunds.filter((r) => r.type === 'Partial');
  let totalPartialRefunds = 0;
  partialRefunds.forEach((pr) => {
    const amount = parseFloat(pr.amount);
    totalPartialRefunds += amount;
  });

  return parseFloat(totalOrderAmount) - (totalPartialRefunds / 100);
}

async function getRefundTypeByType(type) {
  return models.refundType.findOne({
    where: {
      type,
    },
  });
}

module.exports = {
  getRefundsForOrder,
  getRefundTypeByType,
  isRefundPossibleForOrder,
  getRefundTypes,
  createRefund,
  getMaxRefundPossibleForOrder,
};
