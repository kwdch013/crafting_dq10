FROM node:22-alpine

WORKDIR /usr/src/app

COPY frontend/server.js ./server.js
COPY app/ ./public/

ENV PORT=3000
ENV API_BASE_URL=http://localhost:8000

EXPOSE 3000

CMD ["node", "server.js"]
