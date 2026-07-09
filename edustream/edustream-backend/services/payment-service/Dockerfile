FROM node:20-alpine
WORKDIR /app
COPY services/payment-service/package*.json ./
RUN npm install --production
COPY services/payment-service/ ./
COPY shared/ /shared
EXPOSE 5005
CMD ["node", "src/index.js"]
