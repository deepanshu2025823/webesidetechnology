import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { mariaDbConfig } from "@/lib/db-config";

/**
 * TiDB hands back a pooled connection it has already closed at its own end.
 *
 * The driver only finds out when it writes to the socket, which surfaces as
 * "socket has unexpectedly been closed" on a query that was never really
 * attempted. It is most visible during `next build`, where a few hundred
 * prerenders run against one pool over several minutes and any idle gap is long
 * enough for the far end to hang up — a build that passes from a laptop next to
 * the database fails from a CI runner a continent away.
 *
 * Retrying is safe here because nothing was sent: the connection died before
 * the statement reached the server. Anything that did reach it is left alone.
 */
const RETRYABLE = [
  "socket has unexpectedly been closed",
  "connection closed",
  "connection is closed",
  "read ECONNRESET",
  "server has closed the connection",
];

const ATTEMPTS = 4;

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return RETRYABLE.some((fragment) => message.includes(fragment));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createPrismaClient() {
  const client = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfig()) });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let lastError: unknown;

          for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
            try {
              return await query(args);
            } catch (error) {
              if (!isRetryable(error) || attempt === ATTEMPTS) throw error;
              lastError = error;
              // Short, growing pause: the pool needs a moment to notice the
              // dead connection and open a replacement.
              await wait(attempt * 250);
            }
          }

          throw lastError;
        },
      },
    },
  });
}

// Reuse one client across hot reloads in development.
type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
