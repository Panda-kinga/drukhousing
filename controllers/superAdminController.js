const User = require("../models/User");
const Listing = require("../models/Listing");
const v = require("../middleware/validation");
async function dashboard(req, res) {
  const users = await User.getAllUsers();
  const listings = await Listing.allForAdmin();
  res.render("superadmin-dashboard", {
    title: "Superadmin dashboard",
    users,
    listings,
  });
}
async function deactivate(req, res) {
  if (!(await Listing.deactivate(v.id(req.params.id))))
    v.fail("Listing not found.", 404);
  res.redirect("/superadmin/dashboard");
}
module.exports = { dashboard, deactivate };
