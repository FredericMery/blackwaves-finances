'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type DemandeInscription = {
  id: string;
  token: string;
  email_parent: string | null;
  nom_enfant: string | null;
  prenom_enfant: string | null;
  statut: string | null;
};

type LoadState = 'loading' | 'ok' | 'not-found' | 'error';
type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function CompteParentPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [demande, setDemande] = useState<DemandeInscription | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nomParent, setNomParent] = useState('');
  const [prenomParent, setPrenomParent] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreePhoto, setAgreePhoto] = useState(true);
  const [agreeVideo, setAgreeVideo] = useState(true);

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Chargement de la demande à partir du token
  useEffect(() => {
    const fetchDemande = async () => {
      try {
        let rawToken = params.token;
        const normalizedToken = rawToken.startsWith('token-')
          ? rawToken.replace(/^token-/, '')
          : rawToken;

        const { data, error } = await supabase
          .from('demandes_inscription')
          .select('*')
          .eq('token', normalizedToken)
          .maybeSingle();

        if (error) {
          console.error('Erreur Supabase (demandes_inscription):', error);
          setLoadError(error.message);
          setLoadState('error');
          return;
        }

        if (!data) {
          setLoadState('not-found');
          return;
        }

        const d = data as DemandeInscription;
        setDemande(d);
        setLoadState('ok');
      } catch (err: any) {
        console.error('Erreur inattendue:', err);
        setLoadError(err.message ?? 'Erreur inconnue');
        setLoadState('error');
      }
    };

    fetchDemande();
  }, [params.token]);

  // --- États de chargement ---

  if (loadState === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="px-6 py-4 rounded-xl bg-slate-900/70 border border-slate-700 shadow-xl">
          <p className="text-sm tracking-wide">
            Chargement du formulaire de création de compte parent…
          </p>
        </div>
      </main>
    );
  }

  if (loadState === 'not-found') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="px-8 py-6 rounded-2xl bg-gradient-to-br from-red-500/20 via-slate-900 to-slate-900 border border-red-500/60 shadow-2xl">
          <p className="text-lg font-semibold mb-1">
            Lien d’inscription invalide ou expiré.
          </p>
          <p className="text-sm text-slate-300 max-w-md">
            Ce lien ne correspond à aucune demande d’inscription active. Merci
            de contacter le bureau Black Waves pour obtenir un nouveau lien.
          </p>
        </div>
      </main>
    );
  }

  if (loadState === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="px-8 py-6 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/60 shadow-2xl max-w-xl">
          <p className="text-lg font-semibold mb-2">
            Problème lors du chargement du formulaire.
          </p>
          <p className="text-sm text-slate-300 mb-3">
            Une erreur est survenue. Merci de réessayer dans quelques instants.
            Si le problème persiste, contactez le bureau Black Waves.
          </p>
          {loadError && (
            <p className="text-xs text-slate-400 border-t border-slate-700 pt-2">
              <span className="font-mono">Détail technique :</span>{' '}
              {loadError}
            </p>
          )}
        </div>
      </main>
    );
  }

  // loadState === 'ok'
  if (!demande) return null;

  const emailParent = demande.email_parent ?? '';

  // --- Soumission du formulaire ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!emailParent) {
      setSubmitError(
        "L'adresse e-mail du parent n’est pas renseignée dans la demande."
      );
      return;
    }

    if (!nomParent.trim() || !prenomParent.trim()) {
      setSubmitError('Merci de renseigner le nom et le prénom du parent.');
      return;
    }

    if (password.length < 8) {
      setSubmitError(
        'Le mot de passe doit comporter au moins 8 caractères.'
      );
      return;
    }

    if (password !== passwordConfirm) {
      setSubmitError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitState('submitting');

    try {
      // 1) Création du compte Supabase Auth
      const {
        data: signUpData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: emailParent,
        password,
        options: {
          data: {
            role: 'parent',
            nom_parent: nomParent,
            prenom_parent: prenomParent,
            telephone,
            autorisation_photo: agreePhoto,
            autorisation_video: agreeVideo,
          },
        },
      });

      if (signUpError) {
        console.error('Erreur signUp:', signUpError);
        setSubmitError(
          signUpError.message.includes('already registered')
            ? "Un compte existe déjà avec cette adresse e-mail. Vous pouvez vous connecter directement à l’espace membres."
            : signUpError.message
        );
        setSubmitState('error');
        return;
      }

      const user = signUpData.user;
      if (!user) {
        setSubmitError(
          "Impossible de récupérer le compte nouvellement créé. Merci de réessayer ou de contacter le bureau."
        );
        setSubmitState('error');
        return;
      }

      // 2) Création / mise à jour du profil (table public.profiles)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: `${prenomParent.trim()} ${nomParent.trim()}`,
        role: 'parent',
      });

      if (profileError) {
        console.error('Erreur création profil:', profileError);
        // On continue quand même, le compte existe déjà côté Auth
      }

      // 3) (optionnel) MAJ de la demande en "complete" / "compte-parent"
      // -> à adapter selon les valeurs autorisées dans ton CHECK statut
      try {
        await supabase
          .from('demandes_inscription')
          .update({ statut: 'complete' })
          .eq('id', demande.id);
      } catch (updateErr) {
        console.warn(
          'Impossible de mettre à jour le statut de la demande (non bloquant).',
          updateErr
        );
      }

      setSubmitState('success');

      // 4) Redirection vers le login avec pré-remplissage de l’email
      setTimeout(() => {
        const url = new URL('/login', window.location.origin);
        url.searchParams.set('from', '/adherent');
        url.searchParams.set('email', emailParent);
        router.push(url.toString());
      }, 1800);
    } catch (err: any) {
      console.error('Erreur inattendue:', err);
      setSubmitError(err.message ?? 'Erreur inconnue lors de la création.');
      setSubmitState('error');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/70 shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-8 md:p-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-pink-400 mb-2">
            Inscription Black Waves
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Créer votre compte parent
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Ce compte vous permettra d’accéder à l’espace parent&nbsp;:
            plannings, informations équipes, documents, suivi de l’inscription
            de votre enfant, etc.
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2 text-sm md:text-base">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Enfant concerné
            </p>
            <p className="font-semibold">
              {demande.prenom_enfant || 'Prénom ?'}{' '}
              {demande.nom_enfant || 'Nom ?'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Adresse e-mail utilisée
            </p>
            <p className="font-medium">
              {emailParent || 'Adresse non renseignée'}
            </p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div className="rounded-xl border border-red-500/70 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {submitError}
            </div>
          )}

          {submitState === 'success' && (
            <div className="rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Compte parent créé avec succès. Vous allez être redirigé vers la
              page de connexion… Pensez à surveiller vos e-mails (et vos spams)
              pour la suite du processus.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nom du parent
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                value={nomParent}
                onChange={(e) => setNomParent(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Prénom du parent
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                value={prenomParent}
                onChange={(e) => setPrenomParent(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Numéro de téléphone (optionnel)
            </label>
            <input
              type="tel"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="06..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirmation du mot de passe
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="space-y-2 text-xs md:text-sm text-slate-200">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePhoto}
                onChange={(e) => setAgreePhoto(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-pink-500 focus:ring-pink-500"
              />
            <span>
                J’autorise l’utilisation de photos de mon enfant dans le cadre
                de la communication du club (site, réseaux sociaux, affiches…).
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeVideo}
                onChange={(e) => setAgreeVideo(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-pink-500 focus:ring-pink-500"
              />
              <span>
                J’autorise l’utilisation de vidéos de mon enfant dans le cadre
                de la communication du club.
              </span>
            </label>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center rounded-full border border-slate-600/70 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/70 transition-colors"
              disabled={submitState === 'submitting'}
            >
              ← Annuler et revenir au site
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold shadow-lg shadow-pink-500/30 hover:bg-pink-400 transition-colors disabled:opacity-60"
              disabled={submitState === 'submitting'}
            >
              {submitState === 'submitting'
                ? 'Création du compte en cours…'
                : 'Créer mon compte parent'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
