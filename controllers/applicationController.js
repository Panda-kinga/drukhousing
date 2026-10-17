const path = require("path");
const Listing = require("../models/Listing");
const Application = require("../models/Application");
const Document = require("../models/ApplicationDocument");
const v = require("../middleware/validation");
const { folder } = require("../middleware/upload");
async function showApply(req, res) {
  const listing = await Listing.findActive(v.id(req.params.id));
  if (!listing) v.fail("Listing not found.", 404);
  if (!listing.is_open) v.fail("The application deadline has passed.", 409);
  if (await Application.findForTenant(listing.id, req.session.user.id))
    v.fail("You have already applied to this listing.", 409);
  res.render("application-create", { title: "Apply for this home", listing });
}
async function apply(req, res) {
  const data = {
    full_name: v.text(req.body.full_name, "Full name", 100),
    phone: v.text(req.body.phone, "Phone", 30),
    notes: v.text(req.body.notes, "Notes", 2000, false),
  };
  if (!/^\+?[0-9 ()-]{7,20}$/.test(data.phone))
    v.fail("Enter a valid phone number.");
  await Application.createApplication(
    v.id(req.params.id),
    req.session.user.id,
    data,
    req.files || [],
  );
  req.uploadSaved = true;
  res.redirect("/tenant/applications");
}
async function review(req, res) {
  const listing = await Listing.findActive(v.id(req.params.id));
  if (!listing) v.fail("Listing not found.", 404);
  if (listing.landlord_id !== req.session.user.id)
    v.fail("Access denied.", 403);
  const applications = await Application.forListing(
    listing.id,
    req.session.user.id,
  );
  for (const application of applications)
    application.documents = await Document.forApplication(application.id);
  res.render("landlord-applications", {
    title: "Review applications",
    listing,
    applications,
  });
}
async function decide(req, res) {
  await Application.decide(
    v.id(req.params.id),
    v.id(req.params.applicationId),
    req.session.user.id,
    req.body.status,
  );
  res.redirect("/landlord/listings/" + req.params.id + "/applications");
}
async function document(req, res) {
  const document = await Document.findAuthorized(
    v.id(req.params.id),
    req.session.user,
  );
  if (!document) v.fail("Document not found.", 404);
  res.set("Cache-Control", "no-store");
  res.download(path.join(folder, path.basename(document.file_path)));
}
module.exports = { showApply, apply, review, decide, document };
