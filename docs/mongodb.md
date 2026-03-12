# MongoDB Integration Guide

This document explains the MongoDB migration, type-safe schema design, and repository pattern implementation.

---

## Overview

The application replaced synchronous JSON file I/O with **Mongoose** (MongoDB ODM) for:

- **Type Safety** — Schemas enforced at compile-time against domain interfaces
- **Scalability** — Built-in indexing, querying, and persistence
- **Flexibility** — Environment-driven configuration (local Docker or MongoDB Atlas)

---

## Type Safety with Mongoose Schemas

### Domain Interfaces

Each module defines its domain interface:

```ts
// server/src/modules/auth/domain/types/index.ts
export interface IUser {
  id: string;
  username: string;
  createdAt: string;
}

// server/src/modules/tweet/domain/types/index.ts
export interface ITweet {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}
```

### Mongoose Schemas

Schemas are typed with the domain interface and stored in `domain/models/`:

```ts
// server/src/modules/auth/domain/models/user.model.ts
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
```

### The `_id` → `id` Transform

**Problem:** MongoDB uses `_id` as the document primary key, but the domain interface expects `id`.

**Solution:** Use Mongoose's `toJSON` transform to:

1. **Map `_id` to `id`** — When `.lean()` serializes the document
2. **Remove `__v`** — Strips Mongoose version field

**Result:** Repository functions return plain `IUser`/`ITweet` objects that satisfy the domain interface directly.

```ts
const user = await UserModel.findById(id).lean<IUser>();
// user is { id: "...", username: "...", createdAt: "..." }
// Not { _id: "...", username: "...", createdAt: "..." }
```

---

## Code Organization: The Layered Architecture

```
Domain Interface (IUser)
        ↓
Mongoose Schema (UserSchema<IUser>)
        ↓
Repository (findAll, findById, save, etc.)
        ↓
Repository Interface (IUserRepository)
        ↓
Repository Factory (repositories.ts)
        ↓
Service (business logic)
        ↓
Controller (HTTP handlers)
```

### Why Each Layer

1. **Domain Interface** — Contract that Mongoose schemas must satisfy
2. **Mongoose Schema** — Type-safe, validated persistence
3. **Repository Implementation** — Maps domain objects ↔ MongoDB
4. **Repository Interface** — Contracts for swapping implementations (e.g., PostgreSQL)
5. **Repository Factory** (`repositories.ts`) — Single source of truth for which implementation is used
6. **Service** — Business logic, orchestration (e.g., joining tweets with users)
7. **Controller** — HTTP validation, status codes, error handling

### Single Source of Truth for Repos

`server/src/repositories.ts`:

```ts
import { mongoUserRepository } from "./modules/auth/auth.repository.js";
import { mongoTweetRepository } from "./modules/tweet/tweet.repository.js";

export const userRepository = mongoUserRepository;
export const tweetRepository = mongoTweetRepository;
```

Services and middleware import from `repositories.ts`, not directly from modules:

```ts
// ✓ Correct
import { userRepository } from "../../repositories.js";

// ✗ Avoid
import * as authRepository from "../auth/auth.repository.js";
```

This makes it trivial to swap implementations later (e.g., migrate to PostgreSQL).

---

## Repository Implementation

### Read Operations: `.toJSON()`

Mongoose queries return Document objects. Call `.toJSON()` to apply the schema transforms and get plain JavaScript objects that satisfy the domain interface:

```ts
// Returns plain { id, username, createdAt }
const user = await UserModel.findById(id);
return user ? (user.toJSON() as IUser) : undefined;

// For multiple documents:
const docs = await UserModel.find();
return docs.map((doc) => doc.toJSON() as IUser);
```

The `.toJSON()` call applies the schema's `toJSON` transform, which maps `_id → id` and removes `__v`.

### Write Operations: `findByIdAndUpdate` with `upsert`

```ts
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
```

**Key flags:**

- `upsert: true` — Insert if document doesn't exist, update if it does
- `new: true` — Return the updated document (not the original)
- `.toJSON()` — Apply schema transforms and return a plain object with `id` (not `_id`)

### Delete Operations

```ts
export async function remove(id: string): Promise<void> {
  await TweetModel.findByIdAndDelete(id);
}
```

---

## Async/Await Throughout the Stack

All repository operations are `async` now. Services, controllers, and middleware must be async:

```ts
// auth.service.ts
export async function login(username: string): Promise<IUser> {
  const existing = await userRepository.findByUsername(username);
  if (existing) {
    return existing;
  }
  const user = User.create(username);
  return await userRepository.save(user.toJSON());
}

// auth.controller.ts
export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.login(username.trim());
  res.json({ data: user });
}

// auth.middleware.ts
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await userRepository.findById(userId);
  // ...
}
```

**Express 5 handles async errors natively** — if an async handler throws, it's passed to the error handler middleware automatically.

---

## Joining Data: `Promise.all`

When fetching tweets with author info, fetch both datasets in parallel:

```ts
// tweet.service.ts
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
```

This is faster than looping and fetching users one at a time. Later, you could add MongoDB aggregation for complex joins.

---

## Database Setup

### Local Development with Docker

The `docker-compose.yml` spins up MongoDB 7 in a container:

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
```

**Start:**

```bash
docker compose up -d mongo
```

**Stop:**

```bash
docker compose down
```

**Reset data:**

```bash
docker compose down -v
```

### Environment Configuration

`server/.env` (create from `.env.example`):

```
MONGODB_URI=mongodb://localhost:27017/cosc360
PORT=4000
```

`server/src/db/connection.ts` reads `MONGODB_URI`:

```ts
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
```

### Connection Flow

1. `server/src/index.ts` imports `dotenv/config` — loads `.env`
2. Calls `await connectDB()` before starting the Express server
3. If MongoDB is unreachable, connection throws and the server fails (fail-fast)
4. Once connected, repositories can execute queries

---

## Switching to MongoDB Atlas

For production, use a managed MongoDB cluster:

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get the connection string: `mongodb+srv://username:password@cluster.mongodb.net/cosc360`
3. Update `server/.env`:

   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cosc360
   ```

4. Restart the server — **zero code changes**

The application uses the same repositories and schemas regardless of whether the database is local or cloud-hosted.

---

## Verification Checklist

After migration:

```bash
# 1. Start MongoDB
docker compose up -d mongo

# 2. Install dependencies
npm install && npm install --prefix server

# 3. Start the server
npm run server
# Should log "MongoDB connected"

# 4. Create a user
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}'
# Response: { "data": { "id": "...", "username": "alice", "createdAt": "..." } }

# 5. Get empty tweets list
curl http://localhost:4000/api/tweets
# Response: { "data": [] }

# 6. Create a tweet (replace USER_ID)
curl -X POST http://localhost:4000/api/tweets \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"content":"Hello, MongoDB!"}'

# 7. Verify in mongosh
docker exec -it <container-id> mongosh cosc360
> db.users.find()
> db.tweets.find()
```

---

## Key Takeaways

- **Schemas** typed with domain interfaces ensure compile-time safety
- **`toJSON` transforms** map MongoDB's `_id` to domain's `id`
- **Repository factory** (`repositories.ts`) is the single source of truth
- **`.lean()`** returns plain objects that match domain interfaces
- **`async/await`** flows through services → controllers → middleware
- **Docker Compose** provides local development; `.env` handles both local and cloud
- **No code changes needed** to switch from local to Atlas MongoDB
