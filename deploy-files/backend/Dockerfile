FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build
RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npm run db:push && npm start"]
