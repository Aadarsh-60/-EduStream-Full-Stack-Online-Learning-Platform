FROM node:20-alpine
WORKDIR /app
COPY edustream-backend/gateway/package*.json ./
RUN npm install --production
COPY edustream-backend/gateway/ ./
COPY edustream-backend/shared/ /shared
EXPOSE 5000
CMD ["node", "src/index.js"]
