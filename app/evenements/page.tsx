import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function EventsPage() {
  const { data: events, error } = await supabase
    .from("events_club")
    .select("*")
    .eq("is_active", true)
    .order("event_date", { ascending: true });

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-6">
        <h1 className="text-4xl font-bold mb-10 text-center">Événements</h1>
        <pre className="text-red-600 bg-red-50 p-4 rounded-xl">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-6">Événements</h1>
        <p className="text-gray-600">
          Aucun événement actif pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 min-h-screen">

      {/* HERO */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6">
          Nos Événements
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Compétitions, showcases, moments forts du club…  
          Retrouvez ici tous les rendez-vous BlackWaves.
        </p>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {events.map((event) => {

            const formattedDate = new Date(event.event_date).toLocaleDateString(
              "fr-FR",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            );

            return (
              <Link
                key={event.id}
                href={`/evenements/${event.slug}`}
                className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
              >

                {/* IMAGE CONTAINER */}
                <div className="relative w-full aspect-[4/5] overflow-hidden">

                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-500">
                      Image à venir
                    </div>
                  )}

                  {/* Gradient overlay pour lisibilité */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                  {/* DATE BADGE */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-black text-xs font-semibold px-4 py-2 rounded-full shadow">
                    {formattedDate}
                  </div>

                  {/* TEXT OVER IMAGE */}
                  <div className="absolute bottom-0 p-6 text-white">
                    <h2 className="text-xl font-bold leading-tight group-hover:translate-y-[-4px] transition duration-500">
                      {event.title}
                    </h2>
                  </div>
                </div>

              </Link>
            );
          })}

        </div>
      </div>
    </div>
  );
}