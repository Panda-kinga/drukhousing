const Listing = require("../models/Listing");
async function dashboard(req, res) {
  const listings = await Listing.forLandlord(req.session.user.id);
  res.render("landlord-dashboard", { title: "My listings", listings });
}
module.exports = { dashboard };
