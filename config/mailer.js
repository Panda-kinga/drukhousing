const nodemailer = require("nodemailer");
const gmailUser = (process.env.GMAIL_USER || "").trim();
// Google displays app passwords with spaces; SMTP needs the characters only.
const gmailPassword = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, "");
const fromName = (process.env.MAIL_FROM_NAME || "DrukHousing").trim();
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: gmailUser, pass: gmailPassword },
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
    from: `"${fromName}" <${gmailUser}>`,
    to,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:560px"><h1>DrukHousing</h1><p>Kuzuzangpo ${escapeHtml(name)}!</p><p>${escapeHtml(text)}</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#7b1e2b;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Continue</a></p></div>`,
  });
}
module.exports = { sendEmail };
