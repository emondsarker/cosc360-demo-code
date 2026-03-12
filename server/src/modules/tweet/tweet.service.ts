import { Tweet } from "./domain/classes/Tweet.js";
import type { ITweet, ITweetWithAuthor } from "./domain/types/index.js";
import { tweetRepository, userRepository } from "../../repositories.js";

export async function getAll(): Promise<ITweetWithAuthor[]> {
  const [tweets, users] = await Promise.all([
    tweetRepository.findAll(),
    userRepository.findAll(),
  ]);

  return tweets
    .map((tweet: ITweet): ITweetWithAuthor | null => {
      const author = users.find((u) => u.id === tweet.authorId);
      if (!author) return null;
      return { ...tweet, author };
    })
    .filter((t): t is ITweetWithAuthor => t !== null)
    .reverse();
}

export async function create(content: string, authorId: string): Promise<ITweet> {
  const tweet = Tweet.create(content, authorId);
  return await tweetRepository.save(tweet.toJSON());
}

export async function update(
  id: string,
  content: string,
  userId: string
): Promise<ITweet> {
  const tweet = await tweetRepository.findById(id);
  if (!tweet) {
    throw new Error("Tweet not found");
  }
  if (tweet.authorId !== userId) {
    throw new Error("Not authorized");
  }
  tweet.content = content;
  return await tweetRepository.save(tweet);
}

export async function remove(id: string, userId: string): Promise<{ id: string }> {
  const tweet = await tweetRepository.findById(id);
  if (!tweet) {
    throw new Error("Tweet not found");
  }
  if (tweet.authorId !== userId) {
    throw new Error("Not authorized");
  }
  await tweetRepository.remove(id);
  return { id };
}
