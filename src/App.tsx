import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Page de callback pour Supabase (email confirmation, magic link, recovery).
 * Elle échange le "code" présent dans l'URL contre une session, puis redirige.
 *
 * Exemples d'URL :
 *   https://balzac.education/auth/callback#access_token=...&type=recovery
 *   https://balzac.education/auth/callback?code=...&type=signup
 */

// ✅ aligne avec tes routes réelles
const DEST_AFTER_AUTH = "/dashboard";
const DEST_RESET_PASS = "/auth?type=recovery";
const DEST_AUTH_PAGE  = "/auth";

function getTypeFromUrl(u: URL): string | null {
  const fromQuery = u.searchParams.get("type");
  if (fromQuery) return fromQuery;
  const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
  return hash.get("type");
}

function getErrorFromUrl(u: URL): string | null {
  const fromQuery = u.searchParams.get("error_description");
  if (fromQuery) return fromQuery;
  const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
  return hash.get("error_description");
}

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Erreur éventuelle déjà dans l'URL
        const current = new URL(window.location.href);
        const urlError = getErrorFromUrl(current);
        if (urlError) {
          toast({ title: "Connexion impossible", description: urlError, variant: "destructive" });
          navigate(DEST_AUTH_PAGE, { replace: true });
          return;
        }

        // Déjà connecté ?
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (existing) {
          navigate(DEST_AFTER_AUTH, { replace: true });
          return;
        }

        // Échanger l'URL contre une session
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          toast({
            title: "Connexion impossible",
            description: error.message || "Le lien n'est plus valide.",
            variant: "destructive",
          });
          navigate(DEST_AUTH_PAGE, { replace: true });
          return;
        }

        // Double check : session bien créée
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Connexion incomplète",
            description: "Impossible de créer la session. Réessaie depuis la page d’authentification.",
            variant: "destructive",
          });
          navigate(DEST_AUTH_PAGE, { replace: true });
          return;
        }

        // Routing selon le flow
        const type = getTypeFromUrl(new URL(window.location.href));
        if (type === "recovery") {
          toast({ title: "Lien confirmé", description: "Définis ton nouveau mot de passe." });
          navigate(DEST_RESET_PASS, { replace: true }); // -> /auth?type=recovery
        } else {
          toast({ title: "Connexion confirmée", description: "Bienvenue !" });
          navigate(DEST_AFTER_AUTH, { replace: true }); // -> /dashboard
        }
      } catch (e: any) {
        console.error("Auth callback error:", e);
        toast({
          title: "Erreur",
          description: "Un problème est survenu lors de la connexion.",
          variant: "destructive",
        });
        navigate(DEST_AUTH_PAGE, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">Validation en cours…</p>
        {loading && <p className="text-sm text-muted-foreground mt-2">Merci de patienter.</p>}
      </div>
    </div>
  );
}
