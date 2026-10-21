const User = require("../models/User");
async function loadUser(req, res, next) {
  res.locals.user = null;
  if (req.session.user) {
    const user = await User.findById(req.session.user.id);
    if (!user || !user.is_verified || user.is_active === false) delete req.session.user;
    else {
      req.session.user = user;
      res.locals.user = user;
    }
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}
function requireApiAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Log in required." });
  next();
}
function requireApiTenant(req, res, next) {
  if (req.session.user.role !== "tenant")
    return res.status(403).json({ error: "Tenant access required." });
  next();
}
function requireRole(role) {
  return function (req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    if (req.session.user.role !== role)
      return res
        .status(403)
        .render("message", {
          title: "Access denied",
          message: "You do not have access to this page.",
        });
    next();
  };
}
function dashboard(role) {
  if (role === "landlord") return "/landlord/dashboard";
  if (role === "superadmin") return "/superadmin/dashboard";
  return "/tenant/dashboard";
}
module.exports = {
  loadUser,
  requireAuth,
  requireApiAuth,
  requireApiTenant,
  requireTenant: requireRole("tenant"),
  requireLandlord: requireRole("landlord"),
  requireSuperAdmin: requireRole("superadmin"),
  dashboard,
};
