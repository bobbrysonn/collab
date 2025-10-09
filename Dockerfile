FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.js ./

EXPOSE 1234

CMD ["npm", "start"]
