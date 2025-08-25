import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, Award, User, Target } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CertificationDetails {
  id: string;
  user_name: string;
  level: number;
  level_name: string;
  score: number;
  certified_at: string;
  credential_id: string;
  expiration_date: string | null;
  issuing_organization: string;
  certificate_title: string;
  is_valid: boolean;
}

const VerifyCertification = () => {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [certification, setCertification] = useState<CertificationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertification = async () => {
      if (!credentialId) {
        setError('ID de certification manquant');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_certifications')
          .select(`
            id,
            level,
            score,
            certified_at,
            credential_id,
            expiration_date,
            issuing_organization,
            user_id
          `)
          .eq('credential_id', credentialId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError('Certification non trouvée');
          setLoading(false);
          return;
        }

        // Récupérer les informations supplémentaires
        const [profileResult, levelResult, templateResult] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', data.user_id).maybeSingle(),
          supabase.from('difficulty_levels').select('name').eq('level_number', data.level).maybeSingle(),
          supabase
            .from('certificate_templates')
            .select('certificate_title')
            .eq('difficulty_level_id', 
              '(SELECT id FROM difficulty_levels WHERE level_number = ' + data.level + ')'
            )
            .eq('is_active', true)
            .maybeSingle()
        ]);

        // Vérifier si la certification est encore valide
        const now = new Date();
        const expirationDate = data.expiration_date ? new Date(data.expiration_date) : null;
        const isValid = !expirationDate || expirationDate > now;

        setCertification({
          id: data.id,
          user_name: profileResult.data?.full_name || 'Utilisateur inconnu',
          level: data.level,
          level_name: levelResult.data?.name || `Niveau ${data.level}`,
          score: data.score,
          certified_at: data.certified_at || '',
          credential_id: data.credential_id,
          expiration_date: data.expiration_date,
          issuing_organization: data.issuing_organization || 'Organisation',
          certificate_title: templateResult.data?.certificate_title || 'Certification',
          is_valid: isValid
        });
      } catch (error) {
        console.error('Erreur lors du chargement de la certification:', error);
        setError('Erreur lors de la vérification');
      } finally {
        setLoading(false);
      }
    };

    fetchCertification();
  }, [credentialId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Vérification de la certification...</p>
        </div>
      </div>
    );
  }

  if (error || !certification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Certification non valide</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vérifiez l'URL ou contactez l'émetteur de la certification.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* En-tête de vérification */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              {certification.is_valid ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {certification.is_valid ? 'Certification Valide' : 'Certification Expirée'}
            </h1>
            <p className="text-muted-foreground">
              Détails de la certification vérifiée
            </p>
          </div>

          {/* Détails de la certification */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                {certification.certificate_title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations du certifié */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Certifié</p>
                    <p className="font-medium">{certification.user_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Niveau</p>
                    <p className="font-medium">{certification.level_name}</p>
                  </div>
                </div>
              </div>

              {/* Score et date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Score obtenu:</span>
                    <Badge variant={certification.score >= 80 ? "default" : "secondary"}>
                      {certification.score}%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'obtention</p>
                    <p className="font-medium">
                      {format(new Date(certification.certified_at), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validité */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut de validité</p>
                    <Badge variant={certification.is_valid ? "default" : "destructive"}>
                      {certification.is_valid ? 'Valide' : 'Expirée'}
                    </Badge>
                  </div>
                  {certification.expiration_date && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {certification.is_valid ? 'Expire le' : 'Expirée le'}
                      </p>
                      <p className="font-medium">
                        {format(new Date(certification.expiration_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations sur l'émetteur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations sur l'émetteur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{certification.issuing_organization}</p>
                <p className="text-sm text-muted-foreground">
                  ID de certification: {certification.credential_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cette certification a été vérifiée automatiquement.
                  En cas de doute, contactez directement l'organisme émetteur.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertification;