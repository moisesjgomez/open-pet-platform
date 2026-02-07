-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagWeights" JSONB NOT NULL DEFAULT '{}',
    "breedWeights" JSONB NOT NULL DEFAULT '{}',
    "sizeWeights" JSONB NOT NULL DEFAULT '{}',
    "energyWeights" JSONB NOT NULL DEFAULT '{}',
    "preferredSpecies" TEXT,
    "preferredSize" TEXT,
    "preferredEnergy" TEXT,
    "goodWithKids" BOOLEAN,
    "goodWithDogs" BOOLEAN,
    "goodWithCats" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwipeHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cacheType" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AICache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetEmbedding" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionId_key" ON "User"("sessionId");

-- CreateIndex
CREATE INDEX "User_sessionId_idx" ON "User"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "SwipeHistory_userId_idx" ON "SwipeHistory"("userId");

-- CreateIndex
CREATE INDEX "SwipeHistory_petId_idx" ON "SwipeHistory"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "SwipeHistory_userId_petId_key" ON "SwipeHistory"("userId", "petId");

-- CreateIndex
CREATE UNIQUE INDEX "AICache_cacheKey_key" ON "AICache"("cacheKey");

-- CreateIndex
CREATE INDEX "AICache_cacheKey_idx" ON "AICache"("cacheKey");

-- CreateIndex
CREATE INDEX "AICache_cacheType_idx" ON "AICache"("cacheType");

-- CreateIndex
CREATE INDEX "AICache_expiresAt_idx" ON "AICache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PetEmbedding_petId_key" ON "PetEmbedding"("petId");

-- CreateIndex
CREATE INDEX "PetEmbedding_petId_idx" ON "PetEmbedding"("petId");

-- CreateIndex
CREATE INDEX "PetEmbedding_source_idx" ON "PetEmbedding"("source");

-- CreateIndex
CREATE INDEX "AIUsage_date_idx" ON "AIUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsage_date_model_key" ON "AIUsage"("date", "model");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeHistory" ADD CONSTRAINT "SwipeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
