const readline = require("readline");
const User = require("../models/User");
const db = require("../config/db");

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const input = readline.createInterface({
      input: process.stdin,
      output: hidden ? process.stderr : process.stdout,
    });
    input.question(question, (answer) => {
      input.close();
      resolve(answer);
    });
  });
}

async function values() {
  const args = process.argv.slice(2);
  return {
    name: args[0] || (await ask("Name: ")),
    email: args[1] || (await ask("Email: ")),
    password: args[2] || (await ask("Password: ", true)),
  };
}

function validate(data) {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  if (!name || name.length > 100) throw new Error("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (typeof data.password !== "string" || data.password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  if (Buffer.byteLength(data.password, "utf8") > 72)
    throw new Error("Password must be no more than 72 bytes.");
  return { name, email, password: data.password };
}

async function main() {
  const user = validate(await values());
  const created = await User.createSuperAdmin(
    user.name,
    user.email,
    user.password,
  );
  console.log("Super admin created: " + created.email);
}

main()
  .catch((error) => {
    console.error("Could not create super admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$pool.end());
