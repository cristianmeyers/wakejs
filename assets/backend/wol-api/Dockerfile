FROM node:18-alpine

# Instalar dependencias del sistema necesarias para ping y WOL
RUN apk add --no-cache \
    iputils \
    curl \
    bash

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm install --production

# Copiar el resto de la aplicación
COPY index.js .
COPY dhcp-template.conf .

# Exponer el puerto 3000
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Comando para iniciar la aplicación
CMD ["node", "index.js"]
