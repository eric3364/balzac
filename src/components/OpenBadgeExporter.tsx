import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OpenBadgeData {
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

interface OpenBadgeExporterProps {
  certification: {
    id: string;
    level: number;
    score: number;
    certified_at: string;
    credential_id: string;
    expiration_date?: string | null;
    issuing_organization: string;
    user_id: string;
  };
  template?: {
    certificate_title: string;
    name: string;
    custom_badge_url?: string | null;
    badge_color?: string | null;
  };
  difficultyLevel?: {
    name: string;
  };
  userProfile?: {
    full_name: string;
  };
}

export const OpenBadgeExporter: React.FC<OpenBadgeExporterProps> = ({
  certification,
  template,
  difficultyLevel,
  userProfile
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);

  const generateOpenBadge = async (): Promise<OpenBadgeData> => {
    const baseUrl = window.location.origin;
    const badgeId = `${baseUrl}/badge/${certification.credential_id}`;
    const verificationUrl = `${baseUrl}/verify/${certification.credential_id}`;
    
    // Récupérer l'email de l'utilisateur depuis auth
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'unknown@domain.com';

    return {
      "@context": "https://w3id.org/openbadges/v2",
      type: "Assertion",
      id: badgeId,
      badge: {
        type: "BadgeClass",
        id: badgeId,
        name: template?.certificate_title || `Certification ${difficultyLevel?.name || 'Niveau ' + certification.level}`,
        description: `Certification obtenue avec un score de ${certification.score}% en ${difficultyLevel?.name || 'Niveau ' + certification.level}. Délivré par ${certification.issuing_organization}.`,
        image: template?.custom_badge_url || `${baseUrl}/api/badge-image/${certification.credential_id}`,
        criteria: `${baseUrl}/criteria/${certification.level}`,
        issuer: {
          type: "Issuer",
          id: `${baseUrl}/issuer`,
          name: certification.issuing_organization,
          url: baseUrl,
          email: "certifications@balzac-certification.com"
        }
      },
      recipient: {
        type: "email",
        hashed: false,
        identity: userEmail
      },
      verification: {
        type: "hosted",
        url: verificationUrl
      },
      issuedOn: certification.certified_at,
      ...(certification.expiration_date && { expires: certification.expiration_date }),
      evidence: `${baseUrl}/evidence/${certification.credential_id}`
    };
  };

  const exportBadge = async () => {
    setIsExporting(true);
    try {
      const openBadgeData = await generateOpenBadge();
      
      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(openBadgeData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      setBadgeUrl(url);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `badge-${certification.credential_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Badge Open Badge exporté avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export du badge:', error);
      toast.error('Erreur lors de l\'export du badge');
    } finally {
      setIsExporting(false);
    }
  };

  const shareToLinkedIn = async () => {
    try {
      const openBadgeData = await generateOpenBadge();
      const verificationUrl = openBadgeData.verification.url;
      
      // URL de partage LinkedIn avec les métadonnées du badge
      const linkedInUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
      linkedInUrl.searchParams.set('url', verificationUrl);
      
      // Ouvrir dans un nouvel onglet
      window.open(linkedInUrl.toString(), '_blank');
      
      toast.success('Redirection vers LinkedIn pour partage');
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      toast.error('Erreur lors du partage');
    }
  };

  const copyBadgeUrl = async () => {
    try {
      const openBadgeData = await generateOpenBadge();
      await navigator.clipboard.writeText(openBadgeData.verification.url);
      setCopied(true);
      toast.success('URL de vérification copiée !');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={exportBadge}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs"
        >
          <Download className="h-3 w-3" />
          {isExporting ? '...' : 'JSON'}
        </Button>
        
        <Button
          onClick={shareToLinkedIn}
          size="sm"
          className="bg-[#0077B5] hover:bg-[#005885] text-white flex items-center gap-1 text-xs"
        >
          <Share2 className="h-3 w-3" />
          LinkedIn
        </Button>
        
        <Button
          onClick={copyBadgeUrl}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs"
        >
          {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <ExternalLink className="h-3 w-3" />}
          URL
        </Button>
      </div>
      
      <div className="text-[10px] text-muted-foreground mt-1 text-center">
        Open Badge 2.0
      </div>
    </div>
  );
};

export default OpenBadgeExporter;