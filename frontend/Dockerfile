# Étape 1 : Build de l'application
FROM node:20-alpine as build

WORKDIR /app

# Copier fichiers de dépendances et installer
COPY package*.json ./
RUN npm ci

# Copier le code source et compiler le build optimisé
COPY . .
RUN npm run build

# Étape 2 : Hébergement via Nginx (production-ready)
FROM nginx:stable-alpine

# Copier la configuration personnalisée de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers compilés dans le dossier de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exposition du port standard Web
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
