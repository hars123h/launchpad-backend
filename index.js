import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import cloudinary from "cloudinary";
import cookieParser from "cookie-parser";
import { Chat } from "./models/ChatModel.js";
import { isAuth } from "./middlewares/isAuth.js";
import { User } from "./models/userModel.js";
import { app, server } from "./socket/socket.js";
import path from "path";
import axios from 'axios';
import cors from 'cors';

const url = `http://localhost:5173`;
const interval = 30000;

import session from "express-session";
import passport from "passport";
import "./utils/passport.js";

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend origin
    credentials: true, // enable cookies
  })
); // ✅ Allows all origins


// function reloadWebsite() {
//   axios
//     .get(url)
//     .then((response) => {
//       console.log(
//         `Reloaded at ${new Date().toISOString()}: Status Code ${
//           response.status
//         }`
//       );
//     })
//     .catch((error) => {
//       console.error(
//         `Error reloading at ${new Date().toISOString()}:`,
//         error.message
//       );
//     });
// }

// setInterval(reloadWebsite, interval);

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.Cloudinary_Cloud_Name,
  api_key: process.env.Cloudinary_Api,
  api_secret: process.env.Cloudinary_Secret,
});

//using middlewares
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT;

// to get all chats of user
app.get("/api/messages/chats", isAuth, async (req, res) => {
  try {
    const chats = await Chat.find({
      users: req.user._id,
    }).populate({
      path: "users",
      select: "name profilePic",
    });

    chats.forEach((e) => {
      e.users = e.users.filter(
        (user) => user._id.toString() !== req.user._id.toString()
      );
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// to get all users
app.get("/api/user/all", isAuth, async (req, res) => {
  try {
    const search = req.query.search || "";
    const users = await User.find({
      name: {
        $regex: search,
        $options: "i",
      },
      _id: { $ne: req.user._id },
    }).select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_super_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Initialize passport and session BEFORE routes
app.use(passport.initialize());
app.use(passport.session());

// importing routes
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";



//using routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);
app.use("/api/messages", messageRoutes);


const __dirname = path.resolve();

// app.use(express.static(path.join(__dirname, "/frontend/dist")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
// });

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  connectDb();
});
