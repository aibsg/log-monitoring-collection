FROM node:24-alpine as build 

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM alpine:3
WORKDIR /app
COPY --chown=nginx:nginx --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Build ready in /app/dist'"]

