FROM node:13-alpine AS builder
WORKDIR /opt/app
COPY package.json .
COPY src src
COPY webpack.config.js .
COPY tsconfig.json .
RUN npm install && npm run build

FROM node:13-buster
COPY --from=builder /opt/app/dist /opt/app
WORKDIR /opt/app
RUN mkdir music_in && mkdir music_out && npm install && apt-get update && apt-get install ffmpeg -y
CMD ["node", "app.js"]
