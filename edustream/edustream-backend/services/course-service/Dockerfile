FROM node:20-alpine
WORKDIR /app
COPY services/course-service/package*.json ./
RUN npm install --production
COPY services/course-service/ ./
COPY shared/ /shared
EXPOSE 5003
CMD ["node", "src/index.js"]
