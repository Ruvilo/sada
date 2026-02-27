-- CreateTable
CREATE TABLE "ScheduleImportBatch" (
    "id" BIGSERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "fileChecksum" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "rejectedDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleImportBatch_fileChecksum_key" ON "ScheduleImportBatch"("fileChecksum");

-- CreateIndex
CREATE INDEX "ScheduleImportBatch_createdAt_idx" ON "ScheduleImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ScheduleImportBatch_status_idx" ON "ScheduleImportBatch"("status");

-- CreateIndex
CREATE INDEX "ScheduleImportBatch_fileChecksum_idx" ON "ScheduleImportBatch"("fileChecksum");
