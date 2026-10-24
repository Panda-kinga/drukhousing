// Paste this file into a new Google Apps Script project.
// Replace the placeholder secret before deploying the web app.
const BRIDGE_SECRET = "replace_with_the_same_secret_used_by_render";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (!body.secret || body.secret !== BRIDGE_SECRET) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    if (!body.to || !body.subject || !body.text) {
      return json({ ok: false, error: "Missing email fields" }, 400);
    }

    GmailApp.sendEmail(body.to, body.subject, body.text, {
      htmlBody: body.html || body.text,
      name: body.fromName || "DrukHousing",
    });
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error) }, 500);
  }
}

function json(value, status) {
  return ContentService
    .createTextOutput(JSON.stringify({ ...value, status: status || 200 }))
    .setMimeType(ContentService.MimeType.JSON);
}
