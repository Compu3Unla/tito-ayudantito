FROM node:24-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03

# vnu-jar needs a JRE. Version pinned to what's currently available in this base
# image's Debian release; bump alongside the base image digest when updating.
RUN apt-get update && apt-get install -y --no-install-recommends default-jre-headless=2:1.17-74 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /action
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY translations ./translations
COPY .stylelintrc.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]
