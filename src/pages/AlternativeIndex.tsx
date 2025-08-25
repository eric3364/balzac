import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Award, Users, Clock, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHomepageConfig } from "@/hooks/useHomepageConfig";
import { CheckoutFlow } from "@/components/CheckoutFlow";

interface CertificationPricing {
  id: string;
  name: string;
  price: number;
  features: string[];
  level: number;
  level_name: string;
  icon: string;
  description: string;
  session_count: number;
  is_active: boolean;
}

const AlternativeIndex = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { config } = useHomepageConfig();
  const configLoading = false;
  const [certifications, setCertifications] = useState<CertificationPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertifications, setSelectedCertifications] = useState<number[]>([]);

  const isPreview = location.search.includes('preview=true');

  useEffect(() => {
    if (!authLoading && user && !isPreview) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, isPreview]);

  useEffect(() => {
    const fetchCertifications = async () => {
      try {
        const { data, error } = await supabase
          .from('certificate_templates')
          .select(`
            *,
            difficulty_levels!inner(
              level_number,
              name
            )
          `)
          .eq('is_active', true)
          .order('difficulty_level_id', { ascending: true });
        
        if (error) throw error;
        
        const formattedData = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price_euros || 0,
          features: [
            item.feature_1_text || 'Formation complète',
            item.feature_2_text || 'Certification officielle',
            item.feature_3_text || 'Support personnalisé'
          ].filter(Boolean),
          level: item.difficulty_levels.level_number,
          level_name: item.difficulty_levels.name,
          icon: item.badge_icon || 'award',
          description: item.description || 'Description par défaut',
          session_count: item.free_sessions || 3,
          is_active: item.is_active
        }));
        
        setCertifications(formattedData);
      } catch (error) {
        console.error('Error fetching certifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertifications();
  }, []);

  const handlePurchase = (certification: CertificationPricing) => {
    navigate('/payment', { 
      state: { 
        certification,
        selectedCertifications: [certification.level]
      }
    });
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (user && !isPreview) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                 {config.siteTitle}
              </h1>
              <p className="text-xs text-muted-foreground">Certification d'Excellence</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Connexion
            </Button>
            <Button onClick={() => navigate('/admin-auth')} variant="outline" size="sm">
              Administration
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Version Alternative */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Nouvelle expérience de certification</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                {config.heroTitle}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {config.heroDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button size="lg" className="px-8 py-6 text-lg" onClick={() => navigate('/auth')}>
                Commencer maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
                Découvrir les certifications
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">1000+</div>
              <div className="text-muted-foreground">Étudiants certifiés</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
              <div className="text-muted-foreground">Taux de réussite</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
              <div className="text-muted-foreground">Support disponible</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">5★</div>
              <div className="text-muted-foreground">Note moyenne</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Pourquoi choisir 
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Balzac Education</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une approche innovante pour votre certification professionnelle
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Formation Progressive</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  Un parcours structuré avec des sessions d'entraînement adaptées à votre niveau
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-secondary/5">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Certification Reconnue</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  Obtenez une certification officiellement reconnue par les professionnels du secteur
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Suivi Personnalisé</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  Bénéficiez d'un accompagnement sur mesure tout au long de votre parcours
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Nos <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Certifications</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choisissez le niveau qui correspond à vos objectifs professionnels
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {certifications.slice(0, 3).map((cert, index) => (
                <Card key={cert.id} className={`relative overflow-hidden group hover:shadow-2xl transition-all duration-300 ${index === 1 ? 'border-2 border-primary scale-105' : 'hover:scale-105'}`}>
                  {index === 1 && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-secondary text-white text-center py-2 text-sm font-medium">
                      ⭐ Le plus populaire
                    </div>
                  )}
                  <CardHeader className={index === 1 ? 'pt-12' : ''}>
                    <div className="flex items-center justify-between">
                      <Badge variant={index === 1 ? 'default' : 'secondary'}>
                        Niveau {cert.level}
                      </Badge>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{cert.price}€</div>
                        <div className="text-sm text-muted-foreground">par niveau</div>
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{cert.name}</CardTitle>
                    <CardDescription className="text-base">{cert.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{cert.session_count} sessions d'entraînement</span>
                    </div>
                    <div className="space-y-2">
                      {cert.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button 
                      className="w-full" 
                      variant={index === 1 ? 'default' : 'outline'}
                      onClick={() => handlePurchase(cert)}
                    >
                      Commencer cette certification
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" onClick={() => navigate('/pricing')}>
              Voir toutes les certifications
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8 text-white">
            <h2 className="text-4xl md:text-5xl font-bold">
              Prêt à transformer votre carrière ?
            </h2>
            <p className="text-xl opacity-90">
              Rejoignez des milliers de professionnels qui ont déjà obtenu leur certification Balzac
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="px-8 py-6 text-lg" onClick={() => navigate('/auth')}>
                Commencer gratuitement
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-white text-white hover:bg-white hover:text-primary">
                Nous contacter
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">{config.siteTitle}</span>
              </div>
              <p className="text-muted-foreground text-sm">
                La plateforme de référence pour vos certifications professionnelles
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Formation</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Nos certifications</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Méthode d'apprentissage</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Témoignages</a></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Carrières</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Conditions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 {config.siteTitle}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Checkout Flow */}
    </div>
  );
};

export default AlternativeIndex;