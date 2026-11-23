FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY app.js ./
COPY public ./public
COPY src ./src

ENV APP_PORT=3333
EXPOSE 3333

USER node
CMD ["node", "app.js"]
