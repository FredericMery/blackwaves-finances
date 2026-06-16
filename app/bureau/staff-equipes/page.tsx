import React, { Suspense } from "react";
import StaffEquipesClient from "./StaffEquipesClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
              Chargement…
            </div>
          </div>
        </div>
      }
    >
      <StaffEquipesClient />
    </Suspense>
  );
}
