FROM node:20-alpine
WORKDIR /app
COPY services/media-service/package*.json ./
RUN npm install --production
COPY services/media-service/ ./
COPY shared/ /shared
EXPOSE 5004
CMD ["node", "src/index.js"]
