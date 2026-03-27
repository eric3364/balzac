import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Clock, Target, Activity, TrendingUp, Goal, Smile, Frown, UserCheck, KeyRound, Edit2, Trash2 } from 'lucide-react';
import { UserListStats } from '@/hooks/useUserListStats';
import { UserObjectiveStatus } from '@/hooks/useUserObjectiveStatus';

interface UserTableProps {
  filteredUsers: UserListStats[];
  selectedUserIds: Set<string>;
  isAllSelected: boolean;
  userObjectiveStatuses: Record<string, UserObjectiveStatus>;
  onToggleSelectAll: () => void;
  onToggleUserSelection: (userId: string) => void;
  onImpersonate: (user: UserListStats) => void;
  onPasswordReset: (email: string) => void;
  onEdit: (user: UserListStats) => void;
  onDelete: (userId: string) => void;
}

export const UserTable = ({
  filteredUsers, selectedUserIds, isAllSelected, userObjectiveStatuses,
  onToggleSelectAll, onToggleUserSelection,
  onImpersonate, onPasswordReset, onEdit, onDelete,
}: UserTableProps) => {
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox checked={isAllSelected} onCheckedChange={onToggleSelectAll} aria-label="Sélectionner tout" />
              </TableHead>
              <TableHead>Apprenant</TableHead>
              <TableHead>École / Classe / Ville</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><Award className="h-4 w-4" />Certifs</div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><TrendingUp className="h-4 w-4" />Niveau</div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><Target className="h-4 w-4" />Tests</div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><Activity className="h-4 w-4" />Score</div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><Clock className="h-4 w-4" />Temps</div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><Goal className="h-4 w-4" />Objectif</div>
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <UserTableRow
                key={user.user_id || user.email}
                user={user}
                isSelected={user.user_id ? selectedUserIds.has(user.user_id) : false}
                objectiveStatus={user.user_id ? userObjectiveStatuses[user.user_id] : undefined}
                onToggleSelection={() => user.user_id && onToggleUserSelection(user.user_id)}
                onImpersonate={() => onImpersonate(user)}
                onPasswordReset={() => onPasswordReset(user.email)}
                onEdit={() => onEdit(user)}
                onDelete={() => onDelete(user.user_id || '')}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucun apprenant trouvé
        </div>
      )}
    </>
  );
};

interface UserTableRowProps {
  user: UserListStats;
  isSelected: boolean;
  objectiveStatus?: UserObjectiveStatus;
  onToggleSelection: () => void;
  onImpersonate: () => void;
  onPasswordReset: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const UserTableRow = ({
  user, isSelected, objectiveStatus,
  onToggleSelection, onImpersonate, onPasswordReset, onEdit, onDelete,
}: UserTableRowProps) => {
  return (
    <TableRow>
      <TableCell>
        {user.user_id && (
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelection}
            aria-label={`Sélectionner ${user.first_name} ${user.last_name}`} />
        )}
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">
            {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sans nom'}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          {user.last_activity && (
            <div className="text-xs text-muted-foreground">
              Dernière activité: {new Date(user.last_activity).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div>{user.school || '-'}</div>
          <div className="text-muted-foreground">{user.class_name || '-'}</div>
          <div className="text-muted-foreground text-xs">{user.city || '-'}</div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center space-y-1">
          <Badge variant={user.certifications_count > 0 ? "default" : "secondary"}>
            {user.certifications_count}
          </Badge>
          {user.certifications.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Dernière: {user.certifications[0].certified_at ? new Date(user.certifications[0].certified_at).toLocaleDateString('fr-FR') : '-'}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline">N{user.max_level}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="text-sm">
          <div className="font-medium">{user.total_tests}</div>
          <div className="text-xs text-muted-foreground">{user.total_questions} Q</div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="text-sm">
          <div className="font-medium">{user.avg_score}%</div>
          <div className="text-xs text-muted-foreground">{user.correct_answers}/{user.total_questions}</div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="text-sm">
          {user.time_spent_minutes > 0 ? (
            <>
              <div className="font-medium">
                {Math.floor(user.time_spent_minutes / 60)}h{String(user.time_spent_minutes % 60).padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground">{user.time_spent_minutes} min</div>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <ObjectiveCell objectiveStatus={objectiveStatus} />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Badge variant={user.is_active ? "default" : "secondary"}>
            {user.is_active ? "Actif" : "Inactif"}
          </Badge>
          {user.certifications_count > 0 && (
            <Badge variant="outline" className="text-xs">Certifié</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {user.user_id && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={onImpersonate}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Voir en tant que cet utilisateur</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onPasswordReset}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <KeyRound className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Renvoyer mot de passe</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const ObjectiveCell = ({ objectiveStatus }: { objectiveStatus?: UserObjectiveStatus }) => {
  if (!objectiveStatus?.hasObjective) {
    return <span className="text-muted-foreground">-</span>;
  }

  const icon = objectiveStatus.status === 'ok'
    ? <Smile className="h-5 w-5 text-green-500" />
    : objectiveStatus.status === 'warning'
    ? <Frown className="h-5 w-5 text-orange-500" />
    : <Frown className="h-5 w-5 text-red-500" />;

  const label = objectiveStatus.status === 'ok' ? 'Dans les temps'
    : objectiveStatus.status === 'warning' ? 'Léger retard' : 'Retard important';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center">{icon}</div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{label}</p>
            <p>Progression: {Math.round(objectiveStatus.userProgress)}%</p>
            <p>Attendu: {Math.round(objectiveStatus.expectedProgress)}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
