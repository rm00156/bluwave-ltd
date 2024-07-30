const validator = require("validator");
const logger = require("pino")();

const validateSale = (body) => {
  const { name, fromDt, toDt, description, percentage } = body;
  const errors = {};

  if (!validator.isLength(name, { min: 3, max: 50 })) {
    errors.name = "Please enter name between 3 and 50 characters in length.";
    logger.info("Please use enter name between 3 and 50 characters in length.");
  }

  if (!validator.isDate(fromDt)) {
    errors.fromDt = "Please enter valid date";
    logger.info("Please enter valid fromDt");
  }

  if (!validator.isDate(toDt)) {
    errors.toDt = "Please enter valid date";
    logger.info("Please enter valid toDt");
  }

  if (!validator.isBefore(fromDt, toDt) && !validator.equals(fromDt, toDt)) {
    errors.fromDt = "FromDt must be before ToDt";
    logger.info("Please enter valid toDt");
  }

  if (!validator.isLength(description, { min: 1 })) {
    errors.description = "Please set a description";
    logger.info("Please set a description");
  }

  if (!validator.isInt(percentage, { min: 1, max: 100 })) {
    errors.percentage = "Please set a valid percentage";
    logger.info("Please set a valid percentage");
  }
  return errors;
};

module.exports = {
  validateSale,
};
