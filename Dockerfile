FROM node:lts-alpine

WORKDIR /app

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN npm install --omit=dev && npm cache clean --force

COPY . .

EXPOSE 3000

RUN chown -R node /app
USER node
CMD ["node", "server.js"]
