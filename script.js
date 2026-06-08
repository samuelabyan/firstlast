// ─── Letter Pools ───
const LETTERS = {
  en: {
    easy: {
      first: ['A','B','C','D','F','G','H','L','M','N','P','R','S','T','W'],
      last:  ['D','E','G','K','L','M','N','P','R','S','T','W','Y']
    },
    hard: {
      first: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      last:  ['A','B','C','D','E','F','G','H','I','K','L','M','N','O','P','R','S','T','X','Y','Z']
    }
  },
  hy: {
    easy: {
      first: ['Ա','Բ','Գ','Դ','Ե','Զ','Է','Ը','Թ','Լ','Խ','Ծ','Կ','Հ','Ձ','Ղ','Ճ','Մ','Ն','Շ','Ո','Պ','Ջ','Ռ','Ս','Վ','Տ','Ր','Ց','Փ'],
      last:  ['ԻԿ','ՈՒՄ','ԵԼ','ՈՒԹ','ԱՆ','ԵՐ','ՈՒ','ԻՆ','ՈՒՆ','ԱԿ','ԱՐ','ԵՐ'].map(()=>['Ի','Ե','Ա','Ն','Ու','Ր','Կ','Լ']).flat()
    },
    hard: {}
  },
  ru: {
    easy: {
      first: ['А','Б','В','Г','Д','Е','Ж','З','И','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Э','Я'],
      last:  ['А','Е','И','О','У','Ы','Я','Н','Р','Л','Т','К','М','С']
    },
    hard: {
      first: ['А','Б','В','Г','Д','Е','Ж','З','И','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Э','Ю','Я'],
      last:  ['А','Б','В','Г','Д','Е','И','К','Л','М','Н','О','П','Р','С','Т','У','Х','Ч','Ш','Ы','Э','Ю','Я']
    }
  }
};

// Fix Armenian last letters properly
LETTERS.hy.easy.last = ['Ի','Ե','Ա','Ն','Ու','Ր','Կ','Լ','Ու','Ան','Ել'];
LETTERS.hy.hard = {
  first: LETTERS.hy.easy.first,
  last: ['Ի','Ե','Ա','Ն','Ու','Ռ','Կ','Լ','Ձ','Ծ','Փ','Ջ']
};

// ─── State ───
let state = {
  lang: 'en',
  diff: 'easy',
  redName: 'Red Team',
  blueName: 'Blue Team',
  totalRounds: 10,
  timerSec: 45,
  currentRound: 1,
  redScore: 0,
  blueScore: 0,
  firstLetter: '',
  lastLetter: '',
  timerInterval: null,
  timerRemaining: 0,
  timerMax: 45,
  history: []
};

// Load history from localStorage
function loadHistory() {
  try {
    const h = localStorage.getItem('firstlast_history');
    if (h) state.history = JSON.parse(h);
  } catch(e) {}
}

function saveHistory() {
  try {
    localStorage.setItem('firstlast_history', JSON.stringify(state.history.slice(0, 100)));
  } catch(e) {}
}

loadHistory();

// ─── UI Helpers ───
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Update nav
  document.getElementById('nav-setup').classList.remove('active');
  document.getElementById('nav-history').classList.remove('active');
  if (id === 'setup-screen' || id === 'game-screen' || id === 'results-screen') {
    document.getElementById('nav-setup').classList.add('active');
  } else if (id === 'history-screen') {
    document.getElementById('nav-history').classList.add('active');
  }
  window.scrollTo(0,0);
}

function navTo(id) {
  if (id === 'history-screen') { showHistoryScreen(); return; }
  showScreen(id);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── Setup ───
function selectLang(btn) {
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.lang = btn.dataset.lang;
}

function selectDiff(btn) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.diff = btn.dataset.diff;
}

function updateTimerLabel(val) {
  const v = parseInt(val);
  document.getElementById('timer-val').textContent = v === 0 ? 'Off' : v + 's';
}

// ─── Game Logic ───
function startGame() {
  state.redName = document.getElementById('red-name-input').value.trim() || 'Red Team';
  state.blueName = document.getElementById('blue-name-input').value.trim() || 'Blue Team';
  state.totalRounds = parseInt(document.getElementById('rounds-range').value);
  state.timerSec = parseInt(document.getElementById('timer-range').value);
  state.currentRound = 1;
  state.redScore = 0;
  state.blueScore = 0;

  updateHeaders();
  showScreen('game-screen');
  showRoundFlash(state.currentRound, () => startRound());
}

function rematch() {
  state.currentRound = 1;
  state.redScore = 0;
  state.blueScore = 0;
  updateHeaders();
  showScreen('game-screen');
  showRoundFlash(state.currentRound, () => startRound());
}

function updateHeaders() {
  document.getElementById('hdr-red-name').textContent = state.redName.length > 10 ? state.redName.slice(0,10)+'…' : state.redName;
  document.getElementById('hdr-blue-name').textContent = state.blueName.length > 10 ? state.blueName.slice(0,10)+'…' : state.blueName;
  document.getElementById('hdr-red-score').textContent = state.redScore;
  document.getElementById('hdr-blue-score').textContent = state.blueScore;
  document.getElementById('btn-red-name').textContent = state.redName;
  document.getElementById('btn-blue-name').textContent = state.blueName;
}

function showRoundFlash(num, cb) {
  const flash = document.getElementById('round-flash');
  document.getElementById('rf-num').textContent = num;
  document.getElementById('rf-label').textContent = 'Round';
  flash.classList.add('show');
  // re-trigger animation
  const el = document.getElementById('rf-num');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
  setTimeout(() => {
    flash.classList.remove('show');
    if (cb) cb();
  }, 900);
}

function pickLetter(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function startRound() {
  clearTimer();
  const pool = LETTERS[state.lang]?.[state.diff] || LETTERS.en.easy;
  let fl, ll;
  do {
    fl = pickLetter(pool.first);
    ll = pickLetter(pool.last);
  } while (fl === ll);
  state.firstLetter = fl;
  state.lastLetter = ll;

  // Animate letter reveal
  const fb = document.getElementById('letter-first');
  const lb = document.getElementById('letter-last');
  fb.style.animation = 'none'; lb.style.animation = 'none';
  fb.offsetHeight; lb.offsetHeight;
  fb.style.animation = 'pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both';
  lb.style.animation = 'pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.12s both';
  fb.textContent = fl;
  lb.textContent = ll;

  document.getElementById('round-badge').textContent = `Round ${state.currentRound} / ${state.totalRounds}`;

  // Timer
  const tw = document.getElementById('timer-wrap');
  if (state.timerSec > 0) {
    tw.style.display = 'flex';
    state.timerRemaining = state.timerSec;
    state.timerMax = state.timerSec;
    updateTimerUI();
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      updateTimerUI();
      if (state.timerRemaining <= 0) {
        clearTimer();
        playSound('tick');
        showToast("⏰ Time's up!");
      }
    }, 1000);
  } else {
    tw.style.display = 'none';
  }
}

function updateTimerUI() {
  const disp = document.getElementById('timer-display');
  const bar = document.getElementById('timer-bar');
  const pct = (state.timerRemaining / state.timerMax) * 100;
  disp.textContent = state.timerRemaining;
  bar.style.width = pct + '%';
  const urgent = state.timerRemaining <= 10;
  disp.className = 'timer-display' + (urgent ? ' urgent' : '');
  bar.className = 'timer-bar' + (urgent ? ' urgent' : '');
}

function clearTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function awardPoint(team) {
  clearTimer();
  playSound('point');
  if (team === 'red') {
    state.redScore++;
    document.getElementById('hdr-red-score').textContent = state.redScore;
    showToast(`🔴 ${state.redName} scores!`);
  } else {
    state.blueScore++;
    document.getElementById('hdr-blue-score').textContent = state.blueScore;
    showToast(`🔵 ${state.blueName} scores!`);
  }
  nextRound();
}

function skipRound() {
  clearTimer();
  playSound('skip');
  showToast('⏭ Round skipped');
  nextRound();
}

function nextRound() {
  if (state.currentRound >= state.totalRounds) {
    setTimeout(() => endGame(), 400);
    return;
  }
  state.currentRound++;
  setTimeout(() => showRoundFlash(state.currentRound, () => startRound()), 200);
}

function endGame() {
  clearTimer();
  playSound('end');
  launchConfetti();

  // Update result screen
  document.getElementById('res-red-name').textContent = state.redName;
  document.getElementById('res-blue-name').textContent = state.blueName;
  document.getElementById('res-red-score').textContent = state.redScore;
  document.getElementById('res-blue-score').textContent = state.blueScore;

  const banner = document.getElementById('winner-banner');
  const trophy = document.getElementById('trophy-emoji');
  const wt = document.getElementById('winner-text');
  const ws = document.getElementById('winner-sub');
  banner.style.animation = 'none';
  banner.offsetHeight;
  banner.style.animation = '';

  if (state.redScore > state.blueScore) {
    banner.className = 'winner-banner red';
    trophy.textContent = '🏆';
    wt.textContent = `${state.redName} Wins!`;
    ws.textContent = `${state.redScore} – ${state.blueScore}`;
  } else if (state.blueScore > state.redScore) {
    banner.className = 'winner-banner blue';
    trophy.textContent = '🏆';
    wt.textContent = `${state.blueName} Wins!`;
    ws.textContent = `${state.blueScore} – ${state.redScore}`;
  } else {
    banner.className = 'winner-banner tie';
    trophy.textContent = '🤝';
    wt.textContent = "It's a Tie!";
    ws.textContent = `${state.redScore} – ${state.blueScore}`;
  }

  // Save to history
  const winner = state.redScore > state.blueScore ? 'red' : (state.blueScore > state.redScore ? 'blue' : 'tie');
  const langs = { en: '🇬🇧 EN', hy: '🇦🇲 HY', ru: '🇷🇺 RU' };
  state.history.unshift({
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    redName: state.redName,
    blueName: state.blueName,
    redScore: state.redScore,
    blueScore: state.blueScore,
    winner,
    rounds: state.totalRounds,
    lang: langs[state.lang] || 'EN',
    diff: state.diff
  });
  saveHistory();
  showScreen('results-screen');
}

// ─── History ───
function showHistoryScreen() {
  renderHistory();
  showScreen('history-screen');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (state.history.length === 0) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>No games played yet.<br>Start a game to see your history here.</p></div>`;
    return;
  }
  list.innerHTML = state.history.map(g => {
    const emoji = g.winner === 'red' ? '🔴' : (g.winner === 'blue' ? '🔵' : '🤝');
    const cls = g.winner === 'red' ? 'red' : (g.winner === 'blue' ? 'blue' : 'tie');
    const winnerName = g.winner === 'red' ? g.redName : (g.winner === 'blue' ? g.blueName : 'Tie');
    const scoreStr = g.winner === 'tie' ? `${g.redScore}–${g.blueScore}` :
      (g.winner === 'red' ? `<span style="color:var(--red)">${g.redScore}</span>–${g.blueScore}` : `${g.redScore}–<span style="color:var(--blue)">${g.blueScore}</span>`);
    return `
      <div class="history-item">
        <div class="history-result-badge ${cls}">${emoji}</div>
        <div class="history-info">
          <div class="history-teams">${g.redName} vs ${g.blueName}</div>
          <div class="history-meta">${g.date} · ${g.rounds} rounds · ${g.lang} · ${g.diff}</div>
        </div>
        <div class="history-score">${scoreStr}</div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (state.history.length === 0) { showToast('Nothing to clear'); return; }
  if (confirm('Clear all game history?')) {
    state.history = [];
    saveHistory();
    renderHistory();
    showToast('History cleared');
  }
}

// ─── Sound ───
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'point') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'skip') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'tick') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'end') {
      // fanfare
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
        o.start(ctx.currentTime + i * 0.12);
        o.stop(ctx.currentTime + i * 0.12 + 0.25);
      });
    }
  } catch(e) {}
}

// ─── Confetti ───
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const pieces = [];
  const colors = ['#E63946','#1D7CC4','#F4A923','#2DB67D','#FF6B76','#4DA3E8'];
  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 3 + Math.random() * 5,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 8
    });
  }
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy *= 0.999;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 160) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}
