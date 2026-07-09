FROM node:20-alpine
WORKDIR /app
COPY services/search-service/package*.json ./
RUN npm install --production
COPY services/search-service/ ./
COPY shared/ /shared
EXPOSE 5008
CMD ["node", "src/index.js"]
