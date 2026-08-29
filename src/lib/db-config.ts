/**
 * Connection settings for TiDB Cloud, shared by the app and the seed script.
 *
 * TiDB speaks the MySQL protocol over TLS and the MariaDB driver does not
 * understand Prisma's `sslaccept` query parameter, so the URL is parsed here.
 * The connect timeout is raised well above the driver's 1s default - a TLS
 * handshake to a remote serverless gateway routinely takes longer than that,
 * and the pool otherwise fails to initialise with an opaque timeout.
 */
export function mariaDbConfig(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: { minVersion: "TLSv1.2" as const },
    connectionLimit: Number(url.searchParams.get("connection_limit") ?? 5),
    connectTimeout: 30_000,
    initializationTimeout: 30_000,
    acquireTimeout: 30_000,
    idleTimeout: 60,
  };
}
