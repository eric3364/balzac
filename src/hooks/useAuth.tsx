import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, school: string, className: string, city?: string, promoCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id || 'no user');
        
        // Gestion spéciale des événements
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          console.log('Session refreshed/signed in, updating state');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Vérifier si c'est la première connexion d'un apprenant ou un admin qui doit changer son mot de passe
        // Ne pas rediriger si on est en mode recovery (réinitialisation de mot de passe)
        const currentUrl = window.location.href;
        const isRecoveryFlow = currentUrl.includes('type=recovery') || currentUrl.includes('recovery');
        
        if (session?.user && event === 'SIGNED_IN' && !isRecoveryFlow) {
          setTimeout(async () => {
            try {
              // Vérifier si l'utilisateur doit changer son mot de passe (administrateur)
              if (session.user.user_metadata?.force_password_change === true) {
                window.location.href = '/force-password-change';
                return;
              }

              // Vérifier si c'est un apprenant inactif
              const { data: userData, error } = await supabase
                .from('users')
                .select('is_active, user_id')
                .eq('user_id', session.user.id)
                .single();
              
              if (!error && userData && !userData.is_active) {
                // Rediriger vers la page de définition de mot de passe
                window.location.href = '/set-password';
                return;
              }
            } catch (error) {
              console.error('Erreur lors de la vérification du statut utilisateur:', error);
            }
          }, 100);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
        } else {
          console.log('Initial session check:', session?.user?.id || 'no session');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, school: string, className: string, city: string = '', promoCode?: string) => {
    try {
      // Validation basique de format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Erreur d'inscription",
          description: "Mail incorrect, merci de ressaisir vos coordonnées",
          variant: "destructive"
        });
        return { error: { message: "Invalid email format" } };
      }

      // Validation des domaines email courants mal tapés
      const commonDomainTypos: Record<string, string> = {
        'gmil.com': 'gmail.com',
        'gmai.com': 'gmail.com',
        'gma.com': 'gmail.com',
        'gmail.co': 'gmail.com',
        'gmai.fr': 'gmail.fr',
        'gmil.fr': 'gmail.fr',
        'gmail.f': 'gmail.fr',
        'yahoo.co': 'yahoo.com',
        'yahoo.f': 'yahoo.fr',
        'hotmil.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com',
        'hotmil.fr': 'hotmail.fr',
        'hotmai.fr': 'hotmail.fr',
        'outloo.com': 'outlook.com',
        'outlok.com': 'outlook.com',
        'outloo.fr': 'outlook.fr',
        'outlok.fr': 'outlook.fr',
        'nextu.fr': 'next-u.fr',
        'next-u.f': 'next-u.fr',
        'next-u.com': 'next-u.fr',
        'nex-u.fr': 'next-u.fr',
        'next-fr.fr': 'next-u.fr',
        'nextfr.fr': 'next-u.fr'
      };
      
      const emailDomain = email.split('@')[1]?.toLowerCase();
      console.log('Email domain:', emailDomain); // Debug
      if (emailDomain && commonDomainTypos[emailDomain]) {
        console.log('Found typo in domain:', emailDomain); // Debug
        toast({
          title: "Erreur d'inscription",
          description: "Mail incorrect, merci de ressaisir vos coordonnées",
          variant: "destructive"
        });
        return { error: { message: "Invalid email domain" } };
      }
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            school: school,
            class_name: className,
            city: city,
            promo_code: promoCode || null
          }
        }
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        let displayMessage = error.message;
        
        // Détection des erreurs de rate limit
        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          displayMessage = "Trop de tentatives, veuillez patienter quelques minutes";
          
          // Afficher le message de confirmation même en cas de rate limit
          // car l'utilisateur pourrait avoir été créé
          toast({
            title: "Email de confirmation",
            description: "Si votre compte a été créé, un email de validation vous a été envoyé",
          });
        }
        // Détection des erreurs d'email invalide
        else if (errorMessage.includes('invalid') && errorMessage.includes('email') ||
            errorMessage.includes('invalid email') ||
            errorMessage.includes('email format') ||
            errorMessage.includes('valid email') ||
            errorMessage.includes('malformed email')) {
          displayMessage = "Mail incorrect, merci de ressaisir vos coordonnées";
        }
        
        toast({
          title: "Erreur d'inscription",
          description: displayMessage,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Inscription réussie",
        description: "Un email de validation vous a été envoyé, merci de le valider",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur Balzac Certification !"
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Tentative de déconnexion...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        
        // Si la session n'existe pas, c'est que l'utilisateur est déjà déconnecté
        // On nettoie l'état local et on redirige sans afficher d'erreur
        if (error.message?.toLowerCase().includes('session') || 
            error.code === 'session_not_found' ||
            error.status === 403) {
          console.log('Session déjà expirée, nettoyage de l\'état local');
          setSession(null);
          setUser(null);
          toast({
            title: "Déconnexion",
            description: "À bientôt sur Balzac Certification !"
          });
          return;
        }
        
        toast({
          title: "Erreur de déconnexion",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      console.log('Déconnexion réussie');
      toast({
        title: "Déconnexion",
        description: "À bientôt sur Balzac Certification !"
      });
    } catch (error: any) {
      console.error('Erreur catch lors de la déconnexion:', error);
      
      // Même en cas d'erreur, nettoyer l'état local
      setSession(null);
      setUser(null);
      
      toast({
        title: "Déconnexion",
        description: "À bientôt sur Balzac Certification !"
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      
      if (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }
      
      toast({
        title: "Email envoyé",
        description: "Un email de réinitialisation a été envoyé !"
      });
      return { error: null };
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      });
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};