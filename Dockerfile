FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG API_BASE_URL
RUN API_BASE_URL="$API_BASE_URL" node scripts/generate-production-environment.mjs \
    && npm run build -- --configuration production \
    && test -f dist/argos-web/browser/index.html

FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/argos-web/browser /srv

RUN caddy validate --config /etc/caddy/Caddyfile

EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
