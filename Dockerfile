# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo dev)
RUN npm install

# Copiar el resto del código
COPY . .

# Ejecutar build
RUN npm run build

# Etapa 2: Imagen final para producción
FROM node:18-alpine

WORKDIR /app

# Copiar solo package.json y package-lock.json para instalar solo producción
COPY package*.json ./

RUN npm install --production

# Copiar solo el build generado en la etapa anterior
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
