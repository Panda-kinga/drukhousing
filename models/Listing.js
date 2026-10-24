const db = require("../config/db");
const Photo = require("./ListingPhoto");
const now = "(clock_timestamp() AT TIME ZONE 'Asia/Thimphu')";

async function createListing(landlordId, data, files) {
  return db.tx(async (t) => {
    const listing = await t.one(
      `INSERT INTO listings(landlord_id,title,location,dzongkhag,gewog,price,type,lease_years,deadline)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9::timestamp WHERE $9::timestamp > ${now} RETURNING id`,
      [
        landlordId,
        data.title,
        data.location,
        data.dzongkhag,
        data.gewog,
        data.price,
        data.type,
        data.lease_years,
        data.deadline,
      ],
    );
    await Photo.createPhotos(listing.id, files, t);
    return listing;
  });
}

function browse(search = "", type = "", dzongkhag = "", gewog = "") {
  return db.any(
    `SELECT l.*, (
      SELECT MIN(id) FROM listing_photos
      WHERE listing_id=l.id AND image_data IS NOT NULL
    ) AS photo_id
    FROM listings l WHERE l.is_active=true AND l.deadline > ${now}
    AND (l.title ILIKE $1 OR l.location ILIKE $1) AND ($2='' OR l.type=$2)
    AND ($3='' OR l.dzongkhag=$3) AND ($4='' OR l.gewog=$4)
    ORDER BY l.created_at DESC,l.id DESC`,
    ["%" + search + "%", type, dzongkhag, gewog],
  );
}

function findActive(id, connection = db, lock = false) {
  let sql = `SELECT *, deadline > ${now} AS is_open FROM listings WHERE id=$1 AND is_active=true`;
  if (lock) sql += " FOR UPDATE";
  return connection.oneOrNone(sql, [id]);
}

// Recheck time AFTER a row lock is acquired (a competing transaction may have waited).
function isOpen(id, connection = db) {
  return connection.one(
    `SELECT deadline > ${now} AS open FROM listings WHERE id=$1`,
    [id],
  );
}

function forLandlord(landlordId) {
  return db.any(
    `SELECT l.*, (SELECT COUNT(*) FROM applications a WHERE a.listing_id=l.id) AS application_count
    FROM listings l WHERE l.landlord_id=$1 AND l.is_active=true ORDER BY l.id DESC`,
    [landlordId],
  );
}

function allForAdmin() {
  return db.any(
    `SELECT l.*,u.name AS landlord_name FROM listings l JOIN users u ON u.id=l.landlord_id ORDER BY l.id DESC`,
  );
}

function deactivate(id) {
  return db.oneOrNone(
    "UPDATE listings SET is_active=false WHERE id=$1 RETURNING id",
    [id],
  );
}

function restore(id) {
  return db.oneOrNone("UPDATE listings SET is_active=true WHERE id=$1 RETURNING id", [id]);
}

function updateListing(id, landlordId, data) {
  return db.oneOrNone(
    `UPDATE listings SET title=$3,location=$4,dzongkhag=$5,gewog=$6,price=$7,type=$8,lease_years=$9,deadline=$10::timestamp
     WHERE id=$1 AND landlord_id=$2 RETURNING id`,
    [id, landlordId, data.title, data.location, data.dzongkhag, data.gewog, data.price, data.type, data.lease_years, data.deadline],
  );
}

module.exports = {
  createListing,
  browse,
  findActive,
  isOpen,
  forLandlord,
  allForAdmin,
  deactivate,
  restore,
  updateListing,
};
