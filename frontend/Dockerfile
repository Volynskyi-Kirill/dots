# Dockerfile for React frontend
FROM node:20-alpine

WORKDIR /app

# The frontend code will be mounted as a volume in development,
# but we need a package.json to install dependencies in the image.
# For local dev via compose, we mount /app and run npm install inside if needed,
# or just install them locally first. Here we copy and install.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev"]
