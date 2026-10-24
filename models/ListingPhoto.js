
const crypto = require("crypto");
const path = require("path");
const db = require("../config/db");

async function createPhotos(listingId, files, connection) {
  for (const file of files) {
    const extension = path.extname(file.originalname).toLowerCase();
    const filePath = crypto.randomUUID() + extension;

    await connection.none(
      `INSERT INTO listing_photos
       (listing_id, file_path, image_data, content_type)
       VALUES ($1, $2, $3, $4)`,
      [listingId, filePath, file.buffer, file.mimetype],
    );
  }
}

function forListing(id) {
  return db.any(
    `SELECT id, content_type
     FROM listing_photos
     WHERE listing_id = $1
       AND image_data IS NOT NULL
     ORDER BY id`,
    [id],
  );
}

function findById(id) {
  return db.oneOrNone(
    `SELECT p.image_data, p.content_type
     FROM listing_photos p
     JOIN listings l ON l.id = p.listing_id
     WHERE p.id = $1
       AND l.is_active = true
       AND p.image_data IS NOT NULL`,
    [id],
  );
}

module.exports = {
  createPhotos,
  forListing,
  findById,
};
