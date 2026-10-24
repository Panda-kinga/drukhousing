const Listing = require("../models/Listing");
const v = require("../middleware/validation");
const { bhutanLocations, isValidDzongkhag, isValidGewog } = require("../data/bhutanLocations");
async function getHome(req, res) {
  const search = v.text(req.query.q, "Search", 100, false);
  const type = v.text(req.query.type, "Type", 20, false);
  const dzongkhag = v.text(req.query.dzongkhag, "Dzongkhag", 50, false);
  const gewog = v.text(req.query.gewog, "Gewog", 80, false);
  if (type && !["apartment", "house", "room"].includes(type))
    v.fail("Invalid housing type.");
  if (dzongkhag && !isValidDzongkhag(dzongkhag)) v.fail("Invalid Dzongkhag.");
  if (gewog && (!dzongkhag || !isValidGewog(dzongkhag, gewog)))
    v.fail("Invalid Gewog for the selected Dzongkhag.");
  const listings = await Listing.browse(search, type, dzongkhag, gewog);
  res.render("index", { title: "Find your next home", listings, search, type, dzongkhag, gewog, locations: bhutanLocations });
}
module.exports = { getHome };
