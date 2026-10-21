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
async function createSuperAdmin(name, email, password) {
  const hash = await bcrypt.hash(password, 12);
  return db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
    VALUES($1,$2,$3,'superadmin',true) RETURNING id,name,email,role`,
    [name, email, hash],
  );
}
function findByEmail(email) {
  return db.oneOrNone("SELECT * FROM users WHERE email=$1", [email]);
}
function findById(id) {
  return db.oneOrNone(
    "SELECT id,name,email,role,is_verified,is_active FROM users WHERE id=$1",
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
    "SELECT id,name,email,role,is_verified,is_active,created_at FROM users ORDER BY id DESC",
  );
}
function adminList({ search = "", role = "", verified = "", page = 1, pageSize = 10 }) {
  const offset = (page - 1) * pageSize;
  return Promise.all([
    db.any(`SELECT id,name,email,role,is_verified,is_active,created_at FROM users
      WHERE (name ILIKE $1 OR email ILIKE $1) AND ($2='' OR role=$2)
      AND ($3='' OR is_verified=($3='true')) ORDER BY id DESC LIMIT $4 OFFSET $5`,
      [`%${search}%`, role, verified, pageSize, offset]),
    db.one(`SELECT COUNT(*)::int AS total FROM users
      WHERE (name ILIKE $1 OR email ILIKE $1) AND ($2='' OR role=$2)
      AND ($3='' OR is_verified=($3='true'))`, [`%${search}%`, role, verified]),
  ]);
}
function setActive(id, active) {
  return db.oneOrNone("UPDATE users SET is_active=$2 WHERE id=$1 AND role <> 'superadmin' RETURNING id", [id, active]);
}
function verifyUser(id) {
  return db.oneOrNone("UPDATE users SET is_verified=true, verification_token=NULL WHERE id=$1 AND role <> 'superadmin' AND NOT is_verified RETURNING id", [id]);
}
function changeRole(id, role) {
  return db.tx(async (t) => {
    const updated = await t.oneOrNone(
      "UPDATE users SET role=$2 WHERE id=$1 AND role IN ('tenant','landlord') RETURNING id",
      [id, role],
    );
    if (updated && role === "tenant")
      await t.none("UPDATE listings SET is_active=false WHERE landlord_id=$1", [id]);
    return updated;
  });
}
module.exports = {
  createUser,
  createSuperAdmin,
  findByEmail,
  findById,
  verifyPassword,
  markVerified,
  setResetToken,
  findByResetToken,
  resetPassword,
  getAllUsers,
  adminList,
  setActive,
  verifyUser,
  changeRole,
};
