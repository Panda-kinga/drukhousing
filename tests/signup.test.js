jest.mock("../config/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
}));

const crypto = require("crypto");
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");
const { sendEmail } = require("../config/mailer");

const suffix = Date.now();
const validEmail = `signup-valid-${suffix}@example.com`;
const invalidEmail = `signup-invalid-${suffix}`;
const password = "Password123!";

async function signupAgent() {
  const agent = request.agent(app);
  const page = await agent.get("/signup");
  const csrf = page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
  return { agent, csrf };
}

afterAll(async () => {
  await db.none("DELETE FROM users WHERE email IN ($1,$2)", [validEmail, invalidEmail]);
  await db.$pool.end();
});

beforeEach(() => {
  sendEmail.mockClear();
});

test("signup sends the verification token saved in the database", async () => {
  const { agent, csrf } = await signupAgent();
  const response = await agent
    .post("/signup")
    .type("form")
    .send({
      _csrf: csrf,
      name: "Signup Tester",
      email: validEmail,
      password,
      role: "tenant",
    });

  expect(response.status).toBe(200);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(sendEmail.mock.calls[0][0]).toBe(validEmail);
  expect(sendEmail.mock.calls[0][1]).toBe("Verify your DrukHousing account");

  const link = sendEmail.mock.calls[0][2].link;
  const rawToken = link.split("/verify/")[1];
  const saved = await db.one("SELECT verification_token FROM users WHERE email=$1", [validEmail]);
  const savedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  expect(saved.verification_token).toBe(savedToken);
});

test("a bad email is rejected without creating a user or sending mail", async () => {
  const { agent, csrf } = await signupAgent();
  const response = await agent
    .post("/signup")
    .type("form")
    .send({
      _csrf: csrf,
      name: "Invalid Signup",
      email: invalidEmail,
      password,
      role: "tenant",
    });

  const created = await db.one("SELECT COUNT(*)::int AS count FROM users WHERE email=$1", [invalidEmail]);
  expect(response.status).toBe(400);
  expect(created.count).toBe(0);
  expect(sendEmail).not.toHaveBeenCalled();
});
