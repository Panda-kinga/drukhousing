const db = require("../config/db");
const bcrypt = require("bcrypt");
async function createUser(name, email, password, role, verificationToken) {
  const hash = await bcrypt.hash(password, 12);
  return db.one(
    `INSERT INTO users(name,email,password_hash,role,verification_token)
    VALUES($1,$2,$3,$4,$5) RETURNING id`,
    [name, email, hash, role, verificationToken],
  );
}
function findByEmail(email) {
  return db.oneOrNone("SELECT * FROM users WHERE email=$1", [email]);
}
function findById(id) {
  return db.oneOrNone(
    "SELECT id,name,email,role,is_verified FROM users WHERE id=$1",
    [id],
  );
}
function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function markVerified(token) {
  return db.oneOrNone(
    `UPDATE users SET is_verified=true, verification_token=NULL
    WHERE verification_token=$1 RETURNING id`,
    [token],
  );
}
function setResetToken(email, token) {
  return db.oneOrNone(
    `UPDATE users SET reset_token=$2,
    reset_token_expires=(clock_timestamp() AT TIME ZONE 'Asia/Thimphu') + INTERVAL '1 hour'
    WHERE email=$1 RETURNING id`,
    [email, token],
  );
}
function findByResetToken(token) {
  return db.oneOrNone(
    `SELECT id FROM users WHERE reset_token=$1
    AND reset_token_expires > (clock_timestamp() AT TIME ZONE 'Asia/Thimphu')`,
    [token],
  );
}
async function resetPassword(token, password) {
  const hash = await bcrypt.hash(password, 12);
  return db.oneOrNone(
    `UPDATE users SET password_hash=$2,reset_token=NULL,reset_token_expires=NULL
    WHERE reset_token=$1 AND reset_token_expires > (clock_timestamp() AT TIME ZONE 'Asia/Thimphu')
    RETURNING id`,
    [token, hash],
  );
}
function getAllUsers() {
  return db.any(
    "SELECT id,name,email,role,is_verified,created_at FROM users ORDER BY id DESC",
  );
}
module.exports = {
  createUser,
  findByEmail,
  findById,
  verifyPassword,
  markVerified,
  setResetToken,
  findByResetToken,
  resetPassword,
  getAllUsers,
};
