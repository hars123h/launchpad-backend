import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
    },
    gender: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
    },
    // gender: {
    //   type: String,
    //   // required: true,
    //   enum: ["male", "female"],
    // },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // profilePic: {
    //   id: String,
    //   url: String,
    // },
    profilePic: {
      id: String,
      url: {
        type: String,
        default:
          "https://res.cloudinary.com/dm2ipwp75/image/upload/v1750759412/default-avatar-icon-of-social-media-user-vector_udisu8.jpg",
      },
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
  },
  {
    timestamps: true,

  }
);

export const User = mongoose.model("User", userSchema);
