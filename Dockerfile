FROM node:20-slim

# vnu-jar needs a JRE
RUN apt-get update && apt-get install -y --no-install-recommends default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /action
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY translations ./translations
COPY .stylelintrc.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
