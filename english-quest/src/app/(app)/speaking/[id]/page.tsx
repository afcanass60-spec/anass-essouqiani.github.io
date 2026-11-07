import { speakingTasks } from "@/content";
import View from "./View";

// Pages pré-générées pour chaque contenu (nécessaire à l'export statique).
export const dynamicParams = false;
export function generateStaticParams() {
  return speakingTasks.map((t) => ({ id: t.id }));
}

export default function Page() {
  return <View />;
}
