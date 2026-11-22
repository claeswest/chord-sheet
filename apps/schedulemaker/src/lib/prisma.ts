import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

// Fixa schemat's own database — its own Neon project, in Frankfurt. See
// prisma/schema.prisma for what it holds and packages/core/README.md for why
// each product has one to itself.
function createPrismaClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {} as any);
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
