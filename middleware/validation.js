function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function text(value, label, max, required = true) {
  if (typeof value !== "string") {
    if (!required && value === undefined) return "";
    fail(label + " is required.");
  }
  value = value.trim();
  if ((required && !value) || value.length > max)
    fail(
      label +
        " must contain " +
        (required ? "1" : "0") +
        " to " +
        max +
        " characters.",
    );
  return value;
}
function id(value) {
  if (
    !/^[1-9][0-9]*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 2147483647
  )
    fail("Invalid ID.");
  return Number(value);
}
function email(value) {
  value = text(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    fail("Enter a valid email address.");
  return value;
}
function password(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    Buffer.byteLength(value, "utf8") > 72
  )
    fail("Password must be at least 8 characters and no more than 72 bytes.");
  return value;
}
function deadline(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  )
    fail("Enter a valid deadline.");
  const date = new Date(value + ":00+06:00");
  if (!Number.isFinite(date.getTime())) fail("Enter a valid deadline.");
  const roundTrip = new Date(date.getTime() + 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  if (roundTrip !== value) fail("Enter a valid calendar date.");
  return value.replace("T", " ");
}
module.exports = { fail, text, id, email, password, deadline };
