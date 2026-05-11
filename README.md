# IE Network 2027

## Setup
`npx auth secret`
`pnpm run eol`

## Run with Docker Compose
- `docker compose --env-file .env up -d`
- `docker compose --env-file .env down -v`

## Build and Push Docker Image
- `docker build -t nnnpooh/ie_network_2027:latest .`
- `docker push nnnpooh/ie_network_2027:latest`

## Run Docker Container
`run.sh`
```
#!/bin/sh
docker rm -f ie-network-2027
docker pull nnnpooh/ie_network_2027:latest
docker run -d --env-file .env.local --name ie-network-2027 -p 3010:80 nnnpooh/ie_network_2027
```

## Generate types for better-auth
`npx auth@latest generate`

## Generate secret for better-auth
`npx auth secret`

## Todo
- Internationalization (i18n)
- Gmail integration
- Magic link login
- Email queue for sending emails

# Note on Email Sending
- My mistake was using the OAuth Playground, but it was created with Gmail API read/send scopes rather than https://mail.google.com/, so the token works for some API calls but fails for SMTP login.