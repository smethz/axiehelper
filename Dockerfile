FROM node:lts

RUN apt-get update && apt-get install -y python3

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# DEPLOY BOT COMMANDS
RUN npm run deploy:prod

CMD ["npm", "run", "migrate:prod"]