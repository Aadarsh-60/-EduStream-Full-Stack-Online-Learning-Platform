FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/review-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/review-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5007
CMD ["node", "src/index.js"]
