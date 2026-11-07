import { LEVELS } from "@/lib/types";
import View from "./View";

// Pages pré-générées pour chaque contenu (nécessaire à l'export statique).
export const dynamicParams = false;
export function generateStaticParams() {
  return LEVELS.map((level) => ({ level }));
}

export default function Page() {
  return <View />;
}
