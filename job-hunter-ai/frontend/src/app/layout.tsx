import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "Job Hunter AI",
  description: "Agent intelligent de recherche d'emploi et d'alternance",
};

// Applique le thème mémorisé avant le rendu (évite le flash clair/sombre)
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans text-sm">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
