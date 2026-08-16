FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY pleaco-frontend/package.json ./pleaco-frontend/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter pleaco-frontend build

FROM nginx:alpine AS production
COPY --from=build /app/pleaco-frontend/dist /usr/share/nginx/html
COPY pleaco-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]