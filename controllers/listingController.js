const path = require("path");
const Listing = require("../models/Listing");
const Photo = require("../models/ListingPhoto");
const Application = require("../models/Application");
const v = require("../middleware/validation");
const { folder } = require("../middleware/upload");
function showCreate(req, res) {
  res.render("listing-create", { title: "List your home" });
}
async function create(req, res) {
  const data = {
    title: v.text(req.body.title, "Title", 150),
    location: v.text(req.body.location, "Location", 150),
    price: Number(req.body.price),
    type: req.body.type,
    lease_years: Number(req.body.lease_years),
    deadline: v.deadline(req.body.deadline),
  };
  if (
    !Number.isFinite(data.price) ||
    data.price <= 0 ||
    data.price >= 10000000000 ||
    Math.abs(data.price * 100 - Math.round(data.price * 100)) > 0.0001
  )
    v.fail("Enter a positive price with at most two decimal places.");
  if (!["apartment", "house", "room"].includes(data.type))
    v.fail("Choose a valid housing type.");
  if (
    !Number.isInteger(data.lease_years) ||
    data.lease_years < 1 ||
    data.lease_years > 100
  )
    v.fail("Lease duration must be 1 to 100 whole years.");
  if (!req.files || req.files.length === 0)
    v.fail("Upload at least one photo.");
  const listing = await Listing.createListing(
    req.session.user.id,
    data,
    req.files,
  );
  req.uploadSaved = true;
  res.redirect("/listings/" + listing.id);
}
async function details(req, res) {
  const id = v.id(req.params.id);
  const listing = await Listing.findActive(id);
  if (!listing) v.fail("Listing not found.", 404);
  const photos = await Photo.forListing(id);
  let application = null;
  if (req.session.user && req.session.user.role === "tenant")
    application = await Application.findForTenant(id, req.session.user.id);
  res.render("listing-detail", {
    title: listing.title,
    listing,
    photos,
    application,
  });
}
async function photo(req, res) {
  const photo = await Photo.findById(v.id(req.params.id));
  if (!photo) v.fail("Photo not found.", 404);
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(folder, path.basename(photo.file_path)));
}
async function apiList(req, res) {
  const search = v.text(req.query.q, "Search", 100, false);
  const type = v.text(req.query.type, "Type", 20, false);
  if (type && !["apartment", "house", "room"].includes(type))
    v.fail("Invalid housing type.");
  res.json(await Listing.browse(search, type));
}
async function apiDetail(req, res) {
  const listing = await Listing.findActive(v.id(req.params.id));
  if (!listing) v.fail("Listing not found.", 404);
  listing.photos = await Photo.forListing(listing.id);
  res.json(listing);
}
module.exports = { showCreate, create, details, photo, apiList, apiDetail };
