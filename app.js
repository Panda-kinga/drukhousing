// Keep all dates consistent with Bhutan, including PostgreSQL TIMESTAMP parsing.
process.env.TZ = "Asia/Thimphu";
require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./config/db");
const { loadUser } = require("./middleware/auth");
const csrf = require("./middleware/csrf");
const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.disable("x-powered-by");
app.locals.user = null;
app.locals.csrf = "";
app.use((req, res, next) => {
  res.locals.siteName = "DrukHousing";
  next();
});
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "same-origin");
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));
app.use(express.json({ limit: "30kb" }));
app.use(
  session({
    name: "drukhousing.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 },
  }),
);
app.use(csrf.setup);
app.use(loadUser);
app.locals.formatDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Thimphu",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
app.locals.money = (value) =>
  Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
app.use("/", require("./routes/index"));
app.use((req, res, next) =>
  next(Object.assign(new Error("Page not found."), { status: 404 })),
);
app.use(require("./middleware/errors").handle);
module.exports = app;
