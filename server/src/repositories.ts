import { mongoUserRepository } from "./modules/auth/auth.repository.js";
import { mongoTweetRepository } from "./modules/tweet/tweet.repository.js";

export const userRepository = mongoUserRepository;
export const tweetRepository = mongoTweetRepository;
