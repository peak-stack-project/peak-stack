<<<<<<< HEAD
FROM node:22-bookworm-slim
=======
FROM node:22-alpine
>>>>>>> f49057c (Feat: caminho para as dashboards)

WORKDIR /app

COPY package*.json ./
<<<<<<< HEAD
RUN npm install --omit=dev

COPY app.js ./
COPY public ./public
COPY src ./src

ENV APP_PORT=3333
EXPOSE 3333

USER node
CMD ["node", "app.js"]
=======

RUN npm install --omit=dev

COPY . .

EXPOSE 3333

CMD ["node", "app.js"]
>>>>>>> f49057c (Feat: caminho para as dashboards)
