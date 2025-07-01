// @jest-environment node
process.env.JWT_SECRET = "test-secret"; // Set secret before anything

import { jest } from "@jest/globals";

// ---------------------------
// ✅ MOCK BEFORE IMPORTS
// ---------------------------

// ✅ Mock bcrypt as default import
jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

// ✅ Mock cloudinary
jest.unstable_mockModule("cloudinary", () => ({
  default: {
    v2: {
      uploader: {
        upload: jest.fn().mockResolvedValue({
          public_id: "cloud123",
          secure_url: "http://cloudinary.com/image.jpg",
        }),
      },
    },
  },
}));

// ✅ Mock generateToken
jest.unstable_mockModule("../utils/generateToken.js", () => ({
  default: jest.fn(), // prevent real jwt.sign
}));

// ✅ Mock base64 image generator
jest.unstable_mockModule("../utils/urlGenrator.js", () => ({
  default: () => ({ content: "data:image/png;base64,fake" }),
}));

// ✅ Mock upload middleware (injectable)
const mockUploadMiddleware = (req, res, next) => {
  req.file = {
    originalname: "avatar.png",
    buffer: Buffer.from("fake-image"),
    mimetype: "image/png",
  };
  next();
};
jest.unstable_mockModule("../middlewares/multer.js", () => ({
  default: mockUploadMiddleware,
}));

// ---------------------------
// ✅ DYNAMIC IMPORTS AFTER MOCKS
// ---------------------------
const { default: bcrypt } = await import("bcrypt");
const generateToken = (await import("../utils/generateToken.js")).default;
const { User } = await import("../models/userModel.js");
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const { createAuthRouter } = await import("../routes/authRoutes.js");

// ---------------------------
// ✅ APP SETUP
// ---------------------------
const app = express();
app.use(express.json());
app.use("/api/auth", createAuthRouter(mockUploadMiddleware)); // 🧠 inject mockUploadMiddleware

// ---------------------------
// ✅ TESTS
// ---------------------------
describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register a user and return 201", async () => {
    const mockUser = {
      _id: "user123",
      name: "Test",
      email: "test@example.com",
      gender: "male",
      password: "hashedpass",
      profilePic: {
        id: "cloud123",
        url: "http://cloudinary.com/image.jpg",
      },
    };

    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest.spyOn(User, "create").mockResolvedValue(mockUser);
    bcrypt.hash.mockResolvedValue("hashedpass");

    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "test@example.com",
      password: "testpass",
      gender: "male",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User Registered");
    expect(generateToken).toHaveBeenCalledWith("user123", expect.any(Object));
  });

  it("should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "test@example.com",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Please give all values");
  });

  it("should return 400 if user already exists", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({ email: "test@example.com" });

    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "test@example.com",
      password: "testpass",
      gender: "male",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("User Already Exist");
  });
});