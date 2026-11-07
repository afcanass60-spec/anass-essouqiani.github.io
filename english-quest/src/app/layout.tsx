import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ServiceWorker } from "@/components/app/ServiceWorker";

export const metadata: Metadata = {
  title: { default: "English Quest — de B1 à C1", template: "%s · English Quest" },
  description: "Plateforme d'apprentissage de l'anglais B1 → C1 : parcours CECRL, vocabulaire en répétition espacée, grammaire, écoute, oral, conversation IA, écrit et examens d'entraînement.",
  applicationName: "English Quest",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b1a" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7ff" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applique le thème enregistré avant le premier rendu (pas de flash).
const themeScript = `try{var t=localStorage.getItem("eq:theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <StoreProvider>{children}</StoreProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
