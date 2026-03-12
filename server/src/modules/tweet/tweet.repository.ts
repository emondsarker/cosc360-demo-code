import type { ITweet } from "./domain/types/index.js";
import { TweetModel } from "./domain/models/tweet.model.js";

export async function findAll(): Promise<ITweet[]> {
  const docs = await TweetModel.find();
  return docs.map((doc) => doc.toJSON() as ITweet);
}

export async function findById(id: string): Promise<ITweet | undefined> {
  const tweet = await TweetModel.findById(id);
  return tweet ? (tweet.toJSON() as ITweet) : undefined;
}

export async function save(tweet: ITweet): Promise<ITweet> {
  const saved = await TweetModel.findByIdAndUpdate(
    tweet.id,
    {
      _id: tweet.id,
      content: tweet.content,
      authorId: tweet.authorId,
      createdAt: tweet.createdAt,
    },
    { upsert: true, new: true }
  );
  return saved!.toJSON() as ITweet;
}

export async function remove(id: string): Promise<void> {
  await TweetModel.findByIdAndDelete(id);
}

export const mongoTweetRepository = {
  findAll,
  findById,
  save,
  remove,
};
