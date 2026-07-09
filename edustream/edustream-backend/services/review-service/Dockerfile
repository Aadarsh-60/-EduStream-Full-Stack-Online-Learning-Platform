FROM node:20-alpine
WORKDIR /app
COPY services/review-service/package*.json ./
RUN npm install --production
COPY services/review-service/ ./
COPY shared/ /shared
EXPOSE 5007
CMD ["node", "src/index.js"]
