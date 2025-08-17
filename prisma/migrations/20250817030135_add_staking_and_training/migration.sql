-- AlterTable
ALTER TABLE "public"."AgentProfile" ADD COLUMN     "personality" TEXT,
ADD COLUMN     "stakedAmount" DECIMAL(65,30) NOT NULL DEFAULT 10,
ADD COLUMN     "totalEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."TrainingData" (
    "id" TEXT NOT NULL,
    "intentionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "allSubmissions" JSONB NOT NULL,
    "selectedIds" TEXT[],
    "rejectedIds" TEXT[],
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingData_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."TrainingData" ADD CONSTRAINT "TrainingData_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "public"."Intention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
