import { User } from "./domain/classes/User.js";
import type { IUser } from "./domain/types/index.js";
import { userRepository } from "../../repositories.js";

export async function login(username: string): Promise<IUser> {
  const existing = await userRepository.findByUsername(username);
  if (existing) {
    return existing;
  }
  const user = User.create(username);
  return await userRepository.save(user.toJSON());
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function updateProfile(userId: string, username: string): Promise<IUser> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const existingWithUsername = await userRepository.findByUsername(username);
  if (existingWithUsername && existingWithUsername.id !== userId) {
    throw new Error("Username already taken");
  }

  user.username = username;
  return await userRepository.save(user);
}
