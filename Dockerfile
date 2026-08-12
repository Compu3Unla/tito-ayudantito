FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0

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

ENTRYPOINT ["./entrypoint.sh"]
