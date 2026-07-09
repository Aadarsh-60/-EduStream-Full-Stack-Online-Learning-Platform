FROM node:20-alpine
WORKDIR /app
COPY gateway/package*.json ./
RUN npm install --production
COPY gateway/ ./
COPY shared/ /shared
EXPOSE 5000
CMD ["node", "src/index.js"]
