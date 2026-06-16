"use client";

import { useRouter, usePathname } from "next/navigation";

export default function SeasonSelect({
  seasons,
  value,
}: {
  seasons: string[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    router.replace(v ? `${pathname}?saison=${encodeURIComponent(v)}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-xs font-medium text-slate-500">Saison</label>
      <select
        value={value}
        onChange={handleChange}
        className="rounded-full border border-indigo-300/60 bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-400/50 cursor-pointer"
      >
        <option value="">Toutes les saisons</option>
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
