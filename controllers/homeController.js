const Listing = require("../models/Listing");
const v = require("../middleware/validation");
async function getHome(req, res) {
  const search = v.text(req.query.q, "Search", 100, false);
  const type = v.text(req.query.type, "Type", 20, false);
  if (type && !["apartment", "house", "room"].includes(type))
    v.fail("Invalid housing type.");
  const listings = await Listing.browse(search, type);
  res.render("index", { title: "Find your next home", listings, search, type });
}
module.exports = { getHome };
