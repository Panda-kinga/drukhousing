const path = require("path");
const Listing = require("../models/Listing");
const Photo = require("../models/ListingPhoto");
const Application = require("../models/Application");
const v = require("../middleware/validation");
const { folder } = require("../middleware/upload");
const { bhutanLocations, isValidDzongkhag, isValidGewog } = require("../data/bhutanLocations");
function locationFields(body) {
  const dzongkhag = v.text(body.dzongkhag, "Dzongkhag", 50);
  const gewog = v.text(body.gewog, "Gewog", 80);
  if (!isValidDzongkhag(dzongkhag)) v.fail("Choose a valid Dzongkhag.");
  if (!isValidGewog(dzongkhag, gewog))
    v.fail("Choose a Gewog that belongs to the selected Dzongkhag.");
  return { dzongkhag, gewog };
}
function showCreate(req, res) {
  res.render("listing-create", { title: "List your home" });
}
async function showEdit(req, res) {
  const id = v.id(req.params.id);
  const listing = await Listing.findActive(id);
  if (!listing) v.fail("Listing not found.", 404);
  if (listing.landlord_id !== req.session.user.id) v.fail("Access denied.", 403);
  res.render("listing-edit", { title: "Edit your home", listing });
}
async function create(req, res) {
  const data = {
    title: v.text(req.body.title, "Title", 150),
    location: v.text(req.body.location, "Location", 150),
    ...locationFields(req.body),
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
async function update(req, res) {
  const data = {
    title: v.text(req.body.title, "Title", 150),
    location: v.text(req.body.location, "Location", 150),
    ...locationFields(req.body),
    price: Number(req.body.price),
    type: req.body.type,
    lease_years: Number(req.body.lease_years),
    deadline: v.deadline(req.body.deadline),
  };
  if (!Number.isFinite(data.price) || data.price <= 0 || data.price >= 10000000000)
    v.fail("Enter a valid price.");
  if (!["apartment", "house", "room"].includes(data.type)) v.fail("Choose a valid housing type.");
  if (!Number.isInteger(data.lease_years) || data.lease_years < 1 || data.lease_years > 100)
    v.fail("Lease duration must be 1 to 100 whole years.");
  if (!(await Listing.updateListing(v.id(req.params.id), req.session.user.id, data)))
    v.fail("Access denied.", 403);
  res.redirect("/landlord/dashboard");
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
  const dzongkhag = v.text(req.query.dzongkhag, "Dzongkhag", 50, false);
  const gewog = v.text(req.query.gewog, "Gewog", 80, false);
  if (type && !["apartment", "house", "room"].includes(type))
    v.fail("Invalid housing type.");
  if (dzongkhag && !isValidDzongkhag(dzongkhag))
    v.fail("Invalid Dzongkhag.");
  if (gewog && (!dzongkhag || !isValidGewog(dzongkhag, gewog)))
    v.fail("Invalid Gewog for the selected Dzongkhag.");
  res.json(await Listing.browse(search, type, dzongkhag, gewog));
}
function apiLocations(req, res) {
  res.json(bhutanLocations);
}
async function apiDetail(req, res) {
  let id;
  try { id = v.id(req.params.id); } catch (error) { v.fail("Listing not found.", 404); }
  const listing = await Listing.findActive(id);
  if (!listing) v.fail("Listing not found.", 404);
  listing.photos = await Photo.forListing(listing.id);
  res.json(listing);
}
module.exports = { showCreate, showEdit, create, update, details, photo, apiList, apiLocations, apiDetail };
