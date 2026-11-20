# Interfaz de EdRev Cesmag: se compila aquí y la sirve nginx, que además reenvía /api a la API.
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# La interfaz llama a /api en su mismo servidor (nginx lo reenvía a la API): no depende de ninguna IP.
ENV VITE_API_URL=/api VITE_USE_MOCKS=false
RUN npx vite build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
