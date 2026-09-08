# Production Launch & Deployment Runbook

Complete 4-phase verification runbook for deploying Next.js 14+ SaaS applications to Vercel, Lovable, or self-hosted VPS (Docker/Nginx/SSL).

---

## Phase 1: Pre-Flight Code, Build & Security Verification

Execute every check locally before initiating any production release.

### 1. Local Build & Type Invariant Checks
```powershell
# Windows / PowerShell execution standard
cmd.exe /c "npx tsc --noEmit"
cmd.exe /c "npm run build"
cmd.exe /c "npm run lint"
```
- [ ] TypeScript compilation exits with code 0 (zero errors or implicit `any`).
- [ ] Next.js production build completes without warnings or dynamic server usage errors on static routes.
- [ ] ESLint passes without unhandled warnings.

### 2. Secrets & Hygiene Scan
- [ ] Scan repository for hardcoded API keys, bearer tokens, or Supabase `service_role` keys.
- [ ] Confirm `.env.local`, `.env.*.local`, and `*.pem` are listed in `.gitignore`.
- [ ] Verify `.env.example` contains all required environment variable keys with empty or placeholder values.
- [ ] Ensure all `console.log` statements containing tokens, user PII, or raw database queries are removed.

### 3. Application Boundaries & Fallbacks
- [ ] `src/app/error.tsx`: Runtime error boundary with recovery action (`reset()`).
- [ ] `src/app/global-error.tsx`: Root-level fallback capturing layout crashes.
- [ ] `src/app/not-found.tsx`: Accessible 404 handler with navigation back to safety.
- [ ] `src/app/loading.tsx`: Skeleton loading states for dynamic route transitions.

---

## Phase 2: Target-Specific Deployment Workflows

Select the section corresponding to your deployment target.

### Target A: Vercel Cloud Platform

#### 1. Environment Variable Synchronization
Configure in Vercel Project Settings ➔ Environment Variables for **Production** and **Preview**:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
DATABASE_URL=postgres://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```
*Note*: Always connect Server Actions and route handlers via Supabase Transaction Pooler (Port 6543 / PgBouncer mode) to prevent connection exhaustion.

#### 2. Domain & DNS Configuration
| Record Type | Host | Target / Value | TTL |
|---|---|---|---|
| `A` | `@` (apex) | `76.76.21.21` | Auto / 300 |
| `CNAME` | `www` | `cname.vercel-dns.com` | Auto / 300 |

---

### Target B: Lovable Cloud Sync

#### 1. Lovable Architecture Contract Verification
Ensure the mandatory `lovable/` configuration files are up to date and committed:
```
lovable/
├── PROJECT.md     # Project purpose, feature list, and target audience
├── DESIGN.md      # Zinc-950 palette, typography, and shadcn component specs
└── COMPONENTS.md  # Registered layout and feature component inventory
```

#### 2. Synchronization Flow
```powershell
# 1. Commit synchronized spec files
git add lovable/
git commit -m "docs(lovable): update component registry and project spec"
git push origin main

# 2. Lovable will auto-sync with the connected GitHub repository
```

---

### Target C: Self-Hosted VPS (Docker + Nginx + Certbot SSL)

#### 1. Multi-Stage Production `Dockerfile`
Create `Dockerfile` in the project root:
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    env_file:
      - .env.production
    expose:
      - "3000"
    networks:
      - web-net

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - app
    networks:
      - web-net

  certbot:
    image: certbot/certbot
    restart: unless-stopped
    volumes:
      - ./certbot/conf:/etc/letsencrypt:rw
      - ./certbot/www:/var/www/certbot:rw
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12d & wait $${!}; done;'"

networks:
  web-net:
    driver: bridge
```

#### 3. Reverse Proxy `nginx.conf`
```nginx
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 4. Initial SSL Certificate Generation Command
```bash
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d yourdomain.com -d www.yourdomain.com --email admin@yourdomain.com --agree-tos --no-eff-email
docker compose restart nginx
```

---

## Phase 3: Database & Auth Production Verification

### 1. Supabase Database Hardening
- [ ] Run pending migrations: `npx supabase db push` (or execute via Supabase Dashboard SQL Editor).
- [ ] Verify **Row Level Security (RLS)** is enabled on 100% of tables:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Output must return 0 rows.
```
- [ ] Verify foreign key cascade and delete policies.
- [ ] Validate indexes on high-throughput query columns (`org_id`, `user_id`, `created_at`, `slug`).

### 2. Supabase Auth Configuration
- [ ] Set **Site URL**: `https://yourdomain.com`
- [ ] Set **Redirect URLs**:
  - `https://yourdomain.com/**`
  - `https://yourdomain.com/auth/callback`
- [ ] Configure custom SMTP provider (Resend, SendGrid, or AWS SES) for transactional verification emails.
- [ ] Verify OAuth providers (GitHub, Google) client credentials and authorized redirect URIs in provider dashboards.

---

## Phase 4: Post-Launch Smoke Testing & Runbook

### 1. End-to-End Smoke Test Suite
Perform the following manual or automated browser tests immediately after deployment:
- [ ] **Registration & Email Flow**: Create new user account, confirm email receipt, verify profile row creation via trigger.
- [ ] **Session & Middleware**: Log in, navigate across protected `/dashboard` routes, refresh page, verify cookie persistence.
- [ ] **Logout Flow**: Log out and ensure user cannot access authenticated routes via browser back button.
- [ ] **Payment / Webhook Flow**: Trigger a test Stripe webhook event and check database subscription state updates.
- [ ] **Static Assets & Fonts**: Verify favicon, fonts, and images load with HTTP 200/304 and proper Cache-Control headers.

### 2. Error Monitoring Setup (Sentry)
Initialize Sentry for client and server error tracking:
```powershell
cmd.exe /c "npx @sentry/wizard@latest -i nextjs"
```
Verify Sentry DSN is injected in environment variables and unhandled exceptions generate issues in the Sentry dashboard.

### 3. Emergency Rollback Runbook
In the event of a critical regression or runtime failure:

#### Vercel Rollback:
1. Navigate to **Deployments** tab in Vercel Dashboard.
2. Locate the last known good deployment.
3. Click **Instant Rollback** ➔ **Promote to Production** (takes < 2 seconds).

#### VPS Docker Rollback:
```bash
# Revert to previous image tag or commit
git checkout <last-good-commit-hash>
docker compose build app
docker compose up -d app
```
