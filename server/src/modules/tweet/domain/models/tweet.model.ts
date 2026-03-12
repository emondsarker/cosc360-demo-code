import mongoose, { Schema } from "mongoose";
import type { ITweet } from "../types/index.js";

const tweetSchema = new Schema<ITweet>(
  {
    _id: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const TweetModel = mongoose.model<ITweet>("Tweet", tweetSchema);
