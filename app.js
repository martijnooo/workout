/* ============================================================
   Workout Tracker — vanilla JS, localStorage persistence.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Storage ---------- */
  const KEYS = {
    exercises: 'wt.exercises',
    workouts: 'wt.workouts',
    active: 'wt.active',
    settings: 'wt.settings',
    templates: 'wt.templates',
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota / private mode */ }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Seed default exercises ---------- */
  const DEFAULT_EXERCISES = [
    ['Bench Press', 'Chest'], ['Incline Dumbbell Press', 'Chest'], ['Push-up', 'Chest'],
    ['Pull-up', 'Back'], ['Barbell Row', 'Back'], ['Lat Pulldown', 'Back'], ['Deadlift', 'Back'],
    ['Overhead Press', 'Shoulders'], ['Lateral Raise', 'Shoulders'],
    ['Bicep Curl', 'Biceps'], ['Hammer Curl', 'Biceps'],
    ['Tricep Pushdown', 'Triceps'], ['Skullcrusher', 'Triceps'],
    ['Squat', 'Legs'], ['Leg Press', 'Legs'], ['Lunge', 'Legs'], ['Leg Curl', 'Legs'], ['Calf Raise', 'Legs'],
    ['Hip Thrust', 'Glutes'],
    ['Plank', 'Core'], ['Hanging Leg Raise', 'Core'],
  ];

  /* ---------- State ---------- */
  let exercises = load(KEYS.exercises, null);
  if (!exercises) {
    exercises = DEFAULT_EXERCISES.map(([name, muscle]) => ({ id: uid(), name, muscle }));
    save(KEYS.exercises, exercises);
  }
  let workouts = load(KEYS.workouts, []);
  let templates = load(KEYS.templates, []);
  let active = load(KEYS.active, null);

  /* ---------- Starter routines (from the user's Drive plans) ----------
     Each exercise: [name, muscle group, number of sets, target reps].
     Target reps are shown as placeholders/hints, not logged values.        */
  // Each exercise: [name, muscle, sets, target reps, supersetGroup?]. Exercises
  // sharing a superset letter (and adjacent) are performed as a superset.
  const STARTER_ROUTINES = [
    { name: '3-Day A · Full Body', exercises: [
      ['Barbell Bench Press', 'Chest', 3, '8-10'],
      ['Dumbbell Romanian Deadlift', 'Legs', 3, '8-10'],
      ['(Weighted) Pull-Ups', 'Back', 3, '6-12'],
      ['Bulgarian Split Squat (Quad Focus)', 'Legs', 3, '8-10/leg'],
      ['Seated Mid-Chest Cable Fly', 'Chest', 3, '10-15', 'A'],
      ['Dumbbell Lateral Raise', 'Shoulders', 3, '15-20', 'A'],
      ['Standing Weighted Calf Raise', 'Legs', 3, '10-15', 'B'],
      ['Standing Face Pulls', 'Shoulders', 3, '10', 'B'],
    ]},
    { name: '3-Day B · Full Body', exercises: [
      ['Barbell Back Squat', 'Legs', 3, '8-10'],
      ['Standing Barbell Overhead Press', 'Shoulders', 3, '6-8'],
      ['Seated Leg Curls', 'Legs', 3, '10-15'],
      ['Seated Cable Row (Mid/Upper Back)', 'Back', 3, '10-12', 'A'],
      ['Banded Push-Ups', 'Chest', 3, '10+', 'A'],
      ['Incline Dumbbell Overhead Extensions', 'Triceps', 3, '10-15'],
      ['Seated Weighted Calf Raise', 'Legs', 3, '10-15', 'B'],
      ['RKC Plank', 'Core', 3, '30-60s', 'B'],
    ]},
    { name: '3-Day C · Full Body', exercises: [
      ['Barbell Deadlift', 'Legs', 3, '6-8'],
      ['Low Incline Dumbbell Press', 'Chest', 3, '10-12', 'A'],
      ['Dumbbell Chest Supported Row (Mid/Upper Back)', 'Back', 3, '10-12', 'A'],
      ['Seated Leg Extensions', 'Legs', 3, '10-15'],
      ['Cable Lateral Raise', 'Shoulders', 3, '15-20'],
      ['Standing Cable Curl', 'Biceps', 3, '10-15'],
      ['Standing Face Pulls', 'Shoulders', 2, '10', 'B'],
      ['Bird Dog', 'Core', 2, '5/side', 'B'],
    ]},
    { name: '4-Day · Upper 1', exercises: [
      ['Barbell Bench Press', 'Chest', 3, '8-10'],
      ['(Weighted) Pull-Ups', 'Back', 3, '6-12'],
      ['Standing Barbell Overhead Press', 'Shoulders', 3, '6-8'],
      ['Seated Mid-Chest Cable Fly', 'Chest', 3, '10-15'],
      ['Dumbbell Chest Supported Row (Mid/Upper Back)', 'Back', 3, '10-12'],
      ['Incline Dumbbell Curls', 'Biceps', 3, '8-10', 'A'],
      ['Lying Incline Lateral Raise', 'Shoulders', 3, '15-20', 'A'],
      ['Standing Face Pulls', 'Shoulders', 2, '10'],
    ]},
    { name: '4-Day · Lower 1 (Quads)', exercises: [
      ['Barbell Back Squat', 'Legs', 3, '8-10'],
      ['Dumbbell Romanian Deadlift', 'Legs', 3, '8-10', 'A'],
      ['Seated Leg Extensions', 'Legs', 3, '10-15', 'A'],
      ['Walking Lunges (Quad Focus)', 'Legs', 3, '8-10/leg'],
      ['Standing Weighted Calf Raise', 'Legs', 3, '10-15'],
      ['Side Plank', 'Core', 2, '30s/side'],
    ]},
    { name: '4-Day · Upper 2', exercises: [
      ['Low Incline Dumbbell Press', 'Chest', 3, '8-10'],
      ['Chest Supported Dumbbell Row (Lat Focus)', 'Back', 3, '10-12'],
      ['Flat Dumbbell Press', 'Chest', 3, '8-10'],
      ['Rear Delt Cable Row', 'Shoulders', 3, '12-15'],
      ['Cable Lateral Raise', 'Shoulders', 3, '15-20'],
      ['Hammer Curls', 'Biceps', 3, '8-10', 'A'],
      ['Incline Dumbbell Overhead Extensions', 'Triceps', 3, '10-15', 'A'],
      ['Standing Face Pulls', 'Shoulders', 2, '10'],
    ]},
    { name: '4-Day · Lower 2 (Glutes)', exercises: [
      ['Barbell Deadlift', 'Legs', 3, '6-8'],
      ['Bulgarian Split Squat (Glute Focus)', 'Glutes', 3, '8-10/leg'],
      ['Barbell Hip Thrust', 'Glutes', 3, '10-15'],
      ['Lying Leg Curls', 'Legs', 3, '10-15'],
      ['Banded Hip Abductions', 'Glutes', 3, '12', 'A'],
      ['Seated Weighted Calf Raise', 'Legs', 3, '8-10', 'A'],
    ]},
  ];

  /* ---------- Exercise info: tutorial video + alternatives (from Drive plans) ----------
     Shape: { "<exercise>": { v: tutorialUrl, a: [ [altName, altUrl], ... ] } }        */
  const EXERCISE_INFO = {"Barbell Bench Press":{"v":"https://youtu.be/pCGVSBk0bIQ","a":[["Flat Dumbbell Press","https://youtu.be/g14dhC5KYBM"],["Flat Machine Chest Press","https://youtu.be/sO8lFa9CidE"],["Flat Smith Machine Chest Press","https://youtu.be/3Z3C44SXSQE"],["Seated Flat Cable Press","https://youtu.be/hPpNTAEDnxM"],["Neutral Grip Dumbbell Press (*shoulder friendly)","https://youtu.be/N-kUwH1uf9c"]]},"Dumbbell Romanian Deadlift":{"v":"https://youtu.be/Xu4DxwKWzl4","a":[["Barbell Romanian Deadlift","https://youtu.be/Q-2telZDPRw"],["Hyperextensions (back/ hamstring focused)","https://youtu.be/RU5d2H_OmSc"]]},"(Weighted) Pull-Ups":{"a":[["(Weighted) Chin-Ups","https://youtu.be/-TZRdvUS7Qo"],["Banded Pull-Ups","https://youtu.be/VGm-f5-T5no"],["Inverted Row","https://youtu.be/SyMSay4zrsA"],["Kneeling Lat Pulldowns","https://youtu.be/4LxKeTqlpZA"],["Lat Pulldowns","https://youtu.be/AvYZZhEl7Xk"]]},"Bulgarian Split Squat (Quad Focus)":{"v":"https://youtu.be/r9XtxWSTlcg","a":[["Heel Elevated Split Squat","https://youtu.be/bJE0-eZLa6E"],["Walking Lunges (quad focused)","https://youtu.be/JB20RuTOaFc"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"],["Weighted Step Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"]]},"Seated Mid-Chest Cable Fly":{"a":[["Standing Mid-Chest Cable Fly","https://youtu.be/fyFVaCP9J-8"],["Pec-Deck Machine Fly","https://youtu.be/rnV3y1P7894"],["Dumbbell Fly","https://youtu.be/WRn2hqy0gXU"],["Banded Push-Ups","https://youtu.be/dI7LVElfMOg"],["Standing Mid-Chest Cable Fly","https://youtu.be/Y8E3dHNsSTU"]]},"Dumbbell Lateral Raise":{"a":[["Cable Lateral Raise","https://youtu.be/1muit9qEctY"],["Lying Incline Lateral Raise","https://youtu.be/upEqeI0F73M"],["Lean In Lateral Raise","https://youtu.be/2q4kjTDg-vs"],["Wide Grip Barbell Upright Row (last resort)","https://youtu.be/6BTMVh9AnCw"]]},"Standing Weighted Calf Raise":{"a":[["Toes-Elevated Smith Machine Calf Raises","https://youtu.be/_ChZv2iluM8"],["Single Leg Weighted Calf Raise","https://youtu.be/cRKA_Qdut7I"],["Leg Press Calf Raises","https://youtu.be/s8yUXsZrgE0"]]},"Standing Face Pulls":{"a":[["Bent Over Dumbbell Face Pulls","https://youtu.be/kA415Unr-_E"],["(Weighted) Prone Arm Circles","https://youtu.be/6D-4V_M8RJA"],["Wall Slides","https://youtu.be/x4zjfuLXHVk"]]},"Barbell Back Squat":{"a":[["Quad-Focused Leg Press","https://youtu.be/0nrW-q7-WRQ"],["Smith Machine Squat","https://youtu.be/zSVi51Jp3eI"],["Barbell Back Box Squat (*knee friendly)","https://youtu.be/QryQO4VuPK8"],["Weighted Step-Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"],["Goblet Squat (*lower back friendly)","https://youtu.be/nYDEYFXN2Rs"],["Bulgarian Split Squat (quad-focused)","https://youtu.be/r9XtxWSTlcg"]]},"Standing Barbell Overhead Press":{"a":[["Standing Dumbbell Shoulder Press","https://youtu.be/jWriqmLrQqs"],["Seated Dumbbell Shoulder Press","https://youtu.be/DPXG3BJvl8A"],["Seated Neutral-Grip Dumbbell Shoulder Press (*shoulder friendly)","https://youtu.be/W35eREjZnhI"]]},"Seated Leg Curls":{"v":"https://youtu.be/81umRgyxIAU","a":[["Lying Leg Curls","https://youtu.be/aYy3alWRDmk"],["Swiss Ball Leg Curls","https://youtu.be/uRBpd65dbYs"],["Dumbbell Lying Leg Curls","https://youtu.be/Ot1MZipNLOQ"]]},"Seated Cable Row (Mid/Upper Back)":{"v":"https://youtu.be/Q-5V5T55giY","a":[["Dumbbell Chest Supported Row (mid/upper back focused)","https://youtu.be/kNvy2_9Ji2w"],["Barbell Row (mid/upper back focused)","https://youtu.be/FTCmwlfZ29A"],["Chest Supported Machine Row","https://youtu.be/iDiVxqvHGWY"]]},"Banded Push-Ups":{"v":"https://youtu.be/dI7LVElfMOg","a":[["Close-Grip Barbell Bench Press","https://youtu.be/JzCGNgXuATs"],["Close-Grip Push-Ups","https://youtu.be/ZtAz8gupAss"],["Close-Grip Dumbbell Press","https://youtu.be/wHx9-aLjDOM"],["Close-Grip Smith Machine Press","https://youtu.be/GIuRW-MDHK8"],["Cable Pushdowns","https://youtu.be/MlfCS_7ZLXA"]]},"Incline Dumbbell Overhead Extensions":{"a":[["Overhead Rope Extensions","https://youtu.be/7yoTblFCUQM"],["Cable Pushdowns (*elbow friendly)","https://youtu.be/MlfCS_7ZLXA"],["Incline Barbell Skullcrushers","https://youtu.be/XgwPiPY4vCI"],["Cross Cable Tricep Extensions","https://youtu.be/Fua2QlXnn6Y"]]},"RKC Plank":{"v":"https://youtu.be/lOgA1UfFbWY","a":[["Side Plank","https://youtu.be/o4LGPtKjbhU"],["Bird Dog","https://youtu.be/4qE_9h_6Hes"],["Palloff Press","https://youtu.be/WhCH2CwVo4I"],["Dead Bug","https://youtu.be/UJ7b8gYa2Es"]]},"Barbell Deadlift":{"a":[["Sumo Deadlift (*lower back friendly)","https://youtu.be/9rXKd-_DaRs"],["Trap Bar Deadlift (*lower back friendly)","https://youtu.be/5mnlJtf-7WM"],["Dumbbell Romanian Deadlift","https://youtu.be/Xu4DxwKWzl4"],["Hyperextensions (back/ hamstring focused)","https://youtu.be/RU5d2H_OmSc"],["Glute Focused Leg Press","https://youtu.be/p13BNdwR93A"]]},"Low Incline Dumbbell Press":{"a":[["Incline Machine Chest Press","https://youtu.be/abc1fisYB3w"],["Low Incline Smith Machine Press","https://youtu.be/R53nThQcdZo"],["Low Incline Barbell Press","https://youtu.be/jW4j7FoqudI"],["Low Incline Cable Press","https://youtu.be/6qV1WZ_z0u0"],["(Banded) Decline Push-Ups","https://youtu.be/LdahU9kB-u0"]]},"Dumbbell Chest Supported Row (Mid/Upper Back)":{"v":"https://youtu.be/kNvy2_9Ji2w","a":[["Barbell Row (mid/upper back focused)","https://youtu.be/FTCmwlfZ29A"],["Seated Cable Row (mid/ upper back focused)","https://youtu.be/Q-5V5T55giY"],["Chest Supported Machine Row","https://youtu.be/iDiVxqvHGWY"]]},"Seated Leg Extensions":{"a":[["Sissy Squat","https://youtu.be/3SeCC8ABZ_Q"],["Heel Elevated Goblet Squat","https://youtu.be/l9crMLuT4II"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"]]},"Cable Lateral Raise":{"v":"https://youtu.be/1muit9qEctY","a":[["Dumbbell Lateral Raises","https://youtu.be/zcO3sgAeLA0"],["Lying Incline Lateral Raises","https://youtu.be/upEqeI0F73M"],["Lean In Lateral Raise","https://youtu.be/2q4kjTDg-vs"],["Wide Grip Barbell Upright Row (last resort)","https://youtu.be/6BTMVh9AnCw"]]},"Standing Cable Curl":{"a":[["Seated Dumbbell Curls","https://youtu.be/qUAzPq4B2aw"],["Dumbbell Spider Curls","https://youtu.be/hDDcQkCxHjE"]]},"Bird Dog":{"v":"https://youtu.be/4qE_9h_6Hes","a":[["RKC Plank","https://youtu.be/lOgA1UfFbWY"],["Side Plank","https://youtu.be/o4LGPtKjbhU"],["Palloff Press","https://youtu.be/WhCH2CwVo4I"],["Dead Bug","https://youtu.be/UJ7b8gYa2Es"]]},"INTERMEDIATE / 3-day v1":{"a":[["<","https://youtu.be/pCGVSBk0bIQ"],["<","https://youtu.be/Xu4DxwKWzl4"],["<","https://youtu.be/w_yuTRQd6HA"],["<","https://youtu.be/r9XtxWSTlcg"],["<","https://youtu.be/Y8E3dHNsSTU"],["<","https://youtu.be/zcO3sgAeLA0"],["<","https://youtu.be/q2Eigaa9dKU"],["<","https://youtu.be/02g7XtSRXug"],["<","https://youtu.be/AWo-q7P-HZ0"],["<","https://youtu.be/S3kYKH32VqI"],["<","https://youtu.be/81umRgyxIAU"],["<","https://youtu.be/Q-5V5T55giY"],["<","https://youtu.be/dI7LVElfMOg"],["<","https://youtu.be/3d86xMhHROA"],["<","https://youtu.be/2TkLMol2bCo"],["<","https://youtu.be/lOgA1UfFbWY"],["<","https://youtu.be/JL1tJTEmxfw"],["<","https://youtu.be/kpzUeELReEA"],["<","https://youtu.be/kNvy2_9Ji2w"],["<","https://youtu.be/nIalczfM8es"],["<","https://youtu.be/1muit9qEctY"],["<","https://youtu.be/8Bb-ak2lB8E"],["<","https://youtu.be/4qE_9h_6Hes"]]},"Incline Dumbbell Curls":{"a":[["Behind Body Cable Curls","https://youtu.be/S2CNDlAY8kY"],["Barbell Curl","https://youtu.be/-ClfZ00zo8c"]]},"Lying Incline Lateral Raise":{"v":"https://youtu.be/upEqeI0F73M","a":[["Dumbbell Lateral Raises","https://youtu.be/zcO3sgAeLA0"],["Cable Lateral Raise","https://youtu.be/1muit9qEctY"],["Lean In Lateral Raise","https://youtu.be/2q4kjTDg-vs"],["Wide Grip Barbell Upright Row (last resort)","https://youtu.be/6BTMVh9AnCw"]]},"Walking Lunges (Quad Focus)":{"v":"https://youtu.be/JB20RuTOaFc","a":[["Heel Elevated Split Squat","https://youtu.be/bJE0-eZLa6E"],["Bulgarian Split Squat (quad focused)","https://youtu.be/r9XtxWSTlcg"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"],["Weighted Step Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"]]},"Side Plank":{"v":"https://youtu.be/o4LGPtKjbhU","a":[["RKC Plank","https://youtu.be/lOgA1UfFbWY"],["Bird Dog","https://youtu.be/4qE_9h_6Hes"],["Palloff Press","https://youtu.be/WhCH2CwVo4I"],["Dead Bug","https://youtu.be/UJ7b8gYa2Es"]]},"Chest Supported Dumbbell Row (Lat Focus)":{"a":[["Lat Focused Cable Row","https://youtu.be/ZaEnZ47cDTk"],["Barbell Row (lat focused)","https://youtu.be/tS5lKXxtNvE"],["Half-Kneeling Cable Row","https://youtu.be/tTev-zsqR4A"]]},"Flat Dumbbell Press":{"v":"https://youtu.be/g14dhC5KYBM","a":[["Barbell Bench Press","https://youtu.be/pCGVSBk0bIQ"],["Flat Machine Chest Press","https://youtu.be/sO8lFa9CidE"],["Flat Smith Machine Chest Press","https://youtu.be/3Z3C44SXSQE"],["Seated Flat Cable Press","https://youtu.be/hPpNTAEDnxM"],["Neutral Grip Dumbbell Press (*shoulder friendly)","https://youtu.be/N-kUwH1uf9c"]]},"Rear Delt Cable Row":{"a":[["Chest Supported Dumbbell Rear Delt Row","https://youtu.be/6LTUVaKpRCk"],["Rear Delt Cable Fly","https://youtu.be/2Xepcd9FYvE"],["Barbell Row (mid/upper back focused)","https://youtu.be/FTCmwlfZ29A"]]},"Bulgarian Split Squat (Glute Focus)":{"v":"https://youtu.be/r9XtxWSTlcg","a":[["Front Foot Elevated Reverse Lunge","https://youtu.be/JySEdVXPUM8"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"],["Weighted Step Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"],["Single-Leg Leg Press","https://youtu.be/hdioTTf8qdw"]]},"Barbell Hip Thrust":{"a":[["Smith Machine Hip Thrust","https://youtu.be/srYETmyq3_c"],["(Weighted) Single Leg Hip Thrusts","https://youtu.be/FKD9-qezw08"],["Hyperextensions (glute focused)","https://youtu.be/bsXgCaIIwCg"],["Reverse Hyperextensions (bodyweight)","https://youtu.be/yRvF177yb88"]]},"Lying Leg Curls":{"v":"https://youtu.be/aYy3alWRDmk","a":[["Seated Leg Curls","https://youtu.be/81umRgyxIAU"],["Swiss Ball Leg Curls","https://youtu.be/uRBpd65dbYs"],["Dumbbell Lying Leg Curls","https://youtu.be/Ot1MZipNLOQ"]]},"Banded Hip Abductions":{"a":[["Side Lying Hip Raise","https://youtu.be/ZieZ6pjc4fQ"],["Side Lying Leg Raise","https://youtu.be/ht3Ayrre2HA"]]},"INTERMEDIATE / 4-day v1":{"a":[["<","https://youtu.be/pCGVSBk0bIQ"],["<","https://youtu.be/w_yuTRQd6HA"],["<","https://youtu.be/S3kYKH32VqI"],["<","https://youtu.be/Y8E3dHNsSTU"],["<","https://youtu.be/kNvy2_9Ji2w"],["<","https://youtu.be/3D56VDVkQnM"],["<","https://youtu.be/upEqeI0F73M"],["<","https://youtu.be/02g7XtSRXug"],["<","https://youtu.be/AWo-q7P-HZ0"],["<","https://youtu.be/Xu4DxwKWzl4"],["<","https://youtu.be/nIalczfM8es"],["<","https://youtu.be/JB20RuTOaFc"],["<","https://youtu.be/q2Eigaa9dKU"],["<","https://youtu.be/o4LGPtKjbhU"],["<","https://youtu.be/kpzUeELReEA"],["<","https://youtu.be/I2Unz9FR0sc"],["<","https://youtu.be/g14dhC5KYBM"],["<","https://youtu.be/k9G7BykDD4o"],["<","https://youtu.be/1muit9qEctY"],["<","https://youtu.be/OrGL-ymYREg"],["<","https://youtu.be/3d86xMhHROA"],["<","https://youtu.be/JL1tJTEmxfw"],["<","https://youtu.be/sqadB2rroz0"],["<","https://youtu.be/_vBMijiZoxE"],["<","https://youtu.be/aYy3alWRDmk"],["<","https://youtu.be/CA0ALPgTkxw"],["<","https://youtu.be/2TkLMol2bCo"]]}};

  // Drop two junk keys the PDF parser produced, then add the abs tutorials.
  delete EXERCISE_INFO['INTERMEDIATE / 3-day v1'];
  delete EXERCISE_INFO['INTERMEDIATE / 4-day v1'];
  Object.assign(EXERCISE_INFO, {
    'Weighted Crunches (Upper Abs)': { v: 'https://youtu.be/O-_TufI1CgY' },
    'Reverse Crunches (Lower Abs)': { v: 'https://youtu.be/AzS8IpnELbc' },
    'Hanging Leg Raises (Lower Abs)': { v: 'https://youtu.be/RqpNL4XLUUA' },
    'Cable Crunches (Upper Abs)': { v: 'https://youtu.be/N9n6a1MkwpU' },
  });

  function normName(s) {
    return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
  }
  // Build a normalized index once for tolerant lookups.
  const EXINFO_INDEX = {};
  Object.keys(EXERCISE_INFO).forEach((k) => { EXINFO_INDEX[normName(k)] = EXERCISE_INFO[k]; });
  function getExerciseInfo(name) {
    return EXERCISE_INFO[name] || EXINFO_INDEX[normName(name)] || null;
  }

  function findOrCreateExercise(name, muscle) {
    let def = exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (!def) {
      def = { id: uid(), name, muscle: muscle || '' };
      exercises.push(def);
    }
    return def;
  }

  // Seed the Drive plans once. Skips any routine whose name already exists.
  function seedStarterRoutines() {
    if (localStorage.getItem('wt.seeded.plans') === '1') { migrateSupersets(); return; }
    let added = 0;
    STARTER_ROUTINES.forEach((r) => {
      if (templates.some((t) => t.name.toLowerCase() === r.name.toLowerCase())) return;
      const exs = r.exercises.map(([name, muscle, count, rep, ss]) => {
        const def = findOrCreateExercise(name, muscle);
        return {
          exId: def.id, name: def.name, muscle: def.muscle,
          ...(ss ? { ss } : {}),
          sets: Array.from({ length: count }, () => ({ weight: '', reps: rep })),
        };
      });
      templates.push({ id: uid(), name: r.name, exercises: exs });
      added++;
    });
    if (added) { save(KEYS.exercises, exercises); save(KEYS.templates, templates); }
    localStorage.setItem('wt.seeded.plans', '1');
    localStorage.setItem('wt.migrate.ss', '1'); // freshly seeded already carries supersets
  }

  // Backfill superset groups onto routines seeded before supersets existed.
  function migrateSupersets() {
    if (localStorage.getItem('wt.migrate.ss') === '1') return;
    let changed = false;
    STARTER_ROUTINES.forEach((r) => {
      const tpl = templates.find((t) => t.name.toLowerCase() === r.name.toLowerCase());
      if (!tpl) return;
      r.exercises.forEach(([name, , , , ss], i) => {
        const tEx = tpl.exercises[i];
        if (ss && tEx && tEx.name === name && tEx.ss == null) { tEx.ss = ss; changed = true; }
      });
    });
    if (changed) save(KEYS.templates, templates);
    localStorage.setItem('wt.migrate.ss', '1');
  }
  const settings = Object.assign(
    { restDefault: 90, autostart: true, sound: true, barWeight: 20 },
    load(KEYS.settings, {})
  );

  /* ---------- Element helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ============================================================
     In-app dialogs (native confirm/prompt/alert are blocked in the
     sandboxed artifact iframe, so we roll our own).
     ============================================================ */
  const dialogModal = $('#dialog-modal');
  const dialogInput = $('#dialog-input');
  let dialogResolve = null;

  function closeDialog(value) {
    dialogModal.classList.add('hidden');
    const r = dialogResolve; dialogResolve = null;
    if (r) r(value);
  }
  $('#dialog-ok').addEventListener('click', () => {
    closeDialog(dialogInput.classList.contains('hidden') ? true : dialogInput.value);
  });
  $$('[data-dialog-cancel]').forEach((n) =>
    n.addEventListener('click', () => closeDialog(null)));
  dialogInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') closeDialog(dialogInput.value);
  });

  function uiConfirm(message, okLabel = 'OK') {
    return new Promise((resolve) => {
      dialogResolve = resolve;
      $('#dialog-title').textContent = message;
      dialogInput.classList.add('hidden');
      $('#dialog-ok').textContent = okLabel;
      dialogModal.classList.remove('hidden');
    });
  }
  function uiPrompt(message, defaultValue = '', okLabel = 'Save') {
    return new Promise((resolve) => {
      dialogResolve = resolve;
      $('#dialog-title').textContent = message;
      dialogInput.classList.remove('hidden');
      dialogInput.value = defaultValue;
      $('#dialog-ok').textContent = okLabel;
      dialogModal.classList.remove('hidden');
      setTimeout(() => { dialogInput.focus(); dialogInput.select(); }, 50);
    });
  }

  let toastTimer = null;
  function toast(message) {
    const t = $('#toast');
    t.textContent = message;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  /* ============================================================
     Navigation
     ============================================================ */
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  function switchView(name) {
    $$('.tab-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + name));
    if (name === 'history') renderHistory();
    if (name === 'exercises') renderLibrary();
    if (name === 'extras') renderExtras();
  }

  /* ============================================================
     Workout session
     ============================================================ */
  const startBtn = $('#start-workout');
  const emptyBox = $('#workout-empty');
  const activeBox = $('#workout-active');

  startBtn.addEventListener('click', startWorkout);
  $('#finish-workout').addEventListener('click', finishWorkout);
  $('#discard-workout').addEventListener('click', discardWorkout);
  $('#add-exercise').addEventListener('click', openPicker);
  $('#save-routine').addEventListener('click', saveAsRoutine);
  $('#workout-name').addEventListener('input', (e) => {
    if (active) { active.name = e.target.value; persistActive(); }
  });

  function startWorkout() {
    active = {
      id: uid(),
      name: defaultWorkoutName(),
      startedAt: Date.now(),
      exercises: [],
    };
    persistActive();
    renderWorkout();
  }

  function defaultWorkoutName() {
    const h = new Date().getHours();
    const part = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
    return part + ' Workout';
  }

  /* ---------- Routines / templates ---------- */
  let showArchived = false;

  function renderRoutines() {
    const list = $('#routine-list');
    list.innerHTML = '';
    const activeTpls = templates.filter((t) => !t.archived);
    const archivedTpls = templates.filter((t) => t.archived);
    $('#routine-empty').classList.toggle('hidden', activeTpls.length > 0);

    activeTpls.forEach((tpl) => list.appendChild(routineCard(tpl, false)));

    if (archivedTpls.length) {
      const header = el('button', 'archived-header');
      header.innerHTML = `<span>Archived · ${archivedTpls.length}</span><span>${showArchived ? '▾' : '▸'}</span>`;
      header.addEventListener('click', () => { showArchived = !showArchived; renderRoutines(); });
      list.appendChild(header);
      if (showArchived) {
        archivedTpls.forEach((tpl) => list.appendChild(routineCard(tpl, true)));
      }
    }
  }

  function routineCard(tpl, isArchived) {
    const card = el('div', 'routine-card' + (isArchived ? ' is-archived' : ''));

    const body = el('div', 'routine-body');
    body.appendChild(el('div', 'routine-name', tpl.name));
    const names = tpl.exercises.map((e) => e.name).join(', ');
    const setCount = tpl.exercises.reduce((n, e) => n + e.sets.length, 0);
    body.appendChild(el('div', 'routine-sub',
      `${tpl.exercises.length} exercises · ${setCount} sets — ${names}`));
    card.appendChild(body);

    const actions = el('div', 'routine-actions');

    // Archive / unarchive
    const arch = el('button', 'routine-del', isArchived ? '↩︎' : '📥');
    arch.title = isArchived ? 'Unarchive' : 'Archive';
    arch.addEventListener('click', (e) => {
      e.stopPropagation();
      tpl.archived = !isArchived;
      save(KEYS.templates, templates);
      if (!tpl.archived) showArchived = true;
      renderRoutines();
      toast(isArchived ? `"${tpl.name}" restored.` : `"${tpl.name}" archived.`);
    });
    actions.appendChild(arch);

    // Delete
    const del = el('button', 'routine-del', '🗑');
    del.title = 'Delete routine';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!(await uiConfirm(`Delete the "${tpl.name}" routine? Your logged workouts are not affected.`, 'Delete'))) return;
      templates = templates.filter((t) => t.id !== tpl.id);
      save(KEYS.templates, templates);
      renderRoutines();
    });
    actions.appendChild(del);

    // Start (archived routines can still be started)
    const go = el('div', 'routine-go', 'Start ›');
    actions.appendChild(go);

    card.appendChild(actions);
    card.addEventListener('click', () => startFromTemplate(tpl));
    return card;
  }

  function startFromTemplate(tpl) {
    active = {
      id: uid(),
      name: tpl.name,
      startedAt: Date.now(),
      fromTemplate: tpl.id,
      exercises: tpl.exercises.map((tEx) => {
        const prev = lastPerformance(tEx.exId);
        return {
          exId: tEx.exId,
          name: tEx.name,
          muscle: tEx.muscle || '',
          ...(typeof tEx.rest === 'number' ? { rest: tEx.rest } : {}),
          ...(tEx.ss ? { ss: tEx.ss } : {}),
          sets: tEx.sets.map((tSet, i) => {
            const prevSet = prev && prev.sets[i];
            return {
              weight: '', reps: '', done: false,
              // Prefill placeholder from last actual performance, else the routine's target.
              prevW: prevSet ? prevSet.weight : tSet.weight,
              prevR: prevSet ? prevSet.reps : tSet.reps,
            };
          }),
        };
      }),
    };
    persistActive();
    renderWorkout();
  }

  async function saveAsRoutine() {
    if (!active || !active.exercises.length) {
      toast('Add some exercises first, then save as a routine.');
      return;
    }
    const existing = templates.find((t) => t.id === active.fromTemplate);
    const suggested = active.name || (existing && existing.name) || 'My Routine';
    const name = ((await uiPrompt('Name this routine:', suggested)) || '').trim();
    if (!name) return;

    const tplExercises = active.exercises.map((ex) => ({
      exId: ex.exId,
      name: ex.name,
      muscle: ex.muscle,
      ...(typeof ex.rest === 'number' ? { rest: ex.rest } : {}),
      ...(ex.ss ? { ss: ex.ss } : {}),
      // Store the set structure with whatever targets are entered (or last-known).
      sets: ex.sets.map((s) => ({
        weight: s.weight !== '' ? s.weight : (s.prevW ?? ''),
        reps: s.reps !== '' ? s.reps : (s.prevR ?? ''),
      })),
    }));

    // Overwrite a routine of the same name, otherwise add a new one.
    const idx = templates.findIndex((t) => t.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      templates[idx] = { ...templates[idx], name, exercises: tplExercises };
    } else {
      templates.unshift({ id: uid(), name, exercises: tplExercises });
    }
    save(KEYS.templates, templates);
    active.fromTemplate = (idx >= 0 ? templates[idx].id : templates[0].id);
    persistActive();
    toast(`Saved "${name}" — it's on the start screen.`);
  }

  async function discardWorkout() {
    if (!active) return;
    if (active.exercises.length &&
        !(await uiConfirm('Discard this workout? Nothing will be saved.', 'Discard'))) return;
    active = null;
    localStorage.removeItem(KEYS.active);
    stopRest();
    renderWorkout();
  }

  async function finishWorkout() {
    if (!active) return;
    // Drop empty sets / exercises with no completed data.
    const cleaned = active.exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.weight !== '' || s.reps !== ''),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (cleaned.length === 0) {
      if (!(await uiConfirm('No sets logged yet. Discard this workout?', 'Discard'))) return;
      discardWorkout();
      return;
    }
    const finished = {
      id: active.id,
      name: active.name || defaultWorkoutName(),
      startedAt: active.startedAt,
      endedAt: Date.now(),
      exercises: cleaned,
    };
    const prs = detectPRs(finished, workouts); // compare against history before this one
    workouts.unshift(finished);
    save(KEYS.workouts, workouts);
    active = null;
    localStorage.removeItem(KEYS.active);
    stopRest();
    renderWorkout();
    switchView('history');
    if (prs.length) {
      if (settings.sound) beep();
      const names = prs.map((p) => p.name).join(', ');
      toast(`🎉 New PR${prs.length > 1 ? 's' : ''}: ${names}`);
    }
  }

  function persistActive() { save(KEYS.active, active); }

  /* ---------- Adding exercises to the session ---------- */
  function addExerciseToWorkout(def) {
    const prev = lastPerformance(def.id);
    const sets = prev
      ? prev.sets.map((s) => ({ weight: '', reps: '', done: false, prevW: s.weight, prevR: s.reps }))
      : [{ weight: '', reps: '', done: false }];
    active.exercises.push({
      exId: def.id,
      name: def.name,
      muscle: def.muscle || '',
      sets,
    });
    persistActive();
    renderExercises();
  }

  // Find the most recent finished workout that included this exercise.
  function lastPerformance(exId) {
    for (const w of workouts) {
      const found = w.exercises.find((e) => e.exId === exId);
      if (found && found.sets.length) return found;
    }
    return null;
  }

  /* ============================================================
     Rendering: active workout
     ============================================================ */
  function renderWorkout() {
    if (!active) {
      emptyBox.classList.remove('hidden');
      activeBox.classList.add('hidden');
      renderRoutines();
      return;
    }
    emptyBox.classList.add('hidden');
    activeBox.classList.remove('hidden');
    $('#workout-name').value = active.name || '';
    $('#session-date').textContent = formatDate(active.startedAt);
    renderExercises();
    tickSessionTimer();
  }

  function renderExercises() {
    const list = $('#exercise-list');
    list.innerHTML = '';
    const exs = active.exercises;
    let i = 0, letter = 0;
    while (i < exs.length) {
      const ss = exs[i].ss;
      // A superset is a run of 2+ adjacent exercises sharing the same group id.
      let j = i;
      if (ss) { while (j < exs.length && exs[j].ss === ss) j++; }
      const runLen = ss ? j - i : 1;

      if (runLen >= 2) {
        const wrap = el('div', 'superset');
        wrap.appendChild(el('div', 'superset-label', `Superset ${String.fromCharCode(65 + letter++)}`));
        for (let k = i; k < j; k++) wrap.appendChild(renderExerciseBlock(exs[k], k));
        list.appendChild(wrap);
        i = j;
      } else {
        list.appendChild(renderExerciseBlock(exs[i], i));
        i++;
      }
    }
  }

  /* ---------- Reordering via up/down buttons ---------- */
  function moveExercise(exIdx, dir) {
    const j = exIdx + dir;
    if (j < 0 || j >= active.exercises.length) return;
    const arr = active.exercises;
    [arr[exIdx], arr[j]] = [arr[j], arr[exIdx]];
    persistActive();
    renderExercises();
  }

  function renderExerciseBlock(ex, exIdx) {
    const box = el('div', 'exercise');

    const head = el('div', 'exercise-head');

    const reorder = el('div', 'reorder-btns');
    const up = el('button', 'reorder-btn', '↑');
    up.title = 'Move up';
    up.disabled = exIdx === 0;
    up.addEventListener('click', () => moveExercise(exIdx, -1));
    const down = el('button', 'reorder-btn', '↓');
    down.title = 'Move down';
    down.disabled = exIdx === active.exercises.length - 1;
    down.addEventListener('click', () => moveExercise(exIdx, 1));
    reorder.appendChild(up);
    reorder.appendChild(down);
    head.appendChild(reorder);

    const titleWrap = el('div', 'exercise-title-wrap');
    titleWrap.appendChild(el('div', 'exercise-title', ex.name));
    if (ex.muscle) titleWrap.appendChild(el('div', 'exercise-muscle', ex.muscle));
    head.appendChild(titleWrap);

    const headBtns = el('div', 'exercise-head-btns');
    const calc = el('button', 'exercise-menu', '🧮');
    calc.title = 'Plates & warm-up';
    calc.addEventListener('click', () => openCalc(ex));
    headBtns.appendChild(calc);
    if (getExerciseInfo(ex.originName || ex.name)) {
      const info = el('button', 'exercise-menu', 'ⓘ');
      info.title = 'Tutorial & alternatives';
      info.addEventListener('click', () => openInfo(ex, exIdx));
      headBtns.appendChild(info);
    }
    const menu = el('button', 'exercise-menu', '✕');
    menu.title = 'Remove exercise';
    menu.addEventListener('click', () => {
      active.exercises.splice(exIdx, 1);
      persistActive();
      renderExercises();
    });
    headBtns.appendChild(menu);
    head.appendChild(headBtns);
    box.appendChild(head);

    const table = el('div', 'sets-table');
    const header = el('div', 'set-row set-header');
    header.appendChild(el('div', 'set-num', '#'));
    header.appendChild(el('div', '', 'Weight'));
    header.appendChild(el('div', '', 'Reps'));
    header.appendChild(el('div', '', '✓'));
    table.appendChild(header);

    ex.sets.forEach((set, setIdx) => {
      table.appendChild(renderSetRow(ex, exIdx, set, setIdx));
    });
    box.appendChild(table);

    const actions = el('div', 'exercise-actions');
    const addSet = el('button', 'add-set-btn', '+ Add set');
    addSet.addEventListener('click', () => {
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        weight: '', reps: '', done: false,
        prevW: last ? (last.prevW ?? '') : '', prevR: last ? (last.prevR ?? '') : '',
      });
      persistActive();
      renderExercises();
    });
    actions.appendChild(addSet);

    const restChip = el('button', 'rest-chip', `⏱ ${fmtClock(restForExercise(ex))}`);
    restChip.title = 'Rest for this exercise';
    if (typeof ex.rest !== 'number') restChip.classList.add('is-default');
    restChip.addEventListener('click', () => openExerciseRest(exIdx));
    actions.appendChild(restChip);

    // Superset link toggle (with the exercise above)
    const prevEx = active.exercises[exIdx - 1];
    const groupedWithPrev = exIdx > 0 && ex.ss && prevEx.ss === ex.ss;
    if (exIdx > 0) {
      const link = el('button', 'link-chip', groupedWithPrev ? '⛓ Unlink' : '⛓ Superset');
      if (groupedWithPrev) link.classList.add('is-linked');
      link.title = groupedWithPrev ? 'Remove from superset' : 'Superset with the exercise above';
      link.addEventListener('click', () => {
        if (groupedWithPrev) {
          ex.ss = null;
        } else {
          const id = prevEx.ss || ('g' + uid());
          prevEx.ss = id;
          ex.ss = id;
        }
        persistActive();
        renderExercises();
      });
      actions.appendChild(link);
    }

    box.appendChild(actions);

    return box;
  }

  function renderSetRow(ex, exIdx, set, setIdx) {
    const row = el('div', 'set-row');
    if (set.done) row.classList.add('is-done');

    row.appendChild(el('div', 'set-num', String(setIdx + 1)));

    const wInput = el('input', 'set-input');
    wInput.type = 'number';
    wInput.inputMode = 'decimal';
    wInput.placeholder = set.prevW != null && set.prevW !== '' ? String(set.prevW) : 'kg';
    wInput.value = set.weight;
    wInput.addEventListener('input', () => { set.weight = wInput.value; persistActive(); });
    row.appendChild(wInput);

    const rInput = el('input', 'set-input');
    rInput.type = 'number';
    rInput.inputMode = 'numeric';
    rInput.placeholder = set.prevR != null && set.prevR !== '' ? String(set.prevR) : 'reps';
    rInput.value = set.reps;
    rInput.addEventListener('input', () => { set.reps = rInput.value; persistActive(); });
    row.appendChild(rInput);

    const doneBtn = el('button', 'set-done', set.done ? '✓' : '');
    doneBtn.addEventListener('click', () => {
      set.done = !set.done;
      // Auto-fill from previous performance if left blank when checking off.
      if (set.done) {
        if (set.weight === '' && set.prevW != null) set.weight = String(set.prevW);
        if (set.reps === '' && set.prevR != null) set.reps = String(set.prevR);
      }
      persistActive();
      renderExercises();
      if (set.done && settings.autostart) startRest(restForExercise(ex));
    });
    row.appendChild(doneBtn);

    // "previous" hint line
    if ((set.prevW != null && set.prevW !== '') || (set.prevR != null && set.prevR !== '')) {
      const hint = el('div', 'set-prev', `Last: ${set.prevW || '–'} kg × ${set.prevR || '–'}`);
      row.appendChild(hint);
    }

    return row;
  }

  /* ---------- Session timer ---------- */
  let sessionInterval = null;
  function tickSessionTimer() {
    clearInterval(sessionInterval);
    if (!active) return;
    const update = () => {
      const secs = Math.floor((Date.now() - active.startedAt) / 1000);
      $('#session-timer').textContent = fmtClock(secs);
    };
    update();
    sessionInterval = setInterval(update, 1000);
  }

  /* ============================================================
     Exercise picker modal
     ============================================================ */
  const pickerModal = $('#picker-modal');
  const pickerSearch = $('#picker-search');

  function openPicker() {
    pickerSearch.value = '';
    renderPicker('');
    pickerModal.classList.remove('hidden');
    setTimeout(() => pickerSearch.focus(), 50);
  }
  function closePicker() { pickerModal.classList.add('hidden'); }

  pickerSearch.addEventListener('input', () => renderPicker(pickerSearch.value));

  function renderPicker(query) {
    const list = $('#picker-list');
    list.innerHTML = '';
    const q = query.trim().toLowerCase();
    const matches = exercises
      .filter((e) => e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));

    matches.forEach((def) => {
      const item = el('div', 'picker-item');
      item.appendChild(el('div', 'lib-name', def.name));
      if (def.muscle) item.appendChild(el('div', 'lib-muscle', def.muscle));
      item.addEventListener('click', () => {
        addExerciseToWorkout(def);
        closePicker();
      });
      list.appendChild(item);
    });

    // Offer to create a new exercise from the query.
    if (q && !matches.some((m) => m.name.toLowerCase() === q)) {
      const create = el('div', 'picker-item');
      create.appendChild(el('div', 'picker-create', `+ Create "${query.trim()}"`));
      create.addEventListener('click', () => {
        const def = { id: uid(), name: query.trim(), muscle: '' };
        exercises.push(def);
        save(KEYS.exercises, exercises);
        addExerciseToWorkout(def);
        closePicker();
      });
      list.appendChild(create);
    }

    if (!matches.length && !q) {
      list.appendChild(el('div', 'picker-empty', 'No exercises yet. Type to create one.'));
    }
  }

  /* ============================================================
     Rest timer
     ============================================================ */
  const restBox = $('#rest-timer');
  let restInterval = null;
  let restTotal = 0;
  let restRemaining = 0;

  /* ---------- Per-exercise rest ----------
     Sensible per-exercise defaults derived from the plans: heavy compounds
     rest longest, isolation less, core/superset least. Falls back to the
     global default. An explicit ex.rest (set by the user) always wins.        */
  const REST_DEFAULTS = {
    'Barbell Bench Press': 180, 'Barbell Back Squat': 180, 'Barbell Deadlift': 180,
    'Standing Barbell Overhead Press': 180, '(Weighted) Pull-Ups': 180,
    'Dumbbell Romanian Deadlift': 180, 'Bulgarian Split Squat (Quad Focus)': 120,
    'Bulgarian Split Squat (Glute Focus)': 120, 'Low Incline Dumbbell Press': 150,
    'Flat Dumbbell Press': 120, 'Walking Lunges (Quad Focus)': 120,
    'Seated Cable Row (Mid/Upper Back)': 120, 'Dumbbell Chest Supported Row (Mid/Upper Back)': 120,
    'Chest Supported Dumbbell Row (Lat Focus)': 120, 'Rear Delt Cable Row': 105,
    'Seated Leg Extensions': 105, 'Seated Leg Curls': 105, 'Lying Leg Curls': 105,
    'Barbell Hip Thrust': 105, 'Seated Mid-Chest Cable Fly': 90, 'Cable Lateral Raise': 90,
    'Dumbbell Lateral Raise': 90, 'Lying Incline Lateral Raise': 90, 'Standing Cable Curl': 90,
    'Incline Dumbbell Curls': 90, 'Hammer Curls': 90, 'Incline Dumbbell Overhead Extensions': 90,
    'Standing Weighted Calf Raise': 90, 'Seated Weighted Calf Raise': 90,
    'Standing Face Pulls': 60, 'Banded Push-Ups': 60, 'Banded Hip Abductions': 60,
    'RKC Plank': 60, 'Side Plank': 60, 'Bird Dog': 60,
    'Weighted Crunches (Upper Abs)': 90, 'Reverse Crunches (Lower Abs)': 90,
    'Hanging Leg Raises (Lower Abs)': 90, 'Cable Crunches (Upper Abs)': 90,
  };
  function restForExercise(ex) {
    if (ex && typeof ex.rest === 'number') return ex.rest;
    if (ex && REST_DEFAULTS[ex.name] != null) return REST_DEFAULTS[ex.name];
    return settings.restDefault;
  }

  function startRest(seconds) {
    restTotal = seconds;
    restRemaining = seconds;
    restBox.classList.remove('hidden', 'ending');
    updateRestUI();
    clearInterval(restInterval);
    if (seconds <= 0) { finishRest(); return; }
    restInterval = setInterval(() => {
      restRemaining -= 1;
      if (restRemaining <= 0) { finishRest(); return; }
      updateRestUI();
    }, 1000);
  }

  function updateRestUI() {
    $('#rest-remaining').textContent = fmtClock(Math.max(0, restRemaining));
    const pct = restTotal > 0 ? (restRemaining / restTotal) * 100 : 0;
    $('#rest-bar-fill').style.width = Math.max(0, pct) + '%';
  }

  function finishRest() {
    clearInterval(restInterval);
    restRemaining = 0;
    updateRestUI();
    restBox.classList.add('ending');
    if (settings.sound) beep();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    setTimeout(stopRest, 1500);
  }

  function stopRest() {
    clearInterval(restInterval);
    restBox.classList.add('hidden');
    restBox.classList.remove('ending');
  }

  $('#rest-skip').addEventListener('click', stopRest);
  $$('.rest-adjust').forEach((b) => {
    b.addEventListener('click', () => {
      const delta = parseInt(b.dataset.delta, 10);
      restRemaining = Math.max(1, restRemaining + delta);
      restTotal = Math.max(restTotal, restRemaining);
      updateRestUI();
    });
  });
  // Tap the countdown display to open rest settings.
  $('.rest-display').addEventListener('click', openRestSettings);

  // WebAudio beep (no external asset). Browsers require the audio context to be
  // created/resumed from a user gesture, so we unlock it on the first tap.
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* audio unavailable */ }
    return audioCtx;
  }
  // Prime audio on the first interaction anywhere.
  window.addEventListener('pointerdown', ensureAudio, { once: false });

  function beep() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // A rising three-tone chime so the end of rest is unmistakable.
      [[0, 660], [0.2, 880], [0.4, 1175]].forEach(([t, freq]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.24);
      });
    } catch (e) { /* audio unavailable */ }
  }

  /* ---------- Rest settings modal ---------- */
  const restSettingsModal = $('#rest-settings-modal');
  function openRestSettings() {
    $('#rest-default-input').value = settings.restDefault;
    $('#rest-autostart').checked = settings.autostart;
    $('#rest-sound').checked = settings.sound;
    restSettingsModal.classList.remove('hidden');
  }
  $('#rest-default-input').addEventListener('input', (e) => {
    settings.restDefault = Math.max(0, parseInt(e.target.value, 10) || 0);
    save(KEYS.settings, settings);
  });
  $('#rest-autostart').addEventListener('change', (e) => {
    settings.autostart = e.target.checked; save(KEYS.settings, settings);
  });
  $('#rest-sound').addEventListener('change', (e) => {
    settings.sound = e.target.checked; save(KEYS.settings, settings);
  });
  $$('#rest-settings-modal .chip').forEach((c) => {
    c.addEventListener('click', () => {
      settings.restDefault = parseInt(c.dataset.preset, 10);
      $('#rest-default-input').value = settings.restDefault;
      save(KEYS.settings, settings);
    });
  });

  /* ---------- Per-exercise rest modal ---------- */
  const exRestModal = $('#ex-rest-modal');
  let exRestIdx = null;
  function openExerciseRest(exIdx) {
    exRestIdx = exIdx;
    const ex = active.exercises[exIdx];
    $('#ex-rest-title').textContent = ex.name;
    $('#ex-rest-input').value = restForExercise(ex);
    exRestModal.classList.remove('hidden');
  }
  function setExerciseRest(seconds) {
    if (exRestIdx == null) return;
    active.exercises[exRestIdx].rest = Math.max(0, seconds || 0);
    persistActive();
    renderExercises();
  }
  $('#ex-rest-input').addEventListener('input', (e) => {
    setExerciseRest(parseInt(e.target.value, 10));
  });
  $$('#ex-rest-modal .chip').forEach((c) => {
    c.addEventListener('click', () => {
      const s = parseInt(c.dataset.exPreset, 10);
      $('#ex-rest-input').value = s;
      setExerciseRest(s);
    });
  });
  $('#ex-rest-default').addEventListener('click', () => {
    if (exRestIdx == null) return;
    delete active.exercises[exRestIdx].rest; // fall back to the smart default
    persistActive();
    renderExercises();
    $('#ex-rest-input').value = restForExercise(active.exercises[exRestIdx]);
    toast('Using the default rest for this exercise.');
  });

  /* ============================================================
     Plate & warm-up calculator
     ============================================================ */
  const calcModal = $('#calc-modal');
  const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]; // kg, per side
  const round2p5 = (w) => Math.round(w / 2.5) * 2.5;

  function topWeightForExercise(ex) {
    // Heaviest entered weight, else the last-performance placeholder, else blank.
    let best = 0;
    ex.sets.forEach((s) => {
      const w = num(s.weight) || num(s.prevW);
      if (w > best) best = w;
    });
    return best;
  }

  function openCalc(ex) {
    $('#calc-title').textContent = ex.name;
    $('#calc-bar').value = settings.barWeight;
    const top = topWeightForExercise(ex);
    $('#calc-target').value = top || '';
    renderCalc();
    calcModal.classList.remove('hidden');
  }
  function renderCalc() {
    const target = num($('#calc-target').value);
    const bar = num($('#calc-bar').value);
    settings.barWeight = bar; save(KEYS.settings, settings);

    // Plates per side
    const platesBox = $('#calc-plates');
    platesBox.innerHTML = '';
    const perSide = (target - bar) / 2;
    if (!target) {
      platesBox.appendChild(el('div', 'muted', 'Enter a target weight.'));
    } else if (perSide < 0) {
      platesBox.appendChild(el('div', 'muted', 'Target is below the bar weight.'));
    } else if (perSide === 0) {
      platesBox.appendChild(el('div', 'muted', 'Just the bar — no plates.'));
    } else {
      let remaining = perSide;
      const used = [];
      PLATES.forEach((p) => {
        let n = Math.floor(remaining / p + 1e-9);
        if (n > 0) { used.push([p, n]); remaining -= n * p; }
      });
      used.forEach(([p, n]) => {
        const chip = el('div', 'plate-chip');
        chip.appendChild(el('span', 'plate-w', p + ''));
        chip.appendChild(el('span', 'plate-n', '×' + n));
        platesBox.appendChild(chip);
      });
      if (remaining > 0.01) {
        platesBox.appendChild(el('div', 'muted plate-rem', `+${remaining.toFixed(2)} kg unaccounted`));
      }
    }

    // Warm-up sets from target working weight
    const warm = $('#calc-warmup');
    warm.innerHTML = '';
    const card = el('div', 'calc-warm');
    [['50%', 0.5, '8'], ['70%', 0.7, '3–4'], ['90%', 0.9, '1–2']].forEach(([pct, f, reps]) => {
      const w = target ? round2p5(target * f) : 0;
      const row = el('div', 'guide-row warmup-set-row');
      row.appendChild(el('div', 'warmup-set-num', pct));
      const g = el('div', 'guide-body');
      g.appendChild(el('div', 'guide-name', target ? `${w} kg` : '—'));
      g.appendChild(el('div', 'guide-meta', `${reps} reps`));
      row.appendChild(g);
      card.appendChild(row);
    });
    warm.appendChild(card);
  }
  $('#calc-target').addEventListener('input', renderCalc);
  $('#calc-bar').addEventListener('input', renderCalc);

  /* ============================================================
     Personal records + progress chart
     ============================================================ */
  const est1RM = (w, r) => w * (1 + (r || 0) / 30); // Epley

  // Chronological sessions (oldest→newest) for one exercise: best set per day.
  function exerciseHistory(exId) {
    const out = [];
    workouts.forEach((w) => {
      const found = w.exercises.find((e) => e.exId === exId);
      if (!found) return;
      let topW = 0, top1rm = 0, reps = 0;
      found.sets.forEach((s) => {
        const wt = num(s.weight), rp = num(s.reps);
        if (wt > topW) { topW = wt; reps = rp; }
        const e = est1RM(wt, rp);
        if (e > top1rm) top1rm = e;
      });
      if (topW > 0) out.push({ date: w.startedAt, weight: topW, reps, e1rm: top1rm });
    });
    return out.sort((a, b) => a.date - b.date);
  }
  function bestForExercise(exId) {
    const h = exerciseHistory(exId);
    let weight = 0, e1rm = 0;
    h.forEach((p) => { if (p.weight > weight) weight = p.weight; if (p.e1rm > e1rm) e1rm = p.e1rm; });
    return { weight, e1rm };
  }

  // Detect PRs a finished workout set, comparing to history BEFORE it was added.
  function detectPRs(finished, priorWorkouts) {
    const prs = [];
    const savedWorkouts = workouts;
    workouts = priorWorkouts; // temporarily look at history excluding this session
    finished.exercises.forEach((ex) => {
      const prior = bestForExercise(ex.exId);
      let topW = 0, top1rm = 0;
      ex.sets.forEach((s) => {
        const wt = num(s.weight), rp = num(s.reps);
        if (wt > topW) topW = wt;
        const e = est1RM(wt, rp);
        if (e > top1rm) top1rm = e;
      });
      if (topW > 0 && topW > prior.weight) prs.push({ name: ex.name, type: 'weight', value: topW });
      else if (top1rm > 0 && top1rm > prior.e1rm + 0.01) prs.push({ name: ex.name, type: 'e1rm', value: top1rm });
    });
    workouts = savedWorkouts;
    return prs;
  }

  const progressModal = $('#progress-modal');
  function openProgress(def) {
    $('#progress-title').textContent = def.name;
    const h = exerciseHistory(def.id);
    const best = bestForExercise(def.id);

    const prs = $('#progress-prs');
    prs.innerHTML = '';
    $('#progress-empty').classList.toggle('hidden', h.length > 0);
    $('#progress-chart').innerHTML = '';

    if (h.length) {
      prs.appendChild(prTile('Best weight', best.weight ? best.weight + ' kg' : '—'));
      prs.appendChild(prTile('Est. 1RM', best.e1rm ? Math.round(best.e1rm) + ' kg' : '—'));
      prs.appendChild(prTile('Sessions', String(h.length)));
      $('#progress-chart').appendChild(lineChart(h));
    }
    progressModal.classList.remove('hidden');
  }
  function prTile(label, value) {
    const t = el('div', 'pr-tile');
    t.appendChild(el('div', 'pr-value', value));
    t.appendChild(el('div', 'pr-label', label));
    return t;
  }

  // Minimal single-series line chart (weight of the top set over sessions).
  function lineChart(points) {
    const W = 300, H = 150, padL = 34, padR = 10, padT = 12, padB = 22;
    const xs = points.map((_, i) => i);
    const ys = points.map((p) => p.weight);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanY = (maxY - minY) || 1;
    const nx = (i) => padL + (xs.length <= 1 ? 0 : (i / (xs.length - 1)) * (W - padL - padR));
    const ny = (v) => padT + (1 - (v - minY) / spanY) * (H - padT - padB);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'progress-svg');
    const mk = (tag, attrs) => { const n = document.createElementNS(svgNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

    // Y gridlines + labels (min, mid, max)
    [minY, minY + spanY / 2, maxY].forEach((v) => {
      const y = ny(v);
      svg.appendChild(mk('line', { x1: padL, y1: y, x2: W - padR, y2: y, class: 'chart-grid' }));
      const t = mk('text', { x: padL - 6, y: y + 3, class: 'chart-axis', 'text-anchor': 'end' });
      t.textContent = Math.round(v);
      svg.appendChild(t);
    });

    // Area + line
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${nx(i).toFixed(1)} ${ny(p.weight).toFixed(1)}`).join(' ');
    if (points.length > 1) {
      const area = `${d} L${nx(points.length - 1).toFixed(1)} ${ny(minY).toFixed(1)} L${nx(0).toFixed(1)} ${ny(minY).toFixed(1)} Z`;
      svg.appendChild(mk('path', { d: area, class: 'chart-area' }));
      svg.appendChild(mk('path', { d, class: 'chart-line' }));
    }
    // Dots; emphasize the last one
    points.forEach((p, i) => {
      svg.appendChild(mk('circle', { cx: nx(i), cy: ny(p.weight), r: i === points.length - 1 ? 4 : 2.5,
        class: i === points.length - 1 ? 'chart-dot-last' : 'chart-dot' }));
    });
    // Endpoint value label
    const last = points[points.length - 1];
    const lbl = mk('text', { x: nx(points.length - 1), y: ny(last.weight) - 8, class: 'chart-endlabel', 'text-anchor': 'end' });
    lbl.textContent = last.weight + ' kg';
    svg.appendChild(lbl);

    // First/last date labels
    const d0 = mk('text', { x: padL, y: H - 6, class: 'chart-axis', 'text-anchor': 'start' });
    d0.textContent = shortDate(points[0].date);
    svg.appendChild(d0);
    if (points.length > 1) {
      const d1 = mk('text', { x: W - padR, y: H - 6, class: 'chart-axis', 'text-anchor': 'end' });
      d1.textContent = shortDate(last.date);
      svg.appendChild(d1);
    }
    return svg;
  }
  function shortDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /* ============================================================
     Data export / import
     ============================================================ */
  const dataModal = $('#data-modal');
  const DATA_KEYS = [KEYS.exercises, KEYS.workouts, KEYS.templates, KEYS.settings];
  let dataMode = 'export';

  $('#export-data').addEventListener('click', () => {
    dataMode = 'export';
    $('#data-title').textContent = 'Export data';
    $('#data-hint').textContent = 'Select all and copy this text somewhere safe. Paste it back via Import to restore.';
    const bundle = { app: 'workout-tracker', version: 1, exportedAt: Date.now(), data: {} };
    DATA_KEYS.forEach((k) => { bundle.data[k] = load(k, null); });
    const ta = $('#data-text');
    ta.value = JSON.stringify(bundle);
    ta.readOnly = true;
    $('#data-action').textContent = 'Copy';
    dataModal.classList.remove('hidden');
    setTimeout(() => { ta.focus(); ta.select(); }, 50);
  });
  $('#import-data').addEventListener('click', () => {
    dataMode = 'import';
    $('#data-title').textContent = 'Import data';
    $('#data-hint').textContent = 'Paste a previously exported backup here, then Import. This replaces your current data.';
    const ta = $('#data-text');
    ta.value = '';
    ta.readOnly = false;
    $('#data-action').textContent = 'Import & replace';
    dataModal.classList.remove('hidden');
    setTimeout(() => ta.focus(), 50);
  });
  $('#data-action').addEventListener('click', async () => {
    const ta = $('#data-text');
    if (dataMode === 'export') {
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (!ok && navigator.clipboard) { try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) {} }
      toast(ok ? 'Copied to clipboard.' : 'Select the text and copy manually.');
      return;
    }
    // import
    let bundle;
    try { bundle = JSON.parse(ta.value); } catch (e) { toast('That isn’t valid backup text.'); return; }
    if (!bundle || !bundle.data) { toast('That isn’t a workout backup.'); return; }
    if (!(await uiConfirm('Replace all current data with this backup?', 'Replace'))) return;
    DATA_KEYS.forEach((k) => {
      if (bundle.data[k] != null) save(k, bundle.data[k]);
    });
    // Reload in-memory state
    exercises = load(KEYS.exercises, exercises);
    workouts = load(KEYS.workouts, []);
    templates = load(KEYS.templates, []);
    Object.assign(settings, load(KEYS.settings, {}));
    active = load(KEYS.active, null);
    dataModal.classList.add('hidden');
    renderWorkout();
    switchView('history');
    toast('Backup restored.');
  });

  /* ============================================================
     Exercise info modal (tutorial video + alternatives)
     ============================================================ */
  const infoModal = $('#info-modal');
  const YT = (url) => url; // links open in a new tab; kept as-is

  function openInfo(ex, exIdx) {
    // The "origin" is the plan exercise that owns the alternatives list.
    // After a swap we keep pointing at it, so you can keep swapping / swap back.
    const originName = ex.originName || ex.name;
    const info = getExerciseInfo(originName);
    if (!info) return;
    $('#info-title').textContent = ex.name;

    // Tutorial video link (of the origin exercise)
    const vidWrap = $('#info-video');
    vidWrap.innerHTML = '';
    if (info.v) {
      const a = el('a', 'btn btn-primary btn-block', '▶  Watch tutorial');
      a.href = YT(info.v); a.target = '_blank'; a.rel = 'noopener';
      vidWrap.appendChild(a);
    }

    // Options: the original exercise first (so you can swap back), then the alternatives.
    const options = [[originName, info.v || null, true]]
      .concat((info.a || []).map(([name, url]) => [name, url, false]));

    const list = $('#info-alts');
    list.innerHTML = '';
    $('#info-alts-label').classList.toggle('hidden', options.length <= 1);

    options.forEach(([name, url, isOrigin]) => {
      const row = el('div', 'alt-item');
      const left = el('div', 'alt-body');
      left.appendChild(el('div', 'alt-name', name + (isOrigin ? '  ·  original' : '')));
      row.appendChild(left);

      if (url) {
        const watch = el('a', 'alt-watch', '▶');
        watch.title = 'Watch'; watch.href = YT(url); watch.target = '_blank'; watch.rel = 'noopener';
        row.appendChild(watch);
      }

      if (exIdx != null) {
        const isCurrent = name === ex.name;
        if (isCurrent) {
          row.appendChild(el('span', 'alt-current', 'current'));
        } else {
          const swap = el('button', 'alt-swap', 'Swap in');
          swap.addEventListener('click', () => {
            const def = findOrCreateExercise(name, ex.muscle);
            save(KEYS.exercises, exercises);
            const target = active.exercises[exIdx];
            target.exId = def.id;
            target.name = def.name;
            target.muscle = def.muscle;
            target.originName = originName; // keep the alternatives reachable
            persistActive();
            renderExercises();
            infoModal.classList.add('hidden');
            toast(isOrigin ? 'Swapped back to the original.' : `Swapped to ${name}.`);
          });
          row.appendChild(swap);
        }
      }
      list.appendChild(row);
    });

    infoModal.classList.remove('hidden');
  }

  /* ---------- Generic modal close ---------- */
  $$('[data-close]').forEach((n) => {
    n.addEventListener('click', () => {
      pickerModal.classList.add('hidden');
      restSettingsModal.classList.add('hidden');
      infoModal.classList.add('hidden');
      exRestModal.classList.add('hidden');
      calcModal.classList.add('hidden');
      progressModal.classList.add('hidden');
      dataModal.classList.add('hidden');
    });
  });

  /* ============================================================
     History
     ============================================================ */
  function renderHistory() {
    const list = $('#history-list');
    list.innerHTML = '';
    if (!workouts.length) {
      $('#history-empty').classList.remove('hidden');
      return;
    }
    $('#history-empty').classList.add('hidden');

    workouts.forEach((w) => {
      const card = el('div', 'card history-item');
      const head = el('div', 'exercise-head');
      const left = el('div');
      left.appendChild(el('div', 'exercise-title', w.name));
      left.appendChild(el('div', 'history-date', formatDate(w.startedAt)));
      head.appendChild(left);
      const del = el('button', 'exercise-menu', '🗑');
      del.title = 'Delete workout';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!(await uiConfirm('Delete this workout?', 'Delete'))) return;
        workouts = workouts.filter((x) => x.id !== w.id);
        save(KEYS.workouts, workouts);
        renderHistory();
      });
      head.appendChild(del);
      card.appendChild(head);

      // stats
      const totalSets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
      const volume = w.exercises.reduce((n, e) =>
        n + e.sets.reduce((s, x) => s + (num(x.weight) * num(x.reps)), 0), 0);
      const durMin = w.endedAt ? Math.round((w.endedAt - w.startedAt) / 60000) : 0;

      const stats = el('div', 'history-stats');
      stats.appendChild(stat(w.exercises.length, 'Exercises'));
      stats.appendChild(stat(totalSets, 'Sets'));
      stats.appendChild(stat(Math.round(volume).toLocaleString() + ' kg', 'Volume'));
      if (durMin) stats.appendChild(stat(durMin + ' min', 'Duration'));
      card.appendChild(stats);

      // expandable detail
      const detail = el('div', 'history-detail hidden');
      w.exercises.forEach((e) => {
        const exWrap = el('div', 'history-ex');
        exWrap.appendChild(el('div', 'history-ex-name', e.name));
        const setStr = e.sets
          .map((s) => `${s.weight || '–'}×${s.reps || '–'}`)
          .join('   ');
        exWrap.appendChild(el('div', 'history-ex-sets', setStr));
        detail.appendChild(exWrap);
      });
      card.appendChild(detail);

      card.addEventListener('click', () => detail.classList.toggle('hidden'));
      list.appendChild(card);
    });
  }

  function stat(num, label) {
    const s = el('div', 'stat');
    s.appendChild(el('div', 'stat-num', String(num)));
    s.appendChild(el('div', 'stat-label', label));
    return s;
  }

  /* ============================================================
     Exercise library
     ============================================================ */
  $('#add-exercise-def').addEventListener('click', () => {
    const name = $('#new-exercise-name').value.trim();
    const muscle = $('#new-exercise-muscle').value;
    if (!name) return;
    if (exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      toast('That exercise already exists.');
      return;
    }
    exercises.push({ id: uid(), name, muscle });
    save(KEYS.exercises, exercises);
    $('#new-exercise-name').value = '';
    $('#new-exercise-muscle').value = '';
    renderLibrary();
  });

  function renderLibrary() {
    const list = $('#exercise-library');
    list.innerHTML = '';
    const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach((def) => {
      const item = el('div', 'lib-item');
      const left = el('div');
      left.appendChild(el('div', 'lib-name', def.name));
      if (def.muscle) left.appendChild(el('div', 'lib-muscle', def.muscle));
      item.appendChild(left);

      const libBtns = el('div', 'exercise-head-btns');
      const prog = el('button', 'lib-del', '📈');
      prog.title = 'Progress & PRs';
      prog.addEventListener('click', () => openProgress(def));
      libBtns.appendChild(prog);
      if (getExerciseInfo(def.name)) {
        const info = el('button', 'lib-del', 'ⓘ');
        info.title = 'Tutorial & alternatives';
        info.addEventListener('click', () => openInfo(def, null));
        libBtns.appendChild(info);
      }
      const del = el('button', 'lib-del', '🗑');
      del.addEventListener('click', async () => {
        if (!(await uiConfirm(`Delete "${def.name}" from your exercise list? Past workouts keep their data.`, 'Delete'))) return;
        exercises = exercises.filter((e) => e.id !== def.id);
        save(KEYS.exercises, exercises);
        renderLibrary();
      });
      libBtns.appendChild(del);
      item.appendChild(libBtns);
      list.appendChild(item);
    });
  }

  /* ============================================================
     Extras: Abs workouts + Mobility / Prehab guide (from Drive plans)
     ============================================================ */
  // [name, muscle, sets, target reps]
  const ABS_WORKOUTS = [
    { name: 'Abs · Day 1', exercises: [
      ['Weighted Crunches (Upper Abs)', 'Core', 3, '8-15'],
      ['Reverse Crunches (Lower Abs)', 'Core', 3, '8-15'],
    ]},
    { name: 'Abs · Day 2', exercises: [
      ['Hanging Leg Raises (Lower Abs)', 'Core', 3, '8-15'],
      ['Cable Crunches (Upper Abs)', 'Core', 3, '8-15'],
    ]},
  ];

  // Warm-up (4-day plan). [name, reps/target, cue]
  const WARMUP_UPPER = [
    ['Arm Circles', '5 / direction', 'Swing one way for 5 reps, then reverse for 5.'],
    ['Band Over-and-Backs', '5', 'Wide overhand grip; bring the band over and behind your body.'],
    ['Band Pull-Aparts', '10', 'Overhand grip ~shoulder-width; pull apart with the mid-back.'],
    ['Band External Rotations', '10 / side', 'Elbow locked at your side, rotate the hand out then back. Cables work too.'],
    ['Weighted External Rotations', '10 / side', 'Light weight, elbow locked, rotate the hand up toward the ceiling then down.'],
  ];
  const WARMUP_LOWER = [
    ['Forward Leg Swings', '5 / side', 'Hold support at your side; swing the leg front and back.'],
    ['Side Leg Swings', '5 / side', 'Hold support in front; swing the leg side to side.'],
    ['Deep Squat', '30 sec hold', 'Plate at your chest in a deep squat; rock side to side over each ankle.'],
    ['Dead Bug', '5 / side', 'Keep the core engaged; extend the opposite arm and leg.'],
  ];
  // [set, weight, reps, rest]
  const WARMUP_SETS = [
    ['1', '50% of working weight', '8', '1:00'],
    ['2', '70% of working weight', '3–4', '1:00'],
    ['3', '90% of working weight', '1–2', '2:00'],
  ];

  // [name, duration/target, cue]
  const MOBILITY_DAILY = [
    ['Cat Cow', '60 sec', 'Spine. ~7–8 slow cycles, pausing 1s at each end.'],
    ["World's Greatest Stretch", '30 sec / side', 'Hips, ankles, mid-back. Deep lunge, drop the elbow, then rotate open.'],
    ['Asian Squat', '30s hold + 30s rock', 'Hips, ankles. Chest up, elbows push knees out, then rock side to side.'],
    ['Half-Kneeling Thoracic Rotations', '30 sec / side', 'Mid/upper back. Rotate only the upper body, not the hips.'],
    ['Wall Slides', '60 sec', 'Lower/mid traps. Flatten low back to the wall, slide arms up and down.'],
  ];
  const MOBILITY_PREHAB = [
    ['(Weighted) Prone Arm Circles', '2 × 10–15', 'Light plates. Big circle forward and back, keep arms straight.'],
    ['Wall Slides', '2 × 10–15', 'Low back flat, press arms up, stay in contact with the wall.'],
    ['Banded Hip Abductions', '2 × 10–15', 'Band around knees, push out with the glutes. 1 set leaning forward, 1 back.'],
    ['Dead Hangs', '10–60 sec', 'Overhang grip, relax the whole body.'],
  ];

  const mobilityDone = new Set(); // in-memory check-off for the current session

  function renderExtras() {
    // ----- Warm-up -----
    renderMobility($('#warmup-upper'), WARMUP_UPPER);
    renderMobility($('#warmup-lower'), WARMUP_LOWER);
    const wsets = $('#warmup-sets');
    wsets.innerHTML = '';
    const wcard = el('div', 'card');
    WARMUP_SETS.forEach(([n, w, reps, rest]) => {
      const row = el('div', 'guide-row warmup-set-row');
      row.appendChild(el('div', 'warmup-set-num', n));
      const g = el('div', 'guide-body');
      g.appendChild(el('div', 'guide-name', w));
      g.appendChild(el('div', 'guide-meta', `${reps} reps · rest ${rest}`));
      row.appendChild(g);
      wcard.appendChild(row);
    });
    wcard.appendChild(el('div', 'mobility-cue',
      'Only for your first upper and first lower exercise of the day. After that, one quick technique set is plenty.'));
    wsets.appendChild(wcard);

    // ----- Abs workouts -----
    const absList = $('#abs-list');
    absList.innerHTML = '';
    ABS_WORKOUTS.forEach((w) => {
      const card = el('div', 'card');
      const head = el('div', 'exercise-head');
      const left = el('div', 'exercise-title-wrap');
      left.appendChild(el('div', 'exercise-title', w.name));
      left.appendChild(el('div', 'exercise-muscle',
        w.exercises.map((e) => e[0].replace(/\s*\(.*?\)/, '')).join(' · ')));
      head.appendChild(left);
      const start = el('button', 'btn btn-primary', 'Start');
      start.addEventListener('click', () => startAbs(w));
      head.appendChild(start);
      card.appendChild(head);

      const guide = el('div', 'extras-guide');
      w.exercises.forEach(([name, , sets, reps]) => {
        const row = el('div', 'guide-row');
        const g = el('div', 'guide-body');
        g.appendChild(el('div', 'guide-name', name));
        g.appendChild(el('div', 'guide-meta', `${sets} × ${reps}`));
        row.appendChild(g);
        const info = getExerciseInfo(name);
        if (info && info.v) {
          const watch = el('a', 'alt-watch', '▶');
          watch.href = info.v; watch.target = '_blank'; watch.rel = 'noopener'; watch.title = 'Watch';
          row.appendChild(watch);
        }
        guide.appendChild(row);
      });
      card.appendChild(guide);
      absList.appendChild(card);
    });

    // ----- Mobility guides -----
    renderMobility($('#mobility-daily'), MOBILITY_DAILY);
    renderMobility($('#mobility-prehab'), MOBILITY_PREHAB);
  }

  function renderMobility(container, items) {
    container.innerHTML = '';
    const card = el('div', 'card');
    items.forEach(([name, meta, cue]) => {
      const key = name + meta;
      const row = el('div', 'mobility-row');
      if (mobilityDone.has(key)) row.classList.add('is-done');

      const check = el('button', 'mobility-check', mobilityDone.has(key) ? '✓' : '');
      check.addEventListener('click', () => {
        if (mobilityDone.has(key)) mobilityDone.delete(key); else mobilityDone.add(key);
        renderMobility(container, items);
      });
      row.appendChild(check);

      const body = el('div', 'mobility-body');
      const top = el('div', 'mobility-top');
      top.appendChild(el('div', 'guide-name', name));
      top.appendChild(el('div', 'mobility-meta', meta));
      body.appendChild(top);
      body.appendChild(el('div', 'mobility-cue', cue));
      row.appendChild(body);

      card.appendChild(row);
    });
    container.appendChild(card);
  }

  function startAbs(absWorkout) {
    active = {
      id: uid(),
      name: absWorkout.name,
      startedAt: Date.now(),
      exercises: absWorkout.exercises.map(([name, muscle, count, rep]) => {
        const def = findOrCreateExercise(name, muscle);
        const prev = lastPerformance(def.id);
        return {
          exId: def.id, name: def.name, muscle: def.muscle,
          sets: Array.from({ length: count }, (_, i) => {
            const prevSet = prev && prev.sets[i];
            return {
              weight: '', reps: '', done: false,
              prevW: prevSet ? prevSet.weight : '',
              prevR: prevSet ? prevSet.reps : rep,
            };
          }),
        };
      }),
    };
    save(KEYS.exercises, exercises);
    persistActive();
    renderWorkout();
    switchView('workout');
  }

  /* ============================================================
     Utils
     ============================================================ */
  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function fmtClock(totalSecs) {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  /* ============================================================
     Boot
     ============================================================ */
  seedStarterRoutines();
  renderWorkout();

  // Register service worker for offline use (optional; ignored if unsupported).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
