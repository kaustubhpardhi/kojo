"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchExerciseCategories,
  fetchExercisesByCategory,
  preloadEnglishTranslationIndex,
  searchExercises,
  type WgerExercise,
  type WgerExerciseCategory,
} from "@/lib/wger-api";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface ReplacementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  originalExerciseName: string;
  onSelect: (name: string) => void;
}

function resultGroupLabel(ex: WgerExercise): string {
  if (ex.muscles.length > 0) return ex.muscles[0]!.name;
  return ex.category.name;
}

export function ReplacementSheet({
  isOpen,
  onClose,
  originalExerciseName,
  onSelect,
}: ReplacementSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [categories, setCategories] = useState<WgerExerciseCategory[]>([]);
  const [results, setResults] = useState<WgerExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      setResults(await searchExercises(trimmed));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSearchInput("");
    setResults([]);
    setLoading(false);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    void preloadEnglishTranslationIndex();
    let cancelled = false;
    setCategoriesLoading(true);
    fetchExerciseCategories()
      .then((c) => {
        if (!cancelled) setCategories(c);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!debouncedSearch) {
      setResults([]);
      return;
    }
    void runSearch(debouncedSearch);
  }, [debouncedSearch, isOpen, runSearch]);

  const showCategories = !debouncedSearch && !loading;
  const showEmpty =
    !loading && debouncedSearch.length > 0 && results.length === 0;
  const showInitialLoading = categoriesLoading && showCategories;

  const handleCategoryClick = async (cat: WgerExerciseCategory) => {
    setSearchInput(cat.name);
    setLoading(true);
    setResults([]);
    try {
      setResults(await fetchExercisesByCategory(cat.id));
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (name: string) => {
    onSelect(name);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0A0A0A]">
      <header className="shrink-0 border-b border-[#3A3A3A] px-4 pt-4 pb-6">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onClose}
            className="tap-flash shrink-0 w-10 h-10 flex items-center justify-center border border-[#3A3A3A] text-[#F2F2F0] font-bold"
            aria-label="Back"
          >
            ←
          </button>
          <div className="flex-1 text-center pr-10">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#F2F2F0]">
              Replace exercise
            </h2>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-[#3A3A3A]">
              Replacing: {originalExerciseName}
            </p>
          </div>
        </div>
      </header>

      <div className="shrink-0 px-4 pt-2 pb-4">
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="SEARCH EXERCISES…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-[#3A3A3A] rounded-none py-3 text-lg text-[#F2F2F0] placeholder:text-[#3A3A3A] placeholder:text-lg focus:outline-none focus:border-[#C8FF00]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading && (
          <div className="space-y-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-full h-14 bg-[#1A1A1A] wger-placeholder-pulse border-b border-[#3A3A3A]"
              />
            ))}
          </div>
        )}

        {showEmpty && (
          <div className="py-16 text-center">
            <p className="font-bold text-[#F2F2F0] uppercase tracking-wide">
              No exercises found
            </p>
            <p className="mt-2 text-xs text-[#3A3A3A] uppercase tracking-widest">
              Try a different search term
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <ul>
            {results.map((ex) => (
              <li key={ex.id} className="border-b border-[#3A3A3A]">
                <button
                  type="button"
                  onClick={() => handlePick(ex.name)}
                  className="tap-flash w-full flex items-center justify-between gap-3 py-4 text-left min-h-14"
                >
                  <span className="font-bold text-[#F2F2F0] text-sm shrink">
                    {ex.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#3A3A3A] shrink-0">
                    {resultGroupLabel(ex)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {showCategories && (
          <div>
            {showInitialLoading ? (
              <div className="space-y-0">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-full h-12 bg-[#1A1A1A] wger-placeholder-pulse border-b border-[#3A3A3A]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => void handleCategoryClick(cat)}
                    className="tap-flash px-3 py-2 border border-[#3A3A3A] bg-transparent text-[10px] font-bold uppercase tracking-[0.15em] text-[#F2F2F0]"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
