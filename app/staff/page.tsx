export default function StaffPage() {
  /* ---- BUREAU ---- */
  const bureau = [
    {
      name: "Frédéric M.",
      role: "Président",
      img: "/staff/frederic.png",
    },
    {
      name: "Christelle D.",
      role: "Vice-présidente",
      img: "/staff/christelle.png",
    },
    {
      name: "Audrey R.",
      role: "Trésorière",
      img: "/staff/audrey.png",
    },
    {
      name: "Alisson B.",
      role: "Secrétaire générale",
      img: "/staff/alisson.png",
    },
  ];

  /* ---- COACHS ---- */
  const coachs = [
    {
      name: "Aély",
      years: "X ans de pratique",
      team: "Minimes novices",
      bg: "bg-blue-900/25",
      img: "/staff/aely.png",
    },
    {
      name: "Tiphaine",
      years: "X ans de pratique",
      team: "Minimes novices",
      bg: "bg-blue-900/25",
      img: "/staff/tiphaine.png",
    },
    {
      name: "Célia",
      years: "X ans de pratique",
      team: "Minimes intermédiaires",
      bg: "bg-indigo-900/25",
      img: "/staff/celia.png",
    },
    {
      name: "Emma",
      years: "X ans de pratique",
      team: "Minimes intermédiaires",
      bg: "bg-indigo-900/25",
      img: "/staff/emma.png",
    },
    {
      name: "Charlotte",
      years: "X ans de pratique",
      team: "Cadets",
      bg: "bg-emerald-900/25",
      img: "/staff/charlotte.png",
    },
    {
      name: "Maëva",
      years: "X ans de pratique",
      team: "Cadets",
      bg: "bg-emerald-900/25",
      img: "/staff/maeva.png",
    },
    {
      name: "Tommy",
      years: "X ans de pratique",
      team: "Juniors",
      bg: "bg-purple-900/25",
      img: "/staff/tommy.png",
    },
    {
      name: "Matilde",
      years: "X ans de pratique",
      team: "Juniors",
      bg: "bg-purple-900/25",
      img: "/staff/matilde.png",
    },
    {
      name: "Marine",
      years: "X ans de pratique",
      team: "Juniors",
      bg: "bg-purple-900/25",
      img: "/staff/marine.png",
    },
    {
      name: "Élodie",
      years: "X ans de pratique",
      team: "U16",
      bg: "bg-rose-900/25",
      img: "/staff/elodie.png",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-bw-dark via-black to-bw-navy text-white">
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
        {/* HEADER */}
        <header className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan/80">
            Staff & Coachs
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold">
            L’équipe encadrante des Black Waves
          </h1>
          <p className="mt-3 text-sm text-bw-light/80 max-w-2xl">
            Découvrez le bureau du club ainsi que les coachs qui encadrent
            les athlètes au quotidien.
          </p>
        </header>

        {/* ---- BUREAU ---- */}
        <section className="mb-16">
          <h2 className="text-lg md:text-xl font-semibold mb-6">Le Bureau</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {bureau.map((m, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center text-center"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden border border-white/20 bg-black/40 mb-3">
                  <img
                    src={m.img}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-semibold text-white">{m.name}</p>
                <p className="text-xs text-bw-light/70">{m.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- COACHS ---- */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg md:text-xl font-semibold">
              Coachs & Encadrants
            </h2>
            <p className="text-[11px] text-bw-light/60">
              La couleur de fond indique l’équipe coachée.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {coachs.map((c, i) => (
              <div
                key={i}
                className={`rounded-2xl border border-white/10 ${c.bg} p-4 flex flex-col items-center text-center`}
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border border-white/20 bg-black/40 mb-3">
                  <img
                    src={c.img}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-semibold text-white">{c.name}</p>
                <p className="text-[11px] text-bw-light/75 mt-0.5">
                  {c.team}
                </p>
                <p className="text-[11px] text-bw-cyan/70 mt-1">{c.years}</p>
              </div>
            ))}
          </div>

          {/* Légende des couleurs */}
          <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-bw-light/75">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-900/30 border border-blue-500/50">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Minimes novices
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/50">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Minimes intermédiaires
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Cadets
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-900/30 border border-purple-500/50">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Juniors
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-900/30 border border-rose-500/50">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              U16
            </span>
          </div>
        </section>
      </section>
    </div>
  );
}
