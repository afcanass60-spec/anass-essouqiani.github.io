import { chapters } from "@/content";
import View from "./View";

// Pages pré-générées pour chaque contenu (nécessaire à l'export statique).
export const dynamicParams = false;
export function generateStaticParams() {
  return chapters.map((c) => ({ id: c.id }));
}

export default function Page() {
  return <View />;
}
