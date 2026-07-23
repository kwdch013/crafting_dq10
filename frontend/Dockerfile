FROM node:22-alpine

WORKDIR /usr/src/app

COPY frontend/server.js ./server.js
COPY app/ ./public/

ENV PORT=3000
# API_BASE_URL は固定せず、アクセス元のホスト名から導出する (別端末からの接続に対応)
ENV API_PORT=8000

EXPOSE 3000

CMD ["node", "server.js"]
