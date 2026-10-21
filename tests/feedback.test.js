const bcrypt = require("bcrypt");
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");
const mongo = require("../config/mongo");
const Feedback = require("../models/Feedback");

let tenantId;
let otherTenantId;
let landlordId;
let otherLandlordId;
let listingId;
let otherListingId;
const password = "Password123!";
const suffix = Date.now();
const tenantEmail = `feedback-tenant-${suffix}@example.com`;
const otherTenantEmail = `feedback-other-tenant-${suffix}@example.com`;
const landlordEmail = `feedback-landlord-${suffix}@example.com`;
const otherLandlordEmail = `feedback-other-landlord-${suffix}@example.com`;

async function login(email) {
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const csrf = page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  await agent.post("/login").type("form").send({ _csrf: csrf, email, password });
  return agent;
}

async function csrf(agent) {
  const page = await agent.get("/tenant/feedback");
  return page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
}

beforeAll(async () => {
  await mongo.connectMongo();
  await Feedback.ensureIndexes();
  const hash = await bcrypt.hash(password, 4);
  const users = await db.tx(async (t) => {
    const tenant = await t.one(
      `INSERT INTO users(name,email,password_hash,role,is_verified)
       VALUES('Feedback Tenant',$1,$2,'tenant',true) RETURNING id`,
      [tenantEmail, hash],
    );
    const otherTenant = await t.one(
      `INSERT INTO users(name,email,password_hash,role,is_verified)
       VALUES('Other Feedback Tenant',$1,$2,'tenant',true) RETURNING id`,
      [otherTenantEmail, hash],
    );
    const landlord = await t.one(
      `INSERT INTO users(name,email,password_hash,role,is_verified)
       VALUES('Feedback Landlord',$1,$2,'landlord',true) RETURNING id`,
      [landlordEmail, hash],
    );
    const otherLandlord = await t.one(
      `INSERT INTO users(name,email,password_hash,role,is_verified)
       VALUES('Other Feedback Landlord',$1,$2,'landlord',true) RETURNING id`,
      [otherLandlordEmail, hash],
    );
    return { tenant, otherTenant, landlord, otherLandlord };
  });
  tenantId = users.tenant.id;
  otherTenantId = users.otherTenant.id;
  landlordId = users.landlord.id;
  otherLandlordId = users.otherLandlord.id;

  const deadline = "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '2 days'";
  const listing = await db.one(
    `INSERT INTO listings(landlord_id,title,location,price,type,lease_years,deadline)
     VALUES($1,'Feedback Test Home','Thimphu',15000,'apartment',1,${deadline}) RETURNING id`,
    [landlordId],
  );
  const otherListing = await db.one(
    `INSERT INTO listings(landlord_id,title,location,price,type,lease_years,deadline)
     VALUES($1,'Other Feedback Home','Paro',12000,'room',1,${deadline}) RETURNING id`,
    [otherLandlordId],
  );
  listingId = listing.id;
  otherListingId = otherListing.id;
  await db.none(
    `INSERT INTO applications(listing_id,tenant_id,full_name,phone,status)
     VALUES($1,$2,'Feedback Tenant','17123456','accepted'),
           ($3,$4,'Other Feedback Tenant','17123457','accepted')`,
    [listingId, tenantId, otherListingId, otherTenantId],
  );
});

afterAll(async () => {
  await mongo.getMongo().collection("feedback").deleteMany({
    $or: [{ listingId }, { listingId: otherListingId }, { tenantId }, { tenantId: otherTenantId }],
  });
  await db.none("DELETE FROM applications WHERE listing_id IN ($1,$2)", [listingId, otherListingId]);
  await db.none("DELETE FROM listings WHERE id IN ($1,$2)", [listingId, otherListingId]);
  await db.none("DELETE FROM users WHERE id IN ($1,$2,$3,$4)", [tenantId, otherTenantId, landlordId, otherLandlordId]);
  await mongo.closeMongo();
  await db.$pool.end();
});

test("a valid submission is stored in MongoDB", async () => {
  const tenant = await login(tenantEmail);
  const token = await csrf(tenant);
  const response = await tenant
    .post("/tenant/feedback")
    .type("form")
    .send({ _csrf: token, listing_id: listingId, rating: "5", comment: "Great home" });
  expect(response.status).toBe(302);
  const saved = await mongo.getMongo().collection("feedback").findOne({ listingId, tenantId });
  expect(saved.comment).toBe("Great home");
  expect(saved.rating).toBe(5);
});

test("a rating of 9 is rejected and writes nothing", async () => {
  const tenant = await login(otherTenantEmail);
  const token = await csrf(tenant);
  const before = await mongo.getMongo().collection("feedback").countDocuments({ tenantId: otherTenantId });
  const response = await tenant
    .post("/tenant/feedback")
    .type("form")
    .send({ _csrf: token, listing_id: otherListingId, rating: "9", comment: "Invalid" });
  const after = await mongo.getMongo().collection("feedback").countDocuments({ tenantId: otherTenantId });
  expect(response.status).toBe(400);
  expect(after).toBe(before);
});

test("a missing property returns 404 and writes nothing", async () => {
  const tenant = await login(tenantEmail);
  const token = await csrf(tenant);
  const before = await mongo.getMongo().collection("feedback").countDocuments({ tenantId });
  const response = await tenant
    .post("/tenant/feedback")
    .type("form")
    .send({ _csrf: token, listing_id: 999999999, rating: "5", comment: "Missing" });
  const after = await mongo.getMongo().collection("feedback").countDocuments({ tenantId });
  expect(response.status).toBe(404);
  expect(after).toBe(before);
});

test("a landlord sees only their own feedback", async () => {
  await Feedback.createFeedback(otherListingId, otherLandlordId, otherTenantId, "Other Feedback Tenant", 4, "Private feedback");
  const landlord = await login(landlordEmail);
  const response = await landlord.get("/landlord/feedback");
  expect(response.status).toBe(200);
  expect(response.text).not.toContain("Private feedback");
  expect(response.text).toContain("Great home");
});
