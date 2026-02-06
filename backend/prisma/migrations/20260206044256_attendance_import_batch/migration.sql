-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "AttendancePunch" ADD COLUMN     "importBatchId" BIGINT,
ADD COLUMN     "importRow" INTEGER;

-- CreateTable
CREATE TABLE "AttendanceImportBatch" (
    "id" BIGSERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "fileChecksum" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "rejectedDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceImportBatch_fileChecksum_key" ON "AttendanceImportBatch"("fileChecksum");

-- CreateIndex
CREATE INDEX "AttendanceImportBatch_createdAt_idx" ON "AttendanceImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "AttendanceImportBatch_status_idx" ON "AttendanceImportBatch"("status");

-- CreateIndex
CREATE INDEX "AttendanceImportBatch_fileChecksum_idx" ON "AttendanceImportBatch"("fileChecksum");

-- CreateIndex
CREATE INDEX "AttendancePunch_importBatchId_idx" ON "AttendancePunch"("importBatchId");

-- AddForeignKey
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "AttendanceImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
