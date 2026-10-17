const crypto = require("crypto");
function setup(req, res, next) {
  if (!req.session.csrf)
    req.session.csrf = crypto.randomBytes(32).toString("hex");
  res.locals.csrf = req.session.csrf;
  next();
}
function check(req, res, next) {
  const token = req.body && req.body._csrf;
  if (typeof token !== "string" || token !== req.session.csrf) {
    return next(
      Object.assign(
        new Error("This form expired. Reload the page and try again."),
        { status: 403 },
      ),
    );
  }
  next();
}
module.exports = { setup, check };
