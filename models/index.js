const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(env === 'test' ? process.env.TEST_DATABASE_NAME : process.env.DATABASE_NAME, process.env.DATABASE_USERNAME, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: process.env.DATABASE_DIALECT,
  logging: env !== 'test' && env !== 'development',
  pool: {
    max: 12,
    min: 0,
    idle: 10000,
  },
  timezone: 'Europe/London', // Set the connection timezone to UK time
  dialectOptions: {
    timezone: 'local', // This ensures MySQL operates in the local (system) timezone, but Sequelize will handle timezone conversion.
  },
});
const db = {};

fs
  .readdirSync(__dirname)
  .filter((file) => (file.indexOf('.') !== 0) && (file !== 'index.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

module.exports = db;
