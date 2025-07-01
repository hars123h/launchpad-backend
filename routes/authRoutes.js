// import express from "express";
// import {
//   loginUser,
//   logoutUser,
//   registerUser,
// } from "../controllers/authControllers.js";
// import uploadFile from "../middlewares/multer.js";
// // const passport = require("passport");
// import passport from "passport"
// import generateToken from "../utils/generateToken.js";


// const router = express.Router();
// router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// router.get(
//   "/google/callback",
//   passport.authenticate("google", { failureRedirect: "/login", session: true }),
//   (req, res) => {
//     // Custom token generation if needed
//     generateToken(req.user._id, res);
//     res.redirect("http://localhost:5173"); // redirect to frontend
//   }
// );

// router.post("/register", uploadFile, registerUser);
// router.post("/login", loginUser);
// router.get("/logout", logoutUser);

// export default router;


import express from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/authControllers.js";
import passport from "passport";
import generateToken from "../utils/generateToken.js";

// ✅ This function allows injecting `uploadFile` for testability
export const createAuthRouter = (uploadFile) => {
  const router = express.Router();

  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: true }),
    (req, res) => {
      generateToken(req.user._id, res);
      res.redirect("http://localhost:5173");
    }
  );

  router.post("/register", uploadFile, registerUser);
  router.post("/login", loginUser);
  router.get("/logout", logoutUser);

  return router;
};

// ✅ This keeps your app working normally (default export)
import uploadFile from "../middlewares/multer.js";
export default createAuthRouter(uploadFile);
