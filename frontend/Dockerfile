# Stage 1: build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build-time env for Vite (inlined into JS). Defaults allow image to build; set in CI via build-args for production.
ARG VITE_API_URL=
ARG VITE_OPENWEBUI_BASE_URL=
ARG VITE_OPENWEBUI_TOKEN=
ARG VITE_OPENWEBUI_TIMEOUT_MS=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_OPENWEBUI_BASE_URL=$VITE_OPENWEBUI_BASE_URL \
    VITE_OPENWEBUI_TOKEN=$VITE_OPENWEBUI_TOKEN \
    VITE_OPENWEBUI_TIMEOUT_MS=$VITE_OPENWEBUI_TIMEOUT_MS

COPY . .
RUN npm run build

# Stage 2: serve with nginx (no dev server = no "Optimize Dep" / 504s)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
