import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { useFooterConfig } from '@/hooks/useFooterConfig';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { usePendingPurchase } from '@/hooks/usePendingPurchase';
import { useToast } from '@/components/ui/use-toast';
import { BookOpen, Award, Users, CheckCircle, Star, ArrowRight, Shield, Sparkles, TrendingUp, Target, Zap, Clock, Brain, Crown, Trophy, ShoppingCart } from 'lucide-react';

interface CertificationPricing {
  id: string;
  name: string;
  price_euros: number;
  free_sessions: number;
  level_number: number;
  level_name: string;
  level_color: string;
  badge_icon: string;
  badge_color: string;
  badge_background_color: string;
  is_active: boolean;
  feature_1_text?: string;
  feature_2_text?: string;
  feature_3_text?: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { config: homepageAssets } = useHomepageConfig();
  const { config: footerConfig } = useFooterConfig();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get('preview') === 'true';
  const [certificationPricing, setCertificationPricing] = useState<CertificationPricing[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [selectedCertification, setSelectedCertification] = useState<CertificationPricing | null>(null);
  const { pendingPurchase, clearPendingPurchase } = usePendingPurchase();
  const { toast } = useToast();

  // Load certification pricing data
  useEffect(() => {
    const fetchCertificationPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('certificate_templates')
          .select(`
            id,
            name,
            price_euros,
            free_sessions,
            is_active,
            badge_icon,
            badge_color,
            badge_background_color,
            feature_1_text,
            feature_2_text,
            feature_3_text,
            difficulty_levels!inner(
              level_number,
              name,
              color
            )
          `)
          .eq('is_active', true);

        if (error) throw error;

        // Trier les données côté client par level_number
        const sortedData = (data || []).sort((a: any, b: any) => 
          a.difficulty_levels.level_number - b.difficulty_levels.level_number
        );

        const formattedData = sortedData.map((item: any) => ({
          id: item.id,
          name: item.name,
          price_euros: item.price_euros,
          free_sessions: item.free_sessions,
          level_number: item.difficulty_levels.level_number,
          level_name: item.difficulty_levels.name,
          level_color: item.difficulty_levels.color,
          badge_icon: item.badge_icon,
          badge_color: item.badge_color,
          badge_background_color: item.badge_background_color,
          is_active: item.is_active,
          feature_1_text: item.feature_1_text,
          feature_2_text: item.feature_2_text,
          feature_3_text: item.feature_3_text
        }));

        setCertificationPricing(formattedData);
      } catch (error) {
        console.error('Erreur lors du chargement des tarifs:', error);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchCertificationPricing();
  }, []);

  // Redirect authenticated users to dashboard, except in preview mode
  useEffect(() => {
    if (!loading && user && !previewMode) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, previewMode]);

  // Gérer l'achat en attente après connexion
  useEffect(() => {
    if (pendingPurchase && user) {
      setSelectedCertification(pendingPurchase as CertificationPricing);
    }
  }, [pendingPurchase, user]);

  // Function to get icon component from badge_icon name
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'award': return Award;
      case 'star': return Star;
      case 'trophy': return Trophy;
      case 'shield': return Shield;
      case 'crown': return Crown;
      case 'target': return Target;
      case 'zap': return Zap;
      case 'brain': return Brain;
      default: return Award;
    }
  };

  const handlePurchase = (certification: CertificationPricing) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour effectuer un achat.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    setSelectedCertification(certification);
  };

  const confirmPurchase = async (level: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { level }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirection vers le paiement",
          description: "Vous avez été redirigé vers Stripe pour finaliser votre achat.",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création du paiement.",
        variant: "destructive"
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Chargement...</h1>
          <p className="text-muted-foreground">Balzac Certification</p>
        </div>
      </div>
    );
  }

  if (user && !previewMode) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 shadow-sm"
               style={{
                 background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)'
               }}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {homepageAssets.logoUrl ? (
              <img 
                src={homepageAssets.logoUrl} 
                alt="Logo Balzac Certification" 
                className="h-8 w-8 object-contain"
              />
            ) : (
              <BookOpen className="h-8 w-8 text-primary" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-primary">{homepageAssets.siteTitle}</h1>
              <p className="text-sm text-muted-foreground">{homepageAssets.siteSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin-auth')}>
              <Shield className="mr-2 h-4 w-4" />
              Administration
            </Button>
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Connexion
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Commencer
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, hsl(var(--primary)/0.1) 0%, hsl(var(--primary)/0.05) 50%, transparent 100%)',
                 minHeight: '10vh'
               }}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {homepageAssets.bannerUrl && (
          <div className="absolute inset-0 z-0">
            <img 
              src={homepageAssets.bannerUrl} 
              alt={homepageAssets.bannerAlt}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/20 to-background/60"></div>
          </div>
        )}
        
        <div className="relative z-10 container mx-auto px-4 py-8 text-center">
          <div className="max-w-5xl mx-auto">
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-foreground animate-fade-in bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
                style={{ animationDelay: '0.2s' }}>
              {homepageAssets.heroTitle}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed font-medium max-w-3xl mx-auto animate-fade-in"
               style={{ animationDelay: '0.4s' }}>
              {homepageAssets.heroDescription}
            </p>
            

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)/0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(var(--primary)/0.05) 0%, transparent 50%)'
        }}></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {homepageAssets.featuresTitle}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {homepageAssets.featuresDescription}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Brain className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl mb-4">Tests adaptatifs intelligents</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Des évaluations personnalisées qui s'adaptent à votre niveau avec l'IA pour un apprentissage optimal et progressif
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl mb-4">Certifications reconnues</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Obtenez des certifications officielles valorisables dans votre parcours professionnel et académique
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl mb-4">Progression en temps réel</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Suivez vos progrès avec des tableaux de bord détaillés et des statistiques personnalisées
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl mb-4">Apprentissage flexible</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Apprenez à votre rythme, où que vous soyez, avec un accès 24h/24 à tous nos contenus
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl mb-4">Communauté active</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Rejoignez une communauté d'apprenants motivés et bénéficiez d'un accompagnement personnalisé
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl mb-4">Excellence garantie</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Méthodes pédagogiques éprouvées basées sur les dernières recherches en sciences cognitives
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos résultats parlent d'eux-mêmes</h2>
            <p className="text-xl text-muted-foreground">Des chiffres qui témoignent de notre excellence</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="group">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                  {homepageAssets.stat1Number}
                </div>
                <p className="text-lg font-semibold text-muted-foreground">{homepageAssets.stat1Label}</p>
              </div>
            </div>
            <div className="group">
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                  {homepageAssets.stat2Number}
                </div>
                <p className="text-lg font-semibold text-muted-foreground">{homepageAssets.stat2Label}</p>
              </div>
            </div>
            <div className="group">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                  {homepageAssets.stat3Number}
                </div>
                <p className="text-lg font-semibold text-muted-foreground">{homepageAssets.stat3Label}</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Preview Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                Nos Certifications
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Progressez niveau par niveau et obtenez vos certifications officielles
            </p>
          </div>
          
          {loadingPricing ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
                {certificationPricing.map((cert) => {
                  const isFree = cert.price_euros === 0;
                  return (
                     <Card key={cert.id} className={`relative p-4 text-center border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-48 flex-shrink-0 ${
                       isFree 
                         ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' 
                         : 'border-primary/20 bg-gradient-to-br from-background to-background/50'
                     }`}>
                       {/* Badge */}
                       <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                         {isFree && (
                           <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold">
                             GRATUIT
                           </Badge>
                         )}
                       </div>

                      <CardContent className="pt-2 px-2 pb-3">
                        {/* Level Icon */}
                        <div 
                          className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: cert.badge_background_color || '#ffffff' }}
                        >
                          {(() => {
                            const IconComponent = getIconComponent(cert.badge_icon);
                            return (
                              <IconComponent 
                                className="h-6 w-6" 
                                style={{ color: cert.badge_color || '#6366f1' }}
                              />
                            );
                          })()}
                        </div>

                        {/* Level Name */}
                        <h3 className="text-lg font-bold mb-2">{cert.level_name}</h3>
                        
                        {/* Price */}
                        <div className="mb-4">
                          {isFree ? (
                            <div className="text-2xl font-bold text-green-600">Gratuit</div>
                          ) : (
                            <div className="text-2xl font-bold text-primary">{cert.price_euros}€</div>
                          )}
                        </div>

                         {/* Features */}
                         <div className="space-y-2 text-sm text-left">
                           {cert.feature_1_text && (
                             <div className="flex items-center gap-2">
                               {isFree ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Zap className="h-4 w-4 text-primary" />}
                               <span>{cert.feature_1_text}</span>
                             </div>
                           )}
                           {cert.feature_2_text && (
                             <div className="flex items-center gap-2">
                               <CheckCircle className="h-4 w-4 text-primary" />
                               <span>{cert.feature_2_text}</span>
                             </div>
                           )}
                           {cert.feature_3_text && (
                             <div className="flex items-center gap-2">
                               {isFree ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Award className="h-4 w-4 text-primary" />}
                               <span>{cert.feature_3_text}</span>
                             </div>
                           )}
                          </div>

                          {/* Purchase Button */}
                          <div className="mt-4 pt-3 border-t border-border/50">
                            <Button
                              size="sm"
                              className="w-full"
                              variant={isFree ? "secondary" : "default"}
                              onClick={() => isFree ? navigate('/auth') : handlePurchase(cert)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              {isFree ? "Commencer gratuitement" : `Acheter ${cert.price_euros}€`}
                            </Button>
                          </div>
                       </CardContent>
                     </Card>
                  );
                })}
              </div>

              {certificationPricing.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucune certification disponible pour le moment.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/10 to-blue-500/10"></div>
        
        {/* Animated background elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              {homepageAssets.ctaBadge}
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {homepageAssets.ctaTitle}
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {homepageAssets.ctaSubDescription}
            </p>
            
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-br from-background to-muted/10">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg">{footerConfig.company_name}</span>
                <p className="text-sm text-muted-foreground">Excellence en français</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground mb-2">
                {footerConfig.copyright_text}
              </p>
              <div className="flex items-center justify-center md:justify-end gap-4 text-xs text-muted-foreground">
                <span>🔒 100% Sécurisé</span>
                <span>⚡ Support 24/7</span>
                <span>🎯 Certifié</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Flow */}
      {selectedCertification && (
        <CheckoutFlow
          open={selectedCertification !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCertification(null);
              clearPendingPurchase();
            }
          }}
          certification={{
            id: selectedCertification.id,
            name: selectedCertification.name,
            price_euros: selectedCertification.price_euros,
            level_number: selectedCertification.level_number
          }}
        />
      )}
    </div>
  );
};

export default Index;
