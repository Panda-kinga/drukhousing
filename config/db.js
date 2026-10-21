const pgp = require("pg-promise")();
require("dotenv").config();
const db = pgp({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: "-c timezone=Asia/Thimphu",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
module.exports = db;
