const nodemailer = require("nodemailer");
const fromName = process.env.MAIL_FROM_NAME || "Campus Eats";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
async function sendEmail(to, subject, { name, link, text }) {
  return transporter.sendMail({
    from: `"${fromName}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:560px"><h1>DrukHousing</h1><p>Kuzuzangpo ${escapeHtml(name)}!</p><p>${escapeHtml(text)}</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#7b1e2b;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Continue</a></p></div>`,
  });
}
module.exports = { sendEmail };
