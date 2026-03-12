import type { ITweet } from "./domain/types/index.js";

export interface ITweetRepository {
  findAll(): Promise<ITweet[]>;
  findById(id: string): Promise<ITweet | undefined>;
  save(tweet: ITweet): Promise<ITweet>;
  remove(id: string): Promise<void>;
}
