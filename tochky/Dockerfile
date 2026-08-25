FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy source
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
