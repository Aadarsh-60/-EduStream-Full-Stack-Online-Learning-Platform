FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/services/auth-service/package*.json ./
RUN npm install --production
COPY edustream-backend/services/auth-service/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5001
CMD ["node", "src/index.js"]
