-- CreateEnum
CREATE TYPE "ScheduleBlockType" AS ENUM ('CLASS', 'BREAK', 'GAP');

-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PunchSource" AS ENUM ('DEVICE', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('LATE_ARRIVAL', 'EARLY_LEAVE', 'MISSING_IN', 'MISSING_OUT', 'OUT_WITHOUT_IN', 'IN_WITHOUT_OUT', 'ABSENT_DURING_REQUIRED_BLOCK');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('ABSENCE', 'PERMISSION', 'HOLIDAY', 'SPECIAL_SCHEDULE');

-- CreateTable
CREATE TABLE "Employee" (
    "id" BIGSERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "identification" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplate" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeScheduleAssignment" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" BIGINT NOT NULL,
    "scheduleTemplateId" BIGINT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeScheduleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" BIGSERIAL NOT NULL,
    "scheduleTemplateId" BIGINT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "blockType" "ScheduleBlockType" NOT NULL,
    "label" TEXT,
    "requiresPresence" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePunch" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" BIGINT NOT NULL,
    "punchedAt" TIMESTAMPTZ(6) NOT NULL,
    "type" "PunchType" NOT NULL,
    "source" "PunchSource" NOT NULL DEFAULT 'IMPORT',
    "notes" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRule" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "earlyLeaveGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "minGapMinutesToAllowCheckout" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleException" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "startTime" TIME(0),
    "endTime" TIME(0),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceIncident" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "incident" "IncidentType" NOT NULL,
    "expectedStart" TIME(0),
    "expectedEnd" TIME(0),
    "actualTime" TIMESTAMPTZ(6),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_identification_key" ON "Employee"("identification");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_identification_idx" ON "Employee"("identification");

-- CreateIndex
CREATE INDEX "ScheduleTemplate_validFrom_validTo_idx" ON "ScheduleTemplate"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "EmployeeScheduleAssignment_employeeId_startsOn_endsOn_idx" ON "EmployeeScheduleAssignment"("employeeId", "startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "EmployeeScheduleAssignment_scheduleTemplateId_idx" ON "EmployeeScheduleAssignment"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "ScheduleBlock_scheduleTemplateId_weekday_startTime_idx" ON "ScheduleBlock"("scheduleTemplateId", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "AttendancePunch_employeeId_punchedAt_idx" ON "AttendancePunch"("employeeId", "punchedAt");

-- CreateIndex
CREATE INDEX "AttendancePunch_punchedAt_idx" ON "AttendancePunch"("punchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunch_employeeId_punchedAt_type_key" ON "AttendancePunch"("employeeId", "punchedAt", "type");

-- CreateIndex
CREATE INDEX "ScheduleException_employeeId_date_idx" ON "ScheduleException"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceIncident_employeeId_date_idx" ON "AttendanceIncident"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceIncident_employeeId_date_incident_expectedStart_e_key" ON "AttendanceIncident"("employeeId", "date", "incident", "expectedStart", "expectedEnd");

-- AddForeignKey
ALTER TABLE "EmployeeScheduleAssignment" ADD CONSTRAINT "EmployeeScheduleAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeScheduleAssignment" ADD CONSTRAINT "EmployeeScheduleAssignment_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "ScheduleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "ScheduleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
