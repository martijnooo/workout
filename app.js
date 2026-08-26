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
    mobilityLog: 'wt.mobilityLog',
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
  let mobilityLog = load(KEYS.mobilityLog, []);

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
  function ytId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
    return m ? m[1] : null;
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

  /* ---------- Line-icon set (single consistent style) ---------- */
  const ICON_PATHS = {
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    archive: '<rect x="4" y="4" width="16" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8"/><path d="M10 12h4"/>',
    restore: '<path d="M12 20V9"/><path d="M8 13l4-4 4 4"/><path d="M5 5h14"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>',
    chart: '<path d="M4 5v14h16"/><path d="M7 15l3-4 3 2 4-6"/>',
    link: '<path d="M9.5 14.5l5-5"/><path d="M11 6.5l1-1a4 4 0 015.7 5.7l-1 1"/><path d="M13 17.5l-1 1a4 4 0 01-5.7-5.7l1-1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
    play: '<path d="M8 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    chevronUp: '<path d="M6 15l6-6 6 6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    dumbbell: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 108.5-8.5A8.5 8.5 0 005 7"/><path d="M4.5 3.5V7H8"/><path d="M12 8v4l3 2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  };
  function icon(name) {
    return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  }
  // Create a button whose content is one icon (optionally followed by a label).
  function iconBtn(cls, name, title, label) {
    const b = el('button', cls);
    b.innerHTML = icon(name) + (label ? `<span>${label}</span>` : '');
    if (title) b.title = title;
    return b;
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
    if (name === 'mobility') renderMobilityView();
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
  $('#warmup-upper-btn').addEventListener('click', () => setWarmup('upper'));
  $('#warmup-lower-btn').addEventListener('click', () => setWarmup('lower'));
  $('#abs-d1-btn').addEventListener('click', () => addAbsDay(0));
  $('#abs-d2-btn').addEventListener('click', () => addAbsDay(1));
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
      header.innerHTML = `<span>Archived · ${archivedTpls.length}</span>${icon(showArchived ? 'chevronUp' : 'chevronDown')}`;
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
    const arch = iconBtn('routine-del', isArchived ? 'restore' : 'archive', isArchived ? 'Unarchive' : 'Archive');
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
    const del = iconBtn('routine-del', 'trash', 'Delete routine');
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!(await uiConfirm(`Delete the "${tpl.name}" routine? Your logged workouts are not affected.`, 'Delete'))) return;
      templates = templates.filter((t) => t.id !== tpl.id);
      save(KEYS.templates, templates);
      renderRoutines();
    });
    actions.appendChild(del);

    // Start (archived routines can still be started)
    const go = el('div', 'routine-go');
    go.innerHTML = `<span>Start</span>${icon('chevronRight')}`;
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
              targetR: tSet.reps, // the plan's rep target, kept for 1RM-based suggestions
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
      toast(`New PR${prs.length > 1 ? 's' : ''} — ${names}`);
    }
    driveSave('finish'); // auto-backup to Google Drive (no-op if unavailable)
  }

  function persistActive() { save(KEYS.active, active); }

  /* ---------- Adding exercises to the session ---------- */
  function addExerciseToWorkout(def) {
    const prev = lastPerformance(def.id);
    const sets = prev
      ? prev.sets.map((s) => ({ weight: '', reps: '', done: false, prevW: s.weight, prevR: s.reps, targetR: s.reps }))
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
    renderWarmup();
    renderExercises();
    tickSessionTimer();
  }

  /* ---------- Quick-add: warm-up checklist + abs ---------- */
  function setWarmup(type) {
    if (!active) return;
    if (active.warmup && active.warmup.type === type) { active.warmup = null; } // toggle off
    else { active.warmup = { type, done: {} }; }
    persistActive();
    renderWarmup();
  }
  function renderWarmup() {
    const box = $('#warmup-block');
    box.innerHTML = '';
    const up = $('#warmup-upper-btn'), lo = $('#warmup-lower-btn');
    up.classList.toggle('is-on', !!(active && active.warmup && active.warmup.type === 'upper'));
    lo.classList.toggle('is-on', !!(active && active.warmup && active.warmup.type === 'lower'));
    if (!active || !active.warmup) return;

    const items = active.warmup.type === 'upper' ? WARMUP_UPPER : WARMUP_LOWER;
    const card = el('div', 'card warmup-card');
    const head = el('div', 'exercise-head');
    const t = el('div', 'exercise-title-wrap');
    t.appendChild(el('div', 'exercise-title', `Warm-up · ${active.warmup.type === 'upper' ? 'Upper' : 'Lower'}`));
    head.appendChild(t);
    const x = iconBtn('exercise-menu', 'x', 'Remove warm-up');
    x.addEventListener('click', () => { active.warmup = null; persistActive(); renderWarmup(); });
    head.appendChild(x);
    card.appendChild(head);

    items.forEach(([name, meta], i) => {
      const row = el('div', 'mobility-row');
      if (active.warmup.done[i]) row.classList.add('is-done');
      const check = el('button', 'mobility-check');
      if (active.warmup.done[i]) check.innerHTML = icon('check');
      check.addEventListener('click', () => {
        active.warmup.done[i] = !active.warmup.done[i];
        persistActive();
        renderWarmup();
      });
      row.appendChild(check);
      const body = el('div', 'mobility-body');
      const top = el('div', 'mobility-top');
      top.appendChild(el('div', 'guide-name', name));
      top.appendChild(el('div', 'mobility-meta', meta));
      body.appendChild(top);
      row.appendChild(body);
      card.appendChild(row);
    });
    box.appendChild(card);
  }

  function addAbsDay(idx) {
    if (!active) return;
    const day = ABS_WORKOUTS[idx];
    day.exercises.forEach(([name, muscle, count, rep]) => {
      const def = findOrCreateExercise(name, muscle);
      const prev = lastPerformance(def.id);
      active.exercises.push({
        exId: def.id, name: def.name, muscle: def.muscle,
        sets: Array.from({ length: count }, (_, i) => {
          const ps = prev && prev.sets[i];
          return { weight: '', reps: '', done: false, prevW: ps ? ps.weight : '', prevR: ps ? ps.reps : rep, targetR: rep };
        }),
      });
    });
    save(KEYS.exercises, exercises);
    persistActive();
    renderExercises();
    toast(`Added ${day.name}.`);
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
    const up = iconBtn('reorder-btn', 'chevronUp', 'Move up');
    up.disabled = exIdx === 0;
    up.addEventListener('click', () => moveExercise(exIdx, -1));
    const down = iconBtn('reorder-btn', 'chevronDown', 'Move down');
    down.disabled = exIdx === active.exercises.length - 1;
    down.addEventListener('click', () => moveExercise(exIdx, 1));
    reorder.appendChild(up);
    reorder.appendChild(down);
    head.appendChild(reorder);

    const titleWrap = el('div', 'exercise-title-wrap');
    titleWrap.appendChild(el('div', 'exercise-title', ex.name));
    if (ex.muscle) titleWrap.appendChild(el('div', 'exercise-muscle', ex.muscle));
    // Continuous 1RM estimate + suggested working weight (from your history).
    const tReps = targetRepsOf(ex);
    const sug = suggestWeight(ex.exId, tReps);
    if (sug) {
      const line = el('div', 'exercise-suggest');
      line.title = 'Suggested from your recent estimated 1RM';
      line.innerHTML = `<b>${sug.weight} kg</b> · est 1RM ${Math.round(sug.e1rm)} kg`;
      titleWrap.appendChild(line);
    }
    head.appendChild(titleWrap);

    const headBtns = el('div', 'exercise-head-btns');
    const calc = iconBtn('exercise-menu', 'calculator', 'Plates & warm-up');
    calc.addEventListener('click', () => openCalc(ex));
    headBtns.appendChild(calc);
    if (getExerciseInfo(ex.originName || ex.name)) {
      const info = iconBtn('exercise-menu', 'info', 'Tutorial & alternatives');
      info.addEventListener('click', () => openInfo(ex, exIdx));
      headBtns.appendChild(info);
    }
    const menu = iconBtn('exercise-menu', 'x', 'Remove exercise');
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
    const doneHead = el('div', 'set-done-head');
    doneHead.innerHTML = icon('check');
    header.appendChild(doneHead);
    table.appendChild(header);

    ex.sets.forEach((set, setIdx) => {
      table.appendChild(renderSetRow(ex, exIdx, set, setIdx));
    });
    box.appendChild(table);

    const actions = el('div', 'exercise-actions');
    const addSet = el('button', 'add-set-btn');
    addSet.innerHTML = icon('plus') + '<span>Add set</span>';
    addSet.addEventListener('click', () => {
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        weight: '', reps: '', done: false,
        prevW: last ? (last.prevW ?? '') : '', prevR: last ? (last.prevR ?? '') : '',
        targetR: last ? last.targetR : undefined,
      });
      persistActive();
      renderExercises();
    });
    actions.appendChild(addSet);

    const restChip = el('button', 'rest-chip');
    restChip.innerHTML = icon('clock') + `<span>${fmtClock(restForExercise(ex))}</span>`;
    restChip.title = 'Rest for this exercise';
    if (typeof ex.rest !== 'number') restChip.classList.add('is-default');
    restChip.addEventListener('click', () => openExerciseRest(exIdx));
    actions.appendChild(restChip);

    // Superset link toggle (with the exercise above)
    const prevEx = active.exercises[exIdx - 1];
    const groupedWithPrev = exIdx > 0 && ex.ss && prevEx.ss === ex.ss;
    if (exIdx > 0) {
      const link = el('button', 'link-chip');
      link.innerHTML = icon('link') + `<span>${groupedWithPrev ? 'Unlink' : 'Superset'}</span>`;
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

    // Suggested working weight from the rolling 1RM estimate (falls back to last time).
    const setSug = suggestWeight(ex.exId, set.targetR);
    const suggestW = setSug ? setSug.weight : null;

    const wInput = el('input', 'set-input');
    wInput.type = 'number';
    wInput.inputMode = 'decimal';
    wInput.placeholder = suggestW != null ? String(suggestW)
      : (set.prevW != null && set.prevW !== '' ? String(set.prevW) : 'kg');
    if (suggestW != null && !set.done && set.weight === '') wInput.classList.add('is-suggest');
    wInput.value = set.weight;
    wInput.addEventListener('input', () => {
      set.weight = wInput.value; wInput.classList.remove('is-suggest'); persistActive();
    });
    row.appendChild(wInput);

    const rInput = el('input', 'set-input');
    rInput.type = 'number';
    rInput.inputMode = 'numeric';
    const repHint = (set.targetR != null && set.targetR !== '') ? set.targetR
      : (set.prevR != null && set.prevR !== '' ? set.prevR : 'reps');
    rInput.placeholder = String(repHint);
    rInput.value = set.reps;
    rInput.addEventListener('input', () => { set.reps = rInput.value; persistActive(); });
    row.appendChild(rInput);

    const doneBtn = el('button', 'set-done');
    doneBtn.innerHTML = icon('check');
    doneBtn.addEventListener('click', () => {
      set.done = !set.done;
      // Auto-fill blanks when checking off: weight from the suggestion (else last time),
      // reps from the target (else last time).
      if (set.done) {
        if (set.weight === '') {
          if (suggestW != null) set.weight = String(suggestW);
          else if (set.prevW != null) set.weight = String(set.prevW);
        }
        if (set.reps === '') {
          const tr = repFloor(set.targetR);
          if (tr != null) set.reps = String(tr);
          else if (set.prevR != null) set.reps = String(set.prevR);
        }
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
  const PLATES = [20, 15, 10, 5, 2.5, 1.25]; // kg, per side (20 kg is the biggest plate)
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
    // Prefer the entered/last weight; otherwise fall back to the 1RM-based suggestion.
    const sug = suggestWeight(ex.exId, targetRepsOf(ex));
    const top = topWeightForExercise(ex) || (sug ? sug.weight : 0);
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

  /* ---------- Continuous 1RM estimate + weight suggestions ----------
     Rolling estimated 1RM from your recent sessions, inverted through Epley
     to propose a working weight for the target rep range (double-progression:
     load for the bottom of the range; as your reps/e1RM climb the load does too). */
  const round2p5w = (w) => Math.round(w / 2.5) * 2.5;
  function repFloor(s) { const m = String(s == null ? '' : s).match(/\d+/); return m ? parseInt(m[0], 10) : null; }

  // Best estimated 1RM across the last few sessions of this exercise.
  function currentE1RM(exId) {
    const h = exerciseHistory(exId);
    if (!h.length) return 0;
    return Math.max(...h.slice(-3).map((p) => p.e1rm));
  }
  // Suggested working weight for a target rep string (e.g. "8-10"). null if no data.
  function suggestWeight(exId, targetRepStr) {
    const e = currentE1RM(exId);
    if (!e) return null;
    const reps = repFloor(targetRepStr) || 8;
    const w = round2p5w(e / (1 + reps / 30));
    if (!(w > 0)) return null;
    return { e1rm: e, reps, weight: w };
  }
  // The exercise's target rep string (from the plan), for display + suggestions.
  function targetRepsOf(ex) {
    const s = ex.sets.find((x) => x.targetR != null && String(x.targetR).match(/\d/));
    return s ? s.targetR : (ex.sets[0] && ex.sets[0].prevR) || null;
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
  const DATA_KEYS = [KEYS.exercises, KEYS.workouts, KEYS.templates, KEYS.settings, KEYS.mobilityLog];
  let dataMode = 'export';

  function buildBundle() {
    const bundle = { app: 'workout-tracker', version: 1, savedAt: Date.now(), data: {} };
    DATA_KEYS.forEach((k) => { bundle.data[k] = load(k, null); });
    return bundle;
  }
  // Write a bundle's data into storage + in-memory state. Returns true if applied.
  function applyBundle(bundle) {
    if (!bundle || !bundle.data) return false;
    DATA_KEYS.forEach((k) => { if (bundle.data[k] != null) save(k, bundle.data[k]); });
    exercises = load(KEYS.exercises, exercises);
    workouts = load(KEYS.workouts, []);
    templates = load(KEYS.templates, []);
    Object.assign(settings, load(KEYS.settings, {}));
    active = load(KEYS.active, null);
    mobilityLog = load(KEYS.mobilityLog, []);
    if (bundle.savedAt) localStorage.setItem('wt.savedAt', String(bundle.savedAt));
    return true;
  }

  $('#export-data').addEventListener('click', () => {
    dataMode = 'export';
    $('#data-title').textContent = 'Export data';
    $('#data-hint').textContent = 'Select all and copy this text somewhere safe. Paste it back via Import to restore.';
    const ta = $('#data-text');
    ta.value = JSON.stringify(buildBundle());
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
    applyBundle(bundle);
    dataModal.classList.add('hidden');
    renderWorkout();
    switchView('history');
    toast('Backup restored.');
  });

  /* ============================================================
     Google Drive auto-sync (via the mcp capability)
     ============================================================ */
  const DRIVE = {
    server: 'Google Drive',
    title: 'Workout Tracker Data.json',
    parentId: '1sCC280C6z9Zm2ukCHQj_lYXkPj7JPa9l', // the user's "Fitness" folder
  };
  let mcpReady = null;   // Promise<namespace|null>, resolved once
  let driveState = 'init';

  function setSyncStatus(text, cls) {
    const el0 = $('#sync-status');
    if (!el0) return;
    el0.textContent = text;
    el0.className = 'sync-status' + (cls ? ' ' + cls : '');
  }
  function b64ToText(b64) {
    return decodeURIComponent(Array.prototype.map.call(atob(b64),
      (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  }
  const localSavedAt = () => parseInt(localStorage.getItem('wt.savedAt') || '0', 10);

  async function getMcp() {
    if (mcpReady) return mcpReady;
    mcpReady = (window.claude && window.claude.use)
      ? window.claude.use('mcp').catch(() => null)
      : Promise.resolve(null);
    return mcpReady;
  }

  function driveErrorText(code) {
    if (code === 'server_not_connected' || code === 'selection_required')
      return 'Add Google Drive in claude.ai → Settings → Connectors';
    if (code === 'needs_reauth') return 'Reconnect Google Drive in claude.ai → Settings';
    if (code === 'not_granted' || code === 'capability_disabled') return 'Drive sync not available in this view';
    return 'Drive sync error — tap Sync now to retry';
  }

  async function driveFindFileId(mcp) {
    const stored = localStorage.getItem('wt.driveFileId');
    if (stored) return stored;
    const res = await mcp.callTool(DRIVE.server, 'search_files',
      { query: `title = '${DRIVE.title}'`, pageSize: 5, excludeContentSnippets: true });
    const files = (res.payload && res.payload.files) || [];
    if (!files.length) return null;
    files.sort((a, b) => (b.modifiedTime || '').localeCompare(a.modifiedTime || ''));
    localStorage.setItem('wt.driveFileId', files[0].id);
    return files[0].id;
  }

  // Push current data to Drive (new file + trash the old one).
  async function driveSave(reason) {
    const mcp = await getMcp();
    if (!mcp) { setSyncStatus('Drive sync unavailable', 'muted'); return false; }
    try {
      setSyncStatus('Saving…');
      const bundle = buildBundle();
      const res = await mcp.callTool(DRIVE.server, 'create_file', {
        title: DRIVE.title, parentId: DRIVE.parentId,
        textContent: JSON.stringify(bundle), contentMimeType: 'application/json',
        disableConversionToGoogleType: true,
      });
      const newId = res.payload && res.payload.id;
      const prevId = localStorage.getItem('wt.driveFileId');
      if (newId) localStorage.setItem('wt.driveFileId', newId);
      localStorage.setItem('wt.savedAt', String(bundle.savedAt));
      if (prevId && prevId !== newId) {
        mcp.callTool(DRIVE.server, 'trash_file', { fileId: prevId }).catch(() => {});
      }
      setSyncStatus('Synced just now', 'ok');
      return true;
    } catch (e) {
      setSyncStatus(driveErrorText(e && e.code), 'warn');
      return false;
    }
  }

  // On startup: pull from Drive if it's newer than local; otherwise push local up.
  async function driveSyncOnLoad() {
    const mcp = await getMcp();
    if (!mcp) { setSyncStatus('Drive sync unavailable here', 'muted'); return; }
    try {
      setSyncStatus('Checking Google Drive…');
      const fileId = await driveFindFileId(mcp);
      if (!fileId) { await driveSave('seed'); return; }
      const res = await mcp.callTool(DRIVE.server, 'download_file_content', { fileId });
      let bundle = null;
      try { bundle = JSON.parse(b64ToText(res.payload.content)); } catch (e) {}
      const remoteAt = (bundle && bundle.savedAt) || 0;
      if (bundle && remoteAt > localSavedAt()) {
        applyBundle(bundle);
        renderWorkout();
        if ($('#view-history').classList.contains('is-active')) renderHistory();
        setSyncStatus('Synced from Drive', 'ok');
        toast('Synced from Google Drive.');
      } else {
        // Local is newer or equal — make sure Drive reflects it.
        await driveSave('push');
      }
    } catch (e) {
      setSyncStatus(driveErrorText(e && e.code), 'warn');
    }
  }

  $('#sync-now').addEventListener('click', () => driveSave('manual'));

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

    // Tutorial thumbnail + video link (of the origin exercise)
    const vidWrap = $('#info-video');
    vidWrap.innerHTML = '';
    if (info.v) {
      const id = ytId(info.v);
      if (id) {
        const thumbLink = el('a', 'ex-thumb-link');
        thumbLink.href = info.v; thumbLink.target = '_blank'; thumbLink.rel = 'noopener';
        const img = document.createElement('img');
        img.className = 'ex-thumb';
        img.loading = 'lazy';
        img.alt = ex.name;
        img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        img.addEventListener('error', () => { thumbLink.style.display = 'none'; });
        const play = el('div', 'ex-thumb-play');
        play.innerHTML = icon('play');
        thumbLink.appendChild(img);
        thumbLink.appendChild(play);
        vidWrap.appendChild(thumbLink);
      }
      const a = el('a', 'btn btn-primary btn-block');
      a.innerHTML = icon('play') + '<span>Watch tutorial</span>';
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
        const watch = el('a', 'alt-watch');
        watch.innerHTML = icon('play');
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
      const del = iconBtn('exercise-menu', 'trash', 'Delete workout');
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
      const prog = iconBtn('lib-del', 'chart', 'Progress & PRs');
      prog.addEventListener('click', () => openProgress(def));
      libBtns.appendChild(prog);
      if (getExerciseInfo(def.name)) {
        const info = iconBtn('lib-del', 'info', 'Tutorial & alternatives');
        info.addEventListener('click', () => openInfo(def, null));
        libBtns.appendChild(info);
      }
      const del = iconBtn('lib-del', 'trash', 'Delete exercise');
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

  /* ---------- GoWod-style guided mobility routines ----------
     Each move: [name, seconds, cue, perSide?]. perSide moves run twice
     (left then right) in the guided player.                              */
  const MOBILITY_ROUTINES = [
    { id: 'daily', name: 'Daily mobility', focus: 'Full body', moves: [
      ['Cat Cow', 60, 'Spine. ~7–8 slow cycles, pausing 1s at each end.'],
      ["World's Greatest Stretch", 30, 'Hips, ankles, mid-back. Deep lunge, drop the elbow, then rotate open.', true],
      ['Deep (Asian) Squat', 60, 'Hips, ankles. Chest up, elbows push the knees out, rock side to side.'],
      ['Half-Kneeling Thoracic Rotation', 30, 'Mid/upper back. Rotate only the upper body, not the hips.', true],
      ['Wall Slides', 60, 'Lower/mid traps. Flatten the low back to the wall, slide the arms up and down.'],
    ]},
    { id: 'hips', name: 'Hips & squat depth', focus: 'Hips', moves: [
      ['90/90 Hip Switches', 45, 'Sit tall, rotate both knees floor-to-floor, chest up the whole time.'],
      ['Deep Squat Pry', 60, 'Sink into a deep squat, elbows push the knees out, drop lower each breath.'],
      ['Half-Kneeling Hip Flexor Stretch', 40, 'Tuck the pelvis, squeeze the back glute, lean forward slightly.', true],
      ['Frog Stretch', 60, 'Knees wide, ankles in line with the knees, rock the hips back slowly.'],
      ['Pigeon Stretch', 45, 'Front shin angled, hips square, fold forward over the front leg.', true],
    ]},
    { id: 'shoulders', name: 'Shoulders & overhead', focus: 'Shoulders', moves: [
      ['Band / Towel Pass-Throughs', 45, 'Wide grip, take the arms over and behind, keep the ribs down.'],
      ['Wall Slides', 60, 'Low back flat, press the arms up and down staying on the wall.'],
      ['Thread the Needle', 40, 'On all fours, reach one arm under and through, then open up tall.', true],
      ['Doorway Pec Stretch', 40, 'Forearm on the frame, step through until the chest opens.', true],
      ['Prone Y-T-W Raises', 45, 'Face down, lift the arms into a Y, then T, then W. Thumbs up.'],
    ]},
    { id: 'tspine', name: 'Upper back / T-spine', focus: 'Thoracic', moves: [
      ['Cat Cow', 60, 'Move segment by segment through the whole spine.'],
      ['Open Book', 40, 'Side-lying, knees stacked, rotate the top arm open and follow it.', true],
      ['Quadruped T-Spine Rotation', 40, 'Hand behind the head, rotate the elbow up toward the ceiling.', true],
      ['Thoracic Extension over an edge', 45, 'Upper back on a chair/roller, breathe and extend back over it.'],
      ['Half-Kneeling Thoracic Rotation', 40, 'Rotate only the upper body, keep the hips facing forward.', true],
    ]},
    { id: 'ankles', name: 'Ankles & calves', focus: 'Ankles', moves: [
      ['Knee-to-Wall Rocks', 45, 'Drive the knee over the toes toward the wall, heel stays down.', true],
      ['Standing Calf Stretch', 40, 'Back leg straight, heel down, hips forward.', true],
      ['Soleus (Bent-Knee) Stretch', 40, 'Same stance but bend the back knee to reach the lower calf.', true],
      ['Deep Squat Ankle Rock', 60, 'In a deep squat, shift the weight forward over each ankle.'],
      ['Toe Sit', 45, 'Kneel and sit back on tucked toes to stretch the feet and calves.'],
    ]},
    { id: 'wrists', name: 'Wrists & elbows', focus: 'Wrists', moves: [
      ['Wrist Rockers — Palms Down', 40, 'Palms flat on the floor, rock forward and back gently.'],
      ['Wrist Rockers — Palms Up', 40, 'Flip the hands palms-up, fingers toward you, rock back.'],
      ['Wrist Circles', 30, 'Interlace the fingers and circle the wrists both directions.'],
      ['Prayer Stretch', 40, 'Palms together, lower the hands to stretch the wrists.'],
      ['Forearm Extensor Stretch', 40, 'Straight arm, pull the hand down and in with the other hand.', true],
    ]},
    { id: 'hamstrings', name: 'Hamstrings & hinge', focus: 'Posterior chain', moves: [
      ['Standing Forward Fold', 50, 'Soft knees, hinge and hang, let the head go heavy.'],
      ['Single-Leg Hamstring Stretch', 45, 'Hips square, hinge over the front straight leg.', true],
      ['Downward Dog Heel Pedal', 50, 'Push the hips up and back, pedal the heels one at a time.'],
      ['Jefferson Curl (light)', 45, 'Roll down one vertebra at a time, then reverse. Move slowly.'],
      ['Seated Straddle Fold', 50, 'Legs wide, hinge from the hips and walk the hands forward.'],
    ]},
    { id: 'neck', name: 'Neck & desk relief', focus: 'Neck / posture', moves: [
      ['Chin Tucks', 40, 'Glide the chin straight back into a double chin, hold and release.'],
      ['Upper Trap Stretch', 40, 'Ear toward the shoulder, gentle hand assist, breathe.', true],
      ['Levator Scapulae Stretch', 40, 'Look down toward the armpit, guide gently with the hand.', true],
      ['Neck Rotations', 30, 'Slow half-circles ear to ear — no crunching or forcing.'],
      ['Wall Angels', 50, 'Back to the wall, slide the arms up and down keeping contact.'],
    ]},
    { id: 'prehab', name: 'Post-lift prehab', focus: 'Shoulders / hips', moves: [
      ['Prone Arm Circles', 45, 'Light or bodyweight. Big circle forward and back, arms straight.'],
      ['Wall Slides', 45, 'Low back flat, press the arms up, stay in contact with the wall.'],
      ['Banded Hip Abductions', 40, 'Band around the knees, push out with the glutes.', true],
      ['Dead Hang', 45, 'Overhand grip, relax the whole body and breathe.'],
    ]},
  ];

  const mobilityDone = new Set(); // in-memory check-off for the current session (warm-ups)

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
          const watch = el('a', 'alt-watch');
          watch.innerHTML = icon('play');
          watch.href = info.v; watch.target = '_blank'; watch.rel = 'noopener'; watch.title = 'Watch';
          row.appendChild(watch);
        }
        guide.appendChild(row);
      });
      card.appendChild(guide);
      absList.appendChild(card);
    });

  }

  // Mobility now lives in its own top-level tab.
  function renderMobilityView() {
    renderMobilityStreak();
    renderMobilityRoutines();
  }

  function renderMobility(container, items) {
    container.innerHTML = '';
    const card = el('div', 'card');
    items.forEach(([name, meta, cue]) => {
      const key = name + meta;
      const row = el('div', 'mobility-row');
      if (mobilityDone.has(key)) row.classList.add('is-done');

      const check = el('button', 'mobility-check');
      if (mobilityDone.has(key)) check.innerHTML = icon('check');
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

  /* ---------- Guided mobility: streak + routine cards + player ---------- */
  function routineSteps(r) {
    const steps = [];
    r.moves.forEach(([name, secs, cue, perSide]) => {
      if (perSide) {
        steps.push({ name, secs, cue, side: 'Left side' });
        steps.push({ name, secs, cue, side: 'Right side' });
      } else {
        steps.push({ name, secs, cue, side: null });
      }
    });
    return steps;
  }
  function routineSeconds(r) {
    return r.moves.reduce((s, [, secs, , perSide]) => s + (perSide ? secs * 2 : secs), 0);
  }
  function dayKey(ts) { return new Date(ts).toDateString(); }
  function mobilityStreak() {
    const days = new Set(mobilityLog.map((s) => dayKey(s.date)));
    let streak = 0;
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); // today not done yet is fine
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }

  function renderMobilityStreak() {
    const box = $('#mobility-streak');
    if (!box) return;
    box.innerHTML = '';
    const todayKey = new Date().toDateString();
    const doneToday = mobilityLog.some((s) => dayKey(s.date) === todayKey);
    const weekAgo = Date.now() - 7 * 864e5;
    const thisWeek = mobilityLog.filter((s) => s.date >= weekAgo).length;
    const streak = mobilityStreak();

    const card = el('div', 'card mob-streak-card');
    const stats = [
      [String(streak), streak === 1 ? 'day streak' : 'day streak', 'flame'],
      [String(thisWeek), 'this week', null],
      [String(mobilityLog.length), 'total', null],
    ];
    stats.forEach(([val, label]) => {
      const tile = el('div', 'mob-stat');
      tile.appendChild(el('div', 'mob-stat-val', val));
      tile.appendChild(el('div', 'mob-stat-label', label));
      card.appendChild(tile);
    });
    box.appendChild(card);

    const status = el('div', 'mob-today ' + (doneToday ? 'is-done' : ''));
    status.innerHTML = doneToday
      ? icon('check') + '<span>Mobility done today — nice.</span>'
      : icon('clock') + '<span>No mobility logged today yet.</span>';
    box.appendChild(status);
  }

  function renderMobilityRoutines() {
    const wrap = $('#mobility-routines');
    if (!wrap) return;
    wrap.innerHTML = '';
    MOBILITY_ROUTINES.forEach((r) => {
      const card = el('div', 'card mob-card');
      const head = el('div', 'mob-card-head');
      const left = el('div', 'mob-card-title-wrap');
      const titleRow = el('div', 'mob-card-titlerow');
      titleRow.appendChild(el('div', 'exercise-title', r.name));
      titleRow.appendChild(el('span', 'mob-tag', r.focus));
      left.appendChild(titleRow);
      const secs = routineSeconds(r);
      left.appendChild(el('div', 'exercise-muscle',
        `~${Math.max(1, Math.round(secs / 60))} min · ${r.moves.length} moves`));
      head.appendChild(left);

      const play = el('button', 'btn btn-primary mob-play');
      play.innerHTML = icon('play') + '<span>Start</span>';
      play.addEventListener('click', () => openMobilityPlayer(r));
      head.appendChild(play);
      card.appendChild(head);

      const preview = el('div', 'mob-preview hidden');
      routineSteps(r).forEach((st, i) => {
        const row = el('div', 'mob-move-row');
        row.appendChild(el('span', 'mob-move-idx', String(i + 1)));
        const body = el('div', 'mob-move-body');
        const nm = st.name + (st.side ? ` · ${st.side.replace(' side', '')}` : '');
        body.appendChild(el('div', 'guide-name', nm));
        body.appendChild(el('div', 'mobility-cue', st.cue));
        row.appendChild(body);
        row.appendChild(el('span', 'mob-move-secs', fmtClock(st.secs)));
        preview.appendChild(row);
      });
      const toggle = el('button', 'mob-preview-toggle', 'Preview moves');
      toggle.addEventListener('click', () => {
        const nowHidden = preview.classList.toggle('hidden');
        toggle.textContent = nowHidden ? 'Preview moves' : 'Hide moves';
      });
      card.appendChild(toggle);
      card.appendChild(preview);
      wrap.appendChild(card);
    });
  }

  /* ---------- Guided mobility player ---------- */
  const RING_C = 2 * Math.PI * 54;
  const mobPlayerEl = $('#mobility-player');
  let mob = null;

  function openMobilityPlayer(routine) {
    ensureAudio();
    const steps = routineSteps(routine);
    mob = { routine, steps, idx: 0, remaining: steps[0].secs, total: steps[0].secs, paused: false, timer: null };
    $('#mob-done').classList.add('hidden');
    $('.mob-stage', mobPlayerEl).classList.remove('hidden');
    $('.mob-controls', mobPlayerEl).classList.remove('hidden');
    $('.mob-controls-sub', mobPlayerEl).classList.remove('hidden');
    $('#mob-ring-fill').style.strokeDasharray = String(RING_C);
    mobPlayerEl.classList.remove('hidden');
    document.body.classList.add('mob-open');
    renderMobStep();
    updatePauseBtn();
    startMobTimer();
  }

  function startMobTimer() {
    clearInterval(mob.timer);
    mob.timer = setInterval(() => {
      if (!mob || mob.paused) return;
      mob.remaining -= 1;
      if (mob.remaining <= 0) { stepComplete(); return; }
      updateMobUI();
    }, 1000);
  }

  function stepComplete() {
    if (settings.sound) beep();
    if (navigator.vibrate) navigator.vibrate(180);
    if (mob.idx >= mob.steps.length - 1) { finishMobSession(); return; }
    mobGo(mob.idx + 1);
  }

  function mobGo(idx) {
    mob.idx = idx;
    const st = mob.steps[idx];
    mob.remaining = st.secs;
    mob.total = st.secs;
    mob.paused = false;
    renderMobStep();
    updatePauseBtn();
  }

  function renderMobStep() {
    const st = mob.steps[mob.idx];
    $('#mob-routine-name').textContent = mob.routine.name;
    $('#mob-progress-text').textContent = `Move ${mob.idx + 1} of ${mob.steps.length}`;
    $('#mob-move').textContent = st.name;
    const sideEl = $('#mob-side');
    if (st.side) { sideEl.textContent = st.side; sideEl.classList.remove('hidden'); }
    else sideEl.classList.add('hidden');
    $('#mob-cue').textContent = st.cue;
    const info = getExerciseInfo(st.name);
    const watch = $('#mob-watch');
    if (info && info.v) {
      watch.href = info.v;
      watch.innerHTML = icon('play') + '<span>Watch</span>';
      watch.classList.remove('hidden');
    } else {
      watch.classList.add('hidden');
    }
    updateMobUI();
  }

  function updateMobUI() {
    if (!mob) return;
    $('#mob-time').textContent = fmtClock(Math.max(0, mob.remaining));
    const frac = mob.total > 0 ? Math.max(0, mob.remaining) / mob.total : 0;
    $('#mob-ring-fill').style.strokeDashoffset = String(RING_C * (1 - frac));
    const overall = (mob.idx + (1 - frac)) / mob.steps.length;
    $('#mob-progress-fill').style.width = (overall * 100) + '%';
  }

  function togglePause() {
    if (!mob) return;
    mob.paused = !mob.paused;
    updatePauseBtn();
  }
  function updatePauseBtn() {
    const b = $('#mob-pause');
    if (!mob) return;
    b.textContent = mob.paused ? 'Resume' : 'Pause';
    b.classList.toggle('is-paused', mob.paused);
  }

  function finishMobSession() {
    if (mob.timer) clearInterval(mob.timer);
    mobilityLog.push({
      id: uid(), routineId: mob.routine.id, name: mob.routine.name,
      date: Date.now(), moves: mob.routine.moves.length, seconds: routineSeconds(mob.routine),
    });
    save(KEYS.mobilityLog, mobilityLog);
    driveSave('mobility'); // auto-backup to Google Drive (no-op if unavailable)
    const streak = mobilityStreak();
    $('.mob-stage', mobPlayerEl).classList.add('hidden');
    $('.mob-controls', mobPlayerEl).classList.add('hidden');
    $('.mob-controls-sub', mobPlayerEl).classList.add('hidden');
    $('.mob-done-check', mobPlayerEl).innerHTML = icon('check');
    $('#mob-done-sub').textContent =
      `${mob.routine.name} complete · ${streak} day streak 🔥`;
    $('#mob-done').classList.remove('hidden');
    if (settings.sound) beep();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  }

  function closeMobilityPlayer() {
    if (mob && mob.timer) clearInterval(mob.timer);
    mob = null;
    mobPlayerEl.classList.add('hidden');
    document.body.classList.remove('mob-open');
    renderMobilityStreak();
    renderMobilityRoutines();
  }

  $('#mob-pause').addEventListener('click', togglePause);
  $('#mob-next').addEventListener('click', () => {
    if (!mob) return;
    if (mob.idx >= mob.steps.length - 1) finishMobSession();
    else mobGo(mob.idx + 1);
  });
  $('#mob-prev').addEventListener('click', () => {
    if (!mob) return;
    // Partway through a move → restart it; at the very start → previous move.
    if (mob.remaining <= mob.total - 2 && mob.idx >= 0) mobGo(mob.idx);
    else mobGo(Math.max(0, mob.idx - 1));
  });
  $('#mob-restart').addEventListener('click', () => { if (mob) { mob.remaining = mob.total; updateMobUI(); } });
  $('#mob-add15').addEventListener('click', () => {
    if (!mob) return;
    mob.remaining += 15;
    mob.total = Math.max(mob.total, mob.remaining);
    updateMobUI();
  });
  $('#mob-close').addEventListener('click', closeMobilityPlayer);
  $('#mob-done-btn').addEventListener('click', closeMobilityPlayer);

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
              targetR: rep,
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
  // Inject icons into static markup (modal close buttons + [data-icon] buttons).
  $$('.modal-x').forEach((b) => { b.innerHTML = icon('x'); });
  $$('[data-icon]').forEach((b) => {
    b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon));
  });

  seedStarterRoutines();
  renderWorkout();
  driveSyncOnLoad(); // pull newer data from Google Drive if present

  // Register service worker for offline use (optional; ignored if unsupported).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
