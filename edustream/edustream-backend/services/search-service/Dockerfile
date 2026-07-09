FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/search-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/search-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5008
CMD ["node", "src/index.js"]
