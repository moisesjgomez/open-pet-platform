-- CreateTable
CREATE TABLE "AIPetContent" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "enrichmentTier" TEXT NOT NULL DEFAULT 'heuristic',
    "heuristicTags" JSONB NOT NULL DEFAULT '[]',
    "energyLevel" TEXT,
    "size" TEXT,
    "ageCategory" TEXT,
    "aiBio" TEXT,
    "aiSummary" TEXT,
    "aiTags" JSONB NOT NULL DEFAULT '[]',
    "aiTemperament" JSONB NOT NULL DEFAULT '[]',
    "imageAnalysis" JSONB,
    "imageAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPetContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIPetContent_petId_key" ON "AIPetContent"("petId");

-- CreateIndex
CREATE INDEX "AIPetContent_petId_idx" ON "AIPetContent"("petId");

-- CreateIndex
CREATE INDEX "AIPetContent_source_idx" ON "AIPetContent"("source");

-- CreateIndex
CREATE INDEX "AIPetContent_contentHash_idx" ON "AIPetContent"("contentHash");

-- CreateIndex
CREATE INDEX "AIPetContent_enrichmentTier_idx" ON "AIPetContent"("enrichmentTier");
