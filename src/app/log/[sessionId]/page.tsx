import { LoggerScreen } from "@/components/logger/LoggerScreen";

export default async function LogPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LoggerScreen sessionId={sessionId} />;
}
