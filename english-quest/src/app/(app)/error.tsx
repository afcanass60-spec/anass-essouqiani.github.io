"use client";

import { useEffect } from "react";
import { Button, Notice } from "@/components/ui/primitives";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl space-y-4 py-10">
      <Notice tone="red" icon="alert" title="Une erreur inattendue est survenue">
        Votre progression est sauvegardée. Vous pouvez réessayer ; si le problème persiste, exportez vos données depuis les paramètres.
      </Notice>
      <Button onClick={reset} icon="repeat">Réessayer</Button>
    </div>
  );
}
