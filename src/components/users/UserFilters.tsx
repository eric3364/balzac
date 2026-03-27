import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

type SortField = 'name' | 'email' | 'school' | 'class' | 'city' | 'certifications' | 'level' | 'tests' | 'score' | 'activity';
type SortDirection = 'asc' | 'desc';

interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  schoolFilter: string;
  onSchoolFilterChange: (value: string) => void;
  classFilter: string;
  onClassFilterChange: (value: string) => void;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (value: SortDirection) => void;
  schools: readonly string[];
  classes: readonly string[];
  cities: readonly string[];
}

export const UserFilters = ({
  searchTerm, onSearchChange,
  schoolFilter, onSchoolFilterChange,
  classFilter, onClassFilterChange,
  cityFilter, onCityFilterChange,
  statusFilter, onStatusFilterChange,
  sortField, onSortFieldChange,
  sortDirection, onSortDirectionChange,
  schools, classes, cities,
}: UserFiltersProps) => {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={schoolFilter} onValueChange={onSchoolFilterChange}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="École" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les écoles</SelectItem>
            {schools.map(school => (
              <SelectItem key={school} value={school}>{school}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classFilter} onValueChange={onClassFilterChange}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {classes.map(className => (
              <SelectItem key={className} value={className}>{className}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={onCityFilterChange}>
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="Ville" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map(city => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full lg:w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
            <SelectItem value="certified">Certifiés</SelectItem>
            <SelectItem value="uncertified">Non certifiés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-field" className="text-sm font-medium">Trier par:</Label>
          <Select value={sortField} onValueChange={(value) => onSortFieldChange(value as SortField)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity">Dernière activité</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="certifications">Certifications</SelectItem>
              <SelectItem value="level">Niveau max</SelectItem>
              <SelectItem value="tests">Tests effectués</SelectItem>
              <SelectItem value="score">Score moyen</SelectItem>
              <SelectItem value="school">École</SelectItem>
              <SelectItem value="class">Classe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Ordre:</Label>
          <Select value={sortDirection} onValueChange={(value) => onSortDirectionChange(value as SortDirection)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Décroissant</SelectItem>
              <SelectItem value="asc">Croissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export type { SortField, SortDirection };
