FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/media-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/media-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5004
CMD ["node", "src/index.js"]
