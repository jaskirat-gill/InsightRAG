FROM node:22-alpine

WORKDIR /app

# Install dependencies as root first
COPY package.json package-lock.json* ./
RUN npm install

# Use the built-in node user (uid 1000) to match typical host UID
USER node

COPY --chown=node:node . .

CMD ["npm", "run", "dev", "--", "--host"]
