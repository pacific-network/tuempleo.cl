# Etapa 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json y package-lock.json (o yarn.lock)
COPY package*.json ./

# Instalar TODAS las dependencias (incluidas devDependencies)
RUN npm install

# Copiar todo el código fuente
COPY . .

# Construir el proyecto (esto genera /app/dist)
RUN npm run build

# Etapa 2: Producción
FROM node:18-alpine

WORKDIR /app

# Copiar solo las dependencias de producción
COPY package*.json ./
RUN npm install --production

# Copiar solo la carpeta dist desde la etapa de build
COPY --from=build /app/dist ./dist

# Exponer puerto
EXPOSE 3000

# Ejecutar la app compilada
CMD ["node", "dist/main"]
