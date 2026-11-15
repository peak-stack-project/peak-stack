FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY app.js ./
COPY testeAWS.js ./
COPY src ./src
COPY public ./public

EXPOSE 3333

CMD ["npm", "start"]
