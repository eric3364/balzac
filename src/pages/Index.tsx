import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHomepageConfig } from '@/hooks/useHomepageConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Award, Users, CheckCircle, Star, ArrowRight, Shield } from 'lucide-react';

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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
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
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        {homepageAssets.bannerUrl && (
          <div className="absolute inset-0 z-0">
            <img 
              src={homepageAssets.bannerUrl} 
              alt={homepageAssets.bannerAlt}
              className="w-full h-full object-cover opacity-50"
            />
            {/* Overlay sombre pour améliorer le contraste */}
            <div className="absolute inset-0 bg-background/30"></div>
          </div>
        )}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground drop-shadow-lg">
              {homepageAssets.heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-foreground/90 mb-8 leading-relaxed font-medium drop-shadow-sm">
              {homepageAssets.heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-4" onClick={() => navigate('/auth')}>
                {homepageAssets.heroCta_primary}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                {homepageAssets.heroCta_secondary}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{homepageAssets.featuresTitle}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {homepageAssets.featuresDescription}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Tests adaptatifs</CardTitle>
                <CardDescription>
                  Des évaluations personnalisées qui s'adaptent à votre niveau pour un apprentissage optimal
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Certifications reconnues</CardTitle>
                <CardDescription>
                  Obtenez des certifications officielles valorisables dans votre parcours professionnel
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Communauté active</CardTitle>
                <CardDescription>
                  Rejoignez une communauté d'apprenants motivés et bénéficiez d'un accompagnement personnalisé
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{homepageAssets.stat1Number}</div>
              <p className="text-lg text-muted-foreground">{homepageAssets.stat1Label}</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{homepageAssets.stat2Number}</div>
              <p className="text-lg text-muted-foreground">{homepageAssets.stat2Label}</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{homepageAssets.stat3Number}</div>
              <p className="text-lg text-muted-foreground">{homepageAssets.stat3Label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ce que disent nos apprenants</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Marie Dubois",
                role: "Étudiante en commerce",
                content: "Grâce à Balzac Certification, j'ai pu valider mon niveau B2 et décrocher le stage de mes rêves !",
                rating: 5
              },
              {
                name: "Pierre Martin",
                role: "Professionnel",
                content: "Une plateforme exceptionnelle qui m'a permis de progresser rapidement en français professionnel.",
                rating: 5
              },
              {
                name: "Sofia Chen",
                role: "Étudiante internationale",
                content: "L'approche pédagogique est remarquable. Je recommande vivement cette certification.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {homepageAssets.ctaTitle}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {homepageAssets.ctaDescription}
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-4" onClick={() => navigate('/auth')}>
            {homepageAssets.ctaButton}
            <CheckCircle className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-semibold">Balzac Certification</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Balzac Certification. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
