FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    git \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# Compila TypeScript para JS
RUN ./node_modules/.bin/tsc --skipLibCheck

EXPOSE 3001

CMD ["node", "dist/server.js"]

