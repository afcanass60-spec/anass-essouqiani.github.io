import { exams } from "@/content";
import View from "./View";

// Pages pré-générées pour chaque contenu (nécessaire à l'export statique).
export const dynamicParams = false;
export function generateStaticParams() {
  return exams.map((e) => ({ id: e.id }));
}

export default function Page() {
  return <View />;
}
