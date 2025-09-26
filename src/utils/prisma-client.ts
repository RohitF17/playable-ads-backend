import pkg from "@prisma/client";

const { PrismaClient } = pkg;
type PrismaClientType = InstanceType<typeof PrismaClient>;

let prisma: PrismaClientType | null = null;

export function initPrisma(): PrismaClientType {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export function getPrisma(): PrismaClientType {
  if (!prisma) {
    throw new Error("Prisma client not initialized. Call initPrisma() first.");
  }
  return prisma;
}
