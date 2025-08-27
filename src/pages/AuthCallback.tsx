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

const DEST_AFTER_AUTH = "/app";
const DEST_RESET_PASS = "/reset-password";
const DEST_AUTH_PAGE  = "/auth";

function getTypeFromUrl(u: URL): string | null {
  // Supabase peut mettre "type" soit dans la query, soit dans le hash
  const fromQuery = u.searchParams.get("type");
  if (fromQuery) return fromQuery;
  const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
  return hash.get("type");
}

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Si une session existe déjà, on file vers l'app
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate(DEST_AFTER_AUTH, { replace: true });
          return;
        }

        // 2) Échanger l'URL (hash ou query) contre une session (supabase-js v2)
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          // Cas fréquents : lien expiré / déjà utilisé / domaine non autorisé
          toast({
            title: "Connexion impossible",
            description: error.message || "Le lien n'est plus valide.",
            variant: "destructive",
          });
          navigate(DEST_AUTH_PAGE, { replace: true });
          return;
        }

        // 3) Choisir la destination selon le type de flux
        const url = new URL(window.location.href);
        const type = getTypeFromUrl(url);

        if (type === "recovery") {
          // Lien de réinitialisation : on envoie sur la page reset
          toast({
            title: "Lien confirmé",
            description: "Veuillez définir votre nouveau mot de passe.",
          });
          navigate(DEST_RESET_PASS, { replace: true });
        } else {
          // Confirmation email / magic link / signin classique
          toast({
            title: "Connexion confirmée",
            description: "Bienvenue !",
          });
          navigate(DEST_AFTER_AUTH, { replace: true });
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
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">Validation en cours…</p>
        {loading && (
          <p className="text-sm text-muted-foreground mt-2">
            Merci de patienter.
          </p>
        )}
      </div>
    </div>
  );
}
