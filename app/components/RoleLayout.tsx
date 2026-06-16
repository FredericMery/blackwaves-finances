"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type Role = "public" | "adherent" | "coach" | "bureau";

const roleThemes: Record<
  Role,
  { bg: string; text: string; headerBg: string; headerText: string }
> = {
  public: {
    bg: "bg-white",
    text: "text-black",
    headerBg: "bg-white/90",
    headerText: "text-black",
  },
  adherent: {
    bg: "bg-black",
    text: "text-white",
    headerBg: "bg-black/90",
    headerText: "text-white",
  },
  coach: {
    bg: "bg-black",
    text: "text-white",
    headerBg: "bg-black/90",
    headerText: "text-white",
  },
  bureau: {
    bg: "bg-bw-navy",
    text: "text-white",
    headerBg: "bg-bw-navy/95",
    headerText: "text-white",
  },
};

export default function RoleLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("public");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setRole("public");
          setLoading(false);
          return;
        }

        // On va chercher son profil
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error || !profile?.role) {
          console.warn("Profil non trouvé ou pas de rôle, rôle par défaut = adherent");
          setRole("adherent");
        } else {
          const r = profile.role as Role;
          setRole(r === "coach" ? "coach" : r); // sécurité
        }
      } catch (e) {
        console.error("Erreur récupération du rôle :", e);
        setRole("public");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  const theme = roleThemes[role];

  // Menus
  const publicMenu = [
    { href: "/", label: "Accueil" },
    { href: "/club", label: "Le Club" },
    { href: "/histoire", label: "Histoire" },
    { href: "/equipes", label: "Équipes" },
    { href: "/staff", label: "Coachs" },
    { href: "/parents", label: "Parents" },
    { href: "/competitions", label: "Compétitions" },
    { href: "/galerie", label: "Galerie" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Login" },
  ];

  const adherentMenu = [
    { href: "/adherent", label: "Tableau de bord" },
    { href: "/planning", label: "Planning" },
    { href: "/logout", label: "Déconnexion" },
    { href: "/", label: "Retour site public" },
  ];

  const bureauMenu = [
    { href: "/adherent", label: "Tableau de bord" },
    { href: "/planning", label: "Planning" },
    { href: "/admin/staff", label: "Staff & Coachs" },
    { href: "/logout", label: "Déconnexion" },
    { href: "/", label: "Retour site public" },
  ];

  const coachMenu = [
    { href: "/adherent", label: "Tableau de bord" },
    { href: "/planning", label: "Planning" },
    { href: "/logout", label: "Déconnexion" },
    { href: "/", label: "Retour site public" },
  ];

  const menu =
    role === "bureau"
      ? bureauMenu
      : role === "coach"
      ? coachMenu
      : role === "adherent"
      ? adherentMenu
      : publicMenu;

  return (
    <div className={`${theme.bg} ${theme.text} min-h-screen`}>
      {/* HEADER */}
      <header
        className={`${theme.headerBg} ${theme.headerText} backdrop-blur-sm border-b border-white/10 fixed top-0 left-0 z-50 w-full shadow-lg`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
          {/* Logo + nom */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image
                  src="/blackwaves-logo.png"
                  alt="Black Waves Logo"
                  width={44}
                  height={44}
                  className="rounded-full border border-white/20 shadow-sm"
                />
            </Link>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">
                Black Waves
              </span>
              <span className="text-[11px] opacity-70">
                {role === "bureau"
                  ? "Espace bureau"
                  : role === "coach"
                  ? "Espace coach"
                  : role === "adherent"
                  ? "Espace adhérents"
                  : "Cheerleading · Marseille"}
              </span>
            </div>
          </div>

          {/* Menu */}
          <nav className="hidden md:flex gap-5 text-sm font-medium">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`hover:text-bw-blue transition ${
                  theme.headerText
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {/* Bouton retour bureau (visible pour role bureau) */}
          {role === "bureau" && (
            <div className="flex items-center">
              <Link
                href="/bureau"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-sky-600/10 px-2 py-0.5 text-xs font-semibold text-white hover:bg-sky-600/20"
              >
                ← Accueil bureau
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Décaler le contenu sous le header */}
      <div className="h-20" />

      {/* Contenu principal */}
      <main className={loading ? "opacity-60" : ""}>{children}</main>
    </div>
  );
}

