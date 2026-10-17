const db = require("../config/db");
async function createDocuments(applicationId, files, connection) {
  for (const file of files) {
    await connection.none(
      "INSERT INTO application_documents(application_id,file_path) VALUES($1,$2)",
      [applicationId, file.filename],
    );
  }
}
function forApplication(id) {
  return db.any(
    "SELECT id FROM application_documents WHERE application_id=$1 ORDER BY id",
    [id],
  );
}
function findAuthorized(id, user) {
  return db.oneOrNone(
    `SELECT d.file_path FROM application_documents d
    JOIN applications a ON a.id=d.application_id JOIN listings l ON l.id=a.listing_id
    WHERE d.id=$1 AND l.is_active=true AND
    (($3='tenant' AND a.tenant_id=$2) OR ($3='landlord' AND l.landlord_id=$2))`,
    [id, user.id, user.role],
  );
}
module.exports = { createDocuments, forApplication, findAuthorized };
