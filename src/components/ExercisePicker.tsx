"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import {
  createExercise,
  getExerciseLibrary,
  getFavoriteExerciseIds,
  getRecentExerciseIds,
  toggleFavorite,
  type NewExercise,
} from "@/lib/queries";
import { friendlyError } from "@/lib/errors";
import { searchExercises as searchWger, type WgerExercise } from "@/lib/wger-api";
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Exercise, type MuscleGroup } from "@/lib/database.types";
import { useAsync } from "@/hooks/useAsync";
import { Button, IconButton } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { EmptyState } from "./ui/EmptyState";
import { Field } from "./ui/Field";
import { Icon } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";
import { Skeleton } from "./ui/Skeleton";
import { useToast } from "./ui/Toast";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Called once per chosen exercise; sheet stays open in multi mode. */
  onPick: (exercise: Exercise) => void;
  multi?: boolean;
  /**
   * When false (and multi is false), picking an exercise does not dismiss the
   * sheet — used by SwapSheet so it can show a follow-up "apply where?" step.
   */
  closeOnPick?: boolean;
  title?: string;
  excludeIds?: string[];
}

type Tab = "all" | "favorites" | "recent";

export function ExercisePicker({
  open,
  onClose,
  userId,
  onPick,
  multi = true,
  closeOnPick = true,
  title = "Add exercises",
  excludeIds = [],
}: ExercisePickerProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const { data: library, loading, error: libraryError, reload } = useAsync(
    () => getExerciseLibrary(userId),
    [userId],
    open,
  );
  const { data: recentIds } = useAsync(() => getRecentExerciseIds(userId), [userId], open);
  const { data: favoriteIds } = useAsync(
    () => getFavoriteExerciseIds(userId),
    [userId],
    open,
  );

  useEffect(() => {
    if (favoriteIds) setFavorites(favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMuscle(null);
      setEquipment(null);
      setTab("all");
      setAdded([]);
    }
  }, [open]);

  const trimmed = query.trim();

  const filtered = useMemo(() => {
    if (!library) return [];
    const excluded = new Set(excludeIds);
    let rows = library.filter((e) => !excluded.has(e.id));

    if (tab === "favorites") rows = rows.filter((e) => favorites.includes(e.id));
    if (tab === "recent" && recentIds) {
      const order = new Map(recentIds.map((id, i) => [id, i]));
      rows = rows
        .filter((e) => order.has(e.id))
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    }
    if (muscle) rows = rows.filter((e) => e.primary_muscle === muscle);
    if (equipment) rows = rows.filter((e) => e.equipment === equipment);
    if (trimmed) {
      const q = trimmed.toLowerCase();
      rows = rows
        .filter((e) => e.name.toLowerCase().includes(q))
        .sort((a, b) => score(a.name, q) - score(b.name, q));
    }
    return rows;
  }, [library, excludeIds, tab, favorites, recentIds, muscle, equipment, trimmed]);

  const handlePick = useCallback(
    (exercise: Exercise) => {
      haptic("success");
      onPick(exercise);
      if (multi) {
        setAdded((prev) => [...prev, exercise.id]);
      } else if (closeOnPick) {
        onClose();
      }
    },
    [closeOnPick, multi, onClose, onPick],
  );

  const handleCreate = async (input: NewExercise | string) => {
    setCreating(true);
    try {
      const draft: NewExercise =
        typeof input === "string"
          ? { name: input, primary_muscle: muscle, equipment }
          : input;
      const exercise = await createExercise(userId, draft);
      reload();
      setQuery("");
      handlePick(exercise);
      toast({ message: `Added "${exercise.name}" to your library`, icon: "check", tone: "success" });
    } catch (err) {
      console.error(err);
      toast({
        message: friendlyError(err, "Couldn't create that exercise"),
        icon: "x",
        tone: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleFavorite = async (exerciseId: string) => {
    const next = !favorites.includes(exerciseId);
    setFavorites((prev) => (next ? [...prev, exerciseId] : prev.filter((id) => id !== exerciseId)));
    haptic("tap");
    try {
      await toggleFavorite(userId, exerciseId, next);
    } catch {
      setFavorites((prev) => (next ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]));
    }
  };

  const exactMatch = filtered.some((e) => e.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        multi ? (
          <Button block size="lg" onClick={onClose}>
            {added.length > 0 ? `Done · ${added.length} added` : "Done"}
          </Button>
        ) : undefined
      }
    >
      <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3">
        <Field
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
        />

        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {(["all", "favorites", "recent"] as Tab[]).map((t) => (
            <Chip key={t} size="sm" selected={tab === t} onClick={() => setTab(t)}>
              {t === "all" ? "All" : t === "favorites" ? "Favorites" : "Recent"}
            </Chip>
          ))}
          <span className="mx-0.5 w-px shrink-0 self-center bg-line" aria-hidden />
          {MUSCLE_GROUPS.map((m) => (
            <Chip
              key={m}
              size="sm"
              selected={muscle === m}
              onClick={() => setMuscle(muscle === m ? null : m)}
            >
              {m}
            </Chip>
          ))}
        </div>

        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
          {EQUIPMENT.map((eq) => (
            <Chip
              key={eq}
              size="sm"
              selected={equipment === eq}
              onClick={() => setEquipment(equipment === eq ? null : eq)}
            >
              {eq}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 pb-4">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!loading && libraryError && (
          <EmptyState
            icon="cloudOff"
            title="Can't load your library"
            body={friendlyError(
              libraryError,
              "Something went wrong loading exercises. Try again in a moment.",
            )}
          />
        )}

        {!loading &&
          !libraryError &&
          filtered.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              added={added.includes(exercise.id)}
              favorite={favorites.includes(exercise.id)}
              onPick={() => handlePick(exercise)}
              onFavorite={() => void handleFavorite(exercise.id)}
            />
          ))}

        {!loading && trimmed.length >= 2 && !exactMatch && (
          <Button
            block
            variant="soft"
            size="lg"
            icon="plus"
            loading={creating}
            className="mt-2"
            onClick={() => void handleCreate(trimmed)}
          >
            Create &ldquo;{trimmed}&rdquo;
          </Button>
        )}

        {!loading && !libraryError && trimmed.length >= 2 && (
          <WgerResults
            query={trimmed}
            onPick={(w) =>
              void handleCreate({
                name: w.name,
                source: "wger",
                wger_id: w.id,
                primary_muscle: muscleFromWger(w),
                equipment,
              }).catch(() => {
                /* handled in handleCreate */
              })
            }
            existingNames={library?.map((e) => e.name.toLowerCase()) ?? []}
          />
        )}

        {!loading && !libraryError && filtered.length === 0 && trimmed.length < 2 && (
          <EmptyState
            icon="search"
            title={tab === "favorites" ? "No favorites yet" : "Nothing here"}
            body={
              tab === "favorites"
                ? "Tap the star on any exercise to pin it here."
                : "Try a different filter, or search to add something new."
            }
          />
        )}
      </div>
    </Sheet>
  );
}

function score(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  return 2 + n.indexOf(q);
}

/** Best-effort map from wger's category / muscle labels onto our MuscleGroup. */
function muscleFromWger(w: WgerExercise): MuscleGroup | null {
  const labels = [w.category?.name, ...(w.muscles ?? []).map((m) => m.name)]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  const hit = (needle: string) => labels.some((l) => l.includes(needle));
  if (hit("chest") || hit("pectoral")) return "chest";
  if (hit("lat") || hit("back") || hit("trapezius") || hit("rhomboid")) return "back";
  if (hit("shoulder") || hit("deltoid")) return "shoulders";
  if (hit("bicep")) return "biceps";
  if (hit("tricep")) return "triceps";
  if (hit("forearm")) return "forearms";
  if (hit("quad") || hit("thigh")) return "quads";
  if (hit("hamstring")) return "hamstrings";
  if (hit("glute")) return "glutes";
  if (hit("calf") || hit("calve")) return "calves";
  if (hit("abs") || hit("core") || hit("oblique")) return "core";
  if (hit("cardio")) return "cardio";
  if (hit("arm")) return "biceps";
  if (hit("leg")) return "quads";
  return null;
}

function ExerciseRow({
  exercise,
  added,
  favorite,
  onPick,
  onFavorite,
}: {
  exercise: Exercise;
  added: boolean;
  favorite: boolean;
  onPick: () => void;
  onFavorite: () => void;
}) {
  const meta = [exercise.primary_muscle, exercise.equipment].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-1">
      <motion.button
        type="button"
        onClick={onPick}
        whileTap={{ scale: 0.98 }}
        className="flex min-h-16 flex-1 items-center gap-3 rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{exercise.name}</span>
          {meta && (
            <span className="mt-0.5 block truncate text-[12.5px] capitalize text-fg-muted">
              {meta}
            </span>
          )}
        </span>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            added ? "bg-success/20 text-success" : "bg-surface text-fg-muted",
          )}
        >
          <Icon name={added ? "check" : "plus"} size={17} />
        </span>
      </motion.button>
      <IconButton
        icon="star"
        label={favorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
        variant="ghost"
        onClick={onFavorite}
        className={favorite ? "text-pop" : "text-fg-subtle"}
        iconSize={19}
      />
    </div>
  );
}

/** wger results are only offered for names not already in the library. */
function WgerResults({
  query,
  onPick,
  existingNames,
}: {
  query: string;
  onPick: (exercise: WgerExercise) => void;
  existingNames: string[];
}) {
  const [results, setResults] = useState<WgerExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.length < 3) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(() => {
      setLoading(true);
      searchWger(query)
        .then((rows) =>
          setResults(
            rows.filter((r) => !existingNames.includes(r.name.toLowerCase())).slice(0, 8),
          ),
        )
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 450);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!loading && results.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle">
        <Icon name="search" size={13} /> From the wger database
      </p>
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r)}
            className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3 text-left active:scale-[0.99]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{r.name}</span>
              <span className="block truncate text-[12.5px] text-fg-muted">
                {r.category.name}
              </span>
            </span>
            <Icon name="plus" size={18} className="shrink-0 text-fg-subtle" />
          </button>
        ))}
      </div>
    </div>
  );
}
