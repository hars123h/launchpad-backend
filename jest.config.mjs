export default {
  testEnvironment: "node",
  testMatch: ["**/*.test.mjs"], // 👈 match your test file
  moduleFileExtensions: ["js", "json", "mjs"],
  roots: ["<rootDir>"], // Only test backend files
};