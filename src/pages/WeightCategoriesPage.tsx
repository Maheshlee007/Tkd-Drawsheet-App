import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [filterAge, setFilterAge] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return categories.filter(c => {
      if (filterAssoc !== 'all' && c.association !== filterAssoc) return false;
      if (filterAge !== 'all' && c.age_category !== filterAge) return false;
      if (filterGender !== 'all' && c.gender !== filterGender) return false;
      return true;
    });
  }, [categories, filterAssoc, filterAge, filterGender]);

  const ageCategories = useMemo(() => {
    return Array.from(new Set(categories.map(c => c.age_category))).sort();
  }, [categories]);

  function openAdd() {
    setEditingId(null);
    setForm({ association: '', age_category: '', gender: 'male', weight_class: '', min_weight_kg: 0, max_weight_kg: 0, sort_order: 0 });
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
                  <SelectItem value="all">All</SelectItem>
                  {associations.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Age Category</Label>
              <Select value={filterAge} onValueChange={setFilterAge}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ageCategories.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Gender</Label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">{filtered.length} categories</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table view */}
      <Tabs defaultValue={associations[0] ?? 'WT'}>
        <TabsList className="flex-wrap h-auto">
          {associations.map(a => (
            <TabsTrigger key={a} value={a}>{a}</TabsTrigger>
          ))}
        </TabsList>

        {associations.map(assoc => (
          <TabsContent key={assoc} value={assoc}>
            <Card>
              <CardHeader>
                <CardTitle>{assoc} Weight Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Min (kg)</TableHead>
                      <TableHead className="text-right">Max (kg)</TableHead>
                      {isOrganizer && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(grouped[assoc] ?? []).map(cat => (
                      <TableRow key={cat.id}>
                        <TableCell>{cat.age_category}</TableCell>
                        <TableCell>
                          <Badge variant={cat.gender === 'male' ? 'default' : 'secondary'}>
                            {cat.gender}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{cat.weight_class}</TableCell>
                        <TableCell className="text-right">{Number(cat.min_weight_kg) === 0 ? '-' : cat.min_weight_kg}</TableCell>
                        <TableCell className="text-right">{Number(cat.max_weight_kg) >= 999 ? '+' : cat.max_weight_kg}</TableCell>
                        {isOrganizer && (
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Input value={form.association} onChange={e => setForm({ ...form, association: e.target.value })} placeholder="e.g. WT, SGFI" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
