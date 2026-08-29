/** Removes every record the end-to-end suites create, so re-runs stay clean. */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { mariaDbConfig } from "../src/lib/db-config.js";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfig()) });

const clients = await prisma.client.findMany({
  where: { name: { startsWith: "Acme Retail " } },
  select: { id: true },
});
const clientIds = clients.map((c) => c.id);

if (clientIds.length) {
  const projects = await prisma.clientProject.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);
  const plans = await prisma.contentPlan.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
  const planIds = plans.map((p) => p.id);
  const invoices = await prisma.invoice.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
  const invoiceIds = invoices.map((i) => i.id);

  // Delivery
  await prisma.taskComment.deleteMany({ where: { task: { projectId: { in: projectIds } } } });
  await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.milestone.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.changeRequest.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });

  // Finance
  await prisma.payment.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.creditNote.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await prisma.invoice.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.expense.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.renewalEvent.deleteMany({ where: { renewal: { clientId: { in: clientIds } } } });
  await prisma.renewal.deleteMany({ where: { clientId: { in: clientIds } } });

  // Campaigns
  await prisma.contentComment.deleteMany({ where: { contentItem: { planId: { in: planIds } } } });
  await prisma.contentItem.deleteMany({ where: { planId: { in: planIds } } });
  await prisma.socialReport.deleteMany({ where: { planId: { in: planIds } } });
  await prisma.contentPlan.deleteMany({ where: { clientId: { in: clientIds } } });

  // Portal and commercial
  await prisma.approvalComment.deleteMany({ where: { approval: { clientId: { in: clientIds } } } });
  await prisma.approval.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.ticket.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.clientPortalUser.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.partnerReferral.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.clientProject.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { clientId: { in: clientIds } } } });
  await prisma.quotation.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.clientActivity.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.clientContact.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.enquiry.updateMany({ where: { clientId: { in: clientIds } }, data: { clientId: null } });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
}

const partners = await prisma.partner.findMany({ where: { name: { startsWith: "Referral Partner " } }, select: { id: true } });
if (partners.length) {
  const ids = partners.map((p) => p.id);
  await prisma.partnerReward.deleteMany({ where: { partnerId: { in: ids } } });
  await prisma.partnerReferral.deleteMany({ where: { partnerId: { in: ids } } });
  await prisma.partner.deleteMany({ where: { id: { in: ids } } });
}

const employees = await prisma.employee.findMany({ where: { name: { startsWith: "Test Employee " } }, select: { id: true } });
if (employees.length) {
  const ids = employees.map((e) => e.id);
  await prisma.attendance.deleteMany({ where: { employeeId: { in: ids } } });
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: ids } } });
  await prisma.payslip.deleteMany({ where: { employeeId: { in: ids } } });
  await prisma.incentive.deleteMany({ where: { employeeId: { in: ids } } });
  await prisma.salaryStructure.deleteMany({ where: { employeeId: { in: ids } } });
  await prisma.employee.deleteMany({ where: { id: { in: ids } } });
}

const rules = await prisma.rewardRule.deleteMany({ where: { name: { startsWith: "Standard 10% " } } });

const users = await prisma.user.findMany({ where: { email: { startsWith: "member." } }, select: { id: true } });
if (users.length) {
  const ids = users.map((u) => u.id);
  await prisma.activityLog.updateMany({ where: { userId: { in: ids } }, data: { userId: null } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

await prisma.notification.deleteMany({ where: { entity: { in: ["Renewal", "PartnerReward"] } } });

console.log(
  `cleaned ${clients.length} client(s), ${partners.length} partner(s), ${employees.length} employee(s), ${rules.count} rule(s), ${users.length} user(s)`,
);
await prisma.$disconnect();
