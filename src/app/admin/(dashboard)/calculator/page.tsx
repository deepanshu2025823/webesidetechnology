import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CalculatorManager, type GroupRow } from "@/components/admin/CalculatorManager";

const DEFAULTS = {
  isEnabled: true,
  heading: "Project cost calculator",
  subheading: "",
  basePrice: 0,
  taxPercent: 18,
  variancePct: 15,
  ctaLabel: "Email me this estimate",
  disclaimer: "",
};

export default async function CalculatorAdminPage() {
  await requirePermission("website", "write");

  const [config, groups] = await Promise.all([
    prisma.calculatorSettings.findUnique({ where: { id: 1 } }),
    prisma.calculatorGroup.findMany({
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Cost calculator"
        description="The questions, answers and prices behind the calculator on the website. Everything here is live the moment it is saved."
        actions={
          <Link
            href="/cost-calculator"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
          >
            <ExternalLink className="size-4" aria-hidden /> View on the site
          </Link>
        }
      />

      <CalculatorManager
        config={config ? { ...config } : DEFAULTS}
        groups={JSON.parse(JSON.stringify(groups)) as GroupRow[]}
      />
    </>
  );
}
