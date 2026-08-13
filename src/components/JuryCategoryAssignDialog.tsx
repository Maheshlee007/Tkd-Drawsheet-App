import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';
import { judgeService } from '@/services/judgeService';
import { tournamentService } from '@/services/tournamentService';
import { useToast } from '@/hooks/use-toast';

export interface AssignDialogJudge {
  user_id: string;
  first_name: string;
  last_name: string;
}

export interface AssignCategoryOption {
  id: string;
  event_type: string;
  age_category: string;
  gender: string;
  weight_class: string;
  player_count?: number;
}

function categoryLabel(cat: AssignCategoryOption) {
  return `${cat.event_type} • ${cat.age_category} • ${cat.gender} • ${cat.weight_class}`;
}

export interface JuryCategoryAssignDialogProps {
  judge: AssignDialogJudge | null;
  tournamentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a save attempt so the caller can refresh assignment counts */
  onSaved?: () => void;
}

/**
 * Reusable "Assign Categories" dialog for a jury member.
 * Loads the tournament's categories + the jury's existing category-level
 * assignments, then saves via idempotent upsert / revoke.
 */
export default function JuryCategoryAssignDialog({
  judge,
  tournamentId,
  open,
  onOpenChange,
  onSaved,
}: JuryCategoryAssignDialogProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<AssignCategoryOption[]>([]);
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set());
  const [knownAssignments, setKnownAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !judge || !tournamentId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [cats, rows] = await Promise.all([
          tournamentService.getCategories(tournamentId) as Promise<AssignCategoryOption[]>,
          judgeService.listAssignments(judge.user_id, tournamentId),
        ]);
        if (cancelled) return;
        setCategories(cats);
        // categoryId → assignmentId for the jury's active category-level assignments
        const existing: Record<string, string> = {};
        for (const row of rows) {
          if (row.category_id && !row.match_id) existing[row.category_id] = row.id;
        }
        setKnownAssignments(existing);
        setCheckedCategories(new Set(Object.keys(existing)));
      } catch (e: any) {
        if (cancelled) return;
        toast({
          title: 'Failed to load categories',
          description: e.message || 'Could not load tournament categories.',
          variant: 'destructive',
        });
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, judge?.user_id, tournamentId]);

  function toggleCategory(categoryId: string, checked: boolean) {
    setCheckedCategories(prev => {
      const next = new Set(prev);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }

  async function handleSave() {
    if (!judge) return;
    setSaving(true);
    const nextKnown: Record<string, string> = { ...knownAssignments };
    const failures: string[] = [];
    let added = 0;
    let removed = 0;

    // Assign every checked category — the backend upsert is idempotent and
    // returns the assignment row, so this also repairs a stale local map.
    for (const categoryId of Array.from(checkedCategories)) {
      try {
        const assignment = await judgeService.assignToCategory({
          judgeId: judge.user_id,
          categoryId,
          tournamentId,
        });
        if (!(categoryId in knownAssignments)) added++;
        if (assignment?.id) nextKnown[categoryId] = assignment.id;
      } catch (e: any) {
        const cat = categories.find(c => c.id === categoryId);
        failures.push(`assign ${cat ? categoryLabel(cat) : categoryId}: ${e.message || 'failed'}`);
      }
    }

    // Revoke categories that were unchecked (only possible for assignments we know the id of)
    for (const [categoryId, assignmentId] of Object.entries(knownAssignments)) {
      if (checkedCategories.has(categoryId)) continue;
      try {
        await judgeService.revokeAssignment(assignmentId);
        delete nextKnown[categoryId];
        removed++;
      } catch (e: any) {
        const cat = categories.find(c => c.id === categoryId);
        failures.push(`revoke ${cat ? categoryLabel(cat) : categoryId}: ${e.message || 'failed'}`);
      }
    }

    setKnownAssignments(nextKnown);
    onSaved?.();
    setSaving(false);

    if (failures.length > 0) {
      toast({
        title: 'Some assignments failed',
        description: failures.slice(0, 3).join('; '),
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Assignments saved',
        description: `${added} added, ${removed} removed for ${judge.first_name} ${judge.last_name}.`,
      });
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Categories</DialogTitle>
          <DialogDescription>
            {judge
              ? `Select the categories ${judge.first_name} ${judge.last_name} will manage in the jury portal.`
              : 'Select categories for this jury member.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            This tournament has no active categories yet. Add categories first, then assign them here.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{checkedCategories.size} of {categories.length} categories selected</span>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
              {categories.map(cat => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                >
                  <Checkbox
                    checked={checkedCategories.has(cat.id)}
                    onCheckedChange={(value) => toggleCategory(cat.id, value === true)}
                    disabled={saving}
                  />
                  <span className="font-medium capitalize">{categoryLabel(cat)}</span>
                  {cat.player_count != null && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Users className="h-3 w-3" /> {cat.player_count}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || loading || categories.length === 0}
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
