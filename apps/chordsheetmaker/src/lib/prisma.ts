import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

function createPrismaClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {} as any);
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * True when Prisma reports "record not found" (P2025).
 *
 * Needed because `updateMany` cannot be used here: the Neon HTTP driver has no
 * transactions and Prisma compiles updateMany into one, so it throws
 * "Transactions are not supported in HTTP mode" at runtime. The replacement is
 * `update({ where: { id, userId } })` — an extra non-unique filter beside the
 * unique id keeps the ownership check in a single statement — which throws
 * P2025 instead of returning a count of 0.
 *
 * `deleteMany` is unaffected and remains fine to use.
 */
export function isRecordNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2025";
}
