import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

function createPrismaClient() {
  const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
