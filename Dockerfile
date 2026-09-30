# syntax=docker/dockerfile:1

# Production image for the Sahab India site and admin panel.
#
# The point of this file is that the VPS never sees the project. GitHub Actions
# builds here, pushes the result to a private registry, and the server only ever
# pulls a finished image: no repository, no TypeScript, no build toolchain and
# no way to rebuild. The final stage starts from a clean base and copies in only
# `.next/standalone`, so none of the source that produced it travels with it.
#
# Debian slim rather than Alpine: sharp and the Prisma client both ship glibc
# binaries, and musl builds of them are a recurring source of runtime surprises
# that only appear in production.

FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------- dependencies
FROM base AS deps
COPY package.json package-lock.json ./
# `postinstall` runs `prisma generate`, which wants a datasource URL that is not
# available this early. The build stage generates the client anyway, so the
# lifecycle scripts are skipped here. sharp resolves its platform binary through
# optionalDependencies, not an install script, so it is unaffected.
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------- build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the client bundle at build time, so the image is tied to whichever
# origin it was built for.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# `next build` prerenders the service, portfolio and blog routes, so it reads
# the database. The URL arrives as a BuildKit secret rather than a build
# argument: an ARG is recorded in the image history and would ship the database
# password to anyone who pulls the image.
RUN --mount=type=secret,id=database_url \
    DATABASE_URL="$(cat /run/secrets/database_url)" npm run build

# The standalone server deliberately leaves these out, expecting a CDN. There is
# no CDN in front of this one, so it serves them itself.
RUN cp -r public .next/standalone/ \
 && cp -r .next/static .next/standalone/.next/

# Belt and braces. `next build` copies any .env it finds beside it into
# .next/standalone, so a context that leaked one would bake DATABASE_URL,
# AUTH_SECRET and the SMTP password into a layer — and this image is pulled onto
# a server the client administers. .dockerignore already keeps them out of the
# context; this makes it true even if that file is later edited, and fails the
# build loudly rather than shipping a secret quietly.
RUN rm -f .next/standalone/.env .next/standalone/.env.* \
 && if [ -n "$(find .next/standalone -maxdepth 1 -name '.env*' -print -quit)" ]; then \
      echo "refusing to build: an env file survived into the standalone output" >&2; \
      exit 1; \
    fi

# -------------------------------------------------------------------- runtime
FROM node:24-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# The node image already provides an unprivileged `node` user (uid 1000).
COPY --from=build --chown=node:node /app/.next/standalone ./

USER node
EXPOSE 3000

# Compose watches this to decide whether a released container is actually
# serving before it is left in place.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
