import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Award, Users, CheckCircle, Star, ArrowRight, Shield, Sparkles, TrendingUp, Target, Zap, Clock, Brain } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { config: homepageAssets } = useHomepageConfig();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get('preview') === 'true';

  // Redirect authenticated users to dashboard, except in preview mode
  useEffect(() => {
    if (!loading && user && !previewMode) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, previewMode]);

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
                 minHeight: '80vh'
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
        
        <div className="relative z-10 container mx-auto px-4 py-32 text-center">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              Plateforme certifiée et reconnue
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-foreground animate-fade-in bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
                style={{ animationDelay: '0.2s' }}>
              {homepageAssets.heroTitle}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed font-medium max-w-3xl mx-auto animate-fade-in"
               style={{ animationDelay: '0.4s' }}>
              {homepageAssets.heroDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in"
                 style={{ animationDelay: '0.6s' }}>
              <Button size="lg" 
                      className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl" 
                      onClick={() => navigate('/auth')}>
                <Zap className="mr-2 h-5 w-5" />
                {homepageAssets.heroCta_primary}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" 
                      variant="outline" 
                      className="text-lg px-10 py-6 border-2 hover:bg-primary/5 transform hover:scale-105 transition-all duration-300">
                <BookOpen className="mr-2 h-5 w-5" />
                {homepageAssets.heroCta_secondary}
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <p className="text-sm text-muted-foreground mb-6">Déjà choisi par plus de 10 000 apprenants</p>
              <div className="flex justify-center items-center gap-8 opacity-60">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">4.9/5</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Certifié</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">100% Sécurisé</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)/0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(var(--primary)/0.05) 0%, transparent 50%)'
        }}></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Target className="h-4 w-4" />
              Nos avantages
            </div>
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
      <section className="py-24 relative overflow-hidden">
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

      {/* Testimonials */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              Témoignages
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ce que disent nos apprenants</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Découvrez l'expérience de ceux qui nous font confiance
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Marie Dubois",
                role: "Étudiante en commerce",
                content: "Grâce à Balzac Certification, j'ai pu valider mon niveau B2 et décrocher le stage de mes rêves ! La plateforme est intuitive et les résultats sont impressionnants.",
                rating: 5,
                avatar: "🎓"
              },
              {
                name: "Pierre Martin",
                role: "Professionnel RH",
                content: "Une plateforme exceptionnelle qui m'a permis de progresser rapidement en français professionnel. Les certifications sont reconnues par mon entreprise.",
                rating: 5,
                avatar: "👔"
              },
              {
                name: "Sofia Chen",
                role: "Étudiante internationale",
                content: "L'approche pédagogique est remarquable. Les tests adaptatifs m'ont permis d'identifier mes lacunes et de progresser efficacement. Je recommande vivement !",
                rating: 5,
                avatar: "🌟"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-2xl mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/10 to-blue-500/10"></div>
        
        {/* Animated background elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Commencez dès maintenant
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {homepageAssets.ctaTitle}
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {homepageAssets.ctaDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button size="lg" 
                      variant="secondary" 
                      className="text-lg px-10 py-6 bg-white text-primary hover:bg-white/90 transform hover:scale-105 transition-all duration-300 shadow-lg" 
                      onClick={() => navigate('/auth')}>
                <Zap className="mr-2 h-5 w-5" />
                {homepageAssets.ctaButton}
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" 
                      variant="outline" 
                      className="text-lg px-10 py-6 border-2 border-white/30 text-white hover:bg-white/10 transform hover:scale-105 transition-all duration-300">
                <BookOpen className="mr-2 h-5 w-5" />
                En savoir plus
              </Button>
            </div>
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
                <span className="font-bold text-lg">Balzac Certification</span>
                <p className="text-sm text-muted-foreground">Excellence en français</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground mb-2">
                © 2024 Balzac Certification. Tous droits réservés.
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
    </div>
  );
};

export default Index;
