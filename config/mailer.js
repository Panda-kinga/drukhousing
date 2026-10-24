const bridgeUrl = (process.env.MAIL_BRIDGE_URL || "").trim();
const bridgeSecret = (process.env.MAIL_BRIDGE_SECRET || "").trim();
const fromName = (process.env.MAIL_FROM_NAME || "DrukHousing").trim();
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
async function sendEmail(to, subject, { name, link, text }) {
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:560px"><h1>DrukHousing</h1><p>Kuzuzangpo ${escapeHtml(name)}!</p><p>${escapeHtml(text)}</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#7b1e2b;color:#fff;padding:12px 18px;text-decoration:none;border-radius:4px">Continue</a></p></div>`;
  if (!bridgeUrl || !bridgeUrl.startsWith("https://"))
    throw new Error("MAIL_BRIDGE_URL must be an HTTPS Google Apps Script /exec URL.");
  if (!bridgeSecret)
    throw new Error("MAIL_BRIDGE_SECRET is empty.");
  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      secret: bridgeSecret,
      to,
      subject,
      text,
      html,
      fromName,
    }),
  });
  const details = await response.text();
  if (!response.ok) {
    throw new Error(`Mail bridge failed (${response.status}): ${details}`);
  }
  let result;
  try {
    result = details ? JSON.parse(details) : { ok: true };
  } catch {
    throw new Error(
      `Mail bridge returned non-JSON data. Check that the URL is a deployed /exec web-app URL: ${details.slice(0, 300)}`,
    );
  }
  if (!result.ok) throw new Error(`Mail bridge rejected the email: ${result.error || "unknown error"}`);
  return result;
}
module.exports = { sendEmail };
