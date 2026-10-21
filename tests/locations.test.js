const bcrypt = require("bcrypt");
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

let landlordId;
let thimphuListingId;
let samtseListingId;
const password = "Password123!";
const email = `locations-landlord-${Date.now()}@example.com`;

beforeAll(async () => {
  const hash = await bcrypt.hash(password, 4);
  const landlord = await db.one(
    `INSERT INTO users(name,email,password_hash,role,is_verified)
     VALUES('Locations Landlord',$1,$2,'landlord',true) RETURNING id`,
    [email, hash],
  );
  landlordId = landlord.id;
  const deadline = "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') + INTERVAL '2 days'";
  const thimphu = await db.one(
    `INSERT INTO listings(landlord_id,title,location,dzongkhag,gewog,price,type,lease_years,deadline)
     VALUES($1,'Thimphu Test Home','Chang town','Thimphu','Chang',15000,'house',1,${deadline}) RETURNING id`,
    [landlordId],
  );
  const samtse = await db.one(
    `INSERT INTO listings(landlord_id,title,location,dzongkhag,gewog,price,type,lease_years,deadline)
     VALUES($1,'Samtse Test Home','Tashicholing town','Samtse','Tashicholing',15000,'house',1,${deadline}) RETURNING id`,
    [landlordId],
  );
  thimphuListingId = thimphu.id;
  samtseListingId = samtse.id;
});

afterAll(async () => {
  await db.none("DELETE FROM listings WHERE id IN ($1,$2)", [thimphuListingId, samtseListingId]);
  await db.none("DELETE FROM users WHERE id=$1", [landlordId]);
  await db.$pool.end();
});

test("locations API returns all 20 Dzongkhags", async () => {
  const response = await request(app).get("/api/locations");
  expect(response.status).toBe(200);
  expect(Object.keys(response.body)).toHaveLength(20);
});

test("property search filters by Dzongkhag", async () => {
  const response = await request(app).get("/api/properties?dzongkhag=Thimphu");
  expect(response.status).toBe(200);
  expect(response.body.length).toBeGreaterThan(0);
  expect(response.body.every((listing) => listing.dzongkhag === "Thimphu")).toBe(true);
});

test("invalid Dzongkhag returns 400", async () => {
  const response = await request(app).get("/api/properties?dzongkhag=NotBhutan");
  expect(response.status).toBe(400);
});
