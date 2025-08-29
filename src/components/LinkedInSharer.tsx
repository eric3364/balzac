import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LinkedinIcon, Share2, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LinkedInSharerProps {
  certification: {
    id: string;
    level: number;
    score: number;
    certified_at: string;
    credential_id: string;
    issuing_organization?: string | null;
  };
  template?: {
    certificate_title?: string;
    name?: string;
  };
  difficultyLevel?: {
    name: string;
  };
  userProfile?: {
    full_name?: string;
  };
}

export const LinkedInSharer: React.FC<LinkedInSharerProps> = ({
  certification,
  template,
  difficultyLevel,
  userProfile
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLinkedInPost = () => {
    const certificationName = template?.certificate_title || `Certification ${difficultyLevel?.name || 'Niveau ' + certification.level}`;
    const organizationName = certification.issuing_organization || 'Balzac Certification';
    const userName = userProfile?.full_name || 'un apprenant';
    const verificationUrl = `${window.location.origin}/verify/${certification.credential_id}`;
    
    return {
      text: `🎓 Fier d'avoir obtenu ma ${certificationName} !

💡 Score obtenu : ${certification.score}%
📚 Niveau : ${difficultyLevel?.name || 'Niveau ' + certification.level}
🏛️ Délivré par : ${organizationName}

Cette certification valide mes compétences en français et renforce mon employabilité. Un pas de plus dans mon développement professionnel !

#Certification #Français #CompétencesProfessionnelles #ApprentissageContinuel #LinkedIn #BalzacCertification

🔗 Vérifiez cette certification : ${verificationUrl}`,
      
      url: verificationUrl,
      
      // Pour l'API LinkedIn (si implémentée plus tard)
      title: `${userName} a obtenu une certification en français`,
      summary: `Certification ${difficultyLevel?.name || 'Niveau ' + certification.level} obtenue avec un score de ${certification.score}%`,
      source: 'Balzac Certification'
    };
  };

  const shareToLinkedIn = () => {
    const postData = generateLinkedInPost();
    
    // Méthode 1: Partage via URL LinkedIn (simple)
    const linkedInShareUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
    linkedInShareUrl.searchParams.set('url', postData.url);
    
    // Ouvrir dans un nouvel onglet
    window.open(linkedInShareUrl.toString(), '_blank', 'width=600,height=600');
    
    toast.success('Redirection vers LinkedIn pour partage');
    setIsOpen(false);
  };

  const copyPostText = async () => {
    const postData = generateLinkedInPost();
    
    try {
      await navigator.clipboard.writeText(postData.text);
      setCopied(true);
      toast.success('Texte copié ! Vous pouvez le coller sur LinkedIn');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const openLinkedInProfile = () => {
    window.open('https://www.linkedin.com/in/me/', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full bg-[#0077B5] hover:bg-[#005885] text-white flex items-center gap-2"
          size="sm"
        >
          <LinkedinIcon className="h-3 w-3" />
          <span className="text-xs">Partager sur LinkedIn</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinIcon className="h-5 w-5 text-[#0077B5]" />
            Partager votre certification sur LinkedIn
          </DialogTitle>
          <DialogDescription>
            Valorisez votre certification sur votre profil professionnel
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Aperçu de la certification */}
          <Card className="border-[#0077B5]/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {template?.certificate_title || `Certification ${difficultyLevel?.name}`}
                </CardTitle>
                <Badge variant="secondary">{certification.score}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Niveau :</strong> {difficultyLevel?.name || 'Niveau ' + certification.level}</p>
                <p><strong>Émetteur :</strong> {certification.issuing_organization || 'Balzac Certification'}</p>
                <p><strong>Date :</strong> {new Date(certification.certified_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Aperçu du texte */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Aperçu du post :</h4>
            <div className="bg-muted p-3 rounded-lg text-xs max-h-32 overflow-y-auto border">
              <pre className="whitespace-pre-wrap font-sans">
                {generateLinkedInPost().text}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={shareToLinkedIn}
              className="bg-[#0077B5] hover:bg-[#005885] text-white flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Partager maintenant
            </Button>
            
            <Button
              onClick={copyPostText}
              variant="outline"
              className="flex items-center gap-2"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Copier le texte'}
            </Button>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={openLinkedInProfile}
              variant="ghost"
              size="sm"
              className="text-[#0077B5] hover:text-[#005885] flex items-center gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              Ouvrir mon profil LinkedIn
            </Button>
          </div>

          {/* Note informative */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 <strong>Conseil :</strong> Ajoutez cette certification à la section "Licences et certifications" 
              de votre profil LinkedIn pour une visibilité maximale.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkedInSharer;