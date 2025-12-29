# ---------- BASE ----------
FROM node:20-bookworm

# ---------- DEPENDÊNCIAS DO SISTEMA ----------
# Chromium + libs necessárias para Playwright PDF
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------- VARIÁVEIS ----------
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# ---------- APP ----------
WORKDIR /app

# Copia apenas manifests primeiro (melhora cache)
COPY package*.json ./

# Instala dependências (prod + prisma generate no postinstall)
RUN npm install --omit=dev

# Copia o restante do código
COPY . .

# Build TypeScript
RUN npm run build

# ---------- PORT ----------
EXPOSE 3333

# ---------- START ----------
CMD ["node", "dist/server.js"]
