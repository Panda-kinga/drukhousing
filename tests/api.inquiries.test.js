const bcrypt = require("bcrypt");
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

let tenantId;
let landlordId;
let listingId;
const password = "Password123!";
const suffix = Date.now();
const tenantEmail = `inquiry-tenant-${suffix}@example.com`;
const landlordEmail = `inquiry-landlord-${suffix}@example.com`;

async function login(email) {
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const csrf = page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  await agent.post("/login").type("form").send({ _csrf: csrf, email, password });
  return agent;
}

beforeAll(async () => {
  const hash = await bcrypt.hash(password, 4);
  const tenant = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES('Inquiry Tenant',$1,$2,'tenant',true) RETURNING id`,
    [tenantEmail, hash],
  );
  const landlord = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES('Inquiry Landlord',$1,$2,'landlord',true) RETURNING id`,
    [landlordEmail, hash],
  );
  tenantId = tenant.id;
  landlordId = landlord.id;
  const listing = await db.one(
    `INSERT INTO listings(landlord_id,title,location,price,type,lease_years,deadline)
     VALUES($1,'Inquiry API Home','Thimphu',15000,'apartment',1,
     (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '2 days') RETURNING id`,
    [landlordId],
  );
  listingId = listing.id;
});

afterAll(async () => {
  await db.none("DELETE FROM applications WHERE listing_id=$1", [listingId]);
  await db.none("DELETE FROM listings WHERE id=$1", [listingId]);
  await db.none("DELETE FROM users WHERE id IN ($1,$2)", [tenantId, landlordId]);
  await db.$pool.end();
});

function inquiry(agent, id = listingId) {
  return agent.post("/api/inquiries").send({
    listing_id: id,
    full_name: "Inquiry Tenant",
    phone: "17123456",
    notes: "API test inquiry",
  });
}

test("logged-out inquiry submission returns 401", async () => {
  expect((await inquiry(request(app))).status).toBe(401);
});

test("landlords cannot submit inquiries", async () => {
  const landlord = await login(landlordEmail);
  expect((await inquiry(landlord)).status).toBe(403);
});

test("tenant can submit once and duplicate is rejected", async () => {
  const tenant = await login(tenantEmail);
  expect((await inquiry(tenant)).status).toBe(201);
  expect((await inquiry(tenant)).status).toBe(409);
});

test("missing property returns 404", async () => {
  const tenant = await login(tenantEmail);
  expect((await inquiry(tenant, 999999999)).status).toBe(404);
});
