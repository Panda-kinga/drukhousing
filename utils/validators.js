function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

module.exports = { isValidEmail, isValidPassword };
