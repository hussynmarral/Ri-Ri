// Gym rotation — Day 1 always Monday

export type GymDay = {
  day: number; // 1-7
  label: string;
  muscles: string[];
  type: 'weights' | 'cardio';
  durationMinutes: number;
};

export const GYM_ROTATION: GymDay[] = [
  { day: 1, label: 'Back + Biceps + Abs', muscles: ['Back', 'Biceps', 'Abs'], type: 'weights', durationMinutes: 90 },
  { day: 2, label: 'Shoulders + Legs', muscles: ['Shoulders', 'Legs'], type: 'weights', durationMinutes: 90 },
  { day: 3, label: 'Chest + Triceps + Abs', muscles: ['Chest', 'Triceps', 'Abs'], type: 'weights', durationMinutes: 90 },
  { day: 4, label: 'Back + Shoulders', muscles: ['Back', 'Shoulders'], type: 'weights', durationMinutes: 90 },
  { day: 5, label: 'Arms + Abs', muscles: ['Arms', 'Abs'], type: 'weights', durationMinutes: 90 },
  { day: 6, label: 'Walk / Run', muscles: [], type: 'cardio', durationMinutes: 60 },
  { day: 7, label: 'Walk / Run', muscles: [], type: 'cardio', durationMinutes: 120 },
];

// Day 1 = Monday. Returns gym day object for a given JS Date.
export function getGymDayForDate(date: Date): GymDay {
  const jsDay = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  // Convert to rotation index: Mon=0 → Day1, ..., Sun=6 → Day7
  const rotationIndex = jsDay === 0 ? 6 : jsDay - 1;
  return GYM_ROTATION[rotationIndex];
}
