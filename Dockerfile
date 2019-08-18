FROM node:12-alpine AS builder
WORKDIR /opt/app
COPY package.json .
COPY src src
COPY webpack.config.js .
COPY tsconfig.json .
RUN npm install
RUN npm run build

FROM node:12-buster
COPY --from=builder /opt/app/dist /opt/app
WORKDIR /opt/app
RUN mkdir music_in
RUN mkdir music_out
RUN npm install --only=prod
RUN apt-get update
RUN apt-get install sox libsox-fmt-all -y
CMD ["node", "app.js"]
