export type DayType = "A" | "B" | "C";

export interface Exercise {
  id: string;
  day: DayType;
  order: number;
  name: string;
  sets: number;
  rep_range_low: number;
  rep_range_high: number;
  is_priority: boolean;
  amrap_last_set: boolean;
  notes: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  day: DayType;
  date: string;
  completed_at: string | null;
  created_at: string;
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_amrap: boolean;
  logged_at: string;
}

export interface SessionWithLogs extends Session {
  set_logs: (SetLog & { exercise: Exercise })[];
}

export interface ExerciseWithPrevious extends Exercise {
  previousSets: { weight: number; reps: number }[];
}

export interface StreakData {
  current: number;
  longest: number;
}

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, "id" | "created_at">;
        Update: Partial<Omit<Exercise, "id">>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, "id" | "created_at">;
        Update: Partial<Omit<Session, "id">>;
      };
      set_logs: {
        Row: SetLog;
        Insert: Omit<SetLog, "id" | "logged_at">;
        Update: Partial<Omit<SetLog, "id">>;
      };
    };
  };
}
