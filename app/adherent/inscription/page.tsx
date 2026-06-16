'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

type DemandeStatut =
  | 'brouillon'
  | 'attente-parent'
  | 'compte-parent-cree'
  | 'terminee'
  | string;

type DemandeInscription = {
  id: string;
  email_parent: string;
  nom_enfant: string;
  prenom_enfant: string;
  equipe_souhaitee?: string | null;
  statut: DemandeStatut;
  created_at: string;
  updated_at?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdherentInscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [demande, setDemande] = useState<DemandeInscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDemande = async () => {
      setLoading(true);
      setError(null);

      // 1. Récupérer l'utilisateur connecté
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        setError(
          'Impossible de récupérer votre compte. Merci de vous reconnecter à votre espace parent.'
        );
        setLoading(false);
        return;
      }

      const email = user.email;
      if (!email) {
        setError(
          'Aucune adresse e-mail associée à votre compte. Merci de contacter le bureau Black Waves.'
        );
        setLoading(false);
        return;
      }

      // 2. Récupérer la dernière demande d’inscription liée à ce parent
      const { data, error: dError } = await supabase
        .from('demandes_inscription')
        .select('*')
        .eq('email_parent', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dError) {
        console.error(dError);
        setError(
          "Impossible de récupérer les informations d'inscription. Merci de réessayer plus tard."
        );
        setLoading(false);
        return;
      }

      if (!data) {
        setDemande(null);
      } else {
        setDemande(data as DemandeInscription);
      }

      setLoading(false);
    };

    fetchDemande();
  }, []);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const statutInfo = useMemo(() => {
    const statut = demande?.statut as DemandeStatut | undefined;

    switch (statut) {
      case 'brouillon':
        return {
          label: 'En cours côté club',
          description:
            "Votre demande est enregistree, le bureau est en train de preparer l'inscription de votre enfant. Pensez a surveiller vos e-mails (et vos spams) pour les prochaines informations.",
          colorClasses:
            'bg-slate-900/80 border border-slate-600 text-slate-50',
          stepIndex: 1,
        };
      case 'attente-parent':
        return {
          label: 'En attente de vos informations',
          description:
            'Le club vous a transmis un lien pour compléter la fiche de votre enfant. Merci de vérifier vos e-mails (y compris vos spams).',
          colorClasses:
            'bg-amber-900/80 border border-amber-500/80 text-amber-50',
          stepIndex: 2,
        };
      case 'compte-parent-cree':
        return {
          label: 'Compte parent créé',
          description:
            'Votre compte parent est cree. Le club finalise l’enregistrement de votre enfant dans les equipes. Pensez a surveiller vos e-mails (et vos spams) pour les prochaines etapes.',
          colorClasses: 'bg-sky-900/80 border border-sky-500/80 text-sky-50',
          stepIndex: 3,
        };
      case 'terminee':
        return {
          label: 'Inscription terminée',
          description:
            "L'inscription de votre enfant est finalisee. Vous recevrez les dernieres informations pratiques (plannings, documents) par l'equipe. Pensez a surveiller vos e-mails (et vos spams).",
          colorClasses:
            'bg-emerald-900/80 border border-emerald-500/80 text-emerald-50',
          stepIndex: 4,
        };
      default:
        return {
          label: 'Statut en cours de mise à jour',
          description:
            'Le club est en train de mettre à jour le suivi de votre inscription. Si besoin, n’hésitez pas à contacter le bureau.',
          colorClasses:
            'bg-slate-900/80 border border-slate-600 text-slate-50',
          stepIndex: 1,
        };
    }
  }, [demande]);

  const steps = [
    {
      id: 1,
      title: 'Demande de cours d’essai',
      description: 'Votre demande a été enregistrée auprès du club.',
    },
    {
      id: 2,
      title: 'Fiche d’inscription à compléter',
      description: 'Vous complétez les informations administratives en ligne.',
    },
    {
      id: 3,
      title: 'Création du compte parent',
      description:
        "Votre compte parent Black Waves est créé pour suivre l'inscription.",
    },
    {
      id: 4,
      title: 'Inscription finalisée',
      description:
        "Le dossier est validé par le bureau, votre enfant rejoint officiellement l'équipe.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Titre */}
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-[0.25em] text-pink-400 uppercase mb-2">
            Espace parent · Inscription
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Suivi de l&apos;inscription de votre enfant
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Retrouvez ici l&apos;état d&apos;avancement de l&apos;inscription de
            votre enfant au club Black Waves : étapes, statut et informations
            principales.
          </p>
        </header>

        {/* États de chargement / erreur */}
        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-8 text-sm text-slate-200">
            Chargement des informations d&apos;inscription…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-700 bg-red-900/50 px-6 py-4 text-sm text-red-50 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && !demande && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-8 text-sm text-slate-200">
            <p className="font-medium mb-2">
              Aucune inscription en cours trouvée pour votre compte.
            </p>
            <p className="text-slate-300">
              Si vous venez de faire une demande de cours d&apos;essai ou
              d&apos;inscription, le traitement peut prendre un peu de temps. En
              cas de doute, n&apos;hésitez pas à contacter le bureau Black Waves.
            </p>
            <div className="mt-4">
              <Link
                href="/parents"
                className="inline-flex items-center rounded-full border border-pink-500/70 bg-pink-600/10 px-4 py-2 text-xs font-semibold text-pink-100 hover:bg-pink-500/20 transition"
              >
                ← Retour aux informations parents
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && demande && (
          <>
            {/* Carte principale */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-6 md:px-8 md:py-7 mb-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-[0.18em] mb-1">
                    Enfant concerné
                  </p>
                  <h2 className="text-xl md:text-2xl font-semibold">
                    {demande.prenom_enfant} {demande.nom_enfant}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Équipe souhaitée :{' '}
                    <span className="font-medium">
                      {demande.equipe_souhaitee || 'à définir avec le club'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Demande créée le {formatDate(demande.created_at)}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Statut de l&apos;inscription
                  </p>
                  <div
                    className={
                      'inline-flex flex-col items-start md:items-end rounded-2xl px-4 py-3 text-xs md:text-sm ' +
                      statutInfo.colorClasses
                    }
                  >
                    <span className="font-semibold mb-1">
                      {statutInfo.label}
                    </span>
                    <span className="text-[11px] md:text-xs text-slate-100/90 max-w-xs md:max-w-sm">
                      {statutInfo.description}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Timeline des étapes */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-6 md:px-8 md:py-7">
              <h3 className="text-base md:text-lg font-semibold mb-4">
                Étapes de l&apos;inscription
              </h3>

              <ol className="relative border-l border-slate-700/70 pl-4 space-y-4">
                {steps.map((step) => {
                  const done = step.id <= statutInfo.stepIndex;
                  const current = step.id === statutInfo.stepIndex;

                  return (
                    <li key={step.id} className="ml-1">
                      <div className="absolute -left-[9px] mt-1 flex h-4 w-4 items-center justify-center rounded-full border bg-slate-950 border-slate-700">
                        <div
                          className={
                            'h-2 w-2 rounded-full ' +
                            (done
                              ? 'bg-pink-500'
                              : current
                              ? 'bg-pink-400'
                              : 'bg-slate-600')
                          }
                        />
                      </div>
                      <div className="ml-3">
                        <p
                          className={
                            'text-sm font-medium ' +
                            (done
                              ? 'text-pink-200'
                              : current
                              ? 'text-slate-50'
                              : 'text-slate-300')
                          }
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-5 text-[11px] md:text-xs text-slate-400">
                En cas de question sur le statut de votre inscription, vous
                pouvez contacter le bureau Black Waves par les canaux habituels
                (e-mail, WhatsApp, ou à l&apos;issue des entraînements).
              </p>
            </section>

            <div className="mt-6">
              <Link
                href="/adherent"
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 transition"
              >
                ← Retour à mon espace adhérent
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
