-- CreateEnum
CREATE TYPE "SolverVariant" AS ENUM ('KUHN', 'LEDUC', 'NLHE_SUBGAME');

-- CreateEnum
CREATE TYPE "SolveStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Provider" ADD VALUE 'CLUB_GG';

-- CreateTable
CREATE TABLE "PokerNews" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'rss',
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "relevance" DOUBLE PRECISION,
    "isAlert" BOOLEAN NOT NULL DEFAULT false,
    "alertRuleId" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PokerNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolverJob" (
    "id" TEXT NOT NULL,
    "solveId" TEXT NOT NULL,
    "variant" "SolverVariant" NOT NULL,
    "status" "SolveStatus" NOT NULL DEFAULT 'PENDING',
    "numIterations" INTEGER NOT NULL,
    "completedIterations" INTEGER NOT NULL DEFAULT 0,
    "evP0" DOUBLE PRECISION,
    "exploitability" DOUBLE PRECISION,
    "numInfoSets" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolverJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolverStrategy" (
    "id" TEXT NOT NULL,
    "solverJobId" TEXT NOT NULL,
    "infoSetKey" TEXT NOT NULL,
    "actionsJson" JSONB NOT NULL,
    "probabilitiesJson" JSONB NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SolverStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolverNodeLock" (
    "id" TEXT NOT NULL,
    "solverJobId" TEXT NOT NULL,
    "infoSetKey" TEXT NOT NULL,
    "strategyJson" JSONB NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolverNodeLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PokerNews_contentHash_key" ON "PokerNews"("contentHash");

-- CreateIndex
CREATE INDEX "PokerNews_collectedAt_idx" ON "PokerNews"("collectedAt");

-- CreateIndex
CREATE INDEX "PokerNews_sourceId_idx" ON "PokerNews"("sourceId");

-- CreateIndex
CREATE INDEX "PokerNews_isAlert_idx" ON "PokerNews"("isAlert");

-- CreateIndex
CREATE UNIQUE INDEX "SolverJob_solveId_key" ON "SolverJob"("solveId");

-- CreateIndex
CREATE INDEX "SolverJob_status_idx" ON "SolverJob"("status");

-- CreateIndex
CREATE INDEX "SolverStrategy_solverJobId_idx" ON "SolverStrategy"("solverJobId");

-- CreateIndex
CREATE UNIQUE INDEX "SolverStrategy_solverJobId_infoSetKey_key" ON "SolverStrategy"("solverJobId", "infoSetKey");

-- CreateIndex
CREATE INDEX "SolverNodeLock_solverJobId_idx" ON "SolverNodeLock"("solverJobId");

-- CreateIndex
CREATE UNIQUE INDEX "SolverNodeLock_solverJobId_infoSetKey_key" ON "SolverNodeLock"("solverJobId", "infoSetKey");

-- AddForeignKey
ALTER TABLE "SolverStrategy" ADD CONSTRAINT "SolverStrategy_solverJobId_fkey" FOREIGN KEY ("solverJobId") REFERENCES "SolverJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolverNodeLock" ADD CONSTRAINT "SolverNodeLock_solverJobId_fkey" FOREIGN KEY ("solverJobId") REFERENCES "SolverJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
