FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY . .
CMD ["node", "checker.js"]
