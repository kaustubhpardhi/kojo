import { describe, expect, it } from "vitest";
import {
  decideProgression,
  roundToIncrement,
  setsAtTopWeight,
  suggestedWarmups,
  workingSetsOnly,
} from "./progression";

const base = {
  repMin: 6,
  repMax: 8,
  incrementKg: 2.5,
  isDeload: false,
};

describe("workingSetsOnly", () => {
  it("ignores warm-ups", () => {
    const sets = workingSetsOnly([
      { weight: 40, reps: 5, setType: "warmup" },
      { weight: 60, reps: 8, setType: "working" },
      { weight: 60, reps: 8, setType: "failure" },
    ]);
    expect(sets).toHaveLength(2);
    expect(sets.every((s) => s.weight === 60)).toBe(true);
  });
});

describe("setsAtTopWeight", () => {
  it("ignores lighter back-off sets", () => {
    const top = setsAtTopWeight([
      { weight: 100, reps: 6 },
      { weight: 100, reps: 6 },
      { weight: 80, reps: 10 },
    ]);
    expect(top).toHaveLength(2);
    expect(top.every((s) => s.weight === 100)).toBe(true);
  });
});

describe("decideProgression", () => {
  it("all sets at rep_max → +increment and reps reset to rep_min", () => {
    const d = decideProgression({
      ...base,
      lastSessionSets: [
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
      ],
    });
    expect(d.kind).toBe("increase_load");
    if (d.kind === "increase_load") {
      expect(d.targetWeight).toBe(102.5);
      expect(d.targetReps).toBe(6);
    }
  });

  it("keepWeight at rep_max holds load instead of jumping", () => {
    const d = decideProgression({
      ...base,
      keepWeight: true,
      lastSessionSets: [
        { weight: 10, reps: 20 },
        { weight: 10, reps: 20 },
      ],
      repMin: 15,
      repMax: 20,
    });
    expect(d.kind).toBe("add_reps");
    if (d.kind === "add_reps") expect(d.targetWeight).toBe(10);
  });

  it("mixed reps all >= rep_min → same weight, +1 rep per set capped", () => {
    const d = decideProgression({
      ...base,
      lastSessionSets: [
        { weight: 100, reps: 6 },
        { weight: 100, reps: 7 },
        { weight: 100, reps: 8 },
      ],
    });
    expect(d.kind).toBe("add_reps");
    if (d.kind === "add_reps") {
      expect(d.targetWeight).toBe(100);
      expect(d.targetRepsPerSet).toEqual([7, 8, 8]);
    }
  });

  it("a set below rep_min → repeat weight", () => {
    const d = decideProgression({
      ...base,
      lastSessionSets: [
        { weight: 100, reps: 6 },
        { weight: 100, reps: 5 },
        { weight: 100, reps: 6 },
      ],
    });
    expect(d.kind).toBe("repeat");
    if (d.kind === "repeat") expect(d.targetWeight).toBe(100);
  });

  it("no history → cue + optional hint", () => {
    const d = decideProgression({
      ...base,
      lastSessionSets: [],
      anyPriorWeight: 80,
    });
    expect(d.kind).toBe("no_history");
    if (d.kind === "no_history") {
      expect(d.targetWeight).toBeNull();
      expect(d.hintWeight).toBe(80);
    }
  });

  it("warm-ups ignored for the decision", () => {
    const d = decideProgression({
      ...base,
      lastSessionSets: [
        { weight: 50, reps: 5, setType: "warmup" },
        { weight: 100, reps: 8, setType: "working" },
        { weight: 100, reps: 8, setType: "working" },
        { weight: 100, reps: 8, setType: "working" },
      ],
    });
    expect(d.kind).toBe("increase_load");
  });

  it("mixed set weights only evaluate top W", () => {
    const d = decideProgression({
      ...base,
      lastSessionSets: [
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
        { weight: 80, reps: 4 },
      ],
    });
    expect(d.kind).toBe("increase_load");
  });

  it("deload uses ~90% of week-3 top, rounded", () => {
    const d = decideProgression({
      ...base,
      isDeload: true,
      week3TopWeight: 100,
      lastSessionSets: [{ weight: 100, reps: 6 }],
    });
    expect(d.kind).toBe("deload");
    if (d.kind === "deload") {
      expect(d.targetWeight).toBe(90);
      expect(d.targetReps).toBe(6);
    }
  });

  it("deload rounds to increment", () => {
    expect(roundToIncrement(92.25, 2.5)).toBe(92.5);
    const d = decideProgression({
      ...base,
      isDeload: true,
      week3TopWeight: 102.5,
      lastSessionSets: [],
    });
    expect(d.kind).toBe("deload");
    if (d.kind === "deload") {
      // 102.5 * 0.9 = 92.25 → 92.5
      expect(d.targetWeight).toBe(92.5);
    }
  });

  it("bodyweight weight 0 can progress via increment", () => {
    const d = decideProgression({
      ...base,
      repMin: 8,
      repMax: 10,
      lastSessionSets: [
        { weight: 0, reps: 10 },
        { weight: 0, reps: 10 },
        { weight: 0, reps: 10 },
      ],
    });
    expect(d.kind).toBe("increase_load");
    if (d.kind === "increase_load") {
      expect(d.targetWeight).toBe(2.5);
      expect(d.targetReps).toBe(8);
    }
  });
});

describe("suggestedWarmups", () => {
  it("builds 50/70/85% ramp under the target", () => {
    const w = suggestedWarmups(100);
    expect(w).toHaveLength(3);
    expect(w[0]).toMatchObject({ weight: 50, reps: 5, setType: "warmup" });
    expect(w[1]).toMatchObject({ weight: 70, reps: 3, setType: "warmup" });
    expect(w[2]).toMatchObject({ weight: 85, reps: 2, setType: "warmup" });
  });
});
