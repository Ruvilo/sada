-- CreateTable
CREATE TABLE "EmployeeImportBatch" (
    "id" BIGSERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "fileChecksum" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "rejectedDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeImportBatch_fileChecksum_key" ON "EmployeeImportBatch"("fileChecksum");

-- CreateIndex
CREATE INDEX "EmployeeImportBatch_createdAt_idx" ON "EmployeeImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "EmployeeImportBatch_status_idx" ON "EmployeeImportBatch"("status");

-- CreateIndex
CREATE INDEX "EmployeeImportBatch_fileChecksum_idx" ON "EmployeeImportBatch"("fileChecksum");
