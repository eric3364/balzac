import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Page de callback pour Supabase (email confirmation, magic link, recovery).
 * Elle échange le "code" présent dans l'URL contre une session, puis redirige.
 *
 * URL d'exemple :
 *   https://balzac.education/auth/callback#access_token=...&type=recovery
 *   https://balzac.education/auth/callback?code=... (nouveau flux PKCE)
 */
export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        // Vérifier s'il y a déjà une session active
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return navigate("/dashboard", { replace: true });

        // Depuis supabase-js v2, on utilise exchangeCodeForSession()
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          // Cas fréquents : lien expiré, déjà utilisé, domaine non autorisé
          toast({
            title: "Connexion impossible",
            description: error.message || "Le lien n'est plus valide.",
            variant: "destructive",
          });
          // Redirige vers la page d'auth
          navigate("/auth", { replace: true });
          return;
        }

        // Succès → rediriger vers le tableau de bord (ou autre)
        toast({
          title: "Connexion confirmée",
          description: "Bienvenue !",
        });
        navigate("/dashboard", { replace: true });
      } catch (e: any) {
        console.error("Callback error:", e);
        toast({
          title: "Erreur",
          description: "Un problème est survenu lors de la connexion.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
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
        {loading && <p className="text-sm text-muted-foreground mt-2">Merci de patienter.</p>}
      </div>
    </div>
  );
}