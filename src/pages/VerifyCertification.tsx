import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, Award, Target } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CertificationVerificationResult {
  valid: boolean;
  credential_id?: string;
  level_name?: string;
  level_number?: number;
  certified_at?: string;
  expiration_date?: string | null;
  issuing_organization?: string;
  status?: 'active' | 'expired';
  message?: string;
  error?: string;
}

const VerifyCertification = () => {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [verificationResult, setVerificationResult] = useState<CertificationVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyCertification = async () => {
      if (!credentialId) {
        setError('ID de certification manquant');
        setLoading(false);
        return;
      }

      try {
        // Use secure edge function for verification instead of direct DB access
        const { data, error: funcError } = await supabase.functions.invoke('verify-certification', {
          body: { credential_id: credentialId }
        });

        if (funcError) {
          console.error('Verification error:', funcError);
          setError('Erreur lors de la vérification');
          setLoading(false);
          return;
        }

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setVerificationResult(data);
      } catch (err) {
        console.error('Error verifying certification:', err);
        setError('Erreur lors de la vérification');
      } finally {
        setLoading(false);
      }
    };

    verifyCertification();
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

  if (error || !verificationResult || !verificationResult.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Certification non valide</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {error || verificationResult?.message || 'Certification non trouvée'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vérifiez l'URL ou contactez l'émetteur de la certification.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = verificationResult.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* En-tête de vérification */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              {isActive ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {isActive ? 'Certification Valide' : 'Certification Expirée'}
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
                Certification {verificationResult.level_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations du niveau */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Niveau</p>
                    <p className="font-medium">{verificationResult.level_name}</p>
                  </div>
                </div>
                {verificationResult.certified_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date d'obtention</p>
                      <p className="font-medium">
                        {format(new Date(verificationResult.certified_at), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Validité */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut de validité</p>
                    <Badge variant={isActive ? "default" : "destructive"}>
                      {isActive ? 'Valide' : 'Expirée'}
                    </Badge>
                  </div>
                  {verificationResult.expiration_date && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {isActive ? 'Expire le' : 'Expirée le'}
                      </p>
                      <p className="font-medium">
                        {format(new Date(verificationResult.expiration_date), 'dd MMMM yyyy', { locale: fr })}
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
                <p className="font-medium">{verificationResult.issuing_organization}</p>
                <p className="text-sm text-muted-foreground">
                  ID de certification: {verificationResult.credential_id}
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
