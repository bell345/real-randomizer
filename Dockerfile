FROM node:alpine
WORKDIR /app
COPY package.json package.json
RUN npm install .
COPY . .
EXPOSE 8008
CMD node server.node.js
