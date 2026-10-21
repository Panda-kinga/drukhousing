const User = require("../models/User");
const Listing = require("../models/Listing");
const Admin = require("../models/Admin");
const Feedback = require("../models/Feedback");
const v = require("../middleware/validation");
async function dashboard(req, res) {
  const stats = await Admin.getStats();
  const actions = await Admin.recentActions();
  let feedback = { available: true, total: 0, averageRating: null };
  try {
    const result = await Feedback.getStats();
    feedback.total = result.total;
    feedback.averageRating = result.averageRating;
  } catch (error) {
    feedback = { available: false, total: null, averageRating: null };
  }
  res.render("superadmin-dashboard", {
    title: "Superadmin dashboard",
    stats,
    feedback,
    actions,
  });
}
async function deactivate(req, res) {
  const id = v.id(req.params.id);
  if (!(await Listing.deactivate(id)))
    v.fail("Listing not found.", 404);
  await Admin.logAction(req.session.user.id, "remove_listing", "listing", id);
  res.redirect("/superadmin/properties");
}
async function users(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const filters = {
    search: typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "",
    role: ["tenant", "landlord", "superadmin"].includes(req.query.role) ? req.query.role : "",
    verified: ["true", "false"].includes(req.query.verified) ? req.query.verified : "",
    page,
  };
  const [people, count] = await User.adminList(filters);
  res.render("superadmin-users", { title: "Manage users", people, filters, pageCount: Math.max(1, Math.ceil(count.total / 10)) });
}
async function setUserActive(req, res) {
  const id = v.id(req.params.id);
  const active = req.body.active === "true";
  if (!(await User.setActive(id, active))) v.fail("User not found.", 404);
  await Admin.logAction(req.session.user.id, active ? "reactivate_user" : "deactivate_user", "user", id);
  res.redirect("/superadmin/users");
}
async function verifyUser(req, res) {
  const id = v.id(req.params.id);
  if (!(await User.verifyUser(id))) v.fail("Unverified user not found.", 404);
  await Admin.logAction(req.session.user.id, "verify_user", "user", id);
  res.redirect("/superadmin/users");
}
async function changeRole(req, res) {
  const id = v.id(req.params.id);
  const role = req.body.role;
  if (!["tenant", "landlord"].includes(role)) v.fail("Role change is not allowed.");
  if (!(await User.changeRole(id, role))) v.fail("Only tenant and landlord roles can be changed.", 409);
  await Admin.logAction(req.session.user.id, "change_role_to_" + role, "user", id);
  res.redirect("/superadmin/users");
}
async function properties(req, res) {
  res.render("superadmin-properties", { title: "Manage properties", listings: await Listing.allForAdmin() });
}
async function restore(req, res) {
  const id = v.id(req.params.id);
  if (!(await Listing.restore(id))) v.fail("Property not found.", 404);
  await Admin.logAction(req.session.user.id, "restore_listing", "listing", id);
  res.redirect("/superadmin/properties");
}
async function inquiries(req, res) {
  res.render("superadmin-inquiries", { title: "All inquiries", inquiries: await require("../models/Application").allForAdmin() });
}
async function feedback(req, res) {
  let items = [];
  try { items = await Feedback.getAll(); } catch (error) { /* show an empty list if Mongo is unavailable */ }
  res.render("superadmin-feedback", { title: "All feedback", feedback: items });
}
async function deleteFeedback(req, res) {
  const id = req.params.id;
  if (!/^[a-f0-9]{24}$/i.test(id)) v.fail("Invalid feedback ID.");
  const result = await Feedback.deleteById(id);
  if (!result.deletedCount) v.fail("Feedback not found.", 404);
  await Admin.logAction(req.session.user.id, "delete_feedback", "feedback", 0);
  res.redirect("/superadmin/feedback");
}
module.exports = { dashboard, deactivate, users, setUserActive, verifyUser, changeRole, properties, restore, inquiries, feedback, deleteFeedback };
