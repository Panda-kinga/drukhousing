const db = require("../config/db");
const Listing = require("./Listing");
const Document = require("./ApplicationDocument");
function problem(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
async function createApplication(listingId, tenantId, data, files) {
  return db.tx(async (t) => {
    const listing = await Listing.findActive(listingId, t, true);
    if (!listing) throw problem("Listing not found.", 404);
    const time = await Listing.isOpen(listingId, t);
    if (!time.open) throw problem("The application deadline has passed.", 409);
    const application = await t.one(
      `INSERT INTO applications(listing_id,tenant_id,full_name,phone,notes)
      VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [listingId, tenantId, data.full_name, data.phone, data.notes],
    );
    await Document.createDocuments(application.id, files, t);
    return application;
  });
}
function forTenant(tenantId) {
  return db.any(
    `SELECT a.*,l.title,l.location,l.deadline FROM applications a
    JOIN listings l ON l.id=a.listing_id WHERE a.tenant_id=$1 AND l.is_active=true ORDER BY a.id DESC`,
    [tenantId],
  );
}
function forListing(listingId, landlordId) {
  return db.any(
    `SELECT a.* FROM applications a JOIN listings l ON l.id=a.listing_id
    WHERE l.id=$1 AND l.landlord_id=$2 AND l.is_active=true ORDER BY a.created_at,a.id`,
    [listingId, landlordId],
  );
}
function findForTenant(listingId, tenantId) {
  return db.oneOrNone(
    `SELECT a.* FROM applications a JOIN listings l ON l.id=a.listing_id
    WHERE a.listing_id=$1 AND a.tenant_id=$2 AND l.is_active=true`,
    [listingId, tenantId],
  );
}
async function decide(listingId, applicationId, landlordId, status) {
  if (!["accepted", "rejected"].includes(status))
    throw problem("Choose accept or reject.");
  return db.tx(async (t) => {
    const listing = await Listing.findActive(listingId, t, true);
    if (!listing) throw problem("Listing not found.", 404);
    if (listing.landlord_id !== landlordId)
      throw problem("Access denied.", 403);
    const updated = await t.oneOrNone(
      `UPDATE applications SET status=$4
      WHERE id=$1 AND listing_id=$2 AND status=$3 RETURNING id`,
      [applicationId, listingId, "pending", status],
    );
    if (!updated)
      throw problem("Application not found or already reviewed.", 409);
    return updated;
  });
}
function acceptedForTenant(tenantId) {
  return db.any(
    `SELECT l.id,l.title,l.landlord_id FROM applications a JOIN listings l ON l.id=a.listing_id
    WHERE a.tenant_id=$1 AND a.status='accepted' AND l.is_active=true ORDER BY l.id DESC`,
    [tenantId],
  );
}
function allForAdmin() {
  return db.any(`SELECT a.id,a.status,a.created_at,l.title,
    tenant.name AS tenant_name, tenant.email AS tenant_email,
    landlord.name AS landlord_name, landlord.email AS landlord_email
    FROM applications a JOIN listings l ON l.id=a.listing_id
    JOIN users tenant ON tenant.id=a.tenant_id
    JOIN users landlord ON landlord.id=l.landlord_id
    ORDER BY a.created_at DESC, a.id DESC`);
}
module.exports = {
  createApplication,
  forTenant,
  forListing,
  findForTenant,
  decide,
  acceptedForTenant,
  allForAdmin,
};
