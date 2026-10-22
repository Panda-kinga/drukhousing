const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../config/mailer");
const v = require("../middleware/validation");
const { dashboard } = require("../middleware/auth");
const { isValidEmail, isValidPassword } = require("../utils/validators");
function token() {
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function baseUrl(req) {
  // In local development, use the address used to open the app.
  // Production always uses the trusted BASE_URL setting.
  const configuredUrl = process.env.BASE_URL || "";
  if (configuredUrl.startsWith("http://") && req && req.get("host"))
    return `${req.protocol}://${req.get("host")}`;
  return configuredUrl.replace(/\/$/, "");
}
function showSignup(req, res) {
  res.render("signup", { title: "Create an account" });
}
function showLogin(req, res) {
  res.render("login", { title: "Welcome back", error: null });
}
async function signup(req, res) {
  const name = v.text(req.body.name, "Name", 100);
  const email = v.email(req.body.email);
  const password = v.password(req.body.password);
  if (!isValidEmail(email) || !isValidPassword(password))
    v.fail("Enter a valid email and password.");
  const role = req.body.role;
  if (!["tenant", "landlord"].includes(role))
    v.fail("Choose Tenant or Landlord.");
  const verificationToken = token();
  const verificationLink = baseUrl(req) + "/verify/" + verificationToken;
  await User.createUser(
    name,
    email,
    password,
    role,
    hashToken(verificationToken),
  );
  try {
    await sendEmail(
      email,
      "Verify your DrukHousing account",
      {
        name,
        link: verificationLink,
        text: "Please verify your email address to activate your account.",
      },
    );
  } catch (error) {
    console.error(
      "Verification email could not be sent:",
      error.code || "SMTP error",
    );
    console.error("Verification link:", verificationLink);
    return res
      .status(503)
      .render("message", {
        title: "Email could not be sent",
        message:
          "Your account was saved, but the verification email could not be sent. Check the Gmail settings using the recovery steps in README, then retry signup.",
      });
  }
  res.render("message", {
    title: "Check your email",
    message:
      "Open the verification link in your inbox before logging in. Check Spam too.",
  });
}
async function verifyEmail(req, res) {
  const result = await User.markVerified(hashToken(req.params.token));
  if (!result)
    v.fail("This verification link is invalid or has already been used.");
  res.render("message", {
    title: "Email verified",
    message: "Your account is ready. You can now log in.",
  });
}
async function login(req, res) {
  // All unsuccessful logins use the same message, including unverified accounts.
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof req.body.password === "string" ? req.body.password : "";
  const user = await User.findByEmail(email);
  if (
    !user ||
    !password ||
    Buffer.byteLength(password) > 72 ||
    !(await User.verifyPassword(password, user.password_hash)) ||
    !user.is_verified ||
    user.is_active === false
  ) {
    return res
      .status(401)
      .render("login", {
        title: "Welcome back",
        error: "Incorrect email or password",
      });
  }
  await new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  res.redirect(dashboard(user.role));
}
async function logout(req, res) {
  await new Promise((resolve, reject) =>
    req.session.destroy((error) => (error ? reject(error) : resolve())),
  );
  res.clearCookie("drukhousing.sid");
  res.redirect("/");
}
function showForgotPassword(req, res) {
  res.render("forgot-password", { title: "Forgot password" });
}
async function forgotPassword(req, res) {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const resetToken = token();
  const found = await User.setResetToken(email, hashToken(resetToken));
  if (found) {
    try {
      await sendEmail(
        email,
        "Reset your DrukHousing password",
        {
          name: "there",
          link: baseUrl(req) + "/reset-password/" + resetToken,
          text: "This password reset link expires in one hour.",
        },
      );
    } catch (error) {
      console.error("Password reset email failed:", error.code || "SMTP error");
    }
  }
  res.render("message", {
    title: "Check your email",
    message:
      "If an account exists with that email, a password reset link will be sent.",
  });
}
async function showResetPassword(req, res) {
  if (!(await User.findByResetToken(hashToken(req.params.token))))
    v.fail("This reset link is invalid or expired.");
  res.render("reset-password", {
    title: "Choose a new password",
    token: req.params.token,
  });
}
async function resetPassword(req, res) {
  const password = v.password(req.body.password);
  if (!(await User.resetPassword(hashToken(req.params.token), password)))
    v.fail("This reset link is invalid or expired.");
  res.render("message", {
    title: "Password changed",
    message: "Log in with your new password.",
  });
}
module.exports = {
  showSignup,
  showLogin,
  signup,
  verifyEmail,
  login,
  logout,
  showForgotPassword,
  forgotPassword,
  showResetPassword,
  resetPassword,
};
