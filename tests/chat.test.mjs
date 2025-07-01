// @jest-environment node
process.env.JWT_SECRET = "test-secret";

import { jest } from "@jest/globals";

// ---------------------------
// ✅ MOCKS BEFORE IMPORTS
// ---------------------------
jest.unstable_mockModule("../middlewares/isAuth.js", () => ({
    isAuth: (req, res, next) => {
        req.user = { _id: "user123" }; // mocked sender
        next();
    },
}));

jest.unstable_mockModule("../socket/socket.js", () => ({
    getReciverSocketId: jest.fn(() => "socket123"),
    io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

// ---------------------------
// ✅ IMPORTS AFTER MOCKS
// ---------------------------
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const messageRoutes = (await import("../routes/messageRoutes.js")).default;
const { Chat } = await import("../models/ChatModel.js");
const { Messages } = await import("../models/Messages.js");

// ---------------------------
// ✅ SETUP
// ---------------------------
const app = express();
app.use(express.json());
app.use("/api/messages", messageRoutes);

// ---------------------------
// ✅ TEST CASES
// ---------------------------
describe("Message Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("POST / - should send a message and create chat if not exists", async () => {
        jest.spyOn(Chat, "findOne").mockResolvedValue(null);
        jest.spyOn(Chat.prototype, "save").mockResolvedValue();
        jest.spyOn(Chat.prototype, "updateOne").mockResolvedValue();

        const mockMessage = {
            chatId: "chat123",
            sender: "user123",
            text: "Hello",
        };

        jest.spyOn(Messages.prototype, "save").mockResolvedValue(mockMessage);

        const res = await request(app).post("/api/messages").send({
            recieverId: "user456",
            message: "Hello",
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.text).toBe("Hello");
    });

    it("POST / - should return 400 if no recieverId", async () => {
        const res = await request(app).post("/api/messages").send({
            message: "Hello",
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Please give reciever id");
    });

    it("GET /:id - should return messages of a chat", async () => {
        jest.spyOn(Chat, "findOne").mockResolvedValue({ _id: "chat123" });
        jest.spyOn(Messages, "find").mockResolvedValue([
            { text: "Hello", sender: "user123" },
        ]);

        const res = await request(app).get("/api/messages/user456");

        expect(res.statusCode).toBe(200);
        expect(res.body[0].text).toBe("Hello");
    });

    it("GET /:id - should return 404 if chat not found", async () => {
        jest.spyOn(Chat, "findOne").mockResolvedValue(null);

        const res = await request(app).get("/api/messages/user456");

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("No Chat with these users");
    });
});