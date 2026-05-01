# RecallAI — Deployment

Single-VPS deployment with Docker Compose + system nginx.

## Architecture

```
Internet → nginx (system, 80/443)
              ├── /api/auth/         → 127.0.0.1:3000  (NextAuth)
              ├── /api/              → 127.0.0.1:8000  (FastAPI)
              ├── /umami/script.js   → 127.0.0.1:3001  (tracking script)
              ├── /umami/api/send    → 127.0.0.1:3001  (data collection)
              └── /                 → 127.0.0.1:3000  (Next.js)

127.0.0.1:3001  — Umami dashboard (private, SSH tunnel only)
```

All containers bind to `127.0.0.1` only. nginx is the sole public listener.

Minimum VPS spec: **2 vCPU / 4 GB RAM / 40 GB SSD**.
Prod memory caps: backend 1G · worker 2G · frontend 512M · postgres 1G · redis 256M · umami 512M → ~5.3 GB peak.

---

## 1. Prerequisites

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after

# System nginx + certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Verify
docker compose version   # must be >= 2.x
nginx -v
```

---

## 2. Clone & configure

```bash
git clone https://github.com/vynride/RecallAI.git /opt/recallai
cd /opt/recallai
cp .env.example.prod .env
```

Fill every `CHANGE_ME` value in `.env`:

| Variable | How to get it |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | same value as `AUTH_SECRET` |
| `GEMINI_KEY_PEPPER` | `openssl rand -base64 32` — **permanent**, changing it invalidates all stored keys |
| `UMAMI_APP_SECRET` | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | strong password |
| `UMAMI_DB_PASSWORD` | strong password |
| `AUTH_URL` | `https://yourdomain.com` (no trailing slash) |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID/SECRET` | [console.cloud.google.com](https://console.cloud.google.com) — redirect URI: `https://yourdomain.com/api/auth/callback/google` |
| `GITHUB_CLIENT_ID/SECRET` | [github.com/settings/developers](https://github.com/settings/developers) — callback URL: `https://yourdomain.com/api/auth/callback/github` |
| `RECALLAI_DATA_DIR` | `/var/recallai-data` |
| `CELERY_CONCURRENCY` | number of vCPUs |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | leave blank for now (fill in step 7) |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | `https://yourdomain.com/umami/script.js` |

---

## 3. Data directories

```bash
sudo mkdir -p /var/recallai-data/{pg_data,redis_data,recallai_uploads,recallai_results,umami_pg_data}
sudo chown -R $USER:$USER /var/recallai-data
```

Must be on a Linux-native filesystem (ext4/btrfs/xfs) — NTFS/FUSE breaks Postgres and Redis init.

---

## 4. System nginx config

```bash
sudo nano /etc/nginx/sites-available/recallai
```

Paste the following (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

    # Next.js routes — must be before /api/ (longest prefix wins)
    location /api/auth/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /api/proxy/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }

    # FastAPI backend
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }

    # Umami tracking script (public)
    location = /umami/script.js {
        proxy_pass         http://127.0.0.1:3001/script.js;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Umami data collection (public)
    location = /umami/api/send {
        proxy_pass         http://127.0.0.1:3001/api/send;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Next.js frontend
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
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/recallai /etc/nginx/sites-enabled/recallai
sudo rm -f /etc/nginx/sites-enabled/default
```

---

## 5. TLS (first deploy only)

```bash
# Comment out the entire port-443 server block, then reload nginx with HTTP only:
sudo nginx -t && sudo systemctl reload nginx

# Issue the cert:
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com --email you@example.com --agree-tos --non-interactive

# Uncomment the port-443 block and reload:
sudo nginx -t && sudo systemctl reload nginx
```

Certbot installs a systemd timer for auto-renewal — verify it:

```bash
sudo systemctl status certbot.timer
```

---

## 6. Start all services

```bash
cd /opt/recallai
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Watch logs until everything is healthy:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend worker
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

The backend runs `alembic upgrade head` automatically on startup before uvicorn starts.

---

## 7. Configure Umami analytics

The Umami dashboard is not publicly accessible. Access it via SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 user@yourvps
# then open http://localhost:3001
```

1. Default credentials: `admin` / `umami` — **change these immediately**
2. Settings → Websites → Add website → copy the **Website ID**
3. Set in `.env` on the VPS: `NEXT_PUBLIC_UMAMI_WEBSITE_ID=<id>`
4. Rebuild the frontend (`NEXT_PUBLIC_*` vars are baked in at build time):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
   ```

---

## 8. Verify

```bash
# API health
curl https://yourdomain.com/api/health

# Umami tracking script reachable
curl -I https://yourdomain.com/umami/script.js   # expect 200

# Script injected in page HTML
curl -s https://yourdomain.com | grep umami
```

---

## 9. Ongoing operations

**Deploy updates:**
```bash
cd /opt/recallai
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Scale workers:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale worker=2
```

**Check queue depth:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec redis redis-cli llen celery
```

**Database backup:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres \
  pg_dump -U recallai recallai > backup_$(date +%Y%m%d).sql
```

---

## Gotchas

- **`NEXT_PUBLIC_*` are build-time vars** — changing them requires `--build frontend`, not just a restart
- **`GEMINI_KEY_PEPPER` is permanent** — rotating it invalidates all stored user keys
- **`RECALLAI_DATA_DIR` must be on a Linux-native FS** — NTFS/FUSE breaks Postgres/Redis init
- **`/api/auth/` and `/api/proxy/` must come before `/api/`** — nginx uses longest-prefix matching; both are Next.js route handlers that must hit the frontend, not FastAPI
- **Umami subpath doesn't work with the pre-built Docker image** — `BASE_PATH` is a Next.js build-time config; only `script.js` and `api/send` are proxied, the dashboard is SSH-tunnel only
