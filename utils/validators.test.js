const { isValidEmail, isValidPassword } = require("./validators");
const { isValidDzongkhag, isValidGewog } = require("../data/bhutanLocations");

describe("validators", () => {
  test("accepts a valid email", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
  });
  test("rejects a malformed email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
  test("accepts passwords with at least 8 characters", () => {
    expect(isValidPassword("12345678")).toBe(true);
  });
  test("rejects short passwords", () => {
    expect(isValidPassword("short")).toBe(false);
  });
  test("accepts a valid Dzongkhag and Gewog pair", () => {
    expect(isValidDzongkhag("Thimphu")).toBe(true);
    expect(isValidGewog("Thimphu", "Chang")).toBe(true);
  });
  test("rejects a Gewog from another Dzongkhag", () => {
    expect(isValidGewog("Thimphu", "Kanglung")).toBe(false);
  });
});
