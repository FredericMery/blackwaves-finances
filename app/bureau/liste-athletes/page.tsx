import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SeasonSelect from "./SeasonSelect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AthleteRow = {
  id: string;
  nom: string | null;
  prenom: string | null;
  equipe: string | null;
  saison: string | null;
  date_naissance: string | null;
};

type TeamRow = {
  id: string;
  saison: string;
  type_code: string;
  niveau: number;
  label: string;
  ordre: number | null;
};

type DisplayRow = {
  key: string;
  nom: string;        // ALL CAPS
  prenom: string;     // First letter upper, rest lower
  equipeLabel: string;
  teamOrder: number;   // from def_equipes_saison.ordre, for sorting
  saison: string;
  age: number | null;
  seniority: number;
  crossOver: string | null;   // only when >= 2 teams same saison
  equipePlus: string[];        // 3rd+ teams
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeAge(dateString: string | null): number | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function capitalize(s: string | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normKey(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, " ").replace(/[–_-]/g, " ").trim();
}

/** Build a Map from any equipe raw value → human-readable label */
function buildTeamLabelMap(teams: TeamRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const t of teams) {
    const label = t.label || `${t.type_code} N${t.niveau}`;
    m.set(t.id, label);
    m.set(normKey(t.label), label);
    m.set(normKey(t.type_code), label);
    m.set(normKey(`${t.type_code}_N${t.niveau}`), label);
    m.set(normKey(`${t.type_code} N${t.niveau}`), label);
    m.set(normKey(`${t.type_code} ${t.niveau}`), label);
  }
  return m;
}

/** Build a Map from equipe label → ordre (for sorting youngest team first) */
function buildTeamOrderMap(teams: TeamRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of teams) {
    const label = t.label || `${t.type_code} N${t.niveau}`;
    const order = t.ordre ?? 99;
    m.set(label, order);
  }
  return m;
}

function resolveLabel(raw: string | null, map: Map<string, string>): string {
  if (!raw) return "—";
  if (map.has(raw)) return map.get(raw)!;
  const n = normKey(raw);
  if (map.has(n)) return map.get(n)!;
  // Readable fallback: strip UUIDs, normalize code format
  if (/^[0-9a-f-]{36}$/i.test(raw)) return "—";
  return raw;
}

// ---------------------------------------------------------------------------
// Seniority badge classes
// ---------------------------------------------------------------------------
function seniorityClass(n: number): string {
  if (n >= 6) return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-200/60";
  if (n >= 4) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-200/60";
  if (n >= 2) return "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200/60";
  return "bg-slate-100 text-slate-500 border-slate-200 ring-slate-200/40";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ListeAthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const params = await searchParams;
  const selectedSeason = (params.saison ?? "").trim();

  const sb = supabaseAdmin();

  // Fetch all data in parallel
  const [{ data: rawAthletes, error }, { data: rawTeams }] = await Promise.all([
    sb.from("athletes").select("id, nom, prenom, equipe, saison, date_naissance"),
    sb.from("def_equipes_saison").select("id, saison, type_code, niveau, label, ordre").order("ordre", { ascending: true }),
  ]);

  const allAthletes: AthleteRow[] = (rawAthletes ?? []) as AthleteRow[];
  const allTeams: TeamRow[] = (rawTeams ?? []) as TeamRow[];

  // Team label resolver and order map
  const teamLabelMap = buildTeamLabelMap(allTeams);
  const teamOrderMap = buildTeamOrderMap(allTeams);

  // Available seasons (desc)
  const seasons = [
    ...new Set(allAthletes.map((a) => a.saison).filter(Boolean) as string[]),
  ].sort().reverse();

  // Seniority: count distinct seasons per normalised (nom, prenom)
  const seniorityMap = new Map<string, Set<string>>();
  const birthMap = new Map<string, string>();
  for (const a of allAthletes) {
    if (!a.nom || !a.prenom) continue;
    const k = `${a.nom.trim().toUpperCase()}||${a.prenom.trim().toLowerCase()}`;
    if (!seniorityMap.has(k)) seniorityMap.set(k, new Set());
    if (a.saison) seniorityMap.get(k)!.add(a.saison);
    if (a.date_naissance && !birthMap.has(k)) birthMap.set(k, a.date_naissance);
  }

  // Filter by chosen season (or keep all)
  const filtered = selectedSeason
    ? allAthletes.filter((a) => a.saison === selectedSeason)
    : allAthletes;

  // Group by (nom, prenom, saison) → collect all equipe labels (cross-over detection)
  const groups = new Map<string, { first: AthleteRow; equipeLabels: string[] }>();
  for (const a of filtered) {
    if (!a.nom || !a.prenom) continue;
    const k = `${a.nom.trim().toUpperCase()}||${a.prenom.trim().toLowerCase()}||${a.saison ?? ""}`;
    if (!groups.has(k)) groups.set(k, { first: a, equipeLabels: [] });
    const g = groups.get(k)!;
    const lbl = resolveLabel(a.equipe, teamLabelMap);
    if (lbl !== "—" && !g.equipeLabels.includes(lbl)) g.equipeLabels.push(lbl);
  }

  // Build display rows
  const rows: DisplayRow[] = [];
  for (const { first, equipeLabels } of groups.values()) {
    const normK = `${first.nom!.trim().toUpperCase()}||${first.prenom!.trim().toLowerCase()}`;
    const seniority = seniorityMap.get(normK)?.size ?? 1;
    const dob = birthMap.get(normK) ?? first.date_naissance;

    const mainLabel = equipeLabels[0] ?? "—";
    rows.push({
      key: `${first.nom}||${first.prenom}||${first.saison}`,
      nom: (first.nom ?? "").trim().toUpperCase(),
      prenom: capitalize(first.prenom),
      equipeLabel: mainLabel,
      teamOrder: teamOrderMap.get(mainLabel) ?? 9999,
      saison: first.saison ?? "—",
      age: computeAge(dob),
      seniority,
      // cross-over: 2nd team if athlete has >= 2 teams in this season
      crossOver: equipeLabels.length >= 2 ? equipeLabels[1] : null,
      // équipe+: 3rd+ teams
      equipePlus: equipeLabels.length >= 3 ? equipeLabels.slice(2) : [],
    });
  }

  // Sort: team order ASC (youngest team first), then age ASC (youngest athlete first), then nom
  rows.sort((a, b) => {
    // 1. Team order (youngest category first)
    if (a.teamOrder !== b.teamOrder) return a.teamOrder - b.teamOrder;
    // 2. Age ascending — null ages go at the end
    if (a.age !== b.age) {
      if (a.age === null) return 1;
      if (b.age === null) return -1;
      return a.age - b.age;
    }
    // 3. Nom / prénom for stable tie-break
    const n = a.nom.localeCompare(b.nom, "fr");
    if (n !== 0) return n;
    return a.prenom.localeCompare(b.prenom, "fr");
  });

  const crossOverCount = rows.filter((r) => r.crossOver !== null).length;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f7ff_0%,#eef2ff_40%,#e8ecf8_100%)] pb-20 text-slate-900">
      <div className="mx-auto max-w-[1280px] px-4 pt-8 md:px-6">

        {/* Header */}
        <header className="border-b border-indigo-200/60 pb-5 md:pb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-500">Espace bureau</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">Liste des athlètes</h1>
              <p className="mt-2 text-sm text-slate-500">
                Nom · Prénom · Équipe · Saison · Âge · Ancienneté · Cross-over
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/bureau/comptes-athletes"
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Créer compte athlète
              </Link>
              <Link
                href="/bureau"
                className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Retour bureau
              </Link>
              <Link
                href="/bureau/gerer-asso-2"
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Gérer l'asso 2
              </Link>
            </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border-l-4 border-rose-500 bg-rose-50 px-4 py-2 text-sm text-rose-800">
            Impossible de charger la liste : {error.message}
          </div>
        )}

        {/* Stats + filter bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <StatBadge label="athlètes" value={rows.length} tone="indigo" />
            <StatBadge label="saisons dispo" value={seasons.length} tone="slate" />
            {crossOverCount > 0 && (
              <StatBadge label="cross-over" value={crossOverCount} tone="cyan" />
            )}
          </div>
          <SeasonSelect seasons={seasons} value={selectedSeason} />
        </div>

        {/* Table */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-indigo-100/80 bg-white/70 shadow-md backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/60 to-slate-50/40 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 text-left font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left font-semibold">Prénom</th>
                  <th className="px-4 py-3 text-left font-semibold">Équipe</th>
                  <th className="px-4 py-3 text-left font-semibold">Saison</th>
                  <th className="px-4 py-3 text-right font-semibold">Âge</th>
                  <th className="px-4 py-3 text-center font-semibold">Ancienneté</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
                      Cross-over
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                      Équipe +
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                      Aucun athlète trouvé{selectedSeason ? ` pour la saison ${selectedSeason}` : ""}.
                    </td>
                  </tr>
                )}
                {rows.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={[
                      "border-b border-slate-100/80 transition-colors hover:bg-indigo-50/50",
                      idx % 2 === 0 ? "bg-white/50" : "bg-slate-50/30",
                    ].join(" ")}
                  >
                    {/* Nom */}
                    <td className="px-4 py-2.5 font-bold tracking-wide text-slate-800">
                      {row.nom}
                    </td>

                    {/* Prénom */}
                    <td className="px-4 py-2.5 text-slate-700">{row.prenom}</td>

                    {/* Équipe principale */}
                    <td className="px-4 py-2.5">
                      {row.equipeLabel !== "—" ? (
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200/60">
                          {row.equipeLabel}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Saison */}
                    <td className="px-4 py-2.5 text-slate-500 tabular-nums">{row.saison}</td>

                    {/* Âge */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {row.age !== null ? (
                        <span className="font-semibold">{row.age}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Ancienneté badge */}
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${seniorityClass(row.seniority)}`}
                      >
                        {row.seniority} {row.seniority <= 1 ? "sais." : "sais."}
                      </span>
                    </td>

                    {/* Cross-over */}
                    <td className="px-4 py-2.5">
                      {row.crossOver ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 ring-1 ring-inset ring-cyan-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          {row.crossOver}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Équipe + */}
                    <td className="px-4 py-2.5">
                      {row.equipePlus.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.equipePlus.map((eq) => (
                            <span
                              key={eq}
                              className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200/60"
                            >
                              {eq}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="border-t border-slate-100/80 bg-slate-50/40 px-4 py-2 text-[11px] text-slate-400">
            {rows.length} athlète{rows.length !== 1 ? "s" : ""}
            {selectedSeason ? ` · saison ${selectedSeason}` : " · toutes saisons"}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (server-renderable)
// ---------------------------------------------------------------------------
function StatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "indigo" | "slate" | "cyan";
}) {
  const cls = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  }[tone];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${cls}`}
    >
      <span className="text-sm font-bold tabular-nums">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}