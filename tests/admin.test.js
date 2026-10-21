const bcrypt = require("bcrypt");
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

let tenantId;
let landlordId;
let superadminId;
let listingId;
const password = "Password123!";
const suffix = Date.now();
const tenantEmail = `admin-tenant-${suffix}@example.com`;
const landlordEmail = `admin-landlord-${suffix}@example.com`;
const superadminEmail = `admin-super-${suffix}@example.com`;

async function login(email) {
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const csrf = page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  await agent.post("/login").type("form").send({ _csrf: csrf, email, password });
  return agent;
}

async function csrf(agent, path) {
  const page = await agent.get(path);
  return page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
}

beforeAll(async () => {
  const hash = await bcrypt.hash(password, 4);
  const tenant = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES('Admin Tenant',$1,$2,'tenant',true) RETURNING id`,
    [tenantEmail, hash],
  );
  const landlord = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES('Admin Landlord',$1,$2,'landlord',true) RETURNING id`,
    [landlordEmail, hash],
  );
  const superadmin = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES('Admin Tester',$1,$2,'superadmin',true) RETURNING id`,
    [superadminEmail, hash],
  );
  tenantId = tenant.id;
  landlordId = landlord.id;
  superadminId = superadmin.id;
  const listing = await db.one(
    `INSERT INTO listings(landlord_id,title,location,price,type,lease_years,deadline)
     VALUES($1,'Admin Test Home','Thimphu',15000,'apartment',1,
     (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '2 days') RETURNING id`,
    [landlordId],
  );
  listingId = listing.id;
});

afterAll(async () => {
  await db.none("DELETE FROM applications WHERE listing_id=$1", [listingId]);
  await db.none("DELETE FROM listings WHERE id=$1", [listingId]);
  await db.none("DELETE FROM admin_actions WHERE target_id IN ($1,$2,$3)", [tenantId, landlordId, superadminId]);
  await db.none("DELETE FROM users WHERE id IN ($1,$2,$3)", [tenantId, landlordId, superadminId]);
  await db.$pool.end();
});

test("tenants and landlords cannot open the superadmin dashboard", async () => {
  const tenant = await login(tenantEmail);
  const landlord = await login(landlordEmail);
  expect((await tenant.get("/superadmin/dashboard")).status).toBe(403);
  expect((await landlord.get("/superadmin/dashboard")).status).toBe(403);
});

test("a superadmin can open the dashboard", async () => {
  const admin = await login(superadminEmail);
  expect((await admin.get("/superadmin/dashboard")).status).toBe(200);
});

test("changing a landlord to tenant hides their properties", async () => {
  const admin = await login(superadminEmail);
  const token = await csrf(admin, "/superadmin/users");
  const response = await admin
    .post(`/superadmin/users/${landlordId}/role`)
    .type("form")
    .send({ _csrf: token, role: "tenant" });
  expect(response.status).toBe(302);
  const listing = await db.one("SELECT is_active FROM listings WHERE id=$1", [listingId]);
  expect(listing.is_active).toBe(false);
});

test("a superadmin account cannot be changed", async () => {
  const admin = await login(superadminEmail);
  const token = await csrf(admin, "/superadmin/users");
  const response = await admin
    .post(`/superadmin/users/${superadminId}/role`)
    .type("form")
    .send({ _csrf: token, role: "tenant" });
  expect(response.status).toBe(409);
});

test("a deactivated user cannot log in", async () => {
  const admin = await login(superadminEmail);
  const token = await csrf(admin, "/superadmin/users");
  const response = await admin
    .post(`/superadmin/users/${tenantId}/active`)
    .type("form")
    .send({ _csrf: token, active: "false" });
  expect(response.status).toBe(302);

  const tenant = request.agent(app);
  const loginPage = await tenant.get("/login");
  const loginToken = loginPage.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  const denied = await tenant
    .post("/login")
    .type("form")
    .send({ _csrf: loginToken, email: tenantEmail, password });
  expect(denied.status).toBe(401);
});
