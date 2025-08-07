import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFooterConfig } from '@/hooks/useFooterConfig';

export const FooterConfigForm = () => {
  const { config, updateConfig } = useFooterConfig();
  const [saving, setSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);
  const { toast } = useToast();

  // Mettre à jour localConfig quand config change
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig(localConfig);
      toast({
        title: "Configuration sauvegardée",
        description: "La configuration du footer a été mise à jour avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration du footer",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Configuration Footer & Mentions Légales
        </CardTitle>
        <CardDescription>
          Configurez le footer du site avec les informations légales et de contact
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations de l'entreprise */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Informations de l'entreprise</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de l'entreprise</Label>
              <Input
                id="company_name"
                value={localConfig.company_name}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  company_name: e.target.value
                })}
                placeholder="Balzac Certification"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_email">Email de contact</Label>
              <Input
                id="company_email"
                type="email"
                value={localConfig.company_email}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  company_email: e.target.value
                })}
                placeholder="contact@balzac-certification.fr"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input
                id="company_phone"
                value={localConfig.company_phone}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  company_phone: e.target.value
                })}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_address">Adresse</Label>
              <Input
                id="company_address"
                value={localConfig.company_address}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  company_address: e.target.value
                })}
                placeholder="123 Rue de la Formation, Paris"
              />
            </div>
          </div>
        </div>

        {/* Réseaux sociaux */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Réseaux sociaux</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="social_facebook">Facebook</Label>
              <Input
                id="social_facebook"
                value={localConfig.social_links.facebook}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  social_links: {
                    ...localConfig.social_links,
                    facebook: e.target.value
                  }
                })}
                placeholder="https://facebook.com/balzac-certification"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="social_twitter">Twitter/X</Label>
              <Input
                id="social_twitter"
                value={localConfig.social_links.twitter}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  social_links: {
                    ...localConfig.social_links,
                    twitter: e.target.value
                  }
                })}
                placeholder="https://twitter.com/balzac_cert"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="social_linkedin">LinkedIn</Label>
              <Input
                id="social_linkedin"
                value={localConfig.social_links.linkedin}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  social_links: {
                    ...localConfig.social_links,
                    linkedin: e.target.value
                  }
                })}
                placeholder="https://linkedin.com/company/balzac-certification"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="social_instagram">Instagram</Label>
              <Input
                id="social_instagram"
                value={localConfig.social_links.instagram}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  social_links: {
                    ...localConfig.social_links,
                    instagram: e.target.value
                  }
                })}
                placeholder="https://instagram.com/balzac_certification"
              />
            </div>
          </div>
        </div>

        {/* Mentions légales */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Mentions légales</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mentions_legales">Mentions légales</Label>
              <Textarea
                id="mentions_legales"
                value={localConfig.mentions_legales}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  mentions_legales: e.target.value
                })}
                placeholder="Saisissez les mentions légales..."
                rows={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="politique_confidentialite">Politique de confidentialité</Label>
              <Textarea
                id="politique_confidentialite"
                value={localConfig.politique_confidentialite}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  politique_confidentialite: e.target.value
                })}
                placeholder="Saisissez la politique de confidentialité..."
                rows={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="conditions_utilisation">Conditions d'utilisation</Label>
              <Textarea
                id="conditions_utilisation"
                value={localConfig.conditions_utilisation}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  conditions_utilisation: e.target.value
                })}
                placeholder="Saisissez les conditions d'utilisation..."
                rows={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="copyright_text">Texte de copyright</Label>
              <Input
                id="copyright_text"
                value={localConfig.copyright_text}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  copyright_text: e.target.value
                })}
                placeholder="© 2024 Balzac Certification. Tous droits réservés."
              />
            </div>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full md:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};