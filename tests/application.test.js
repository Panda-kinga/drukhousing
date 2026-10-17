// Automated checks use an in-memory PostgreSQL engine (PGlite).
// Gmail and MongoDB are doubles: these tests never send email or need local services.
process.env.TZ = "Asia/Thimphu";
process.env.SESSION_SECRET = "test-only-long-secret-not-for-real-accounts";
process.env.APP_URL = "http://localhost:3000";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");
const { PGlite } = require("@electric-sql/pglite");
const postgres = new PGlite();
const db = {
  async any(sql, values = []) {
    return (await postgres.query(sql, values)).rows;
  },
  async oneOrNone(sql, values = []) {
    const rows = await db.any(sql, values);
    return rows[0] || null;
  },
  async one(sql, values = []) {
    const result = await db.oneOrNone(sql, values);
    if (!result) throw Object.assign(new Error("No row returned"), { code: 0 });
    return result;
  },
  async none(sql, values = []) {
    await postgres.query(sql, values);
  },
  async tx(callback) {
    await postgres.exec("BEGIN");
    try {
      const result = await callback(db);
      await postgres.exec("COMMIT");
      return result;
    } catch (error) {
      await postgres.exec("ROLLBACK");
      throw error;
    }
  },
};
function replaceModule(name, exports) {
  const filename = require.resolve(name);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
replaceModule("../config/db", db);
const emails = [];
replaceModule("../config/mailer", {
  async sendEmail(to, subject, text) {
    emails.push({ to, subject, text });
  },
});
const feedbackDocuments = [];
const collection = {
  async createIndex() {},
  async insertOne(document) {
    for (const item of feedbackDocuments) {
      if (
        item.listingId === document.listingId &&
        item.tenantId === document.tenantId
      ) {
        throw Object.assign(new Error("Duplicate feedback"), { code: 11000 });
      }
    }
    feedbackDocuments.push(document);
  },
  find(filter) {
    assert.ok(Object.keys(filter).length > 0, "Feedback must always be scoped");
    const matching = [];
    for (const item of feedbackDocuments) {
      let matches = true;
      for (const key of Object.keys(filter))
        if (item[key] !== filter[key]) matches = false;
      if (matches) matching.push({ ...item });
    }
    return {
      sort() {
        return {
          async toArray() {
            return matching.reverse();
          },
        };
      },
    };
  },
};
replaceModule("../config/mongo", {
  getMongo() {
    return {
      collection() {
        return collection;
      },
    };
  },
  async connectMongo() {},
  async closeMongo() {},
});
const { app } = require("../app");
const uploads = path.join(__dirname, "../uploads");
const originalFiles = new Set(fs.readdirSync(uploads));
const tinyPng = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082",
  "hex",
);
async function csrf(agent, url = "/login") {
  const response = await agent.get(url);
  assert.equal(response.status, 200, response.text.slice(0, 200));
  const match = response.text.match(/name="_csrf" value="([a-f0-9]+)"/);
  assert.ok(match, "Form contains CSRF protection");
  return match[1];
}
async function signup(agent, email, role, name) {
  const token = await csrf(agent, "/signup");
  const response = await agent
    .post("/signup")
    .type("form")
    .send({ _csrf: token, name, email, password: "Password123!", role });
  assert.equal(response.status, 200);
  const emailMessage = emails.at(-1);
  assert.equal(emailMessage.to, email);
  const link = emailMessage.text.match(/\/verify\/[a-f0-9]+/)[0];
  return link;
}
async function login(agent, email) {
  const token = await csrf(agent);
  return agent
    .post("/login")
    .type("form")
    .send({ _csrf: token, email, password: "Password123!" });
}
function futureDeadline() {
  return new Date(Date.now() + 6 * 3600000 + 86400000)
    .toISOString()
    .slice(0, 16);
}
async function createListing(agent, title) {
  const token = await csrf(agent, "/landlord/listings/new");
  return agent
    .post("/landlord/listings")
    .field("_csrf", token)
    .field("title", title)
    .field("location", "Paro, Bhutan")
    .field("price", "12000")
    .field("type", "house")
    .field("lease_years", "2")
    .field("deadline", futureDeadline())
    .attach("photos", tinyPng, {
      filename: "house.png",
      contentType: "image/png",
    });
}
async function apply(agent, listingId) {
  const token = await csrf(agent, "/listings/" + listingId + "/apply");
  return agent
    .post("/listings/" + listingId + "/apply")
    .field("_csrf", token)
    .field("full_name", "Tashi Tenant")
    .field("phone", "17123456")
    .field("notes", "Looking for a family home.")
    .attach("documents", Buffer.from("%PDF-1.4\nTest document"), {
      filename: "document.pdf",
      contentType: "application/pdf",
    });
}
test("DrukHousing routes and business rules", async (t) => {
  await postgres.exec(
    fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"),
  );
  const tenant = request.agent(app);
  const landlord = request.agent(app);
  const otherLandlord = request.agent(app);
  const admin = request.agent(app);
  const visitor = request.agent(app);
  let listingId, secondId, applicationId, documentId, photoId;
  try {
    await t.test(
      "Public page renders; private pages redirect to shared login",
      async () => {
        assert.equal((await visitor.get("/")).status, 200);
        assert.equal(
          (await visitor.get("/tenant/dashboard")).headers.location,
          "/login",
        );
        assert.equal(
          (await visitor.get("/landlord/dashboard")).headers.location,
          "/login",
        );
      },
    );
    await t.test(
      "Signup cannot create superadmin; missing CSRF is rejected",
      async () => {
        let response = await visitor
          .post("/signup")
          .send({ role: "superadmin" });
        assert.equal(response.status, 403);
        const token = await csrf(visitor, "/signup");
        response = await visitor
          .post("/signup")
          .type("form")
          .send({
            _csrf: token,
            name: "Bad",
            email: "bad@example.com",
            password: "Password123!",
            role: "superadmin",
          });
        assert.equal(response.status, 400);
        assert.equal(
          await db.oneOrNone(
            "SELECT id FROM users WHERE email='bad@example.com'",
          ),
          null,
        );
      },
    );
    await t.test(
      "Signup stores tenant role; unverified login stays generic; verification token is one-use",
      async () => {
        const link = await signup(
          tenant,
          "tenant@example.com",
          "tenant",
          "Tashi",
        );
        const user = await db.one(
          "SELECT * FROM users WHERE email='tenant@example.com'",
        );
        assert.equal(user.role, "tenant");
        assert.notEqual(user.password_hash, "Password123!");
        assert.ok(!link.includes(user.verification_token));
        const denied = await login(tenant, "tenant@example.com");
        assert.equal(denied.status, 401);
        assert.match(denied.text, /Incorrect email or password/);
        assert.equal((await tenant.get(link)).status, 200);
        assert.equal((await tenant.get(link)).status, 400);
        assert.equal(
          (await login(tenant, "tenant@example.com")).headers.location,
          "/tenant/dashboard",
        );
      },
    );
    await t.test(
      "Landlord and SQL-promoted superadmin land on their role dashboards",
      async () => {
        for (const data of [
          [landlord, "owner@example.com", "landlord", "Pema"],
          [otherLandlord, "other@example.com", "landlord", "Sonam"],
          [admin, "admin@example.com", "tenant", "Admin"],
        ]) {
          const link = await signup(...data);
          await data[0].get(link);
        }
        await db.none(
          "UPDATE users SET role='superadmin' WHERE email='admin@example.com'",
        );
        assert.equal(
          (await login(landlord, "owner@example.com")).headers.location,
          "/landlord/dashboard",
        );
        await login(otherLandlord, "other@example.com");
        assert.equal(
          (await login(admin, "admin@example.com")).headers.location,
          "/superadmin/dashboard",
        );
        assert.equal((await tenant.get("/landlord/dashboard")).status, 403);
        assert.equal((await landlord.get("/superadmin/dashboard")).status, 403);
      },
    );
    await t.test(
      "Database CHECK and foreign keys reject invalid records",
      async () => {
        await assert.rejects(
          db.none(
            "INSERT INTO users(name,email,password_hash,role) VALUES('X','x@example.com','hash','hacker')",
          ),
        );
        await assert.rejects(
          db.none(
            "INSERT INTO listing_photos(listing_id,file_path) VALUES(9999,'bad.png')",
          ),
        );
        const user = await db.one(
          "SELECT id FROM users WHERE email='tenant@example.com'",
        );
        await assert.rejects(
          db.none(
            "INSERT INTO listings(landlord_id,title,location,price,type,lease_years,deadline) VALUES($1,'Bad','Paro',20,'house',1,localtimestamp+interval '1 day')",
            [user.id],
          ),
        );
      },
    );
    await t.test(
      "Landlord creates listing with photo; search and JSON share models",
      async () => {
        const result = await createListing(landlord, "Paro family home");
        assert.equal(result.status, 302, result.text);
        listingId = Number(result.headers.location.split("/").at(-1));
        photoId = (
          await db.one("SELECT id FROM listing_photos WHERE listing_id=$1", [
            listingId,
          ])
        ).id;
        assert.equal((await visitor.get("/photos/" + photoId)).status, 200);
        const list = await visitor.get("/api/listings?q=Paro&type=house");
        assert.equal(list.body.length, 1);
        assert.equal(list.body[0].title, "Paro family home");
        assert.equal(
          (await visitor.get("/api/listings?q=missing")).body.length,
          0,
        );
        assert.equal(
          (await visitor.get("/api/listings/" + listingId)).status,
          200,
        );
        assert.equal((await visitor.get("/api/listings/invalid")).status, 400);
        const other = await createListing(otherLandlord, "Other landlord home");
        secondId = Number(other.headers.location.split("/").at(-1));
        assert.equal((await visitor.get('/')).status, 200);
        assert.equal((await visitor.get('/listings/'+listingId)).status, 200);
        assert.equal((await landlord.get('/landlord/dashboard')).status, 200);
        assert.equal((await tenant.get('/tenant/dashboard')).status, 200);

      },
    );
    await t.test(
      "File content checks and file-size limits reject invalid uploads and clean up",
      async () => {
        const token = await csrf(landlord, "/landlord/listings/new");
        const before = fs.readdirSync(uploads).length;
        let result = await landlord
          .post("/landlord/listings")
          .field("_csrf", token)
          .attach("photos", Buffer.from("<script>bad</script>"), {
            filename: "fake.png",
            contentType: "image/png",
          });
        assert.equal(result.status, 400);
        result = await landlord
          .post("/landlord/listings")
          .field("_csrf", token)
          .attach("photos", Buffer.alloc(5 * 1024 * 1024 + 1), {
            filename: "big.png",
            contentType: "image/png",
          });
        assert.equal(result.status, 400);
        assert.equal(fs.readdirSync(uploads).length, before);
      },
    );
    await t.test(
      "Application and document save together; document is private",
      async () => {
        const response = await apply(tenant, listingId);
        assert.equal(response.status, 302, response.text);
        applicationId = (
          await db.one("SELECT id FROM applications WHERE listing_id=$1", [
            listingId,
          ])
        ).id;
        documentId = (
          await db.one(
            "SELECT id FROM application_documents WHERE application_id=$1",
            [applicationId],
          )
        ).id;
        assert.equal(
          (await tenant.get("/documents/" + documentId)).status,
          200,
        );
        assert.equal(
          (await landlord.get("/documents/" + documentId)).status,
          200,
        );
        assert.equal(
          (await otherLandlord.get("/documents/" + documentId)).status,
          404,
        );
        assert.equal(
          (await visitor.get("/documents/" + documentId)).headers.location,
          "/login",
        );
        const file = await db.one(
          "SELECT file_path FROM application_documents WHERE id=$1",
          [documentId],
        );
        assert.equal(
          (await visitor.get("/uploads/" + file.file_path)).status,
          404,
        );
      },
    );
    await t.test(
      "A duplicate application is rejected by PostgreSQL UNIQUE constraint",
      async () => {
        const token = await csrf(tenant);
        const response = await tenant
          .post("/listings/" + listingId + "/apply")
          .field("_csrf", token)
          .field("full_name", "Tashi")
          .field("phone", "17123456");
        assert.equal(response.status, 409);
        assert.equal(
          Number(
            (
              await db.one(
                "SELECT COUNT(*) FROM applications WHERE listing_id=$1",
                [listingId],
              )
            ).count,
          ),
          1,
        );
      },
    );
    await t.test(
      "Document insert failure rolls back the application and removes new files",
      async () => {
        const originalNone = db.none;
        db.none = async function (sql, values) {
          if (sql.startsWith("INSERT INTO application_documents"))
            throw new Error("Test document insert failure");
          return originalNone(sql, values);
        };
        const before = fs.readdirSync(uploads).length;
        try {
          assert.equal((await apply(tenant, secondId)).status, 500);
        } finally {
          db.none = originalNone;
        }
        assert.equal(
          await db.oneOrNone(
            "SELECT id FROM applications WHERE listing_id=$1",
            [secondId],
          ),
          null,
        );
        assert.equal(fs.readdirSync(uploads).length, before);
      },
    );
    await t.test(
      "Only owner can review; decisions can be made before the deadline",
      async () => {
        assert.equal(
          (
            await otherLandlord.get(
              "/landlord/listings/" + listingId + "/applications",
            )
          ).status,
          403,
        );
        const token = await csrf(landlord);
        const response = await landlord
          .post(
            "/landlord/listings/" +
              listingId +
              "/applications/" +
              applicationId,
          )
          .type("form")
          .send({ _csrf: token, status: "accepted" });
        assert.equal(response.status, 302);
        assert.equal(
          (await db.one("SELECT status FROM applications WHERE id=$1", [applicationId])).status,
          "accepted",
        );
      },
    );
    await t.test("Unaccepted tenants cannot leave feedback", async () => {
      const token = await csrf(tenant);
      const response = await tenant
        .post("/tenant/feedback")
        .type("form")
        .send({ _csrf: token, listing_id: secondId, rating: "5" });
      assert.equal(response.status, 403);
    });
    await t.test(
      "Expired listing disappears from search and rejects new applications",
      async () => {
        await db.none(
          "UPDATE listings SET created_at=localtimestamp-interval '2 days',deadline=localtimestamp-interval '1 hour' WHERE id=$1",
          [listingId],
        );
        const list = await visitor.get("/api/listings");
        assert.ok(!list.body.some((row) => row.id === listingId));
        assert.equal(
          (await tenant.get("/listings/" + listingId + "/apply")).status,
          409,
        );
        const token = await csrf(tenant);
        const response = await tenant
          .post("/listings/" + listingId + "/apply")
          .field("_csrf", token)
          .field("full_name", "Tashi")
          .field("phone", "17123456");
        assert.equal(response.status, 409);
      },
    );
    await t.test(
      "Owner decisions remain scoped and invalid decisions are rejected",
      async () => {
        const otherToken = await csrf(otherLandlord);
        let response = await otherLandlord
          .post(
            "/landlord/listings/" +
              listingId +
              "/applications/" +
              applicationId,
          )
          .type("form")
          .send({ _csrf: otherToken, status: "accepted" });
        assert.equal(response.status, 403);
        const token = await csrf(landlord);
        response = await landlord
          .post(
            "/landlord/listings/" +
              listingId +
              "/applications/" +
              applicationId,
          )
          .type("form")
          .send({ _csrf: token, status: "invalid" });
        assert.equal(response.status, 400);
        response = await landlord
          .post(
            "/landlord/listings/" +
              listingId +
              "/applications/" +
              applicationId,
          )
          .type("form")
          .send({ _csrf: token, status: "accepted" });
        assert.equal(response.status, 409);
        assert.match(
          (await tenant.get("/tenant/applications")).text,
          /badge accepted/,
        );
        response = await landlord
          .post(
            "/landlord/listings/" +
              listingId +
              "/applications/" +
              applicationId,
          )
          .type("form")
          .send({ _csrf: token, status: "rejected" });
        assert.equal(response.status, 409);
      },
    );
    await t.test('Owner can reject a pending application after the deadline', async () => {
      assert.equal((await apply(tenant, secondId)).status, 302);
      const row = await db.one('SELECT id FROM applications WHERE listing_id=$1', [secondId]);
      await db.none("UPDATE listings SET created_at=localtimestamp-interval '2 days',deadline=localtimestamp-interval '1 hour' WHERE id=$1", [secondId]);
      assert.equal((await otherLandlord.get('/landlord/listings/'+secondId+'/applications')).status, 200);
      const token = await csrf(otherLandlord);
      const response = await otherLandlord.post('/landlord/listings/'+secondId+'/applications/'+row.id).type('form').send({_csrf:token,status:'rejected'});
      assert.equal(response.status, 302);
      assert.equal((await db.one('SELECT status FROM applications WHERE id=$1',[row.id])).status, 'rejected');
    });
    await t.test(
      "Feedback validates rating, ignores forged IDs, escapes HTML and prevents duplicates",
      async () => {
        const token = await csrf(tenant);
        const send = (rating) =>
          tenant
            .post("/tenant/feedback")
            .type("form")
            .send({
              _csrf: token,
              listing_id: listingId,
              rating,
              landlordId: 999,
              tenantId: 999,
              comment: "<script>alert(1)</script>",
            });
        assert.equal((await send("6")).status, 400);
        assert.equal((await send("2.5")).status, 400);
        assert.equal((await send("5")).status, 302);
        const actual = await db.one(
          "SELECT landlord_id FROM listings WHERE id=$1",
          [listingId],
        );
        assert.equal(feedbackDocuments[0].landlordId, actual.landlord_id);
        assert.notEqual(feedbackDocuments[0].tenantId, 999);
        assert.equal((await send("4")).status, 409);
        const page = await tenant.get("/tenant/feedback");
        assert.match(page.text, /&lt;script&gt;/);
        assert.ok(!page.text.includes("<script>alert"));
        assert.match(
          (await landlord.get("/landlord/feedback")).text,
          /Paro family home/,
        );
        assert.ok(
          !(await otherLandlord.get("/landlord/feedback")).text.includes(
            "Paro family home",
          ),
        );
      },
    );
    await t.test(
      "Deactivation hides listing, photos, documents, applications, feedback and JSON",
      async () => {
        const token = await csrf(admin);
        assert.equal(
          (
            await admin
              .post("/superadmin/listings/" + listingId + "/deactivate")
              .type("form")
              .send({ _csrf: token })
          ).status,
          302,
        );
        for (const url of [
          "/listings/" + listingId,
          "/photos/" + photoId,
          "/api/listings/" + listingId,
        ])
          assert.equal((await visitor.get(url)).status, 404);
        assert.equal(
          (await tenant.get("/documents/" + documentId)).status,
          404,
        );
        for (const url of ["/tenant/applications", "/tenant/feedback"])
          assert.ok(!(await tenant.get(url)).text.includes("Paro family home"));
        for (const url of ["/landlord/dashboard", "/landlord/feedback"])
          assert.ok(
            !(await landlord.get(url)).text.includes("Paro family home"),
          );
        assert.match(
          (await admin.get("/superadmin/dashboard")).text,
          /Deactivated/,
        );
      },
    );
    await t.test(
      "Forgot-password responses are generic; reset token expires and is one-use",
      async () => {
        const token = await csrf(visitor, "/forgot-password");
        const known = await visitor
          .post("/forgot-password")
          .type("form")
          .send({ _csrf: token, email: "tenant@example.com" });
        const link = emails.at(-1).text.match(/\/reset-password\/[a-f0-9]+/)[0];
        const unknown = await visitor
          .post("/forgot-password")
          .type("form")
          .send({ _csrf: token, email: "unknown@example.com" });
        assert.equal(known.text, unknown.text);
        const resetCsrf = await csrf(visitor, link);
        assert.equal(
          (
            await visitor
              .post(link)
              .type("form")
              .send({ _csrf: resetCsrf, password: "ChangedPassword123!" })
          ).status,
          200,
        );
        assert.equal((await visitor.get(link)).status, 400);
        await visitor
          .post("/forgot-password")
          .type("form")
          .send({ _csrf: token, email: "tenant@example.com" });
        const expired = emails
          .at(-1)
          .text.match(/\/reset-password\/[a-f0-9]+/)[0];
        await db.none(
          "UPDATE users SET reset_token_expires=localtimestamp-interval '1 second' WHERE email='tenant@example.com'",
        );
        assert.equal((await visitor.get(expired)).status, 400);
      },
    );
    await t.test("Logout clears the session", async () => {
      const token = await csrf(tenant);
      assert.equal(
        (await tenant.post("/logout").type("form").send({ _csrf: token }))
          .status,
        302,
      );
      assert.equal(
        (await tenant.get("/tenant/dashboard")).headers.location,
        "/login",
      );
    });
  } finally {
    await postgres.close();
    for (const file of fs.readdirSync(uploads)) {
      if (!originalFiles.has(file)) fs.unlinkSync(path.join(uploads, file));
    }
  }
});
