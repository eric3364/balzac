import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { SiteFooter } from '@/components/SiteFooter';
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
  custom_badge_url?: string;
  is_active: boolean;
  feature_1_text?: string;
  feature_2_text?: string;
  feature_3_text?: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { config: homepageAssets } = useHomepageConfig();
  
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
            custom_badge_url,
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
          custom_badge_url: item.custom_badge_url,
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
    // Rediriger directement vers la page de paiement (avec ou sans utilisateur connecté)
    navigate(`/payment?level=${certification.level_number}`);
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {homepageAssets.logoUrl ? (
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                <img 
                  src={homepageAssets.logoUrl} 
                  alt="Logo Balzac Certification" 
                  className="h-8 w-8 object-contain"
                />
              </div>
            ) : (
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold gradient-text">{homepageAssets.siteTitle}</h1>
              <p className="text-sm text-muted-foreground font-medium">{homepageAssets.siteSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="hover:bg-primary/10 hover:text-primary transition-all duration-300" onClick={() => navigate('/auth')}>
              Connexion
            </Button>
            <Button variant="outline" className="hover:bg-primary/10 hover:text-primary transition-all duration-300" onClick={() => navigate('/admin-auth')}>
              <Shield className="mr-2 h-4 w-4" />
              Administration
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 lg:py-12">
        {homepageAssets.bannerUrl && (
          <div className="absolute inset-0 z-0">
            <img 
              src={homepageAssets.bannerUrl} 
              alt={homepageAssets.bannerAlt}
              className="w-full h-full object-cover"
              style={{ opacity: (homepageAssets.bannerOpacity || 100) / 100 }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-background/40 to-background/60"></div>
          </div>
        )}
        
        {/* Dynamic Background - only if no banner */}
        {!homepageAssets.bannerUrl && (
          <div className="absolute inset-0">
            <div 
              className="w-full h-full opacity-60"
              style={{ background: 'var(--gradient-hero)' }}
            ></div>
          </div>
        )}
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden z-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-500/8 rounded-full blur-2xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-pink-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-6xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4 animate-fade-in">
              <Sparkles className="h-5 w-5" style={{ color: homepageAssets.heroBadgeColor }} />
              <span className="text-sm font-semibold" style={{ color: homepageAssets.heroBadgeColor }}>Plateforme de certification nouvelle génération</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-none animate-fade-in"
                style={{ 
                  animationDelay: '0.2s',
                  color: homepageAssets.heroTitleColor 
                }}>
              <span>{homepageAssets.heroTitle}</span>
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl mb-6 leading-relaxed font-medium max-w-4xl mx-auto animate-fade-in"
               style={{ 
                 animationDelay: '0.4s',
                 color: homepageAssets.heroDescriptionColor 
               }}>
              {homepageAssets.heroDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="default" 
                className="px-6 py-3 hero-glow hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/auth?tab=signup')}
              >
                <Star className="mr-2 h-5 w-5" />
                Commencer maintenant
              </Button>
              <Button 
                variant="outline" 
                size="default" 
                className="px-6 py-3 bg-background/50 backdrop-blur-sm hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/pricing')}
              >
                Voir les tarifs
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6"
                style={{ color: homepageAssets.featuresTitleColor }}>
              {homepageAssets.featuresTitle}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {homepageAssets.featuresDescription}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="group card-elegant hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-105">
              <CardHeader className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg mb-2 gradient-text">{homepageAssets.feature1Title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-muted-foreground">
                  {homepageAssets.feature1Description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group card-elegant hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-105">
              <CardHeader className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle className="text-lg mb-2 gradient-text">{homepageAssets.feature2Title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-muted-foreground">
                  {homepageAssets.feature2Description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group card-elegant hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-105">
              <CardHeader className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg mb-2 gradient-text">{homepageAssets.feature3Title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-muted-foreground">
                  {homepageAssets.feature3Description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group card-elegant hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-105">
              <CardHeader className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg mb-2 gradient-text">{homepageAssets.feature4Title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-muted-foreground">
                  {homepageAssets.feature4Description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group card-elegant hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-105">
              <CardHeader className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Users className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-lg mb-2 gradient-text">{homepageAssets.feature5Title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-muted-foreground">
                  {homepageAssets.feature5Description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group card-elegant hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-105">
              <CardHeader className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Sparkles className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle className="text-lg mb-2 gradient-text">{homepageAssets.feature6Title}</CardTitle>
                <CardDescription className="text-sm leading-snug text-muted-foreground">
                  {homepageAssets.feature6Description}
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: homepageAssets.statsTitleColor }}>
              {homepageAssets.statsTitle}
            </h2>
            <p className="text-xl text-muted-foreground">{homepageAssets.statsDescription}</p>
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
                       {/* Level Icon or Custom Badge */}
                        <div className="w-36 h-36 mx-auto mb-4 rounded-full flex items-center justify-center overflow-hidden">
                          {cert.custom_badge_url ? (
                            <img 
                              src={cert.custom_badge_url} 
                              alt={`Badge ${cert.level_name}`}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <div 
                              className="w-full h-full rounded-full flex items-center justify-center"
                              style={{ backgroundColor: cert.badge_background_color || '#ffffff' }}
                            >
                              {(() => {
                                const IconComponent = getIconComponent(cert.badge_icon);
                                return (
                                  <IconComponent 
                                    className="h-18 w-18" 
                                    style={{ color: cert.badge_color || '#6366f1' }}
                                  />
                                );
                              })()}
                            </div>
                          )}
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
                              onClick={() => isFree ? navigate('/auth') : navigate(`/payment?level=${cert.level_number}`)}
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
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6"
                style={{ color: homepageAssets.ctaTitleColor }}>
              {homepageAssets.ctaTitle}
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {homepageAssets.ctaSubDescription}
            </p>
            
          </div>
        </div>
      </section>

      {/* Site Footer */}
      <SiteFooter />

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
