FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

# Pas de COPY . . ici pour le dev, le code sera monté par le volume

EXPOSE 3000

CMD ["npm", "run", "dev"]