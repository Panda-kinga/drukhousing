const Feedback = require("../models/Feedback");
const Listing = require("../models/Listing");
const Application = require("../models/Application");
const v = require("../middleware/validation");
// Mongo cannot join PostgreSQL. Look up the title and hide inactive listings here.
async function withTitles(items, landlordId) {
  const visible = [];
  for (const item of items) {
    const listing = await Listing.findActive(item.listingId);
    if (
      listing &&
      (landlordId === undefined || listing.landlord_id === landlordId)
    ) {
      item.title = listing.title;
      visible.push(item);
    }
  }
  return visible;
}
async function tenantPage(req, res) {
  const feedback = await withTitles(
    await Feedback.getFeedbackForTenant(req.session.user.id),
  );
  const accepted = await Application.acceptedForTenant(req.session.user.id);
  const eligible = [];
  for (const listing of accepted) {
    let alreadyLeft = false;
    for (const item of feedback)
      if (item.listingId === listing.id) alreadyLeft = true;
    if (!alreadyLeft) eligible.push(listing);
  }
  res.render("tenant-feedback", { title: "My feedback", feedback, eligible });
}
async function submit(req, res) {
  const listingId = v.id(req.body.listing_id);
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    v.fail("Choose a rating from 1 to 5.");
  const comment = v.text(req.body.comment, "Comment", 2000, false);
  const listing = await Listing.findActive(listingId);
  if (!listing) v.fail("Listing not found.", 404);
  const application = await Application.findForTenant(
    listingId,
    req.session.user.id,
  );
  if (!application || application.status !== "accepted")
    v.fail("Only accepted applicants can leave feedback.", 403);
  await Feedback.createFeedback(
    listing.id,
    listing.landlord_id,
    req.session.user.id,
    req.session.user.name,
    rating,
    comment,
  );
  res.redirect("/tenant/feedback");
}
async function landlordPage(req, res) {
  const id = req.session.user.id;
  const feedback = await withTitles(
    await Feedback.getFeedbackForLandlord(id),
    id,
  );
  res.render("landlord-feedback", { title: "Customer feedback", feedback });
}
module.exports = { tenantPage, submit, landlordPage };
