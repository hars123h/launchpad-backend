import { Post } from "../models/postModel.js";
import TryCatch from "../utils/Trycatch.js";
import getDataUrl from "../utils/urlGenrator.js";
import cloudinary from "cloudinary";

export const newPost = TryCatch(async (req, res) => {
  const { caption } = req.body;

  const ownerId = req.user._id;

  const file = req.file;
  const fileUrl = getDataUrl(file);

  let option;

  const type = req.query.type;
  if (type === "reel") {
    option = {
      resource_type: "video",
    };
  } else {
    option = {};
  }

  const myCloud = await cloudinary.v2.uploader.upload(fileUrl.content, option);

  const post = await Post.create({
    caption,
    post: {
      id: myCloud.public_id,
      url: myCloud.secure_url,
    },
    owner: ownerId,
    type,
  });

  res.status(201).json({
    message: "Post created",
    post,
  });
});

export const deletePost = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post)
    return res.status(404).json({
      message: "No post with this id",
    });

  if (post.owner.toString() !== req.user._id.toString())
    return res.status(403).json({
      message: "Unauthorized",
    });

  await cloudinary.v2.uploader.destroy(post.post.id);

  await post.deleteOne();

  res.json({
    message: "Post Deleted",
  });
});

export const getAllPosts = TryCatch(async (req, res) => {
  const { limit = 5, cursor, type = "post" } = req.query;
  const query = { type };

  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate("owner", "-password")
    .populate({
      path: "comments.user",
      select: "-password",
    });

  const hasMore = posts.length === parseInt(limit);
  const nextCursor = hasMore ? posts[posts.length - 1].createdAt : null;

  // const posts = await Post.find({ type: "post" })
  //   .sort({ createdAt: -1 })
  //   .populate("owner", "-password")
  //   .populate({
  //     path: "comments.user",
  //     select: "-password",
  //   });

  const reels = await Post.find({ type: "reel" })
    .sort({ createdAt: -1 })
    .populate("owner", "-password")
    .populate({
      path: "comments.user",
      select: "-password",
    });

  res.json({
    posts, nextCursor,
    hasMore, reels
  });
});


// export const getAllPosts = TryCatch(async (req, res) => {
//   const { type = "all", cursor, limit = 5 } = req.query;

//   const postLimit = Number(limit);

//   const buildQuery = (contentType, cursorValue) => {
//     const query = { type: contentType };
//     if (cursorValue) {
//       query.createdAt = { $lt: new Date(cursorValue) };
//     }
//     return query;
//   };

//   const response = {
//     posts: [],
//     reels: [],
//     nextPostCursor: null,
//     nextReelCursor: null,
//     hasMorePosts: false,
//     hasMoreReels: false,
//   };

//   if (type === "post" || type === "all") {
//     const posts = await Post.find(buildQuery("post", cursor))
//       .sort({ createdAt: -1 })
//       .limit(postLimit + 1)
//       .populate("owner", "-password")
//       .populate({
//         path: "comments.user",
//         select: "-password",
//       });

//     response.hasMorePosts = posts.length > postLimit;
//     if (response.hasMorePosts) posts.pop();
//     response.posts = posts;
//     response.nextPostCursor = response.hasMorePosts ? posts[posts.length - 1].createdAt : null;
//   }

//   if (type === "reel" || type === "all") {
//     const reels = await Post.find(buildQuery("reel", cursor))
//       .sort({ createdAt: -1 })
//       .limit(postLimit + 1)
//       .populate("owner", "-password")
//       .populate({
//         path: "comments.user",
//         select: "-password",
//       });

//     response.hasMoreReels = reels.length > postLimit;
//     if (response.hasMoreReels) reels.pop();
//     response.reels = reels;
//     response.nextReelCursor = response.hasMoreReels ? reels[reels.length - 1].createdAt : null;
//   }

//   return res.json(response);
// });
export const likeUnlikePost = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      message: "No Post with this id",
    });
  }

  let message = "";

  if (post.likes.includes(req.user._id)) {
    const index = post.likes.indexOf(req.user._id);
    post.likes.splice(index, 1);
    message = "Post Unliked";
  } else {
    post.likes.push(req.user._id);
    message = "Post Liked";
  }

  await post.save();

  // Optional: populate user for frontend if needed
  const updatedPost = await Post.findById(post._id)
    .populate("owner", "-password")
    .populate({ path: "comments.user", select: "-password" });

  res.json({
    message,
    post: updatedPost, // 🔥 send updated post to frontend
  });
});

export const commentonPost = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id).populate([
    { path: "owner", select: "name profilePic" },
    { path: "comments.user", select: "name profilePic" },
    { path: "likes", select: "_id" }
  ]);

  if (!post) {
    return res.status(404).json({
      message: "No Post with this id",
    });
  }

  post.comments.push({
    user: req.user._id,
    name: req.user.name,
    comment: req.body.comment,
  });

  await post.save();

  const updatedPost = await Post.findById(post._id)
    .populate("owner", "-password")
    .populate({ path: "comments.user", select: "-password" });

  res.status(200).json(updatedPost); // ✅ send updated post back
});

export const deleteComment = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post)
    return res.status(404).json({
      message: "No Post with this id",
    });

  if (!req.query.commentId) {
    return res.status(400).json({
      message: "Please give comment id",
    });
  }

  const commentIndex = post.comments.findIndex(
    (item) => item._id.toString() === req.query.commentId.toString()
  );

  if (commentIndex === -1) {
    return res.status(400).json({
      message: "Comment not found",
    });
  }

  const comment = post.comments[commentIndex];

  const isOwner =
    post.owner.toString() === req.user._id.toString() ||
    comment.user.toString() === req.user._id.toString();

  if (!isOwner) {
    return res.status(403).json({
      message: "You are not allowed to delete this comment",
    });
  }

  post.comments.splice(commentIndex, 1);
  await post.save();

  // ✅ Return updated post so frontend can update only that one post
  const updatedPost = await Post.findById(post._id)
    .populate("owner", "-password")
    .populate({ path: "comments.user", select: "-password" });

  return res.status(200).json(updatedPost);
});

export const editCaption = TryCatch(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post)
    return res.status(404).json({
      message: "No Post with this id",
    });

  if (post.owner.toString() !== req.user._id.toString())
    return res.status(403).json({
      message: "You are not owner of this post",
    });

  post.caption = req.body.caption;
  await post.save();

  const updatedPost = await Post.findById(post._id)
    .populate("owner", "-password")
    .populate({
      path: "comments.user",
      select: "-password",
    });

  res.json(updatedPost); // ✅ return full updated post
});
