import { grammarTopics } from "@/content";
import View from "./View";

// Pages pré-générées pour chaque contenu (nécessaire à l'export statique).
export const dynamicParams = false;
export function generateStaticParams() {
  return grammarTopics.map((t) => ({ id: t.id }));
}

export default function Page() {
  return <View />;
}
