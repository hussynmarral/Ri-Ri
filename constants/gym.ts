// Gym rotation — Day 1 always Monday

export interface Exercise {
  name: string;
  muscle: string;
  sets: number;
  reps: string; // e.g. "8-12" or "60s"
}

export type GymDay = {
  day: number; // 1-7
  label: string;
  muscles: string[];
  type: 'weights' | 'cardio';
  durationMinutes: number;
  exercises: Exercise[];
};

export const GYM_ROTATION: GymDay[] = [
  {
    day: 1, label: 'Back + Biceps + Abs', muscles: ['Back', 'Biceps', 'Abs'], type: 'weights', durationMinutes: 90,
    exercises: [
      { name: 'Pull-ups',        muscle: 'Back',   sets: 4, reps: '8-12' },
      { name: 'Barbell Row',     muscle: 'Back',   sets: 4, reps: '8-10' },
      { name: 'Lat Pulldown',    muscle: 'Back',   sets: 3, reps: '10-12' },
      { name: 'Seated Cable Row',muscle: 'Back',   sets: 3, reps: '12' },
      { name: 'Barbell Curl',    muscle: 'Biceps', sets: 3, reps: '10-12' },
      { name: 'Hammer Curl',     muscle: 'Biceps', sets: 3, reps: '12' },
      { name: 'Crunches',        muscle: 'Abs',    sets: 3, reps: '20' },
      { name: 'Leg Raises',      muscle: 'Abs',    sets: 3, reps: '15' },
    ],
  },
  {
    day: 2, label: 'Shoulders + Legs', muscles: ['Shoulders', 'Legs'], type: 'weights', durationMinutes: 90,
    exercises: [
      { name: 'Military Press',  muscle: 'Shoulders', sets: 4, reps: '8-10' },
      { name: 'Lateral Raise',   muscle: 'Shoulders', sets: 4, reps: '12-15' },
      { name: 'Front Raise',     muscle: 'Shoulders', sets: 3, reps: '12' },
      { name: 'Squat',           muscle: 'Legs',      sets: 4, reps: '8-10' },
      { name: 'Leg Press',       muscle: 'Legs',      sets: 3, reps: '12' },
      { name: 'Romanian Deadlift', muscle: 'Legs',    sets: 3, reps: '10' },
      { name: 'Calf Raise',      muscle: 'Legs',      sets: 4, reps: '15-20' },
    ],
  },
  {
    day: 3, label: 'Chest + Triceps + Abs', muscles: ['Chest', 'Triceps', 'Abs'], type: 'weights', durationMinutes: 90,
    exercises: [
      { name: 'Bench Press',     muscle: 'Chest',    sets: 4, reps: '8-10' },
      { name: 'Incline DB Press',muscle: 'Chest',    sets: 3, reps: '10-12' },
      { name: 'Cable Flye',      muscle: 'Chest',    sets: 3, reps: '12-15' },
      { name: 'Dips',            muscle: 'Triceps',  sets: 3, reps: '10-15' },
      { name: 'Skullcrusher',    muscle: 'Triceps',  sets: 3, reps: '10-12' },
      { name: 'Tricep Pushdown', muscle: 'Triceps',  sets: 3, reps: '12' },
      { name: 'Plank',           muscle: 'Abs',      sets: 3, reps: '60s' },
      { name: 'Russian Twist',   muscle: 'Abs',      sets: 3, reps: '20' },
    ],
  },
  {
    day: 4, label: 'Back + Shoulders', muscles: ['Back', 'Shoulders'], type: 'weights', durationMinutes: 90,
    exercises: [
      { name: 'Deadlift',        muscle: 'Back',      sets: 4, reps: '5-8' },
      { name: 'T-Bar Row',       muscle: 'Back',      sets: 3, reps: '10' },
      { name: 'Lat Pulldown',    muscle: 'Back',      sets: 3, reps: '12' },
      { name: 'Overhead Press',  muscle: 'Shoulders', sets: 3, reps: '8-10' },
      { name: 'Arnold Press',    muscle: 'Shoulders', sets: 3, reps: '10-12' },
      { name: 'Rear Delt Flye',  muscle: 'Shoulders', sets: 3, reps: '15' },
    ],
  },
  {
    day: 5, label: 'Arms + Abs', muscles: ['Arms', 'Abs'], type: 'weights', durationMinutes: 90,
    exercises: [
      { name: 'Barbell Curl',    muscle: 'Biceps',  sets: 4, reps: '10-12' },
      { name: 'Preacher Curl',   muscle: 'Biceps',  sets: 3, reps: '10-12' },
      { name: 'Concentration Curl', muscle: 'Biceps', sets: 3, reps: '12' },
      { name: 'Close Grip Bench',muscle: 'Triceps', sets: 3, reps: '10' },
      { name: 'Overhead Extension', muscle: 'Triceps', sets: 3, reps: '12' },
      { name: 'Cable Pushdown',  muscle: 'Triceps', sets: 3, reps: '15' },
      { name: 'Hanging Leg Raise', muscle: 'Abs',   sets: 3, reps: '15' },
      { name: 'Cable Crunch',    muscle: 'Abs',     sets: 3, reps: '15' },
    ],
  },
  {
    day: 6, label: 'Walk / Run', muscles: [], type: 'cardio', durationMinutes: 60,
    exercises: [
      { name: 'Incline Treadmill Walk', muscle: 'Cardio', sets: 1, reps: '30-45m' },
      { name: 'Light Run',              muscle: 'Cardio', sets: 1, reps: '15m' },
    ],
  },
  {
    day: 7, label: 'Walk / Run', muscles: [], type: 'cardio', durationMinutes: 120,
    exercises: [
      { name: 'Outdoor Walk',    muscle: 'Cardio', sets: 1, reps: '60-90m' },
      { name: 'Stretching',      muscle: 'Mobility', sets: 1, reps: '20m' },
    ],
  },
];

// Day 1 = Monday. Returns gym day object for a given JS Date.
export function getGymDayForDate(date: Date): GymDay {
  const jsDay = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  // Convert to rotation index: Mon=0 → Day1, ..., Sun=6 → Day7
  const rotationIndex = jsDay === 0 ? 6 : jsDay - 1;
  return GYM_ROTATION[rotationIndex];
}
