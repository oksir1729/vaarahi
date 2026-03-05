# Stage 1: Build the Vite React Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install frontend dependencies (this allows for better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend source
COPY . .

# Build the frontend (Vite builds into /app/dist)
RUN npm run build

# Stage 2: Build the Express Backend & Serve
FROM node:20-alpine

WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server source code
COPY server/ ./server/

# Build the Typescript server (Optional, you can also run it via ts-node, but building is better for prod)
# Assuming you might want to run the server directly or via ts-node in production
# Railway/Vercel handles ports via process.env.PORT automatically

# Copy built frontend from Stage 1 into the running container
COPY --from=builder /app/dist ./client_dist

# Expose default port
EXPOSE 5000

# Start server
# Since the server package.json start script likely uses nodemon or ts-node, we use that.
# For production, running via `node` using compiled output or `--loader ts-node/esm` is fine given the app state.
WORKDIR /app/server
CMD ["npm", "run", "start"]
