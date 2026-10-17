const Application = require("../models/Application");
async function dashboard(req, res) {
  const applications = await Application.forTenant(req.session.user.id);
  let pending = 0;
  let accepted = 0;
  for (const application of applications) {
    if (application.status === "pending") pending++;
    if (application.status === "accepted") accepted++;
  }
  res.render("tenant-dashboard", {
    title: "Your dashboard",
    applications,
    pending,
    accepted,
  });
}
async function applications(req, res) {
  res.render("tenant-applications", {
    title: "My applications",
    applications: await Application.forTenant(req.session.user.id),
  });
}
module.exports = { dashboard, applications };
