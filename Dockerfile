FROM node:22-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma/

RUN npm install

# Copy application sources
COPY tsconfig.json ./
COPY src ./src/

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "run", "dev"]
