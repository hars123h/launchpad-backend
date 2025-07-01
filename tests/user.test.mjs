// @jest-environment node
process.env.JWT_SECRET = "test-secret"; // required for middleware

import { jest } from "@jest/globals";

// ---------------------------
// ✅ MOCK BEFORE IMPORTS
// ---------------------------
jest.unstable_mockModule("bcrypt", () => ({
    default: {
        compare: jest.fn(),
        hash: jest.fn(),
    },
}));

jest.unstable_mockModule("cloudinary", () => ({
    default: {
        v2: {
            uploader: {
                upload: jest.fn().mockResolvedValue({
                    public_id: "new_pic_id",
                    secure_url: "http://cloudinary.com/new.jpg",
                }),
                destroy: jest.fn().mockResolvedValue({}),
            },
        },
    },
}));

jest.unstable_mockModule("../middlewares/isAuth.js", () => ({
    isAuth: (req, res, next) => {
        req.user = { _id: "user123" };
        next();
    },
}));

jest.unstable_mockModule("../middlewares/multer.js", () => ({
    default: (req, res, next) => {
        req.file = {
            originalname: "avatar.png",
            buffer: Buffer.from("fake-image"),
            mimetype: "image/png",
        };
        next();
    },
}));

jest.unstable_mockModule("../utils/urlGenrator.js", () => ({
    default: () => ({ content: "data:image/png;base64,fake" }),
}));

// ---------------------------
// ✅ IMPORTS AFTER MOCKS
// ---------------------------
const { User } = await import("../models/userModel.js");
const { default: bcrypt } = await import("bcrypt");
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const userRoutes = (await import("../routes/userRoutes.js")).default;

// ---------------------------
// ✅ EXPRESS APP SETUP
// ---------------------------
const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

// ---------------------------
// ✅ TEST CASES
// ---------------------------
describe("User Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("GET /me - should return user profile", async () => {
        const mockUser = { _id: "user123", name: "Test" };

        jest.spyOn(User, "findById").mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });

        const res = await request(app).get("/api/users/me");

        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe("Test");
    });

    it("PUT /:id - should update user profile", async () => {
        const mockUser = {
            _id: "user123",
            name: "Old Name",
            profilePic: { id: "old_id", url: "old_url" },
            save: jest.fn(),
        };

        jest.spyOn(User, "findById").mockResolvedValue(mockUser);

        const res = await request(app).put("/api/users/any-id").send({ name: "New Name" });

        expect(res.statusCode).toBe(200);
        expect(mockUser.name).toBe("New Name");
        expect(mockUser.save).toHaveBeenCalled();
        expect(res.body.message).toBe("Profile updated");
    });

    it("POST /:id - should update password", async () => {
        const mockUser = {
            password: "hashed_old_pass",
            save: jest.fn(),
        };

        jest.spyOn(User, "findById").mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        bcrypt.hash.mockResolvedValue("hashed_new_pass");

        const res = await request(app).post("/api/users/any-id").send({
            oldPassword: "oldpass",
            newPassword: "newpass",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Password Updated");
        expect(mockUser.password).toBe("hashed_new_pass");
    });

    it("POST /follow/:id - should follow a user", async () => {
        const loggedInUser = {
            _id: "user123",
            followers: [],
            followings: [],
            save: jest.fn(),
        };

        const targetUser = {
            _id: "target123",
            followers: [],
            followings: [],
            save: jest.fn(),
        };

        jest.spyOn(User, "findById")
            .mockResolvedValueOnce(targetUser)
            .mockResolvedValueOnce(loggedInUser);

        const res = await request(app).post("/api/users/follow/target123");

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("User Followed");
    });

    it("GET /followdata/:id - should return followers and followings", async () => {
  const mockUser = {
    followers: [{ name: "Follower1" }],
    followings: [{ name: "Following1" }],
  };

  // chain: findById -> select -> populate -> populate -> resolves to mockUser
  const populateMock2 = jest.fn().mockResolvedValue(mockUser);
  const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
  const selectMock = jest.fn().mockReturnValue({ populate: populateMock1 });

  jest.spyOn(User, "findById").mockReturnValue({ select: selectMock });

  const res = await request(app).get("/api/users/followdata/user123");

  expect(res.statusCode).toBe(200);
  expect(res.body.followers).toEqual([{ name: "Follower1" }]);
  expect(res.body.followings).toEqual([{ name: "Following1" }]);
});
});