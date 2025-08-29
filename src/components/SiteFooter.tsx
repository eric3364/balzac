import { useFooterSettings } from '@/hooks/useFooterSettings';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, MapPin, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const socialIcons = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

export const SiteFooter = () => {
  const { settings, socialLinks, footerLinks, loading } = useFooterSettings();

  if (loading) {
    return null;
  }

  const getSocialIcon = (iconName: string) => {
    const Icon = socialIcons[iconName as keyof typeof socialIcons] || Facebook;
    return Icon;
  };

  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contact</h3>
            <div className="space-y-3">
              {settings?.company_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {settings.company_address}
                  </p>
                </div>
              )}
              
              {settings?.company_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`mailto:${settings.company_email}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {settings.company_email}
                  </a>
                </div>
              )}
              
              {settings?.company_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`tel:${settings.company_phone}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {settings.company_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          {footerLinks.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Liens</h3>
              <div className="space-y-2">
                {footerLinks
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((link) => (
                     <div key={link.id}>
                       {link.url.startsWith('/') ? (
                         <Link 
                           to={link.url === '/politique-de-confidentialite' ? '/legal/politique-de-confidentialite' : link.url}
                           className="text-sm text-muted-foreground hover:text-primary transition-colors block"
                         >
                           {link.label}
                         </Link>
                       ) : (
                         <a 
                           href={link.url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-sm text-muted-foreground hover:text-primary transition-colors block"
                         >
                           {link.label}
                         </a>
                       )}
                     </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Suivez-nous</h3>
              <div className="flex flex-wrap gap-4">
                {socialLinks
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((social) => {
                    const Icon = getSocialIcon(social.icon);
                    return (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                        aria-label={social.name}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="hidden sm:inline">{social.name}</span>
                      </a>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* Cookie Management */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Préférences</h3>
            <div className="space-y-2">
              {settings?.cookie_management_url && (
                <a 
                  href={settings.cookie_management_url}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block"
                >
                  Gérer mes cookies
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t mt-8 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {settings?.copyright_text || '© 2025 NEXT-U – Tous droits réservés.'}
          </p>
        </div>
      </div>
    </footer>
  );
};