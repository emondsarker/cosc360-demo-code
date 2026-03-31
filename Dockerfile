# Stage 1: Build the client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the server
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npx tsc

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app

# Install server production deps
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# Copy built server
COPY --from=server-build /app/server/dist ./dist

# Copy built client into a static folder the server can serve
COPY --from=client-build /app/client/dist ./public

EXPOSE 4000

CMD ["node", "dist/index.js"]
