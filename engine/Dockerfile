FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

RUN npm install
RUN npm run build --workspace=packages/shared-types
RUN cd apps/api && npx prisma generate && npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss; npm run start --workspace=apps/api"]
