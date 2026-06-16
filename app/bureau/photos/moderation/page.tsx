import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Submission = {
  id: string;
  url: string;
  parent_email: string;
  parent_name?: string | null;
  season?: string | null;
  team?: string | null;
  photo_type?: string | null;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  status?: string | null;
};

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://blackwaves-cheer.com";

const ADMIN_TOKEN = process.env.BUREAU_ADMIN_TOKEN || "";

export const dynamic = "force-dynamic";

async function api(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  if (ADMIN_TOKEN) headers.set("x-bw-admin-token", ADMIN_TOKEN);

  const res = await fetch(`${SITE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  return { res, data };
}

async function getPending(): Promise<Submission[]> {
  const { res, data } = await api("/api/bureau/photos/pending", { method: "GET" });
  if (!res.ok) return [];
  return (data?.items || []) as Submission[];
}

async function approveAction(formData: FormData) {
  "use server";
  const submission_id = String(formData.get("submission_id") || "");
  const comment = String(formData.get("comment") || "").trim() || null;

  await api("/api/bureau/photos/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submission_id, comment }),
  });

  revalidatePath("/bureau/photos/moderation");
  redirect("/bureau/photos/moderation");
}

async function rejectAction(formData: FormData) {
  "use server";
  const submission_id = String(formData.get("submission_id") || "");
  const comment = String(formData.get("comment") || "").trim();

  await api("/api/bureau/photos/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submission_id, comment }),
  });

  revalidatePath("/bureau/photos/moderation");
  redirect("/bureau/photos/moderation");
}

function safeUrl(url?: string | null) {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function Tag({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "blue";
}) {
  const cls =
    tone === "blue"
      ? "border-blue-200/70 bg-blue-50 text-blue-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function TopLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

export default async function BureauPhotosModerationPage() {
  const items = await getPending();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.32em] uppercase text-slate-500">
              Espace bureau • Modération
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">
                Validation des photos
              </h1>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {items.length} en attente
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Validez pour publier dans la galerie, ou refusez avec un motif (mail automatique au parent).
            </p>
          </div>

          <div className="flex gap-2">
            <TopLink href="/bureau/photos">Gestion média</TopLink>
            <TopLink href="/bureau/photos/moderation">Actualiser</TopLink>
          </div>
        </div>

        {/* List */}
        <div className="mt-8 space-y-4">
          {items.map((s) => {
            const url = safeUrl(s.url);
            const dateLabel = formatDate(s.created_at);

            return (
              <div
                key={s.id}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-4 md:p-5">
                  <div className="grid gap-5 md:grid-cols-[320px_1fr]">
                    {/* Image */}
                    <div>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        {url ? (
                          <img
                            src={url}
                            alt={s.title || "Photo soumise"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            Pas d’URL
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.season ? <Tag>{s.season}</Tag> : null}
                        {s.team ? <Tag>{s.team}</Tag> : null}
                        {s.photo_type ? <Tag tone="blue">{s.photo_type}</Tag> : null}
                        {dateLabel ? <Tag>Soumise {dateLabel}</Tag> : null}
                      </div>
                    </div>

                    {/* Content + actions */}
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-slate-900">
                            {s.title || "Sans titre"}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Parent :{" "}
                            <span className="font-medium text-slate-800">
                              {s.parent_name || "—"}
                            </span>{" "}
                            <span className="text-slate-400">•</span>{" "}
                            <span className="font-medium text-slate-800">
                              {s.parent_email}
                            </span>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          #{s.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="mt-3 text-sm leading-relaxed text-slate-700">
                        {s.description ? (
                          s.description
                        ) : (
                          <span className="text-slate-500">Aucune description</span>
                        )}
                      </div>

                      {/* Actions: une seule ligne claire + labels */}
                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        {/* Publier */}
                        <form
                          action={approveAction}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <input type="hidden" name="submission_id" value={s.id} />

                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900">
                              Publier
                            </div>
                            <div className="text-xs text-slate-500">commentaire optionnel</div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              name="comment"
                              placeholder="Ex : super souvenir !"
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                            <button
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                              type="submit"
                            >
                              Publier
                            </button>
                          </div>

                          <div className="mt-2 text-[12px] text-slate-500">
                            La photo sera ajoutée à la galerie après validation.
                          </div>
                        </form>

                        {/* Refuser */}
                        <form
                          action={rejectAction}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <input type="hidden" name="submission_id" value={s.id} />

                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900">
                              Refuser
                            </div>
                            <div className="text-xs text-slate-500">motif obligatoire</div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              name="comment"
                              placeholder="Ex : photo floue / hors thème"
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                              required
                            />
                            <button
                              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                              type="submit"
                            >
                              Refuser
                            </button>
                          </div>

                          <div className="mt-2 text-[12px] text-slate-500">
                            Motifs fréquents : floue • hors thème • visage non autorisé • doublon
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-700 shadow-sm">
              <div className="text-xl font-semibold text-slate-900">Rien à valider</div>
              <div className="mt-2 text-sm text-slate-600">
                Aucune photo en attente pour le moment.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
