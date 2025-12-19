import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { UserCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ImpersonationBanner = () => {
  const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const handleStop = () => {
    stopImpersonation();
    navigate('/admin');
  };

  const userName = [impersonatedUser.first_name, impersonatedUser.last_name]
    .filter(Boolean)
    .join(' ') || impersonatedUser.email;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5" />
          <span className="font-medium">
            Mode impersonnation : vous visualisez l'application en tant que{' '}
            <strong>{userName}</strong>
            {impersonatedUser.school && (
              <span className="text-orange-100 ml-2">
                ({impersonatedUser.school}
                {impersonatedUser.class_name && ` - ${impersonatedUser.class_name}`})
              </span>
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="text-white hover:bg-orange-600 hover:text-white"
        >
          <X className="h-4 w-4 mr-1" />
          Quitter l'impersonnation
        </Button>
      </div>
    </div>
  );
};
