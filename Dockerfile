# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# No C toolchain needed: bcrypt (stray backend dep in this package.json) is
# v6, which ships prebuilt musl binaries — verified `npm ci` + `require()`
# both succeed on bare node:22-alpine. Add python3/make/g++ here only if a
# future native dep has no alpine prebuild.
RUN npm ci

COPY . .

# Vite inlines import.meta.env.VITE_* at build time — must be present
# before `vite build` runs, cannot be supplied as container runtime env.
ARG VITE_API_URL
ARG VITE_YOS_BASE_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_YOS_BASE_URL=${VITE_YOS_BASE_URL}

RUN npm run build

# ---------- Stage 2: runtime ----------
# nginx:stable-alpine, NOT a pinned minor like nginx:1.27-alpine. Pinned minor
# tags are frozen snapshots that stop being rebuilt, so their Alpine packages
# rot: 1.27-alpine scans 6 critical / 27 high, 1.28-alpine 8 critical / 26 high,
# while stable-alpine — same nginx stable branch, continuously rebuilt — is
# 0 critical / 0 high. Re-pin to a digest here if reproducibility ever matters
# more than staying patched.
FROM nginx:stable-alpine AS runtime

# Which backend container nginx proxies /api/ to. Defaults to the production
# service name, so an unparameterised build produces exactly what it always
# has. The staging build passes http://backend-staging:3000 — without this a
# staging frontend would proxy straight into the PRODUCTION API and write test
# data to real users, which is the one failure this whole split exists to
# prevent. Baked at build time rather than read from the environment because
# nginx.conf is a static file in the image; see docs/staging.md.
ARG BACKEND_UPSTREAM=http://backend:3000
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s|http://backend:3000|${BACKEND_UPSTREAM}|" /etc/nginx/conf.d/default.conf \
 && grep -q "${BACKEND_UPSTREAM}" /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
