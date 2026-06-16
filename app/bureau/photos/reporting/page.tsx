"use client";

import React, { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  url: string;
  title?: string | null;
  season?: string | null;
  type?: string | null;
  team?: string | null;
  created_at?: string | null;
  status?: string | null;

  likes: number;
  dislikes: number;
  score: number;
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function safeLower(s: any) {
  return (typeof s === "string" ? s : "").toLowerCase();
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n || 0);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pickStr(v: any) {
  const s = typeof v === "string" ? v.trim() : "";
  return s || "—";
}

function toCsv(rows: Array<Record<string, any>>) {
  const cols = Object.keys(rows[0] || {});
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replaceAll(`"`, `""`)}"`;
    return s;
  };
  const head = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type GroupStat = {
  key: string;
  count: number;
  likes: number;
  dislikes: number;
  score: number;
  avgScore: number;
  avgLikes: number;
  avgDislikes: number;
};

function groupByKey(rows: Row[], getter: (r: Row) => string, topN = 8): GroupStat[] {
  const map = new Map<string, Omit<GroupStat, "avgScore" | "avgLikes" | "avgDislikes">>();
  for (const r of rows) {
    const k = getter(r) || "—";
    const cur = map.get(k) || { key: k, count: 0, likes: 0, dislikes: 0, score: 0 };
    cur.count += 1;
    cur.likes += r.likes || 0;
    cur.dislikes += r.dislikes || 0;
    cur.score += r.score || 0;
    map.set(k, cur);
  }
  const arr: GroupStat[] = Array.from(map.values()).map((g) => ({
    ...g,
    avgScore: g.count ? g.score / g.count : 0,
    avgLikes: g.count ? g.likes / g.count : 0,
    avgDislikes: g.count ? g.dislikes / g.count : 0,
  }));
  arr.sort((a, b) => b.score - a.score || b.likes - a.likes || b.count - a.count);
  return arr.slice(0, topN);
}

function scorePill(score: number) {
  if (score >= 15) return "border-emerald-300/25 bg-emerald-500/12 text-emerald-200";
  if (score >= 0) return "border-cyan-300/20 bg-cyan-500/10 text-cyan-200";
  if (score <= -10) return "border-red-300/25 bg-red-500/12 text-red-200";
  return "border-orange-300/25 bg-orange-500/12 text-orange-200";
}

function barWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${clamp((value / max) * 100, 0, 100).toFixed(1)}%`;
}

type SortKey = "score" | "likes" | "dislikes" | "created_at";
type SortDir = "desc" | "asc";

export default function PhotosThumbsReportingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [season, setSeason] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [view, setView] = useState<"cards" | "table">("cards");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState<number>(24);
  const [page, setPage] = useState<number>(1);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (season) params.set("season", season);
      if (type) params.set("type", type);
      if (team) params.set("team", team);
      params.set("limit", "300");

      const r = await fetch(`/api/bureau/photos/thumbs-reporting?${params.toString()}`);
      const j = await r.json();

      if (!r.ok || !j?.ok) throw new Error(j?.error || "reporting failed");
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, type, team]);

  // options basées sur data (pratique)
  const seasons = useMemo(
    () => Array.from(new Set(rows.map((r) => r.season).filter(Boolean))) as string[],
    [rows]
  );
  const types = useMemo(
    () => Array.from(new Set(rows.map((r) => r.type).filter(Boolean))) as string[],
    [rows]
  );
  const teams = useMemo(
    () => Array.from(new Set(rows.map((r) => r.team).filter(Boolean))) as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = `${r.title || ""} ${r.season || ""} ${r.type || ""} ${r.team || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  // sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "desc" ? -1 : 1;

    arr.sort((a, b) => {
      const av: any = (a as any)[sortKey];
      const bv: any = (b as any)[sortKey];

      if (sortKey === "created_at") {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (bt - at) * dir;
      }

      const an = typeof av === "number" ? av : Number(av || 0);
      const bn = typeof bv === "number" ? bv : Number(bv || 0);
      if (bn !== an) return (bn - an) * dir;

      // tie-breakers
      if ((b.score || 0) !== (a.score || 0)) return ((b.score || 0) - (a.score || 0)) * dir;
      if ((b.likes || 0) !== (a.likes || 0)) return ((b.likes || 0) - (a.likes || 0)) * dir;
      return safeLower(b.title).localeCompare(safeLower(a.title)) * dir;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  // pagination
  useEffect(() => {
    setPage(1);
  }, [season, type, team, q, pageSize, sortKey, sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length, pageSize]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // KPIs
  const kpis = useMemo(() => {
    const total = sorted.length;
    const likes = sorted.reduce((s, r) => s + (r.likes || 0), 0);
    const dislikes = sorted.reduce((s, r) => s + (r.dislikes || 0), 0);
    const score = sorted.reduce((s, r) => s + (r.score || 0), 0);

    const voted = sorted.filter((r) => (r.likes || 0) + (r.dislikes || 0) > 0).length;
    const voteRate = total ? (voted / total) * 100 : 0;

    const avgLikes = total ? likes / total : 0;
    const avgDislikes = total ? dislikes / total : 0;
    const avgScore = total ? score / total : 0;

    const top = [...sorted].sort((a, b) => b.score - a.score || b.likes - a.likes)[0];
    const worst = [...sorted].sort((a, b) => a.score - b.score || b.dislikes - a.dislikes)[0];

    const maxLikes = Math.max(0, ...sorted.map((r) => r.likes || 0));
    const maxDislikes = Math.max(0, ...sorted.map((r) => r.dislikes || 0));

    return {
      total,
      likes,
      dislikes,
      score,
      voted,
      voteRate,
      avgLikes,
      avgDislikes,
      avgScore,
      top,
      worst,
      maxLikes,
      maxDislikes,
    };
  }, [sorted]);

  const bySeason = useMemo(() => groupByKey(sorted, (r) => r.season || "—", 8), [sorted]);
  const byType = useMemo(() => groupByKey(sorted, (r) => r.type || "—", 8), [sorted]);
  const byTeam = useMemo(() => groupByKey(sorted, (r) => r.team || "—", 8), [sorted]);

  const maxGroupScoreSeason = useMemo(() => Math.max(0, ...bySeason.map((g) => Math.abs(g.score))), [bySeason]);
  const maxGroupScoreType = useMemo(() => Math.max(0, ...byType.map((g) => Math.abs(g.score))), [byType]);
  const maxGroupScoreTeam = useMemo(() => Math.max(0, ...byTeam.map((g) => Math.abs(g.score))), [byTeam]);

  const exportCsv = () => {
    const out = sorted.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      title: r.title || "",
      season: r.season || "",
      type: r.type || "",
      team: r.team || "",
      likes: r.likes || 0,
      dislikes: r.dislikes || 0,
      score: r.score || 0,
      created_at: r.created_at || "",
      status: r.status || "",
      url: r.url || "",
    }));
    const csv = toCsv(out);
    const suffix = [
      season ? `season-${season}` : "",
      type ? `type-${type}` : "",
      team ? `team-${team}` : "",
    ]
      .filter(Boolean)
      .join("_");
    downloadText(`blackwaves-photos-votes${suffix ? `_${suffix}` : ""}.csv`, csv, "text/csv;charset=utf-8");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* BG FX */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute top-40 right-0 h-[420px] w-[520px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[520px] rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-cyan-400/5 to-indigo-400/10" />
          <div className="relative">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-pink-300/80">
                  Bureau • Photos • Reporting
                </p>
                <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">
                  Reporting des votes{" "}
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                    👍 / 👎
                  </span>
                </h1>
                <p className="mt-2 text-sm text-slate-300/80 max-w-3xl">
                  Analyse des likes/dislikes par photo, avec KPI, classements et synthèses par saison / type / équipe.
                  Les chiffres reflètent les votes enregistrés (score = likes - dislikes).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={exportCsv}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                  title="Exporter les données filtrées (CSV)"
                >
                  Export CSV
                </button>
                <button
                  onClick={load}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-pink-600/20 hover:brightness-110 transition"
                >
                  Rafraîchir
                </button>
              </div>
            </div>

            {/* KPI row */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-slate-300/80">Photos (filtrées)</div>
                <div className="mt-1 text-2xl font-extrabold">{loading ? "…" : fmtInt(kpis.total)}</div>
                <div className="mt-1 text-xs text-slate-400/80">
                  {loading ? "" : `${fmtInt(kpis.voted)} avec au moins 1 vote (${kpis.voteRate.toFixed(0)}%)`}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-slate-300/80">Votes</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <div className="text-2xl font-extrabold">{loading ? "…" : fmtInt(kpis.likes + kpis.dislikes)}</div>
                  {!loading && (
                    <div className="text-xs text-slate-400/80">
                      👍 {fmtInt(kpis.likes)} • 👎 {fmtInt(kpis.dislikes)}
                    </div>
                  )}
                </div>
                {!loading && (
                  <div className="mt-2 text-xs text-slate-400/80">
                    Moy/photo : 👍 {kpis.avgLikes.toFixed(1)} • 👎 {kpis.avgDislikes.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-slate-300/80">Score total</div>
                <div className="mt-1 text-2xl font-extrabold">{loading ? "…" : fmtInt(kpis.score)}</div>
                {!loading && (
                  <div className={clsx("mt-2 inline-flex items-center rounded-full border px-2 py-1 text-xs", scorePill(kpis.avgScore))}>
                    Score moyen&nbsp;: <span className="ml-1 font-semibold">{kpis.avgScore.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-slate-300/80">Top / Worst</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-200/90" title={kpis.top?.title || ""}>
                      🏆 {kpis.top?.title || "—"}
                    </span>
                    <span className={clsx("shrink-0 rounded-full border px-2 py-1", scorePill(kpis.top?.score || 0))}>
                      {fmtInt(kpis.top?.score || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-200/90" title={kpis.worst?.title || ""}>
                      ⚠️ {kpis.worst?.title || "—"}
                    </span>
                    <span className={clsx("shrink-0 rounded-full border px-2 py-1", scorePill(kpis.worst?.score || 0))}>
                      {fmtInt(kpis.worst?.score || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {err && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {err}
              </div>
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-200/80">Saison</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="">Toutes</option>
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-200/80">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="">Tous</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-200/80">Équipe</label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="">Toutes</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-200/80">Recherche</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                placeholder="Titre, saison, équipe…"
              />
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-200/80">Vue</label>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-xs border transition",
                    view === "cards"
                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  Cartes
                </button>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-xs border transition",
                    view === "table"
                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  Tableau
                </button>
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-200/80">Tri</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(
                  [
                    ["score", "Score"],
                    ["likes", "Likes"],
                    ["dislikes", "Dislikes"],
                    ["created_at", "Date"],
                  ] as Array<[SortKey, string]>
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                      else {
                        setSortKey(k);
                        setSortDir("desc");
                      }
                    }}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-xs border transition",
                      sortKey === k
                        ? "border-pink-300/35 bg-pink-500/10 text-pink-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    )}
                    title="Cliquer pour trier / inverser"
                  >
                    {label}
                    {sortKey === k ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-200/80">Pagination</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <select
                  value={String(pageSize)}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                >
                  {[12, 24, 36, 60].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} / page
                    </option>
                  ))}
                </select>

                <div className="ml-auto flex items-center gap-2 text-xs text-slate-300/80">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={clsx(
                      "rounded-xl px-3 py-2 border transition",
                      page <= 1
                        ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    ←
                  </button>
                  <span>
                    Page <span className="font-semibold text-slate-100">{page}</span> / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={clsx(
                      "rounded-xl px-3 py-2 border transition",
                      page >= totalPages
                        ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-300/70 flex flex-wrap gap-3 items-center">
            <span>{loading ? "Chargement…" : `${fmtInt(sorted.length)} photo(s) (après recherche)`}</span>
            {!loading && (
              <>
                <span className="text-slate-400/60">•</span>
                <span>
                  Tri : <span className="text-slate-100 font-semibold">{sortKey}</span>{" "}
                  <span className="text-slate-400/80">{sortDir}</span>
                </span>
              </>
            )}
          </div>
        </section>

        {/* Synthèses */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(
            [
              { title: "Par saison", items: bySeason, max: maxGroupScoreSeason },
              { title: "Par type", items: byType, max: maxGroupScoreType },
              { title: "Par équipe", items: byTeam, max: maxGroupScoreTeam },
            ] as const
          ).map((bloc) => (
            <div key={bloc.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-semibold">{bloc.title}</div>
                <div className="text-xs text-slate-300/70">Top {bloc.items.length}</div>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="h-3 w-2/3 bg-white/5 animate-pulse rounded" />
                      <div className="mt-2 h-2 w-full bg-white/5 animate-pulse rounded" />
                    </div>
                  ))
                ) : bloc.items.length === 0 ? (
                  <div className="text-sm text-slate-300/80">Aucune donnée.</div>
                ) : (
                  bloc.items.map((g) => {
                    const w = barWidth(Math.abs(g.score), bloc.max || 1);
                    return (
                      <div key={g.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" title={g.key}>
                              {g.key}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-300/70">
                              {fmtInt(g.count)} photo(s) • 👍 {fmtInt(g.likes)} • 👎 {fmtInt(g.dislikes)}
                            </div>
                          </div>
                          <span className={clsx("shrink-0 rounded-full border px-2 py-1 text-xs", scorePill(g.score))}>
                            {g.score >= 0 ? "+" : ""}
                            {fmtInt(g.score)}
                          </span>
                        </div>

                        <div className="mt-3 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full",
                              g.score >= 0 ? "bg-emerald-400/60" : "bg-red-400/60"
                            )}
                            style={{ width: w }}
                          />
                        </div>

                        <div className="mt-2 text-[11px] text-slate-400/80 flex justify-between">
                          <span>score moyen {g.avgScore.toFixed(1)}</span>
                          <span>likes moy. {g.avgLikes.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Content */}
        <section className="mt-8">
          {/* Table view */}
          {view === "table" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
                <div className="text-sm font-semibold">Détails (tableau)</div>
                <div className="text-xs text-slate-300/70">
                  Affiche {fmtInt(pageRows.length)} / {fmtInt(sorted.length)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-black/20 text-xs text-slate-200/80">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">#</th>
                      <th className="text-left font-semibold px-4 py-3">Photo</th>
                      <th className="text-left font-semibold px-4 py-3">Meta</th>
                      <th className="text-right font-semibold px-4 py-3">👍</th>
                      <th className="text-right font-semibold px-4 py-3">👎</th>
                      <th className="text-right font-semibold px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {loading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="h-12 w-20 rounded-lg bg-white/5 animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-3 w-64 rounded bg-white/5 animate-pulse" />
                            <div className="mt-2 h-3 w-40 rounded bg-white/5 animate-pulse" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="h-3 w-10 ml-auto rounded bg-white/5 animate-pulse" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="h-3 w-10 ml-auto rounded bg-white/5 animate-pulse" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="h-3 w-12 ml-auto rounded bg-white/5 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-300/80">
                          Aucune photo pour ces filtres.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r, i) => {
                        const rank = (page - 1) * pageSize + i + 1;
                        const likeW = barWidth(r.likes || 0, kpis.maxLikes || 1);
                        const dislikeW = barWidth(r.dislikes || 0, kpis.maxDislikes || 1);

                        return (
                          <tr key={r.id} className="hover:bg-white/5 transition">
                            <td className="px-4 py-3 text-slate-400">{rank}</td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-20 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={r.url} alt={r.title || "photo"} className="h-full w-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold truncate" title={r.title || ""}>
                                    {r.title || "Sans titre"}
                                  </div>
                                  <div className="text-xs text-slate-300/70 truncate">{r.id}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="text-xs text-slate-200/90 truncate">
                                {pickStr(r.season)} · {pickStr(r.type)} · {pickStr(r.team)}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <div className="flex-1">
                                  <div className="text-[11px] text-slate-400/80 mb-1">likes</div>
                                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-400/60" style={{ width: likeW }} />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="text-[11px] text-slate-400/80 mb-1">dislikes</div>
                                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full bg-red-400/60" style={{ width: dislikeW }} />
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs">
                                {fmtInt(r.likes)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs">
                                {fmtInt(r.dislikes)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className={clsx("rounded-full border px-2 py-1 text-xs", scorePill(r.score))}>
                                {r.score >= 0 ? "+" : ""}
                                {fmtInt(r.score)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {!loading && (
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-5 py-4 border-t border-white/10 text-xs text-slate-300/80">
                  <div>
                    Affiche{" "}
                    <span className="font-semibold text-slate-100">
                      {fmtInt((page - 1) * pageSize + 1)}
                    </span>
                    {" – "}
                    <span className="font-semibold text-slate-100">
                      {fmtInt(Math.min(page * pageSize, sorted.length))}
                    </span>{" "}
                    sur {fmtInt(sorted.length)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                      className={clsx(
                        "rounded-xl px-3 py-2 border transition",
                        page <= 1
                          ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      «
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={clsx(
                        "rounded-xl px-3 py-2 border transition",
                        page <= 1
                          ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      ←
                    </button>
                    <span>
                      Page <span className="font-semibold text-slate-100">{page}</span> / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className={clsx(
                        "rounded-xl px-3 py-2 border transition",
                        page >= totalPages
                          ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                      className={clsx(
                        "rounded-xl px-3 py-2 border transition",
                        page >= totalPages
                          ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cards view */}
          {view === "cards" && (
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="aspect-video bg-white/5 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-2/3 bg-white/5 animate-pulse rounded" />
                      <div className="h-3 w-1/2 bg-white/5 animate-pulse rounded" />
                      <div className="h-2 w-full bg-white/5 animate-pulse rounded" />
                    </div>
                  </div>
                ))
              ) : pageRows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-slate-300">
                  Aucune photo pour ces filtres.
                </div>
              ) : (
                pageRows.map((r, idx) => {
                  const rank = (page - 1) * pageSize + idx + 1;
                  const likeW = barWidth(r.likes || 0, kpis.maxLikes || 1);
                  const dislikeW = barWidth(r.dislikes || 0, kpis.maxDislikes || 1);

                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/10 transition"
                    >
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.url} alt={r.title || "photo"} className="w-full aspect-video object-cover" />
                        <div className="absolute top-2 left-2 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-xs">
                          #{rank}
                        </div>
                        <div className={clsx("absolute top-2 right-2 rounded-full border px-2 py-1 text-xs", scorePill(r.score))}>
                          score {r.score >= 0 ? "+" : ""}
                          {fmtInt(r.score)}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-sm font-semibold truncate" title={r.title || ""}>
                          {r.title || "Sans titre"}
                        </div>
                        <div className="mt-1 text-xs text-slate-300/80 truncate">
                          {pickStr(r.season)} · {pickStr(r.type)} · {pickStr(r.team)}
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                            👍 <span className="font-semibold text-slate-100">{fmtInt(r.likes)}</span>
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                            👎 <span className="font-semibold text-slate-100">{fmtInt(r.dislikes)}</span>
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[11px] text-slate-400/80 mb-1">likes</div>
                            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400/60" style={{ width: likeW }} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-400/80 mb-1">dislikes</div>
                            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-red-400/60" style={{ width: dislikeW }} />
                            </div>
                          </div>
                        </div>

                        {r.created_at && (
                          <div className="mt-3 text-[11px] text-slate-400/80">
                            Ajoutée le{" "}
                            <span className="text-slate-200/90">
                              {new Date(r.created_at).toLocaleString("fr-FR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
