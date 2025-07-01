import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  caption: String,

  post: {
    id: String,
    url: String,
  },

  type: {
    type: String,
    required: true,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
    },
  ],
});

postSchema.index({ type: 1, createdAt: -1, _id: -1 }); // Efficient filtering + sorting + pagination


export const Post = mongoose.model("Post", postSchema);
