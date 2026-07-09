FROM node:20-alpine
WORKDIR /app
COPY services/user-service/package*.json ./
RUN npm install --production
COPY services/user-service/ ./
COPY shared/ /shared
EXPOSE 5002
CMD ["node", "src/index.js"]
