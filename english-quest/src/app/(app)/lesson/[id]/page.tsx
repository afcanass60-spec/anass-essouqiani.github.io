import { allLessons } from "@/content";
import View from "./View";

// Pages pré-générées pour chaque contenu (nécessaire à l'export statique).
export const dynamicParams = false;
export function generateStaticParams() {
  return allLessons.map((l) => ({ id: l.id }));
}

export default function Page() {
  return <View />;
}
