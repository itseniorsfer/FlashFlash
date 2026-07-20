# Imagen ligera de Node.js Alpine para producción
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos de dependencias e instalar solo producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar el código fuente completo
COPY . .

# Exponer puerto 8080 para Google Cloud Run
EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
