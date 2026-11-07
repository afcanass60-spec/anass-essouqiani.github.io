import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="app-backdrop" />
      <div className="space-y-4">
        <p className="font-display text-6xl font-bold text-gradient">404</p>
        <h1 className="font-display text-2xl font-bold">Cette région n&apos;existe pas sur la carte</h1>
        <Link href="/dashboard" className="inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-white">Retour au tableau de bord</Link>
      </div>
    </main>
  );
}
