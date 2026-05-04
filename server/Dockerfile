# From repository root: docker build -f server/Dockerfile -t prediction-api ./server
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
