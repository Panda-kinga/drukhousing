const db = require("../config/db");
async function createPhotos(listingId, files, connection) {
  for (const file of files) {
    await connection.none(
      "INSERT INTO listing_photos(listing_id,file_path) VALUES($1,$2)",
      [listingId, file.filename],
    );
  }
}
function forListing(id) {
  return db.any(
    "SELECT id FROM listing_photos WHERE listing_id=$1 ORDER BY id",
    [id],
  );
}
function findById(id) {
  return db.oneOrNone(
    `SELECT p.file_path FROM listing_photos p JOIN listings l ON l.id=p.listing_id
    WHERE p.id=$1 AND l.is_active=true`,
    [id],
  );
}
module.exports = { createPhotos, forListing, findById };
