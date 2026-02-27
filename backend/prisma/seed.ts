import { ScheduleBlockType } from "@prisma/client";
import { prisma } from "../src/prisma";


function timeToDate(time: string) {
  // "HH:MM" -> Date ISO válido para campos @db.Time
  return new Date(`1970-01-01T${time}:00.000Z`);
}

async function main() {
  // 1) Reglas del sistema (singleton)
  await prisma.attendanceRule.upsert({
    where: { id: 1 },
    update: {
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 0,
      minGapMinutesToAllowCheckout: 11,
    },
    create: {
      id: 1,
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 0,
      minGapMinutesToAllowCheckout: 11,
    },
  });

  // 2) Plantilla de horario
  const template = await prisma.scheduleTemplate.create({
    data: {
      name: "Plantilla base 7–16",
      validFrom: new Date("2025-01-01"),
    },
  });

  // 3) Bloques base del día
  const blocks: Array<{
    start: string;
    end: string;
    type: ScheduleBlockType;
    presence: boolean;
    label: string;
  }> = [
    { start: "07:00", end: "08:30", type: "GAP", presence: false, label: "Gap mañana" },

    { start: "08:30", end: "09:10", type: "CLASS", presence: true, label: "Lección 1" },
    { start: "09:10", end: "09:50", type: "CLASS", presence: true, label: "Lección 2" },
    { start: "09:50", end: "10:00", type: "BREAK", presence: true, label: "Recreo" },

    { start: "10:00", end: "10:40", type: "CLASS", presence: true, label: "Lección 3" },
    { start: "10:40", end: "11:20", type: "CLASS", presence: true, label: "Lección 4" },
    { start: "11:20", end: "11:30", type: "BREAK", presence: true, label: "Recreo" },

    { start: "11:30", end: "12:00", type: "GAP", presence: false, label: "Gap pre-almuerzo" },
    { start: "12:00", end: "13:00", type: "BREAK", presence: false, label: "Almuerzo" },

    { start: "13:00", end: "13:40", type: "CLASS", presence: true, label: "Lección 5" },
    { start: "13:40", end: "14:20", type: "CLASS", presence: true, label: "Lección 6" },
    { start: "14:20", end: "14:30", type: "BREAK", presence: true, label: "Recreo" },

    { start: "14:30", end: "16:00", type: "GAP", presence: false, label: "Gap tarde" },
  ];

  // 4) Insertar bloques para lunes a viernes (weekday 1..5)
  for (let weekday = 1; weekday <= 5; weekday++) {
    for (const b of blocks) {
      await prisma.scheduleBlock.create({
        data: {
          scheduleTemplateId: template.id,
          weekday,
          startTime: timeToDate(b.start),
          endTime: timeToDate(b.end),
          blockType: b.type,
          requiresPresence: b.presence,
          label: b.label,
        },
      });
    }
  }

  console.log("Seeding completed.");
}

main()
  .then(() => console.log("✅ Seeding completed."))
  .catch((e) => console.error("❌ Seeding failed:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
