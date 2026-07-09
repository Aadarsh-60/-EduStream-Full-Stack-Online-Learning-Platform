FROM node:20-alpine
WORKDIR /app
COPY services/auth-service/package*.json ./
RUN npm install --production
COPY services/auth-service/ ./
COPY shared/ /shared
EXPOSE 5001
CMD ["node", "src/index.js"]
