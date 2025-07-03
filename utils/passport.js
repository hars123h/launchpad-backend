import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/userModel.js";
import bcrypt from "bcrypt"
import dotenv from "dotenv";
dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // callbackURL: "http://localhost:7000/api/auth/google/callback",
            callbackURL: "https://launchpad-backend-glx1.onrender.com/api/auth/google/callback",

        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const existingUser = await User.findOne({ email: profile.emails[0].value });

                if (existingUser) return done(null, existingUser);

                const user = await User.create({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Dummy password
                    gender: "male", // Or prompt on frontend later
                    profilePic: {
                        id: "",
                        url: profile.photos[0].value,
                    },
                    authProvider: "google",
                });

                done(null, user);
            } catch (error) {
                done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});