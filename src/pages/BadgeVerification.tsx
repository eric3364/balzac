import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Award, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BadgeData {
  "@context": "https://w3id.org/openbadges/v2";
  type: "Assertion";
  id: string;
  badge: {
    type: "BadgeClass";
    id: string;
    name: string;
    description: string;
    image: string;
    criteria: string;
    issuer: {
      type: "Issuer";
      id: string;
      name: string;
      url: string;
      email?: string;
    };
  };
  recipient: {
    type: "email";
    hashed: boolean;
    identity: string;
  };
  verification: {
    type: "hosted";
    url: string;
  };
  issuedOn: string;
  expires?: string;
  evidence?: string;
}

const BadgeVerification = () => {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadgeData = async () => {
      if (!credentialId) {
        setError('ID de badge manquant');
        setLoading(false);
        return;
      }

      try {
        const { data: certification, error } = await supabase
          .from('user_certifications')
          .select(`
            *,
            profiles!inner(full_name)
          `)
          .eq('credential_id', credentialId)
          .maybeSingle();

        if (error) throw error;

        if (!certification) {
          setError('Badge non trouvé');
          setLoading(false);
          return;
        }

        // Récupérer les informations du niveau et du template
        const [levelResult, templateResult] = await Promise.all([
          supabase
            .from('difficulty_levels')
            .select('name')
            .eq('level_number', certification.level)
            .maybeSingle(),
          supabase
            .from('certificate_templates')
            .select('certificate_title, custom_badge_url')
            .eq('difficulty_level_id', 
              '(SELECT id FROM difficulty_levels WHERE level_number = ' + certification.level + ')'
            )
            .eq('is_active', true)
            .maybeSingle()
        ]);

        const baseUrl = window.location.origin;
        const badgeId = `${baseUrl}/badge/${certification.credential_id}`;
        const verificationUrl = `${baseUrl}/verify/${certification.credential_id}`;

        const openBadgeData: BadgeData = {
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          id: badgeId,
          badge: {
            type: "BadgeClass",
            id: badgeId,
            name: templateResult.data?.certificate_title || `Certification ${levelResult.data?.name || 'Niveau ' + certification.level}`,
            description: `Certification obtenue avec un score de ${certification.score}% en ${levelResult.data?.name || 'Niveau ' + certification.level}. Délivré par ${certification.issuing_organization}.`,
            image: templateResult.data?.custom_badge_url || `${baseUrl}/api/badge-image/${certification.credential_id}`,
            criteria: `${baseUrl}/criteria/${certification.level}`,
            issuer: {
              type: "Issuer",
              id: `${baseUrl}/issuer`,
              name: certification.issuing_organization || 'Organisation',
              url: baseUrl,
              email: "certifications@balzac-certification.com"
            }
          },
          recipient: {
            type: "email",
            hashed: false,
            identity: "verified-user@domain.com" // Anonymisé pour la sécurité
          },
          verification: {
            type: "hosted",
            url: verificationUrl
          },
          issuedOn: certification.certified_at || new Date().toISOString(),
          ...(certification.expiration_date && { expires: certification.expiration_date }),
          evidence: `${baseUrl}/evidence/${certification.credential_id}`
        };

        setBadgeData(openBadgeData);
      } catch (error) {
        console.error('Erreur lors du chargement du badge:', error);
        setError('Erreur lors de la vérification du badge');
      } finally {
        setLoading(false);
      }
    };

    fetchBadgeData();
  }, [credentialId]);

  const downloadBadgeJSON = () => {
    if (!badgeData) return;
    
    const blob = new Blob([JSON.stringify(badgeData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `openbadge-${credentialId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement du badge...</p>
        </div>
      </div>
    );
  }

  if (error || !badgeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Badge non trouvé</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Open Badge Vérifié</h1>
            <p className="text-muted-foreground">
              Badge conforme au standard Open Badge 2.0
            </p>
          </div>

          {/* Détails du badge */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                {badgeData.badge.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{badgeData.badge.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Émetteur</h3>
                  <p className="text-muted-foreground">{badgeData.badge.issuer.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Date d'émission</h3>
                  <p className="text-muted-foreground">
                    {new Date(badgeData.issuedOn).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {badgeData.expires && (
                <div>
                  <h3 className="font-semibold mb-2">Date d'expiration</h3>
                  <p className="text-muted-foreground">
                    {new Date(badgeData.expires).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Badge variant="secondary">Standard Open Badge 2.0</Badge>
                <Badge variant="outline">Vérification hébergée</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={downloadBadgeJSON} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Télécharger JSON
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(badgeData.verification.url, '_blank')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Vérifier la certification
            </Button>
          </div>

          {/* Métadonnées techniques */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Métadonnées techniques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg overflow-auto">
                <pre className="text-xs">
                  {JSON.stringify(badgeData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BadgeVerification;