# syntax=docker/dockerfile:1

# ---------- Stage 1: production dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app

# bcrypt@5 has a native addon. Unlike the frontend's bcrypt@6 (which ships
# prebuilt musl binaries), v5's alpine prebuilds are unreliable, so keep a C
# toolchain here. Multi-stage means it never reaches the final image.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# tini reaps zombies and forwards signals, so `docker compose stop` shuts the
# app down cleanly instead of waiting out the 10s kill timeout.
RUN apk add --no-cache tini

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Config arrives at RUNTIME via env_file (unlike the frontend, whose VITE_*
# vars are compiled in at build time). Nothing secret is baked into this image.
EXPOSE 3000
USER node

# `GET /` returns a JSON status payload, so it doubles as the health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
