FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# We just copied 'shared' inside this service folder, so it is in '.' 
# We move it to the root /shared where the code expects it.
RUN mv shared /shared
EXPOSE 5002
CMD ["node", "src/index.js"]
