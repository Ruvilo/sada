import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.upsert({
    where: { identification: "123456789" },
    update: {},
    create: {
      firstName: "Juan",
      lastName: "Pérez",
      identification: "123456789",
      email: "juan.perez@sada.com",
    },
  });

  const template = await prisma.scheduleTemplate.findFirst({
    where: { name: "Plantilla base 7–16" },
    orderBy: { id: "desc" },
  });

  if (!template) throw new Error("template not exists");

  await prisma.employeeScheduleAssignment.create({
    data: {
      employeeId: employee.id,
      scheduleTemplateId: template.id,
      startsOn: new Date("2025-01-01"),
    },
  });

  console.log("Template assigned successfully");
}

main().finally(async () => prisma.$disconnect());
