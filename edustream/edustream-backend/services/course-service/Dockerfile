FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/course-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/course-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5003
CMD ["node", "src/index.js"]
