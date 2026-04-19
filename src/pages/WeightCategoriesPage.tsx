import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Scale, Filter } from 'lucide-react';
import { weightCategoryService, type WeightCategory } from '@/services/weightCategoryService';
import { useAuth } from '@/store/useAuthStore';

const AGE_ORDER = ['Sub-Junior', 'Cadet', 'Junior', 'Senior', 'Veteran'];

function formatWeightRange(category: WeightCategory): string {
  const min = Number(category.min_weight_kg);
  const max = Number(category.max_weight_kg);
  if (max >= 999) return `${min}kg+`;
  if (min <= 0) return `Under ${max}kg`;
  return `${min}-${max}kg`;
}

function ageSort(a: string, b: string): number {
  const aIndex = AGE_ORDER.indexOf(a);
  const bIndex = AGE_ORDER.indexOf(b);
  if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
  if (aIndex === -1) return 1;
  if (bIndex === -1) return -1;
  return aIndex - bIndex;
}

export default function WeightCategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const isOrganizer = user?.roles?.includes('organizer') || isAdmin;

  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [associations, setAssociations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterAssoc, setFilterAssoc] = useState<string>('');
  const [genderView, setGenderView] = useState<'all' | 'male' | 'female'>('all');
  const [selectedAgeChip, setSelectedAgeChip] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    association: '',
    age_category: '',
    gender: 'male',
    weight_class: '',
    min_weight_kg: 0,
    max_weight_kg: 0,
    sort_order: 0,
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cats, assocs] = await Promise.all([
        weightCategoryService.getAll(),
        weightCategoryService.getAssociations(),
      ]);
      setCategories(cats);
      setAssociations(assocs);
      if (assocs.length > 0) {
        const preferred = assocs.find((value) => value === 'WT') ?? assocs[0];
        setFilterAssoc((current) => current || preferred);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load weight categories');
    } finally {
      setLoading(false);
    }
  }

  const ageCategories = useMemo(() => {
    return Array.from(new Set(categories.map((c) => c.age_category))).sort(ageSort);
  }, [categories]);

  const selectedAssociationCategories = useMemo(() => {
    if (!filterAssoc) return [];
    return categories.filter((c) => c.association === filterAssoc);
  }, [categories, filterAssoc]);

  const filteredByGender = useMemo(() => {
    if (genderView === 'all') return selectedAssociationCategories;
    return selectedAssociationCategories.filter((c) => c.gender === genderView);
  }, [selectedAssociationCategories, genderView]);

  const ageChipsForAssociation = useMemo(() => {
    return Array.from(new Set(selectedAssociationCategories.map((category) => category.age_category))).sort(ageSort);
  }, [selectedAssociationCategories]);

  useEffect(() => {
    if (selectedAgeChip !== 'all' && !ageChipsForAssociation.includes(selectedAgeChip)) {
      setSelectedAgeChip('all');
    }
  }, [ageChipsForAssociation, selectedAgeChip]);

  const filteredByAgeAndGender = useMemo(() => {
    if (selectedAgeChip === 'all') return filteredByGender;
    return filteredByGender.filter((category) => category.age_category === selectedAgeChip);
  }, [filteredByGender, selectedAgeChip]);

  const groupedByAge = useMemo(() => {
    const map: Record<string, WeightCategory[]> = {};
    for (const category of filteredByAgeAndGender) {
      if (!map[category.age_category]) map[category.age_category] = [];
      map[category.age_category].push(category);
    }
    return map;
  }, [filteredByAgeAndGender]);

  function openAdd() {
    setEditingId(null);
    setForm({
      association: filterAssoc || associations[0] || '',
      age_category: ageCategories[0] || 'Sub-Junior',
      gender: 'male',
      weight_class: '',
      min_weight_kg: 0,
      max_weight_kg: 0,
      sort_order: 0,
    });
    setDialogOpen(true);
  }

  function openEdit(category: WeightCategory) {
    setEditingId(category.id);
    setForm({
      association: category.association,
      age_category: category.age_category,
      gender: category.gender,
      weight_class: category.weight_class,
      min_weight_kg: category.min_weight_kg,
      max_weight_kg: category.max_weight_kg,
      sort_order: category.sort_order,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingId) {
        await weightCategoryService.update(editingId, form);
      } else {
        await weightCategoryService.create(form as Omit<WeightCategory, 'id'>);
      }
      setDialogOpen(false);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to save category');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this weight category?')) return;
    try {
      await weightCategoryService.remove(id);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to delete category');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Weight Categories</h1>
            <p className="text-sm text-muted-foreground">Association-first view with age-group sections and side-by-side male/female classes.</p>
          </div>
        </div>
        {isOrganizer && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        )}
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md">{error}</div>}

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="flex items-center gap-1 mb-1"><Filter className="h-3 w-3" /> Association</Label>
              <Select value={filterAssoc} onValueChange={setFilterAssoc}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select association" /></SelectTrigger>
                <SelectContent>
                  {associations.map((association) => (
                    <SelectItem key={association} value={association}>
                      {association === 'State' ? 'State Association' : association}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1">Gender View</Label>
              <div className="flex gap-1">
                {(['all', 'male', 'female'] as const).map((view) => (
                  <Button
                    key={view}
                    size="sm"
                    variant={genderView === view ? 'default' : 'outline'}
                    onClick={() => setGenderView(view)}
                    className="capitalize"
                  >
                    {view === 'all' ? 'All' : view === 'male' ? 'Male' : 'Female'}
                  </Button>
                ))}
              </div>
            </div>

            <Badge variant="secondary">{filteredByAgeAndGender.length} classes</Badge>
          </div>

          {ageChipsForAssociation.length > 0 && (
            <div className="mt-4">
              <Label className="mb-2 block">Category Chips</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedAgeChip === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedAgeChip('all')}
                >
                  All
                </Button>
                {ageChipsForAssociation.map((ageCategory) => (
                  <Button
                    key={ageCategory}
                    type="button"
                    size="sm"
                    variant={selectedAgeChip === ageCategory ? 'default' : 'outline'}
                    onClick={() => setSelectedAgeChip(ageCategory)}
                    className="capitalize"
                  >
                    {ageCategory}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {filterAssoc && ageCategories.map((ageCategory) => {
        const scoped = (groupedByAge[ageCategory] || []).sort((a, b) => a.sort_order - b.sort_order);
        const male = scoped.filter((category) => category.gender === 'male');
        const female = scoped.filter((category) => category.gender === 'female');
        const rowCount = Math.max(male.length, female.length);

        if (rowCount === 0) return null;

        return (
          <Card key={ageCategory}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{ageCategory}</span>
                <Badge variant="outline" className="text-xs">
                  {rowCount} class{rowCount > 1 ? 'es' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr className="border-b">
                      {(genderView === 'all' || genderView === 'male') && (
                        <th className="text-left px-3 py-2 border-r" colSpan={2}>Male</th>
                      )}
                      {(genderView === 'all' || genderView === 'female') && (
                        <th className="text-left px-3 py-2" colSpan={2}>Female</th>
                      )}
                    </tr>
                    <tr className="border-b text-xs text-slate-600">
                      {(genderView === 'all' || genderView === 'male') && (
                        <>
                          <th className="text-left px-3 py-2 border-r">Class</th>
                          <th className="text-left px-3 py-2 border-r">Weight</th>
                        </>
                      )}
                      {(genderView === 'all' || genderView === 'female') && (
                        <>
                          <th className="text-left px-3 py-2 border-r">Class</th>
                          <th className="text-left px-3 py-2">Weight</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rowCount }).map((_, rowIndex) => {
                      const maleCategory = male[rowIndex];
                      const femaleCategory = female[rowIndex];

                      return (
                        <tr key={`${ageCategory}-${rowIndex}`} className="border-b last:border-b-0">
                          {(genderView === 'all' || genderView === 'male') && (
                            <>
                              <td className="px-3 py-2 border-r">
                                {maleCategory ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{maleCategory.weight_class}</span>
                                    {isOrganizer && (
                                      <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(maleCategory)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => void handleDelete(maleCategory.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r text-slate-700">
                                {maleCategory ? formatWeightRange(maleCategory) : '-'}
                              </td>
                            </>
                          )}

                          {(genderView === 'all' || genderView === 'female') && (
                            <>
                              <td className="px-3 py-2 border-r">
                                {femaleCategory ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{femaleCategory.weight_class}</span>
                                    {isOrganizer && (
                                      <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(femaleCategory)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => void handleDelete(femaleCategory.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {femaleCategory ? formatWeightRange(femaleCategory) : '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Weight Category</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Association</Label>
                <Select value={form.association} onValueChange={(value) => setForm({ ...form, association: value })}>
                  <SelectTrigger><SelectValue placeholder="Select association" /></SelectTrigger>
                  <SelectContent>
                    {associations.map((association) => (
                      <SelectItem key={association} value={association}>
                        {association === 'State' ? 'State Association' : association}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age Category</Label>
                <Select value={form.age_category} onValueChange={(value) => setForm({ ...form, age_category: value })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ageCategories.map((ageCategory) => (
                      <SelectItem key={ageCategory} value={ageCategory}>{ageCategory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weight Class Name</Label>
                <Input
                  value={form.weight_class}
                  onChange={(event) => setForm({ ...form, weight_class: event.target.value })}
                  placeholder="e.g. Fin, Super Fin, Fly"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min (kg)</Label>
                <Input
                  type="number"
                  value={form.min_weight_kg}
                  onChange={(event) => setForm({ ...form, min_weight_kg: Number(event.target.value) })}
                />
              </div>
              <div>
                <Label>Max (kg)</Label>
                <Input
                  type="number"
                  value={form.max_weight_kg}
                  onChange={(event) => setForm({ ...form, max_weight_kg: Number(event.target.value) })}
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
