const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

let listingId;
let landlordId;

beforeAll(async () => {
  const email = `public-${Date.now()}@example.com`;
  const landlord = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES($1,$2,'test-hash','landlord',true) RETURNING id`,
    ["Public Test Landlord", email],
  );
  landlordId = landlord.id;
  const listing = await db.one(
    `INSERT INTO listings(landlord_id,title,location,price,type,lease_years,deadline)
     VALUES($1,'Public API Test Home','Paro',12000,'house',1,
     (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '2 days') RETURNING id`,
    [landlordId],
  );
  listingId = listing.id;
});

afterAll(async () => {
  await db.none("DELETE FROM listings WHERE id=$1", [listingId]);
  await db.none("DELETE FROM users WHERE id=$1", [landlordId]);
  await db.$pool.end();
});

test("GET /api/properties returns an array", async () => {
  const response = await request(app).get("/api/properties");
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test("GET /api/properties/:id returns a property", async () => {
  const response = await request(app).get(`/api/properties/${listingId}`);
  expect(response.status).toBe(200);
  expect(response.body.id).toBe(listingId);
});

test("missing and non-numeric properties return 404", async () => {
  expect((await request(app).get("/api/properties/999999999")).status).toBe(404);
  expect((await request(app).get("/api/properties/not-a-number")).status).toBe(404);
});
