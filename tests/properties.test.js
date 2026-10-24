const bcrypt = require("bcrypt");
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

const tinyPng = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082", "hex");
const password = "Password123!";
const suffix = Date.now();
const landlordEmail = `property-landlord-${suffix}@example.com`;
const otherEmail = `property-other-${suffix}@example.com`;
const tenantEmail = `property-tenant-${suffix}@example.com`;
let landlordId, otherId, tenantId, listingId;

const parseBinary = (response, callback) => {
  const chunks = [];
  response.on("data", (chunk) => chunks.push(chunk));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
};

async function login(email) {
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const csrf = page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  await agent.post("/login").type("form").send({ _csrf: csrf, email, password });
  return agent;
}
function deadline() { return new Date(Date.now() + 172800000).toISOString().slice(0, 16); }
async function csrf(agent) {
  const page = await agent.get("/landlord/dashboard");
  return page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
}

beforeAll(async () => {
  const hash = await bcrypt.hash(password, 4);
  const rows = await Promise.all([
    db.one("INSERT INTO users(name,email,password_hash,role,is_verified) VALUES('Property Landlord',$1,$2,'landlord',true) RETURNING id", [landlordEmail, hash]),
    db.one("INSERT INTO users(name,email,password_hash,role,is_verified) VALUES('Other Landlord',$1,$2,'landlord',true) RETURNING id", [otherEmail, hash]),
    db.one("INSERT INTO users(name,email,password_hash,role,is_verified) VALUES('Property Tenant',$1,$2,'tenant',true) RETURNING id", [tenantEmail, hash]),
  ]);
  [landlordId, otherId, tenantId] = rows.map((row) => row.id);
});

afterAll(async () => {
  await db.none("DELETE FROM listing_photos WHERE listing_id=$1", [listingId]);
  await db.none("DELETE FROM listings WHERE id=$1", [listingId]);
  await db.none("DELETE FROM users WHERE id IN ($1,$2,$3)", [landlordId, otherId, tenantId]);
  await db.$pool.end();
});

test("a landlord can create a property", async () => {
  const landlord = await login(landlordEmail);
  const token = await csrf(landlord);
  const result = await landlord.post("/landlord/listings").field("_csrf", token).field("title", "Property Test Home").field("location", "Paro town").field("dzongkhag", "Paro").field("gewog", "Dokar").field("price", "12000").field("type", "house").field("lease_years", "1").field("deadline", deadline()).attach("photos", tinyPng, { filename: "test.png", contentType: "image/png" });
  expect(result.status).toBe(302);
  listingId = Number(result.headers.location.split("/").pop());
});

test("uploaded listing photos persist in PostgreSQL and are served as image data", async () => {
  const stored = await db.one(
    "SELECT id, image_data, content_type FROM listing_photos WHERE listing_id=$1 ORDER BY id LIMIT 1",
    [listingId],
  );
  expect(stored.image_data).toEqual(tinyPng);
  expect(stored.content_type).toBe("image/png");

  const response = await request(app)
    .get("/photos/" + stored.id)
    .buffer(true)
    .parse(parseBinary);
  expect(response.status).toBe(200);
  expect(response.headers["content-type"]).toMatch(/^image\/png/);
  expect(response.body).toEqual(tinyPng);
});

test("a tenant cannot create a property", async () => {
  const tenant = await login(tenantEmail);
  const result = await tenant.post("/landlord/listings").field("title", "Nope");
  expect(result.status).toBe(403);
});

test("a landlord cannot submit a Gewog from another Dzongkhag", async () => {
  const landlord = await login(landlordEmail);
  const token = await csrf(landlord);
  const result = await landlord.post("/landlord/listings")
    .field("_csrf", token)
    .field("title", "Invalid Location Home")
    .field("location", "Test street")
    .field("dzongkhag", "Thimphu")
    .field("gewog", "Kanglung")
    .field("price", "12000")
    .field("type", "house")
    .field("lease_years", "1")
    .field("deadline", deadline());
  expect(result.status).toBe(400);
});

test("a landlord cannot edit another landlord's property", async () => {
  const other = await login(otherEmail);
  const token = await csrf(other);
  const result = await other.post(`/landlord/listings/${listingId}`).type("form").send({ _csrf: token, title: "Changed", location: "Paro town", dzongkhag: "Paro", gewog: "Dokar", price: "12000", type: "house", lease_years: "1", deadline: deadline() });
  expect(result.status).toBe(403);
});
