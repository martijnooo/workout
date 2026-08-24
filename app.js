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
  const STARTER_ROUTINES = [
    { name: '3-Day A · Full Body', exercises: [
      ['Barbell Bench Press', 'Chest', 3, '8-10'],
      ['Dumbbell Romanian Deadlift', 'Legs', 3, '8-10'],
      ['(Weighted) Pull-Ups', 'Back', 3, '6-12'],
      ['Bulgarian Split Squat (Quad Focus)', 'Legs', 3, '8-10/leg'],
      ['Seated Mid-Chest Cable Fly', 'Chest', 3, '10-15'],
      ['Dumbbell Lateral Raise', 'Shoulders', 3, '15-20'],
      ['Standing Weighted Calf Raise', 'Legs', 3, '10-15'],
      ['Standing Face Pulls', 'Shoulders', 3, '10'],
    ]},
    { name: '3-Day B · Full Body', exercises: [
      ['Barbell Back Squat', 'Legs', 3, '8-10'],
      ['Standing Barbell Overhead Press', 'Shoulders', 3, '6-8'],
      ['Seated Leg Curls', 'Legs', 3, '10-15'],
      ['Seated Cable Row (Mid/Upper Back)', 'Back', 3, '10-12'],
      ['Banded Push-Ups', 'Chest', 3, '10+'],
      ['Incline Dumbbell Overhead Extensions', 'Triceps', 3, '10-15'],
      ['Seated Weighted Calf Raise', 'Legs', 3, '10-15'],
      ['RKC Plank', 'Core', 3, '30-60s'],
    ]},
    { name: '3-Day C · Full Body', exercises: [
      ['Barbell Deadlift', 'Legs', 3, '6-8'],
      ['Low Incline Dumbbell Press', 'Chest', 3, '10-12'],
      ['Dumbbell Chest Supported Row (Mid/Upper Back)', 'Back', 3, '10-12'],
      ['Seated Leg Extensions', 'Legs', 3, '10-15'],
      ['Cable Lateral Raise', 'Shoulders', 3, '15-20'],
      ['Standing Cable Curl', 'Biceps', 3, '10-15'],
      ['Standing Face Pulls', 'Shoulders', 2, '10'],
      ['Bird Dog', 'Core', 2, '5/side'],
    ]},
    { name: '4-Day · Upper 1', exercises: [
      ['Barbell Bench Press', 'Chest', 3, '8-10'],
      ['(Weighted) Pull-Ups', 'Back', 3, '6-12'],
      ['Standing Barbell Overhead Press', 'Shoulders', 3, '6-8'],
      ['Seated Mid-Chest Cable Fly', 'Chest', 3, '10-15'],
      ['Dumbbell Chest Supported Row (Mid/Upper Back)', 'Back', 3, '10-12'],
      ['Incline Dumbbell Curls', 'Biceps', 3, '8-10'],
      ['Lying Incline Lateral Raise', 'Shoulders', 3, '15-20'],
      ['Standing Face Pulls', 'Shoulders', 2, '10'],
    ]},
    { name: '4-Day · Lower 1 (Quads)', exercises: [
      ['Barbell Back Squat', 'Legs', 3, '8-10'],
      ['Dumbbell Romanian Deadlift', 'Legs', 3, '8-10'],
      ['Seated Leg Extensions', 'Legs', 3, '10-15'],
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
      ['Hammer Curls', 'Biceps', 3, '8-10'],
      ['Incline Dumbbell Overhead Extensions', 'Triceps', 3, '10-15'],
      ['Standing Face Pulls', 'Shoulders', 2, '10'],
    ]},
    { name: '4-Day · Lower 2 (Glutes)', exercises: [
      ['Barbell Deadlift', 'Legs', 3, '6-8'],
      ['Bulgarian Split Squat (Glute Focus)', 'Glutes', 3, '8-10/leg'],
      ['Barbell Hip Thrust', 'Glutes', 3, '10-15'],
      ['Lying Leg Curls', 'Legs', 3, '10-15'],
      ['Banded Hip Abductions', 'Glutes', 3, '12'],
      ['Seated Weighted Calf Raise', 'Legs', 3, '8-10'],
    ]},
  ];

  /* ---------- Exercise info: tutorial video + alternatives (from Drive plans) ----------
     Shape: { "<exercise>": { v: tutorialUrl, a: [ [altName, altUrl], ... ] } }        */
  const EXERCISE_INFO = {"Barbell Bench Press":{"v":"https://youtu.be/pCGVSBk0bIQ","a":[["Flat Dumbbell Press","https://youtu.be/g14dhC5KYBM"],["Flat Machine Chest Press","https://youtu.be/sO8lFa9CidE"],["Flat Smith Machine Chest Press","https://youtu.be/3Z3C44SXSQE"],["Seated Flat Cable Press","https://youtu.be/hPpNTAEDnxM"],["Neutral Grip Dumbbell Press (*shoulder friendly)","https://youtu.be/N-kUwH1uf9c"]]},"Dumbbell Romanian Deadlift":{"v":"https://youtu.be/Xu4DxwKWzl4","a":[["Barbell Romanian Deadlift","https://youtu.be/Q-2telZDPRw"],["Hyperextensions (back/ hamstring focused)","https://youtu.be/RU5d2H_OmSc"]]},"(Weighted) Pull-Ups":{"a":[["(Weighted) Chin-Ups","https://youtu.be/-TZRdvUS7Qo"],["Banded Pull-Ups","https://youtu.be/VGm-f5-T5no"],["Inverted Row","https://youtu.be/SyMSay4zrsA"],["Kneeling Lat Pulldowns","https://youtu.be/4LxKeTqlpZA"],["Lat Pulldowns","https://youtu.be/AvYZZhEl7Xk"]]},"Bulgarian Split Squat (Quad Focus)":{"v":"https://youtu.be/r9XtxWSTlcg","a":[["Heel Elevated Split Squat","https://youtu.be/bJE0-eZLa6E"],["Walking Lunges (quad focused)","https://youtu.be/JB20RuTOaFc"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"],["Weighted Step Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"]]},"Seated Mid-Chest Cable Fly":{"a":[["Standing Mid-Chest Cable Fly","https://youtu.be/fyFVaCP9J-8"],["Pec-Deck Machine Fly","https://youtu.be/rnV3y1P7894"],["Dumbbell Fly","https://youtu.be/WRn2hqy0gXU"],["Banded Push-Ups","https://youtu.be/dI7LVElfMOg"],["Standing Mid-Chest Cable Fly","https://youtu.be/Y8E3dHNsSTU"]]},"Dumbbell Lateral Raise":{"a":[["Cable Lateral Raise","https://youtu.be/1muit9qEctY"],["Lying Incline Lateral Raise","https://youtu.be/upEqeI0F73M"],["Lean In Lateral Raise","https://youtu.be/2q4kjTDg-vs"],["Wide Grip Barbell Upright Row (last resort)","https://youtu.be/6BTMVh9AnCw"]]},"Standing Weighted Calf Raise":{"a":[["Toes-Elevated Smith Machine Calf Raises","https://youtu.be/_ChZv2iluM8"],["Single Leg Weighted Calf Raise","https://youtu.be/cRKA_Qdut7I"],["Leg Press Calf Raises","https://youtu.be/s8yUXsZrgE0"]]},"Standing Face Pulls":{"a":[["Bent Over Dumbbell Face Pulls","https://youtu.be/kA415Unr-_E"],["(Weighted) Prone Arm Circles","https://youtu.be/6D-4V_M8RJA"],["Wall Slides","https://youtu.be/x4zjfuLXHVk"]]},"Barbell Back Squat":{"a":[["Quad-Focused Leg Press","https://youtu.be/0nrW-q7-WRQ"],["Smith Machine Squat","https://youtu.be/zSVi51Jp3eI"],["Barbell Back Box Squat (*knee friendly)","https://youtu.be/QryQO4VuPK8"],["Weighted Step-Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"],["Goblet Squat (*lower back friendly)","https://youtu.be/nYDEYFXN2Rs"],["Bulgarian Split Squat (quad-focused)","https://youtu.be/r9XtxWSTlcg"]]},"Standing Barbell Overhead Press":{"a":[["Standing Dumbbell Shoulder Press","https://youtu.be/jWriqmLrQqs"],["Seated Dumbbell Shoulder Press","https://youtu.be/DPXG3BJvl8A"],["Seated Neutral-Grip Dumbbell Shoulder Press (*shoulder friendly)","https://youtu.be/W35eREjZnhI"]]},"Seated Leg Curls":{"v":"https://youtu.be/81umRgyxIAU","a":[["Lying Leg Curls","https://youtu.be/aYy3alWRDmk"],["Swiss Ball Leg Curls","https://youtu.be/uRBpd65dbYs"],["Dumbbell Lying Leg Curls","https://youtu.be/Ot1MZipNLOQ"]]},"Seated Cable Row (Mid/Upper Back)":{"v":"https://youtu.be/Q-5V5T55giY","a":[["Dumbbell Chest Supported Row (mid/upper back focused)","https://youtu.be/kNvy2_9Ji2w"],["Barbell Row (mid/upper back focused)","https://youtu.be/FTCmwlfZ29A"],["Chest Supported Machine Row","https://youtu.be/iDiVxqvHGWY"]]},"Banded Push-Ups":{"v":"https://youtu.be/dI7LVElfMOg","a":[["Close-Grip Barbell Bench Press","https://youtu.be/JzCGNgXuATs"],["Close-Grip Push-Ups","https://youtu.be/ZtAz8gupAss"],["Close-Grip Dumbbell Press","https://youtu.be/wHx9-aLjDOM"],["Close-Grip Smith Machine Press","https://youtu.be/GIuRW-MDHK8"],["Cable Pushdowns","https://youtu.be/MlfCS_7ZLXA"]]},"Incline Dumbbell Overhead Extensions":{"a":[["Overhead Rope Extensions","https://youtu.be/7yoTblFCUQM"],["Cable Pushdowns (*elbow friendly)","https://youtu.be/MlfCS_7ZLXA"],["Incline Barbell Skullcrushers","https://youtu.be/XgwPiPY4vCI"],["Cross Cable Tricep Extensions","https://youtu.be/Fua2QlXnn6Y"]]},"RKC Plank":{"v":"https://youtu.be/lOgA1UfFbWY","a":[["Side Plank","https://youtu.be/o4LGPtKjbhU"],["Bird Dog","https://youtu.be/4qE_9h_6Hes"],["Palloff Press","https://youtu.be/WhCH2CwVo4I"],["Dead Bug","https://youtu.be/UJ7b8gYa2Es"]]},"Barbell Deadlift":{"a":[["Sumo Deadlift (*lower back friendly)","https://youtu.be/9rXKd-_DaRs"],["Trap Bar Deadlift (*lower back friendly)","https://youtu.be/5mnlJtf-7WM"],["Dumbbell Romanian Deadlift","https://youtu.be/Xu4DxwKWzl4"],["Hyperextensions (back/ hamstring focused)","https://youtu.be/RU5d2H_OmSc"],["Glute Focused Leg Press","https://youtu.be/p13BNdwR93A"]]},"Low Incline Dumbbell Press":{"a":[["Incline Machine Chest Press","https://youtu.be/abc1fisYB3w"],["Low Incline Smith Machine Press","https://youtu.be/R53nThQcdZo"],["Low Incline Barbell Press","https://youtu.be/jW4j7FoqudI"],["Low Incline Cable Press","https://youtu.be/6qV1WZ_z0u0"],["(Banded) Decline Push-Ups","https://youtu.be/LdahU9kB-u0"]]},"Dumbbell Chest Supported Row (Mid/Upper Back)":{"v":"https://youtu.be/kNvy2_9Ji2w","a":[["Barbell Row (mid/upper back focused)","https://youtu.be/FTCmwlfZ29A"],["Seated Cable Row (mid/ upper back focused)","https://youtu.be/Q-5V5T55giY"],["Chest Supported Machine Row","https://youtu.be/iDiVxqvHGWY"]]},"Seated Leg Extensions":{"a":[["Sissy Squat","https://youtu.be/3SeCC8ABZ_Q"],["Heel Elevated Goblet Squat","https://youtu.be/l9crMLuT4II"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"]]},"Cable Lateral Raise":{"v":"https://youtu.be/1muit9qEctY","a":[["Dumbbell Lateral Raises","https://youtu.be/zcO3sgAeLA0"],["Lying Incline Lateral Raises","https://youtu.be/upEqeI0F73M"],["Lean In Lateral Raise","https://youtu.be/2q4kjTDg-vs"],["Wide Grip Barbell Upright Row (last resort)","https://youtu.be/6BTMVh9AnCw"]]},"Standing Cable Curl":{"a":[["Seated Dumbbell Curls","https://youtu.be/qUAzPq4B2aw"],["Dumbbell Spider Curls","https://youtu.be/hDDcQkCxHjE"]]},"Bird Dog":{"v":"https://youtu.be/4qE_9h_6Hes","a":[["RKC Plank","https://youtu.be/lOgA1UfFbWY"],["Side Plank","https://youtu.be/o4LGPtKjbhU"],["Palloff Press","https://youtu.be/WhCH2CwVo4I"],["Dead Bug","https://youtu.be/UJ7b8gYa2Es"]]},"INTERMEDIATE / 3-day v1":{"a":[["<","https://youtu.be/pCGVSBk0bIQ"],["<","https://youtu.be/Xu4DxwKWzl4"],["<","https://youtu.be/w_yuTRQd6HA"],["<","https://youtu.be/r9XtxWSTlcg"],["<","https://youtu.be/Y8E3dHNsSTU"],["<","https://youtu.be/zcO3sgAeLA0"],["<","https://youtu.be/q2Eigaa9dKU"],["<","https://youtu.be/02g7XtSRXug"],["<","https://youtu.be/AWo-q7P-HZ0"],["<","https://youtu.be/S3kYKH32VqI"],["<","https://youtu.be/81umRgyxIAU"],["<","https://youtu.be/Q-5V5T55giY"],["<","https://youtu.be/dI7LVElfMOg"],["<","https://youtu.be/3d86xMhHROA"],["<","https://youtu.be/2TkLMol2bCo"],["<","https://youtu.be/lOgA1UfFbWY"],["<","https://youtu.be/JL1tJTEmxfw"],["<","https://youtu.be/kpzUeELReEA"],["<","https://youtu.be/kNvy2_9Ji2w"],["<","https://youtu.be/nIalczfM8es"],["<","https://youtu.be/1muit9qEctY"],["<","https://youtu.be/8Bb-ak2lB8E"],["<","https://youtu.be/4qE_9h_6Hes"]]},"Incline Dumbbell Curls":{"a":[["Behind Body Cable Curls","https://youtu.be/S2CNDlAY8kY"],["Barbell Curl","https://youtu.be/-ClfZ00zo8c"]]},"Lying Incline Lateral Raise":{"v":"https://youtu.be/upEqeI0F73M","a":[["Dumbbell Lateral Raises","https://youtu.be/zcO3sgAeLA0"],["Cable Lateral Raise","https://youtu.be/1muit9qEctY"],["Lean In Lateral Raise","https://youtu.be/2q4kjTDg-vs"],["Wide Grip Barbell Upright Row (last resort)","https://youtu.be/6BTMVh9AnCw"]]},"Walking Lunges (Quad Focus)":{"v":"https://youtu.be/JB20RuTOaFc","a":[["Heel Elevated Split Squat","https://youtu.be/bJE0-eZLa6E"],["Bulgarian Split Squat (quad focused)","https://youtu.be/r9XtxWSTlcg"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"],["Weighted Step Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"]]},"Side Plank":{"v":"https://youtu.be/o4LGPtKjbhU","a":[["RKC Plank","https://youtu.be/lOgA1UfFbWY"],["Bird Dog","https://youtu.be/4qE_9h_6Hes"],["Palloff Press","https://youtu.be/WhCH2CwVo4I"],["Dead Bug","https://youtu.be/UJ7b8gYa2Es"]]},"Chest Supported Dumbbell Row (Lat Focus)":{"a":[["Lat Focused Cable Row","https://youtu.be/ZaEnZ47cDTk"],["Barbell Row (lat focused)","https://youtu.be/tS5lKXxtNvE"],["Half-Kneeling Cable Row","https://youtu.be/tTev-zsqR4A"]]},"Flat Dumbbell Press":{"v":"https://youtu.be/g14dhC5KYBM","a":[["Barbell Bench Press","https://youtu.be/pCGVSBk0bIQ"],["Flat Machine Chest Press","https://youtu.be/sO8lFa9CidE"],["Flat Smith Machine Chest Press","https://youtu.be/3Z3C44SXSQE"],["Seated Flat Cable Press","https://youtu.be/hPpNTAEDnxM"],["Neutral Grip Dumbbell Press (*shoulder friendly)","https://youtu.be/N-kUwH1uf9c"]]},"Rear Delt Cable Row":{"a":[["Chest Supported Dumbbell Rear Delt Row","https://youtu.be/6LTUVaKpRCk"],["Rear Delt Cable Fly","https://youtu.be/2Xepcd9FYvE"],["Barbell Row (mid/upper back focused)","https://youtu.be/FTCmwlfZ29A"]]},"Bulgarian Split Squat (Glute Focus)":{"v":"https://youtu.be/r9XtxWSTlcg","a":[["Front Foot Elevated Reverse Lunge","https://youtu.be/JySEdVXPUM8"],["Reverse Lunges (*knee friendly)","https://youtu.be/AUEGDvCrQJA"],["Weighted Step Ups (*knee friendly)","https://youtu.be/Cjc3AgmdtlA"],["Single-Leg Leg Press","https://youtu.be/hdioTTf8qdw"]]},"Barbell Hip Thrust":{"a":[["Smith Machine Hip Thrust","https://youtu.be/srYETmyq3_c"],["(Weighted) Single Leg Hip Thrusts","https://youtu.be/FKD9-qezw08"],["Hyperextensions (glute focused)","https://youtu.be/bsXgCaIIwCg"],["Reverse Hyperextensions (bodyweight)","https://youtu.be/yRvF177yb88"]]},"Lying Leg Curls":{"v":"https://youtu.be/aYy3alWRDmk","a":[["Seated Leg Curls","https://youtu.be/81umRgyxIAU"],["Swiss Ball Leg Curls","https://youtu.be/uRBpd65dbYs"],["Dumbbell Lying Leg Curls","https://youtu.be/Ot1MZipNLOQ"]]},"Banded Hip Abductions":{"a":[["Side Lying Hip Raise","https://youtu.be/ZieZ6pjc4fQ"],["Side Lying Leg Raise","https://youtu.be/ht3Ayrre2HA"]]},"INTERMEDIATE / 4-day v1":{"a":[["<","https://youtu.be/pCGVSBk0bIQ"],["<","https://youtu.be/w_yuTRQd6HA"],["<","https://youtu.be/S3kYKH32VqI"],["<","https://youtu.be/Y8E3dHNsSTU"],["<","https://youtu.be/kNvy2_9Ji2w"],["<","https://youtu.be/3D56VDVkQnM"],["<","https://youtu.be/upEqeI0F73M"],["<","https://youtu.be/02g7XtSRXug"],["<","https://youtu.be/AWo-q7P-HZ0"],["<","https://youtu.be/Xu4DxwKWzl4"],["<","https://youtu.be/nIalczfM8es"],["<","https://youtu.be/JB20RuTOaFc"],["<","https://youtu.be/q2Eigaa9dKU"],["<","https://youtu.be/o4LGPtKjbhU"],["<","https://youtu.be/kpzUeELReEA"],["<","https://youtu.be/I2Unz9FR0sc"],["<","https://youtu.be/g14dhC5KYBM"],["<","https://youtu.be/k9G7BykDD4o"],["<","https://youtu.be/1muit9qEctY"],["<","https://youtu.be/OrGL-ymYREg"],["<","https://youtu.be/3d86xMhHROA"],["<","https://youtu.be/JL1tJTEmxfw"],["<","https://youtu.be/sqadB2rroz0"],["<","https://youtu.be/_vBMijiZoxE"],["<","https://youtu.be/aYy3alWRDmk"],["<","https://youtu.be/CA0ALPgTkxw"],["<","https://youtu.be/2TkLMol2bCo"]]}};

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
    if (localStorage.getItem('wt.seeded.plans') === '1') return;
    let added = 0;
    STARTER_ROUTINES.forEach((r) => {
      if (templates.some((t) => t.name.toLowerCase() === r.name.toLowerCase())) return;
      const exs = r.exercises.map(([name, muscle, count, rep]) => {
        const def = findOrCreateExercise(name, muscle);
        return {
          exId: def.id, name: def.name, muscle: def.muscle,
          sets: Array.from({ length: count }, () => ({ weight: '', reps: rep })),
        };
      });
      templates.push({ id: uid(), name: r.name, exercises: exs });
      added++;
    });
    if (added) { save(KEYS.exercises, exercises); save(KEYS.templates, templates); }
    localStorage.setItem('wt.seeded.plans', '1');
  }
  const settings = Object.assign(
    { restDefault: 90, autostart: true, sound: true },
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
  function renderRoutines() {
    const list = $('#routine-list');
    list.innerHTML = '';
    $('#routine-empty').classList.toggle('hidden', templates.length > 0);

    templates.forEach((tpl) => {
      const card = el('div', 'routine-card');

      const body = el('div', 'routine-body');
      body.appendChild(el('div', 'routine-name', tpl.name));
      const names = tpl.exercises.map((e) => e.name).join(', ');
      const setCount = tpl.exercises.reduce((n, e) => n + e.sets.length, 0);
      body.appendChild(el('div', 'routine-sub',
        `${tpl.exercises.length} exercises · ${setCount} sets — ${names}`));
      card.appendChild(body);

      card.appendChild(el('div', 'routine-go', 'Start ›'));

      const del = el('button', 'routine-del', '🗑');
      del.title = 'Delete routine';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Delete the "${tpl.name}" routine? Your logged workouts are not affected.`)) return;
        templates = templates.filter((t) => t.id !== tpl.id);
        save(KEYS.templates, templates);
        renderRoutines();
      });
      card.appendChild(del);

      card.addEventListener('click', () => startFromTemplate(tpl));
      list.appendChild(card);
    });
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

  function saveAsRoutine() {
    if (!active || !active.exercises.length) {
      alert('Add some exercises first, then save the workout as a routine.');
      return;
    }
    const existing = templates.find((t) => t.id === active.fromTemplate);
    const suggested = active.name || (existing && existing.name) || 'My Routine';
    const name = (prompt('Name this routine:', suggested) || '').trim();
    if (!name) return;

    const tplExercises = active.exercises.map((ex) => ({
      exId: ex.exId,
      name: ex.name,
      muscle: ex.muscle,
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
    alert(`Saved "${name}" — you'll see it on the start screen.`);
  }

  function discardWorkout() {
    if (!active) return;
    if (active.exercises.length && !confirm('Discard this workout? Nothing will be saved.')) return;
    active = null;
    localStorage.removeItem(KEYS.active);
    stopRest();
    renderWorkout();
  }

  function finishWorkout() {
    if (!active) return;
    // Drop empty sets / exercises with no completed data.
    const cleaned = active.exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.weight !== '' || s.reps !== ''),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (cleaned.length === 0) {
      if (!confirm('No sets logged. Discard this workout?')) return;
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
    workouts.unshift(finished);
    save(KEYS.workouts, workouts);
    active = null;
    localStorage.removeItem(KEYS.active);
    stopRest();
    renderWorkout();
    switchView('history');
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
    active.exercises.forEach((ex, exIdx) => {
      list.appendChild(renderExerciseBlock(ex, exIdx));
    });
  }

  function renderExerciseBlock(ex, exIdx) {
    const box = el('div', 'exercise');

    const head = el('div', 'exercise-head');
    const titleWrap = el('div');
    titleWrap.appendChild(el('div', 'exercise-title', ex.name));
    if (ex.muscle) titleWrap.appendChild(el('div', 'exercise-muscle', ex.muscle));
    head.appendChild(titleWrap);

    const headBtns = el('div', 'exercise-head-btns');
    if (getExerciseInfo(ex.name)) {
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
      if (set.done && settings.autostart) startRest(settings.restDefault);
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

  // WebAudio beep (no external asset).
  let audioCtx = null;
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [0, 0.18, 0.36].forEach((t) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.3, now + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.16);
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

  /* ============================================================
     Exercise info modal (tutorial video + alternatives)
     ============================================================ */
  const infoModal = $('#info-modal');
  const YT = (url) => url; // links open in a new tab; kept as-is

  function openInfo(ex, exIdx) {
    const info = getExerciseInfo(ex.name);
    if (!info) return;
    $('#info-title').textContent = ex.name;

    // Tutorial video link
    const vidWrap = $('#info-video');
    vidWrap.innerHTML = '';
    if (info.v) {
      const a = el('a', 'btn btn-primary btn-block', '▶  Watch tutorial');
      a.href = YT(info.v); a.target = '_blank'; a.rel = 'noopener';
      vidWrap.appendChild(a);
    }

    // Alternatives list
    const list = $('#info-alts');
    list.innerHTML = '';
    const alts = info.a || [];
    $('#info-alts-label').classList.toggle('hidden', alts.length === 0);
    alts.forEach(([name, url]) => {
      const row = el('div', 'alt-item');
      const left = el('div', 'alt-body');
      left.appendChild(el('div', 'alt-name', name));
      row.appendChild(left);

      const watch = el('a', 'alt-watch', '▶');
      watch.title = 'Watch'; watch.href = YT(url); watch.target = '_blank'; watch.rel = 'noopener';
      row.appendChild(watch);

      // Swap only makes sense inside an active workout
      if (exIdx != null) {
        const swap = el('button', 'alt-swap', 'Swap in');
        swap.addEventListener('click', () => {
          const def = findOrCreateExercise(name, ex.muscle);
          save(KEYS.exercises, exercises);
          const target = active.exercises[exIdx];
          target.exId = def.id;
          target.name = def.name;
          target.muscle = def.muscle;
          persistActive();
          renderExercises();
          infoModal.classList.add('hidden');
        });
        row.appendChild(swap);
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
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this workout?')) return;
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
      alert('That exercise already exists.');
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
      if (getExerciseInfo(def.name)) {
        const info = el('button', 'lib-del', 'ⓘ');
        info.title = 'Tutorial & alternatives';
        info.addEventListener('click', () => openInfo(def, null));
        libBtns.appendChild(info);
      }
      const del = el('button', 'lib-del', '🗑');
      del.addEventListener('click', () => {
        if (!confirm(`Delete "${def.name}" from your exercise list? Past workouts keep their data.`)) return;
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
