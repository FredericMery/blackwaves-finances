"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Erreur lors du logout :", e);
      } finally {
        router.replace("/login");
      }
    }

    doLogout();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bw-dark text-white">
      <p className="text-sm text-bw-light/80">
        Déconnexion en cours...
      </p>
    </main>
  );
}

