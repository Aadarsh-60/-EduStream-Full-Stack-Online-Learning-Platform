FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/notification-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/notification-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5006
CMD ["node", "src/index.js"]
