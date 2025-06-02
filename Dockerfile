# Usar imagen base de Node.js
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY . .

# Compilar (si usas TypeScript)
RUN npm run build

# Exponer el puerto (ajústalo si no usas el 3000)
EXPOSE 3000

# Comando para iniciar la app
CMD ["node", "dist/main"]