const { cleanup } = require("./upload");
async function handle(error, req, res, next) {
  await cleanup(req);
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === "23505") {
    status = 409;
    message =
      "This email is already registered, or you have already applied to this listing.";
  }
  if (error.code === 11000) {
    status = 409;
    message = "You have already left feedback for this listing.";
  }
  if (error.code === "23514" || error.code === 0) {
    status = 400;
    message = "Check your entries. The deadline must be in the future.";
  }
  if (error.name === "MulterError") {
    status = 400;
    message =
      "Upload at most 6 photos or 3 documents, each no larger than 5 MB.";
  }
  if (status >= 500) {
    console.error("Request failed:", error.code || error.name);
    message =
      "Something went wrong. Please try again and check your database connections.";
  }
  if (req.path.startsWith("/api/"))
    return res.status(status).json({ error: message });
  res
    .status(status)
    .render("message", {
      title: status === 404 ? "Not found" : "Unable to continue",
      message,
    });
}
module.exports = { handle };
