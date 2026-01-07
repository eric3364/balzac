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
        const current = new URL(window.location.href);
        
        // Erreur éventuelle déjà dans l'URL
        const urlError = getErrorFromUrl(current);
        if (urlError) {
          toast({ title: "Connexion impossible", description: urlError, variant: "destructive" });
          navigate(DEST_AUTH_PAGE, { replace: true });
          return;
        }

        const type = getTypeFromUrl(current);
        const hasCode = current.searchParams.has("code");
        const hash = current.hash;
        
        // Pour le flow de recovery, Supabase met les tokens dans le hash
        // Format: #access_token=...&type=recovery
        if (hash && hash.includes("access_token")) {
          // Laisser Supabase gérer automatiquement le hash via onAuthStateChange
          // Attendre que la session soit établie
          let attempts = 0;
          const maxAttempts = 20;
          
          while (attempts < maxAttempts && !cancelled) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              if (type === "recovery") {
                toast({ title: "Lien confirmé", description: "Définis ton nouveau mot de passe." });
                navigate(DEST_RESET_PASS, { replace: true });
              } else {
                toast({ title: "Connexion confirmée", description: "Bienvenue !" });
                navigate(DEST_AFTER_AUTH, { replace: true });
              }
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
          }
          
          // Si toujours pas de session après les tentatives
          toast({
            title: "Connexion incomplète",
            description: "Le lien a peut-être expiré. Réessaie.",
            variant: "destructive",
          });
          navigate(DEST_AUTH_PAGE, { replace: true });
          return;
        }

        // Pour les flows avec code (email confirmation, magic link)
        if (hasCode) {
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

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast({
              title: "Connexion incomplète",
              description: "Impossible de créer la session.",
              variant: "destructive",
            });
            navigate(DEST_AUTH_PAGE, { replace: true });
            return;
          }

          if (type === "recovery") {
            toast({ title: "Lien confirmé", description: "Définis ton nouveau mot de passe." });
            navigate(DEST_RESET_PASS, { replace: true });
          } else {
            toast({ title: "Connexion confirmée", description: "Bienvenue !" });
            navigate(DEST_AFTER_AUTH, { replace: true });
          }
          return;
        }

        // Aucun code ni hash - vérifier si déjà connecté
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (existing) {
          navigate(DEST_AFTER_AUTH, { replace: true });
          return;
        }

        // Sinon rediriger vers auth
        navigate(DEST_AUTH_PAGE, { replace: true });
        
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