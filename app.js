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
  let active = load(KEYS.active, null);
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
    const menu = el('button', 'exercise-menu', '✕');
    menu.title = 'Remove exercise';
    menu.addEventListener('click', () => {
      active.exercises.splice(exIdx, 1);
      persistActive();
      renderExercises();
    });
    head.appendChild(menu);
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

  /* ---------- Generic modal close ---------- */
  $$('[data-close]').forEach((n) => {
    n.addEventListener('click', () => {
      pickerModal.classList.add('hidden');
      restSettingsModal.classList.add('hidden');
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
      const del = el('button', 'lib-del', '🗑');
      del.addEventListener('click', () => {
        if (!confirm(`Delete "${def.name}" from your exercise list? Past workouts keep their data.`)) return;
        exercises = exercises.filter((e) => e.id !== def.id);
        save(KEYS.exercises, exercises);
        renderLibrary();
      });
      item.appendChild(del);
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
  renderWorkout();

  // Register service worker for offline use (optional; ignored if unsupported).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
