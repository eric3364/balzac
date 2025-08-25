import React from 'react';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import { usePublicLegalPage } from '@/hooks/useLegalPage';
import { NavLink } from 'react-router-dom';

const SiteFooter: React.FC = () => {
  const { settings, loading: footerLoading } = useFooterSettings();
  const { page: legalPage, loading: pageLoading } = usePublicLegalPage();

  if (footerLoading || pageLoading) {
    return null; // Don't render footer while loading
  }

  const showLegalLink = settings.legal_link_enabled && legalPage;

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>{settings.copyright_text}</p>
          {showLegalLink && (
            <div className="flex space-x-4 mt-2 sm:mt-0">
              <NavLink
                to="/mentions-legales"
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {settings.legal_link_label}
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;