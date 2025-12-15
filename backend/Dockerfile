# backend/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Спочатку копіюємо файли залежностей, щоб кешувати їх
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

# Копіюємо решту коду
COPY . .

EXPOSE 3000

# Запускаємо в режимі розробки (з гарячим перезавантаженням)
CMD ["npm", "run", "start:dev"]