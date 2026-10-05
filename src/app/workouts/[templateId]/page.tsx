import { AppShell } from "@/components/AppShell";
import { TemplateBuilder } from "@/components/TemplateBuilder";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  return (
    <AppShell>
      <TemplateBuilder templateId={templateId} />
    </AppShell>
  );
}
