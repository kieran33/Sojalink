FROM node:24-slim AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
ENV NODE_ENV=development
RUN npm run build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/build ./
COPY --from=build /app/docker-entrypoint.js ./
RUN npm ci --omit=dev

EXPOSE 3333
CMD ["node", "docker-entrypoint.js"]