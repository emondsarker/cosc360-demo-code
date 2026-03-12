import type { IUser } from "./domain/types/index.js";
import { UserModel } from "./domain/models/user.model.js";

export async function findAll(): Promise<IUser[]> {
  const docs = await UserModel.find();
  return docs.map((doc) => doc.toJSON() as IUser);
}

export async function findById(id: string): Promise<IUser | undefined> {
  const user = await UserModel.findById(id);
  return user ? (user.toJSON() as IUser) : undefined;
}

export async function findByUsername(username: string): Promise<IUser | undefined> {
  const user = await UserModel.findOne({ username });
  return user ? (user.toJSON() as IUser) : undefined;
}

export async function save(user: IUser): Promise<IUser> {
  const saved = await UserModel.findByIdAndUpdate(
    user.id,
    {
      _id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
    { upsert: true, new: true }
  );
  return saved!.toJSON() as IUser;
}

export const mongoUserRepository = {
  findAll,
  findById,
  findByUsername,
  save,
};
