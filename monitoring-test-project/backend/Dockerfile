FROM node:22-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install


FROM node:22-alpine 
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm install -g pm2
RUN apk add --no-cache openssl

RUN mkdir -p logs && chown -R node:node logs
RUN npx prisma generate

USER node

EXPOSE 3001

CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
