import type { IUser } from "./domain/types/index.js";

export interface IUserRepository {
  findAll(): Promise<IUser[]>;
  findById(id: string): Promise<IUser | undefined>;
  findByUsername(username: string): Promise<IUser | undefined>;
  save(user: IUser): Promise<IUser>;
}
