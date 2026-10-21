const { getMongo } = require("../config/mongo");
function collection() {
  return getMongo().collection("feedback");
}
async function ensureIndexes() {
  await collection().createIndex(
    { listingId: 1, tenantId: 1 },
    { unique: true },
  );
  await collection().createIndex({ landlordId: 1, createdAt: -1 });
  await collection().createIndex({ tenantId: 1, createdAt: -1 });
}
function createFeedback(
  listingId,
  landlordId,
  tenantId,
  tenantName,
  rating,
  comment,
) {
  return collection().insertOne({
    listingId,
    landlordId,
    tenantId,
    tenantName,
    rating,
    comment,
    createdAt: new Date(),
  });
}
function getFeedbackForListing(listingId) {
  return collection().find({ listingId }).sort({ createdAt: -1 }).toArray();
}
function getFeedbackForLandlord(landlordId) {
  return collection().find({ landlordId }).sort({ createdAt: -1 }).toArray();
}
function getFeedbackForTenant(tenantId) {
  return collection().find({ tenantId }).sort({ createdAt: -1 }).toArray();
}
async function getStats() {
  const result = await collection().aggregate([
    { $group: { _id: null, total: { $sum: 1 }, averageRating: { $avg: "$rating" } } },
  ]).toArray();
  return result[0] || { total: 0, averageRating: null };
}
function getAll() {
  return collection().find({}).sort({ createdAt: -1 }).toArray();
}
function deleteById(id) {
  const { ObjectId } = require("mongodb");
  return collection().deleteOne({ _id: new ObjectId(id) });
}
module.exports = {
  ensureIndexes,
  createFeedback,
  getFeedbackForListing,
  getFeedbackForLandlord,
  getFeedbackForTenant,
  getStats,
  getAll,
  deleteById,
};
