import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Scale, Filter } from 'lucide-react';
import { weightCategoryService, type WeightCategory } from '@/services/weightCategoryService';
import { useAuth } from '@/store/useAuthStore';

export default function WeightCategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const isOrganizer = user?.roles?.includes('organizer') || isAdmin;

  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [associations, setAssociations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterAssoc, setFilterAssoc] = useState<string>('all');
  const [filterAge, setFilterAge] = useState<string>('');
  const [filterGender, setFilterGender] = useState<'male' | 'female'>('male');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    association: '', age_category: '', gender: 'male', weight_class: '',
    min_weight_kg: 0, max_weight_kg: 0, sort_order: 0,
  });

  useEffect(() => {
    loadData();
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
      // Default filter to first association instead of 'all'
      if (assocs.length > 0) {
        setFilterAssoc(prev => prev === 'all' ? assocs[0] : prev);
      }
      if (cats.length > 0 && !filterAge) {
        const firstAge = Array.from(new Set(cats.map(c => c.age_category))).sort()[0];
        if (firstAge) setFilterAge(firstAge);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return categories.filter(c => {
      if (filterAssoc !== 'all' && c.association !== filterAssoc) return false;
      if (filterAge && c.age_category !== filterAge) return false;
      if (c.gender !== filterGender) return false;
      return true;
    });
  }, [categories, filterAssoc, filterAge, filterGender]);

  const ageCategories = useMemo(() => {
    return Array.from(new Set(categories.map(c => c.age_category))).sort();
  }, [categories]);

  function openAdd() {
    setEditingId(null);
    setForm({ association: filterAssoc !== 'all' ? filterAssoc : (associations[0] ?? ''), age_category: '', gender: 'male', weight_class: '', min_weight_kg: 0, max_weight_kg: 0, sort_order: 0 });
    setDialogOpen(true);
  }

  function openEdit(cat: WeightCategory) {
    setEditingId(cat.id);
    setForm({
      association: cat.association,
      age_category: cat.age_category,
      gender: cat.gender,
      weight_class: cat.weight_class,
      min_weight_kg: cat.min_weight_kg,
      max_weight_kg: cat.max_weight_kg,
      sort_order: cat.sort_order,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingId) {
        await weightCategoryService.update(editingId, form);
      } else {
        await weightCategoryService.create(form as any);
      }
      setDialogOpen(false);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleCopyToAssociation(targetAssoc: string) {
    if (!editingId) return;
    try {
      await weightCategoryService.create({ ...form, association: targetAssoc } as any);
      await loadData();
      alert(`Copied to ${targetAssoc}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this weight category?')) return;
    try {
      await weightCategoryService.remove(id);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Group by association for tab view
  const grouped = useMemo(() => {
    const map: Record<string, WeightCategory[]> = {};
    for (const c of filtered) {
      if (!map[c.association]) map[c.association] = [];
      map[c.association].push(c);
    }
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Weight Categories</h1>
        </div>
        {isOrganizer && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        )}
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md">{error}</div>}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="flex items-center gap-1 mb-1"><Filter className="h-3 w-3" /> Association</Label>
              <Select value={filterAssoc} onValueChange={setFilterAssoc}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {associations.map(a => <SelectItem key={a} value={a}>{a === 'State' ? 'State Association' : a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Age Category</Label>
              <Select value={filterAge} onValueChange={setFilterAge}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ageCategories.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Gender</Label>
              <div className="flex gap-1">
                {(['male', 'female'] as const).map(g => (
                  <Button
                    key={g}
                    size="sm"
                    variant={filterGender === g ? 'default' : 'outline'}
                    onClick={() => setFilterGender(g)}
                    className="capitalize"
                  >
                    {g === 'male' ? '♂ Male' : '♀ Female'}
                  </Button>
                ))}
              </div>
            </div>
            <Badge variant="secondary">{filtered.length} categories</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chips view grouped by age */}
      <Tabs value={filterAssoc} onValueChange={setFilterAssoc}>
        <TabsList className="flex-wrap h-auto">
          {associations.map(a => (
            <TabsTrigger key={a} value={a}>{a === 'State' ? 'State Association' : a}</TabsTrigger>
          ))}
        </TabsList>

        {associations.map(assoc => (
          <TabsContent key={assoc} value={assoc}>
            <Card>
              <CardHeader>
                <CardTitle>{assoc === 'State' ? 'State Association' : assoc} Weight Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chips grouped by age category */}
                {Array.from(new Set((grouped[assoc] ?? []).map(c => c.age_category))).sort().map(ageCat => {
                  const cols = (grouped[assoc] ?? []).filter(c => c.age_category === ageCat);
                  const males = cols.filter(c => c.gender === 'male');
                  const females = cols.filter(c => c.gender === 'female');
                  return (
                    <div key={ageCat} className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700 border-b pb-1">{ageCat}</p>
                      {males.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-blue-600 font-medium w-14">♂ Male</span>
                          {males.sort((a, b) => a.sort_order - b.sort_order).map(cat => (
                            <Badge
                              key={cat.id}
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-800 cursor-pointer hover:bg-blue-100"
                              onClick={() => isOrganizer ? openEdit(cat) : undefined}
                            >
                              {cat.weight_class}
                              {Number(cat.min_weight_kg) > 0 ? ` (${cat.min_weight_kg}` : ' (0'}
                              -{Number(cat.max_weight_kg) >= 999 ? '+' : cat.max_weight_kg}kg)
                            </Badge>
                          ))}
                        </div>
                      )}
                      {females.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-pink-600 font-medium w-14">♀ Female</span>
                          {females.sort((a, b) => a.sort_order - b.sort_order).map(cat => (
                            <Badge
                              key={cat.id}
                              variant="outline"
                              className="border-pink-200 bg-pink-50 text-pink-800 cursor-pointer hover:bg-pink-100"
                              onClick={() => isOrganizer ? openEdit(cat) : undefined}
                            >
                              {cat.weight_class}
                              {Number(cat.min_weight_kg) > 0 ? ` (${cat.min_weight_kg}` : ' (0'}
                              -{Number(cat.max_weight_kg) >= 999 ? '+' : cat.max_weight_kg}kg)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(grouped[assoc] ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No categories for this association/filter</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Weight Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Association</Label>
                <Select value={form.association} onValueChange={v => setForm({ ...form, association: v })}>
                  <SelectTrigger><SelectValue placeholder="Select association" /></SelectTrigger>
                  <SelectContent>
                    {associations.map(a => <SelectItem key={a} value={a}>{a === 'State' ? 'State Association' : a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age Category</Label>
                <Select value={form.age_category} onValueChange={v => setForm({ ...form, age_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ageCategories.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weight Class Name</Label>
                <Input value={form.weight_class} onChange={e => setForm({ ...form, weight_class: e.target.value })} placeholder="e.g. Fin, Fly" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min (kg)</Label>
                <Input type="number" value={form.min_weight_kg} onChange={e => setForm({ ...form, min_weight_kg: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Max (kg)</Label>
                <Input type="number" value={form.max_weight_kg} onChange={e => setForm({ ...form, max_weight_kg: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingId && associations.filter(a => a !== form.association).length > 0 && (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-muted-foreground">Copy to:</span>
                {associations.filter(a => a !== form.association).map(a => (
                  <Button key={a} size="sm" variant="outline" className="text-xs h-7" onClick={() => handleCopyToAssociation(a)}>
                    {a === 'State' ? 'State Assoc.' : a}
                  </Button>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
