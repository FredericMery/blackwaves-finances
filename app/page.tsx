import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">BlackWaves Finance</h1>
      <p className="max-w-xl text-base text-gray-600">
        Bienvenue sur l&apos;application finance. Utilise le bouton ci-dessous pour acceder
        au module de gestion.
      </p>
      <Link
        href="/bureau/gerer-asso-2"
        className="rounded-md bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
      >
        Ouvrir l&apos;espace finance
      </Link>
    </main>
  );
}
