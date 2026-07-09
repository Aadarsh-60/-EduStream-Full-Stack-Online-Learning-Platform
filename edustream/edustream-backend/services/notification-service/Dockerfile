FROM node:20-alpine
WORKDIR /app
COPY services/notification-service/package*.json ./
RUN npm install --production
COPY services/notification-service/ ./
COPY shared/ /shared
EXPOSE 5006
CMD ["node", "src/index.js"]
