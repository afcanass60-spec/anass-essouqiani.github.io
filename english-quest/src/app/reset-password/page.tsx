"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function ResetPasswordPage() {
  const [update, setUpdate] = useState(false);
  useEffect(() => {
    // Le lien reçu par email revient ici avec ?update=1 et une session de récupération.
    if (new URLSearchParams(window.location.search).get("update")) setUpdate(true);
  }, []);
  return <AuthForm key={update ? "u" : "r"} mode={update ? "update" : "reset"} />;
}
