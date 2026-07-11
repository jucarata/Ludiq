import { OnlineGameView } from "@/components/multiplayer/online/OnlineGameView";

type PlayPageProps = {
  params: Promise<{ code: string }>;
};

export default async function MultiplayerPlayPage({ params }: PlayPageProps) {
  const { code } = await params;

  return <OnlineGameView code={code.toUpperCase()} />;
}
