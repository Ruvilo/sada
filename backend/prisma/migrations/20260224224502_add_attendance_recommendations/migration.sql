-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IncidentType" ADD VALUE 'UNSCHEDULED_WORK';
ALTER TYPE "IncidentType" ADD VALUE 'DUPLICATE_PUNCHES';
ALTER TYPE "IncidentType" ADD VALUE 'MISSING_OUT_BEFORE_NEXT_IN';
