// @jest-environment node
process.env.JWT_SECRET = "test-secret";

import { jest } from "@jest/globals";

// ---------------------------
// ✅ MOCKS BEFORE IMPORTS
// ---------------------------
jest.unstable_mockModule("cloudinary", () => ({
    default: {
        v2: {
            uploader: {
                upload: jest.fn().mockResolvedValue({
                    public_id: "test_img_id",
                    secure_url: "http://cloudinary.com/test.jpg",
                }),
                destroy: jest.fn().mockResolvedValue({}),
            },
        },
    },
}));

jest.unstable_mockModule("../middlewares/isAuth.js", () => ({
    isAuth: (req, res, next) => {
        req.user = { _id: "user123", name: "Test User" };
        next();
    },
}));

jest.unstable_mockModule("../middlewares/multer.js", () => ({
    default: (req, res, next) => {
        req.file = {
            originalname: "image.png",
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
const { Post } = await import("../models/postModel.js");
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const postRoutes = (await import("../routes/postRoutes.js")).default;

// ---------------------------
// ✅ EXPRESS APP SETUP
// ---------------------------
const app = express();
app.use(express.json());
app.use("/api/posts", postRoutes);

// ---------------------------
// ✅ MOCK HELPERS
// ---------------------------
function getMockPostWithPopulate(data = {}) {
    return {
        ...data,
        save: jest.fn().mockResolvedValue(true),
        deleteOne: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
    };
}

function getMockQueryChain(posts) {
    return {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        then: jest.fn(cb => cb(posts)),
    };
}

// ---------------------------
// ✅ TESTS
// ---------------------------
describe("Post Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("POST /new - should create a new post", async () => {
        jest.spyOn(Post, "create").mockResolvedValue({
            caption: "Test Caption",
            post: { id: "cloud_id", url: "cloud_url" },
            owner: "user123",
            type: "post",
        });

        const res = await request(app)
            .post("/api/posts/new")
            .query({ type: "post" })
            .send({ caption: "Test Caption" });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Post created");
        expect(res.body.post.caption).toBe("Test Caption");
    });

    // it("PUT /:id - should edit caption", async () => {
    //     const mockPost = getMockPostWithPopulate({
    //         _id: "post123",
    //         owner: "user123",
    //         caption: "Old Caption",
    //     });

    //     jest.spyOn(Post, "findById").mockResolvedValue(mockPost);

    //     const res = await request(app)
    //         .put("/api/posts/123")
    //         .send({ caption: "Updated Caption" });

    //     expect(res.statusCode).toBe(200);
    //     expect(mockPost.caption).toBe("Updated Caption");
    // });

    // it("DELETE /:id - should delete post", async () => {
    //     const mockPost = getMockPostWithPopulate({
    //         _id: "post123",
    //         owner: "user123",
    //         post: { id: "cloud_id" },
    //     });

    //     jest.spyOn(Post, "findById").mockResolvedValue(mockPost);

    //     const res = await request(app).delete("/api/posts/123");

    //     expect(res.statusCode).toBe(200);
    //     expect(res.body.message).toBe("Post Deleted");
    // });

    // it("POST /like/:id - should like and unlike post", async () => {
    //     const mockPost = getMockPostWithPopulate({
    //         _id: "post123",
    //         likes: [],
    //     });

    //     jest.spyOn(Post, "findById").mockResolvedValue(mockPost);

    //     const likeRes = await request(app).post("/api/posts/like/123");
    //     expect(likeRes.statusCode).toBe(200);
    //     expect(likeRes.body.message).toBe("Post Liked");

    //     mockPost.likes = ["user123"];
    //     const unlikeRes = await request(app).post("/api/posts/like/123");
    //     expect(unlikeRes.statusCode).toBe(200);
    //     expect(unlikeRes.body.message).toBe("Post Unliked");
    // });

    // it("POST /comment/:id - should comment on post", async () => {
    //     const mockPost = getMockPostWithPopulate({
    //         _id: "post123",
    //         comments: [],
    //     });

    //     jest.spyOn(Post, "findById").mockResolvedValue(mockPost);

    //     const res = await request(app)
    //         .post("/api/posts/comment/123")
    //         .send({ comment: "Nice post!" });

    //     expect(res.statusCode).toBe(200);
    //     expect(Array.isArray(res.body.comments)).toBe(true);
    // });

    // it("DELETE /comment/:id?commentId=x - should delete comment", async () => {
    //     const mockPost = getMockPostWithPopulate({
    //         _id: "post123",
    //         owner: "user123",
    //         comments: [
    //             {
    //                 _id: "comment1",
    //                 user: "user123",
    //                 comment: "Nice!",
    //             },
    //         ],
    //     });

    //     jest.spyOn(Post, "findById").mockResolvedValue(mockPost);

    //     const res = await request(app).delete(
    //         "/api/posts/comment/123?commentId=comment1"
    //     );

    //     expect(res.statusCode).toBe(200);
    //     expect(Array.isArray(res.body.comments)).toBe(true);
    // });

    // it("GET /all - should return posts and reels with pagination data", async () => {
    //     jest.spyOn(Post, "find").mockReturnValue({
    //         sort: jest.fn().mockReturnThis(),
    //         limit: jest.fn().mockReturnThis(),
    //         populate: jest.fn().mockReturnThis(),
    //         then: jest.fn((cb) => cb([{ _id: "post1", caption: "Test" }])),
    //     });

    //     const res = await request(app).get("/api/posts/all").query({ type: "post", limit: 1 });

    //     expect(res.statusCode).toBe(200);
    //     expect(Array.isArray(res.body.posts)).toBe(true);
    //     expect(res.body).toHaveProperty("hasMore");
    //     expect(res.body).toHaveProperty("nextCursor");
    // });
});