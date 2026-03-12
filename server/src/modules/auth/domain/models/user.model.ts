import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/index.js";

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    username: { type: String, required: true, unique: true },
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

export const UserModel = mongoose.model<IUser>("User", userSchema);
