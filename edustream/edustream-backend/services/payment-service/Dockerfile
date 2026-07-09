FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/payment-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/payment-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5005
CMD ["node", "src/index.js"]
