# Droplet deployment (SSL via host nginx)

Use host nginx as the single SSL entry point so all traffic is HTTPS with one certificate.

## 1. Nginx on the Droplet

- Copy the config to nginx and enable it:
  ```bash
  sudo cp deploy/nginx/cpsc319.conf /etc/nginx/sites-available/cpsc319
  sudo ln -sf /etc/nginx/sites-available/cpsc319 /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  ```
- Ensure Let’s Encrypt certs exist, e.g.:
  ```bash
  sudo certbot certonly --webroot -w /var/www/html -d cpsc319.jaskiratgill.ca
  ```
  (or use the path where your app is served if different.)

## 2. Frontend behind host nginx

Host nginx must listen on 80/443, so the frontend container must **not** bind to 80/443. Use the droplet compose override so the frontend is only on 8080:

```bash
docker compose -f docker-compose.yml -f docker-compose.droplet.yml up -d
```

So: host nginx serves HTTPS and proxies `/` → `http://127.0.0.1:8080`, and `/api/sync/`, `/api/query/`, `/api/mcp/` to the backend containers.

## 3. Frontend env (path-prefixed API URL)

Set the API base URL to the path-prefixed origin (no port):

```bash
VITE_API_URL=https://cpsc319.jaskiratgill.ca/api/sync
```

So all existing frontend calls (`/api/v1/auth/...`, `/sync`, `/plugins`, etc.) become `https://cpsc319.jaskiratgill.ca/api/sync/...` and nginx strips `/api/sync/` and forwards to the sync-service on port 8000.

In `.env` on the Droplet:

```
VITE_API_URL=https://cpsc319.jaskiratgill.ca/api/sync
```

(Restart the frontend container after changing env so `/config.js` is regenerated.)
