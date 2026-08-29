import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";
import { DEFAULT_SETTINGS } from "@/lib/queries";

export default async function SettingsPage() {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const settings = { ...DEFAULT_SETTINGS, ...(row ?? {}) };

  return (
    <>
      <PageHeader
        title="Settings & SEO"
        description="Brand details, contact information, analytics and the metadata used across the site."
      />
      <SettingsForm settings={JSON.parse(JSON.stringify(settings))} />
    </>
  );
}
