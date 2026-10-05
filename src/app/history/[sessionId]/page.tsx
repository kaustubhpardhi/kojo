import { AppShell } from "@/components/AppShell";
import { SessionDetail } from "@/components/SessionDetail";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <AppShell>
      <SessionDetail sessionId={sessionId} />
    </AppShell>
  );
}
