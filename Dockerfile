FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copiar também os arquivos estáticos necessários
COPY --from=build /app/public/ /usr/share/nginx/html/ 2>/dev/null || true
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]