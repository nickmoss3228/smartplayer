# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# No C toolchain needed: bcrypt (stray backend dep in this package.json) is
# v6, which ships prebuilt musl binaries — verified `npm ci` + `require()`
# both succeed on bare node:20-alpine. Add python3/make/g++ here only if a
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
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
