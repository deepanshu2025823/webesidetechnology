# Deploying to the Hostinger VPS

The project is built by GitHub Actions and the server only ever receives a
finished container image from a private registry. There is no checkout, no
TypeScript and no build toolchain on the VPS, and nothing on it can rebuild the
application.

**What this does and does not protect.** The repository, the sources and the git
history stay on GitHub. What reaches the server is compiled output. Anyone with
root on that box can still copy the image and read the bundled JavaScript — this
raises the cost of taking the code, it does not make it impossible. Hosting on a
machine somebody else administers has no version of this that does.

## The shape of it

```
push to main
  → GitHub Actions builds the image (needs DATABASE_URL: the build prerenders)
  → pushes it to ghcr.io/deepanshu2025823/webesidetechnology  (private)
  → ssh to the VPS: docker compose pull && up -d
  → nginx on the VPS proxies sahabindia.in to 127.0.0.1:3001
```

## What already exists on that server

It is **shared with another live site**. `jls.service` runs the JLS Worldwide
Next.js app on `127.0.0.1:3000` behind three nginx vhosts. Nothing here touches
it, and that is deliberate:

- the app listens on **3001**, because 3000 is taken;
- the nginx file claims only `sahabindia.in`, so the existing catch-all keeps
  serving every other hostname as it does today;
- `/root/backups/nginx-*.tar.gz` holds a copy of `/etc/nginx` from before any
  change.

Run `systemctl is-active jls.service` after anything you change here.

## One-time setup

### 1. On the VPS

```bash
# A deploy account that is not the one JLS uses.
useradd -m -s /bin/bash sahabdeploy
usermod -aG docker sahabdeploy          # note: docker group == root-equivalent
install -d -m 700 -o sahabdeploy -g sahabdeploy /home/sahabdeploy/.ssh
echo "<the public key>" > /home/sahabdeploy/.ssh/authorized_keys
chown sahabdeploy:sahabdeploy /home/sahabdeploy/.ssh/authorized_keys
chmod 600 /home/sahabdeploy/.ssh/authorized_keys

install -d -m 750 -o sahabdeploy -g sahabdeploy /opt/sahabindia
```

Copy `deploy/docker-compose.yml` to `/opt/sahabindia/docker-compose.yml`, and
write `/opt/sahabindia/.env` (mode `600`, owned by `sahabdeploy`) with the
runtime values: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`,
`SMTP_*`, `ENQUIRY_NOTIFY_TO`, `CRON_SECRET`.

> That file is the real exposure. The client's root user can read it, and it
> carries the production database credentials. Give this deployment its own
> database user rather than the one used anywhere else.

### 2. nginx

```bash
cp deploy/nginx/sahabindia.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/sahabindia.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx        # never reload without -t passing
```

### 3. DNS — do this before asking for a certificate

`sahabindia.in` is registered but has **no nameservers set at all**, which is
the whole reason it does not load. At the registrar, point it at a DNS provider,
then create:

| Record | Name | Value |
| ------ | ---- | ----- |
| A | `@` | `177.7.63.74` |
| A | `www` | `177.7.63.74` |

Certbot cannot issue anything until these resolve.

```bash
certbot --nginx -d sahabindia.in -d www.sahabindia.in
```

### 4. GitHub

Repository → Settings → Secrets and variables → Actions.

| Kind | Name | Value |
| ---- | ---- | ----- |
| Variable | `NEXT_PUBLIC_SITE_URL` | `https://sahabindia.in` |
| Secret | `DATABASE_URL` | the TiDB connection string |
| Secret | `VPS_HOST` | `177.7.63.74` |
| Secret | `VPS_USER` | `sahabdeploy` |
| Secret | `VPS_SSH_KEY` | the **private** key matching the one installed above |
| Secret | `GHCR_TOKEN` | a PAT with `read:packages`, so the VPS can pull |

`NEXT_PUBLIC_SITE_URL` is compiled into the bundle, so the image is tied to the
origin it was built for. Changing the domain means rebuilding, not just moving
DNS.

TiDB must accept connections from GitHub's runners for the build to prerender.

## Deploying

Push to `main`. To ship without a code change, run the workflow from the Actions
tab.

Rolling back is `docker compose` pointed at an older tag — every build is also
pushed as `sha-<commit>`:

```bash
cd /opt/sahabindia
docker compose pull ghcr.io/deepanshu2025823/webesidetechnology:sha-<commit>
docker compose up -d
```

## Checking it

```bash
docker compose -f /opt/sahabindia/docker-compose.yml ps
docker compose -f /opt/sahabindia/docker-compose.yml logs -f --tail=100
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/

# And that the neighbour is still up.
systemctl is-active jls.service
```

To confirm the image really carries no sources or secrets:

```bash
docker run --rm --entrypoint sh ghcr.io/deepanshu2025823/webesidetechnology:latest \
  -c 'ls -A /app; test -d /app/src && echo "SOURCE PRESENT" || echo "no source"; \
      ls -A /app/.env* 2>/dev/null || echo "no env file"'
```
