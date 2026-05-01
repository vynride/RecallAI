# VPS Deployment Plan — RecallAI

## Architecture

```
Internet → nginx (system, 80/443)
              ├── /            → 127.0.0.1:3000  (Next.js frontend)
              ├── /api/auth/   → 127.0.0.1:3000  (NextAuth)
              ├── /api/        → 127.0.0.1:8000  (FastAPI backend)
              └── /umami/      → 127.0.0.1:3001  (Analytics)

backend:8000 ← worker (Celery, queue=pipeline)
backend:8000 ← beat   (Celery scheduler, cleanup every 30 min)

postgres:5432  — app data
redis:6379     — Celery broker (db 0) + result backend (db 1)
umami-db:5432  — analytics data (separate postgres instance)
```

Docker containers bind only to `127.0.0.1` (see `docker-compose.prod.yml`).
System nginx is the only process listening on 80/443.

---

## 1. Server prerequisites

```bash
# Docker Engine + Compose plugin (not docker-compose v1)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this

# System nginx + certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Verify
docker compose version    # must be >= 2.x
nginx -v
```

Minimum recommended VPS spec: **2 vCPU / 4 GB RAM / 40 GB SSD**.
Memory limits from `docker-compose.prod.yml`: backend 1G, worker 2G, frontend 512M, postgres 1G, redis 256M, umami 512M → ~5.3 GB peak.

---

## 2. Clone & configure

```bash
git clone <repo-url> /opt/recallai
cd /opt/recallai

cp .env.example.prod .env
```

Edit `.env` — every `CHANGE_ME` and blank value must be filled:

| Variable | How to generate |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | same value as `AUTH_SECRET` |
| `GEMINI_KEY_PEPPER` | `openssl rand -base64 32` (permanent — changing invalidates all stored keys) |
| `UMAMI_APP_SECRET` | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | strong password, 16+ chars |
| `UMAMI_DB_PASSWORD` | strong password, 16+ chars |
| `AUTH_URL` | `https://yourdomain.com` (no trailing slash) |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID/SECRET` | [console.cloud.google.com](https://console.cloud.google.com) — Authorized redirect URI: `https://yourdomain.com/api/auth/callback/google` |
| `GITHUB_CLIENT_ID/SECRET` | [github.com/settings/developers](https://github.com/settings/developers) — Callback URL: `https://yourdomain.com/api/auth/callback/github` |
| `RECALLAI_DATA_DIR` | `/var/recallai-data` |
| `CELERY_CONCURRENCY` | number of vCPUs on the server |

Leave `NEXT_PUBLIC_UMAMI_WEBSITE_ID` blank for now — you'll fill it in step 7.

---

## 3. Create data directories

These must exist before Docker bind-mounts them:

```bash
sudo mkdir -p /var/recallai-data/{pg_data,redis_data,recallai_uploads,recallai_results,umami_pg_data}
sudo chown -R $USER:$USER /var/recallai-data
```

---

## 4. Configure system nginx

Create the site config:

```bash
sudo nano /etc/nginx/sites-available/recallai
```

Paste the following (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Will be used by certbot for ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # FastAPI backend
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }

    # Next.js frontend (catches /api/auth/* too)
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # Umami analytics
    location /umami/ {
        proxy_pass         http://127.0.0.1:3001/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/recallai /etc/nginx/sites-enabled/recallai
sudo rm -f /etc/nginx/sites-enabled/default
```

---

## 5. Bootstrap TLS (first deploy only)

Nginx needs certs before the TLS block can start. Issue them while only the HTTP block is active:

```bash
# Comment out the entire second server block (port 443) in /etc/nginx/sites-available/recallai
# Then test and reload nginx with just the HTTP block:
sudo nginx -t && sudo systemctl reload nginx

# Issue the cert (replace yourdomain.com and your email):
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com --email you@example.com --agree-tos --non-interactive

# Uncomment the port-443 server block, then reload:
sudo nginx -t && sudo systemctl reload nginx
```

Enable auto-renewal (certbot installs a systemd timer by default — verify it):

```bash
sudo systemctl status certbot.timer
```

If you prefer a cron entry instead:

```cron
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

---

## 6. Start all services

```bash
cd /opt/recallai
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Watch logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend worker
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

The backend startup command runs `alembic upgrade head` automatically before uvicorn starts.

---

## 7. Configure Umami analytics

1. Open `https://yourdomain.com/umami` in a browser.
2. Default credentials: `admin` / `umami` — **change these immediately**.
3. Go to Settings → Websites → Add website → copy the **Website ID**.
4. Set it in `.env`:
   ```
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=<paste-id-here>
   ```
5. Restart the frontend container to bake in the build-time env var:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
   ```

> `NEXT_PUBLIC_*` vars are inlined at build time by Next.js, so a full rebuild is required after changing them.

---

## 8. Verify

```bash
# Health endpoint
curl https://yourdomain.com/api/health

# Check analytics script loads (should return JS, not 404)
curl -I https://yourdomain.com/umami/script.js

# Tail all logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

---

## 9. Ongoing operations

**Deploy updates:**
```bash
cd /opt/recallai
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Scale Celery workers** (e.g. add a second worker):
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale worker=2
```

**View job queue depth:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec redis redis-cli llen celery
```

**Manual database backup:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres pg_dump -U recallai recallai > backup_$(date +%Y%m%d).sql
```

---

## Known issues / gotchas

- **`NEXT_PUBLIC_*` vars are build-time**: changing `NEXT_PUBLIC_UMAMI_WEBSITE_ID` or `NEXT_PUBLIC_UMAMI_SCRIPT_URL` in `.env` requires `--build frontend`, not just a container restart.
- **`RECALLAI_DATA_DIR` must be on a Linux-native FS** (ext4/btrfs/xfs). NTFS/FUSE mounts break Postgres and Redis init due to missing POSIX chmod support.
- **`GEMINI_KEY_PEPPER` is permanent** once users have saved their Gemini API keys. Rotating it will invalidate all stored keys.
- **Umami script URL** must match the nginx proxy path: `https://yourdomain.com/umami/script.js` (the `/umami/` prefix is what nginx routes to the umami container).
- **nginx must be running before containers start** if you want zero-downtime deploys — system nginx stays up independently of Docker restarts.
