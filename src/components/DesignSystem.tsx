"use client";

import { useState } from "react";
import { usePrefs } from "./PreferencesProvider";
import { Button, IconButton } from "./ui/Button";
import { Burst } from "./ui/Burst";
import { Card } from "./ui/Card";
import { Chip } from "./ui/Chip";
import { EmptyState } from "./ui/EmptyState";
import { Field, TextArea } from "./ui/Field";
import { Icon } from "./ui/Icon";
import { Mark, Mascot } from "./ui/Mark";
import { Ring } from "./ui/Ring";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Sheet } from "./ui/Sheet";
import { Skeleton } from "./ui/Skeleton";
import { Stepper } from "./ui/Stepper";
import { useToast } from "./ui/Toast";
import { PALETTES, type Palette, type ThemeMode } from "@/lib/prefs";

const SWATCHES = [
  ["--bg", "Background"],
  ["--surface", "Surface"],
  ["--surface-2", "Surface 2"],
  ["--surface-3", "Surface 3"],
  ["--line", "Line"],
  ["--fg", "Foreground"],
  ["--fg-muted", "Muted"],
  ["--fg-subtle", "Subtle"],
  ["--accent", "Accent"],
  ["--accent-fg", "Accent text"],
  ["--pop", "Pop"],
  ["--success", "Success"],
  ["--danger", "Danger"],
  ["--heat", "Heat"],
] as const;

export function DesignSystem() {
  const { prefs, setPrefs } = usePrefs();
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stepper, setStepper] = useState<number | "">(60);
  const [burst, setBurst] = useState(false);

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-safe">
      <header className="flex items-center gap-3 py-5">
        <Mark size={40} />
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
            Design system
          </h1>
          <p className="text-[13.5px] text-fg-muted">kōjō · tokens and components</p>
        </div>
      </header>

      <Section title="Theme">
        <SegmentedControl<ThemeMode>
          label="Theme mode"
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
          options={[
            { value: "system", label: "Auto" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <div className="mt-2 flex gap-2">
          {PALETTES.map((p) => (
            <Chip
              key={p.id}
              selected={prefs.palette === p.id}
              onClick={() => setPrefs({ palette: p.id as Palette })}
            >
              {p.name}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-2">
          {SWATCHES.map(([token, label]) => (
            <div key={token} className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-surface-2 p-2.5">
              <span
                className="h-9 w-9 shrink-0 rounded-[10px] ring-1 ring-line"
                style={{ background: `var(${token})` }}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{label}</span>
                <span className="block truncate text-[11px] text-fg-subtle">{token}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-2">
          <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em]">
            Display 40
          </p>
          <p className="font-display text-[28px] font-extrabold tracking-[-0.02em]">Title 28</p>
          <p className="font-display text-[19px] font-bold">Heading 19</p>
          <p className="text-[15px]">Body 15 — the default reading size.</p>
          <p className="text-[13px] text-fg-muted">Caption 13 — secondary detail.</p>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
            Label 11.5
          </p>
          <p className="font-display text-[26px] font-extrabold tabular">1234.5 tabular</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="space-y-2">
          <Button block size="xl">Primary XL — 64px</Button>
          <Button block size="lg" variant="secondary" icon="plus">Secondary LG</Button>
          <Button block size="md" variant="soft" icon="sparkle">Soft MD</Button>
          <Button block size="sm" variant="ghost">Ghost SM</Button>
          <Button block size="md" variant="danger" icon="trash">Danger</Button>
          <Button block size="md" loading>Loading</Button>
          <Button block size="md" disabled>Disabled</Button>
          <div className="flex gap-2 pt-1">
            <IconButton icon="plus" label="Add" />
            <IconButton icon="swap" label="Swap" variant="soft" />
            <IconButton icon="x" label="Close" variant="ghost" />
            <IconButton icon="play" label="Start" variant="primary" size="lg" />
          </div>
        </div>
      </Section>

      <Section title="Cards & radius">
        <div className="space-y-2">
          <Card>Default surface card · radius lg (20px)</Card>
          <Card tone="muted">Muted card</Card>
          <Card tone="accent">Accent card</Card>
          <div className="flex gap-2">
            {(["sm", "md", "lg", "xl"] as const).map((r) => (
              <div
                key={r}
                className="flex h-16 flex-1 items-center justify-center bg-surface-2 text-[12px] font-semibold"
                style={{ borderRadius: `var(--radius-${r})` }}
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Stepper">
        <Stepper
          label="Weight"
          unit="kg"
          value={stepper}
          onChange={setStepper}
          step={2.5}
          quickSteps={[2.5, 5]}
          decimals
          ghost="57.5 kg"
          onGhostFill={() => setStepper(57.5)}
        />
      </Section>

      <Section title="Fields">
        <div className="space-y-3">
          <Field label="Name" placeholder="Push Day" />
          <TextArea label="Notes" placeholder="Cues and reminders" />
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-2">
          <Chip selected>Selected</Chip>
          <Chip>Default</Chip>
          <Chip size="sm">Small</Chip>
          <Chip size="sm" selected>Small selected</Chip>
        </div>
      </Section>

      <Section title="Rings">
        <div className="flex items-center gap-4">
          <Ring value={0.66} label="2 of 3 done">
            <span className="font-display text-[20px] font-extrabold tabular">2</span>
            <span className="text-[11px] text-fg-muted">of 3</span>
          </Ring>
          <Ring value={1} size={72} color="var(--success)" label="Complete">
            <Icon name="check" size={22} />
          </Ring>
          <Ring value={0.25} size={56} stroke={7} color="var(--pop)" label="Quarter" />
        </div>
      </Section>

      <Section title="Mascot">
        <div className="flex items-end gap-5">
          <Mascot size={80} />
          <Mascot size={80} mood="proud" />
          <Mark size={48} animated />
        </div>
        <p className="mt-2 text-[13px] text-fg-muted">
          The mark is 工 from 工場 (kōjō, &ldquo;workshop&rdquo;) read as a loaded barbell:
          two plates and a bar. The mascot adds eyes for empty states and the
          session-complete screen.
        </p>
      </Section>

      <Section title="Feedback">
        <div className="space-y-2">
          <Button block variant="secondary" onClick={() => toast({ message: "Nice. Set 3 down.", icon: "check" })}>
            Show toast
          </Button>
          <Button
            block
            variant="secondary"
            onClick={() => toast({ message: "New PR — 102.5 kg!", icon: "trophy", tone: "success" })}
          >
            Show success toast
          </Button>
          <Button block variant="secondary" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <div className="relative">
            <Button
              block
              variant="secondary"
              onClick={() => {
                setBurst(true);
                setTimeout(() => setBurst(false), 1200);
              }}
            >
              PR burst
            </Button>
            {burst && <Burst />}
          </div>
        </div>
      </Section>

      <Section title="Loading & empty">
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="mt-2 rounded-[var(--radius-lg)] bg-surface">
          <EmptyState
            icon="dumbbell"
            title="Nothing here yet"
            body="Friendly, specific, and always with a way out."
            action={<Button size="md">Do the thing</Button>}
          />
        </div>
      </Section>

      <Section title="Motion">
        <ul className="space-y-1.5 text-[13.5px] text-fg-muted">
          <li>
            <strong className="text-fg">snappy</strong> — stiffness 520, damping 34. Taps, toggles.
          </li>
          <li>
            <strong className="text-fg">gentle</strong> — 260/28. Screen and layout transitions.
          </li>
          <li>
            <strong className="text-fg">bouncy</strong> — 420/18. Celebrations.
          </li>
          <li>
            <strong className="text-fg">sheet</strong> — 380/38. Bottom sheets.
          </li>
          <li>All of it collapses to near-instant under prefers-reduced-motion.</li>
        </ul>
      </Section>

      <Section title="Icons">
        <div className="flex flex-wrap gap-2">
          {(
            [
              "home", "dumbbell", "chart", "user", "plus", "minus", "play", "check",
              "flame", "trophy", "swap", "skip", "grip", "clock", "star", "sparkle",
              "share", "archive", "trash", "copy", "edit", "note", "cloudOff", "bolt",
            ] as const
          ).map((name) => (
            <span
              key={name}
              title={name}
              className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-surface-2 text-fg-muted"
            >
              <Icon name={name} size={20} />
            </span>
          ))}
        </div>
      </Section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Bottom sheet"
        subtitle="Drag down or tap the backdrop to dismiss."
        footer={<Button block size="lg" onClick={() => setSheetOpen(false)}>Done</Button>}
      >
        <p className="pb-4 text-[14.5px] text-fg-muted">
          Sheets replaced the old full-screen takeovers. They keep context visible
          behind them and stay reachable with one thumb.
        </p>
      </Sheet>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}
