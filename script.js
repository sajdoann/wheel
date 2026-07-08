const DEFAULT_ENTRIES = [
  "Ada Lovelace",
  "Grace Hopper",
  "Katherine Johnson",
  "Alan Turing",
  "Margaret Hamilton",
  "Linus Torvalds",
];

const DEFAULT_REMOVE_WINNER = true;

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#c026d3",
  "#65a30d",
  "#e11d48",
  "#0d9488",
];

const state = {
  entries: [],
  removeWinner: DEFAULT_REMOVE_WINNER,
  muted: false,
  rotation: 0,
  spinning: false,
  winner: "",
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wheelCanvas = document.querySelector("#wheelCanvas");
const wheelCtx = wheelCanvas.getContext("2d");
const celebrationCanvas = document.querySelector("#celebrationCanvas");
const celebrationCtx = celebrationCanvas.getContext("2d");
const spinButton = document.querySelector("#spinButton");
const muteButton = document.querySelector("#muteButton");
const winnerText = document.querySelector("#winnerText");
const addForm = document.querySelector("#addForm");
const nameInput = document.querySelector("#nameInput");
const removeWinnerInput = document.querySelector("#removeWinner");
const shuffleButton = document.querySelector("#shuffleButton");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");
const entriesList = document.querySelector("#entriesList");
const entryCount = document.querySelector("#entryCount");
const emptyState = document.querySelector("#emptyState");
const winnerDialog = document.querySelector("#winnerDialog");
const dialogWinner = document.querySelector("#dialogWinner");
const dialogDetail = document.querySelector("#dialogDetail");
const spinAgainButton = document.querySelector("#spinAgainButton");

let audioContext;
let hashWriteTimer;
let confetti = [];
let fireworkFrame;

function init() {
  loadFromHash();
  if (state.entries.length === 0 && !window.location.hash) {
    state.entries = [...DEFAULT_ENTRIES];
  }

  resizeCelebrationCanvas();
  bindEvents();
  render();
  saveToHash();
}

function bindEvents() {
  window.addEventListener("resize", () => {
    resizeCelebrationCanvas();
    drawWheel();
  });

  window.addEventListener("hashchange", () => {
    loadFromHash();
    render();
  });

  spinButton.addEventListener("click", spinWheel);
  wheelCanvas.addEventListener("click", spinWheel);
  spinAgainButton.addEventListener("click", () => {
    winnerDialog.close();
    spinWheel();
  });

  muteButton.addEventListener("click", () => {
    state.muted = !state.muted;
    updateMuteButton();
    saveToHash();
  });

  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const names = parseNames(nameInput.value);
    if (names.length === 0) {
      nameInput.focus();
      return;
    }

    state.entries.push(...names);
    nameInput.value = "";
    render();
    saveToHash();
  });

  nameInput.addEventListener("paste", (event) => {
    const text = event.clipboardData?.getData("text") ?? "";
    if (!/[\n,;]/.test(text)) {
      return;
    }

    event.preventDefault();
    const names = parseNames(text);
    if (names.length > 0) {
      state.entries.push(...names);
      render();
      saveToHash();
    }
  });

  removeWinnerInput.addEventListener("change", () => {
    state.removeWinner = removeWinnerInput.checked;
    saveToHash();
  });

  shuffleButton.addEventListener("click", () => {
    state.entries = shuffled(state.entries);
    render();
    saveToHash();
  });

  sampleButton.addEventListener("click", () => {
    state.entries = [...DEFAULT_ENTRIES];
    state.winner = "";
    render();
    saveToHash();
  });

  clearButton.addEventListener("click", () => {
    state.entries = [];
    state.winner = "";
    render();
    saveToHash();
    nameInput.focus();
  });

  copyButton.addEventListener("click", async () => {
    saveToHash(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy link";
      }, 1200);
    } catch {
      copyButton.textContent = "Copy failed";
      setTimeout(() => {
        copyButton.textContent = "Copy link";
      }, 1600);
    }
  });
}

function parseNames(value) {
  return value
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 250);
}

function render() {
  removeWinnerInput.checked = state.removeWinner;
  updateMuteButton();
  updateEntries();
  updateWinner();
  drawWheel();
}

function updateMuteButton() {
  muteButton.textContent = state.muted ? "Sound off" : "Sound on";
  muteButton.setAttribute("aria-pressed", String(state.muted));
}

function updateEntries() {
  entriesList.innerHTML = "";
  entryCount.textContent = `${state.entries.length} ${state.entries.length === 1 ? "entry" : "entries"}`;
  emptyState.style.display = state.entries.length === 0 ? "block" : "none";
  spinButton.disabled = state.entries.length === 0 || state.spinning;
  shuffleButton.disabled = state.entries.length < 2 || state.spinning;
  clearButton.disabled = state.entries.length === 0 || state.spinning;

  state.entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "entry-item";

    const input = document.createElement("input");
    input.type = "text";
    input.value = entry;
    input.setAttribute("aria-label", `Entry ${index + 1}`);
    input.addEventListener("change", () => {
      const value = input.value.trim();
      if (value) {
        state.entries[index] = value;
      } else {
        state.entries.splice(index, 1);
      }
      render();
      saveToHash();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${entry}`);
    remove.addEventListener("click", () => {
      state.entries.splice(index, 1);
      render();
      saveToHash();
    });

    item.append(input, remove);
    entriesList.append(item);
  });
}

function updateWinner() {
  winnerText.textContent = state.winner || "Nobody yet";
}

function drawWheel() {
  const size = wheelCanvas.width;
  const center = size / 2;
  const radius = center - 18;

  wheelCtx.clearRect(0, 0, size, size);
  wheelCtx.save();
  wheelCtx.translate(center, center);

  if (state.entries.length === 0) {
    drawEmptyWheel(radius);
    wheelCtx.restore();
    return;
  }

  const arc = (Math.PI * 2) / state.entries.length;
  wheelCtx.rotate(state.rotation);

  state.entries.forEach((entry, index) => {
    const start = index * arc - Math.PI / 2;
    const end = start + arc;

    wheelCtx.beginPath();
    wheelCtx.moveTo(0, 0);
    wheelCtx.arc(0, 0, radius, start, end);
    wheelCtx.closePath();
    wheelCtx.fillStyle = COLORS[index % COLORS.length];
    wheelCtx.fill();
    wheelCtx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    wheelCtx.lineWidth = 5;
    wheelCtx.stroke();

    wheelCtx.save();
    wheelCtx.rotate(start + arc / 2);
    wheelCtx.textAlign = "right";
    wheelCtx.textBaseline = "middle";
    wheelCtx.fillStyle = "#fff";
    wheelCtx.font = "800 28px system-ui, sans-serif";
    wheelCtx.shadowColor = "rgba(0, 0, 0, 0.3)";
    wheelCtx.shadowBlur = 4;
    const label = fitLabel(entry, state.entries.length);
    wheelCtx.fillText(label, radius - 34, 0, radius * 0.6);
    wheelCtx.restore();
  });

  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, radius, 0, Math.PI * 2);
  wheelCtx.lineWidth = 12;
  wheelCtx.strokeStyle = "#ffffff";
  wheelCtx.stroke();
  wheelCtx.restore();
}

function drawEmptyWheel(radius) {
  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, radius, 0, Math.PI * 2);
  wheelCtx.fillStyle = "#dbeafe";
  wheelCtx.fill();
  wheelCtx.lineWidth = 12;
  wheelCtx.strokeStyle = "#ffffff";
  wheelCtx.stroke();
  wheelCtx.fillStyle = "#31506f";
  wheelCtx.textAlign = "center";
  wheelCtx.textBaseline = "middle";
  wheelCtx.font = "800 34px system-ui, sans-serif";
  wheelCtx.fillText("Add names", 0, 0);
}

function fitLabel(entry, count) {
  const maxLength = count > 18 ? 14 : count > 10 ? 18 : 28;
  return entry.length > maxLength ? `${entry.slice(0, maxLength - 1)}...` : entry;
}

function spinWheel() {
  if (state.spinning || state.entries.length === 0) {
    return;
  }

  unlockAudio();
  const winnerIndex = randomIndex(state.entries.length);
  const arc = (Math.PI * 2) / state.entries.length;
  const targetCenter = winnerIndex * arc + arc / 2 - Math.PI / 2;
  const fullTurns = reducedMotion ? 1 : 6 + randomIndex(4);
  const targetRotation = fullTurns * Math.PI * 2 - targetCenter;
  const startRotation = state.rotation;
  const endRotation = targetRotation;
  const duration = reducedMotion ? 350 : 4700 + randomIndex(1000);
  const startedAt = performance.now();

  state.spinning = true;
  spinButton.disabled = true;
  shuffleButton.disabled = true;
  clearButton.disabled = true;

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = easeOutCubic(progress);
    state.rotation = normalizeRotation(startRotation + (endRotation - startRotation) * eased);
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    finishSpin(winnerIndex);
  }

  requestAnimationFrame(tick);
}

function finishSpin(winnerIndex) {
  const winner = state.entries[winnerIndex];
  state.winner = winner;
  state.spinning = false;

  if (state.removeWinner) {
    state.entries.splice(winnerIndex, 1);
  }

  render();
  saveToHash();
  announceWinner(winner);
}

function announceWinner(winner) {
  winnerText.textContent = winner;
  dialogWinner.textContent = winner;
  dialogDetail.textContent = state.removeWinner
    ? "Selected and removed from the wheel."
    : "Selected and still available for future spins.";

  playApplause();
  startFireworks();

  if (typeof winnerDialog.showModal === "function") {
    winnerDialog.showModal();
  }
}

function randomIndex(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function shuffled(values) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function normalizeRotation(value) {
  const full = Math.PI * 2;
  return ((value % full) + full) % full;
}

function unlockAudio() {
  if (state.muted || audioContext) {
    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playApplause() {
  if (state.muted || !audioContext) {
    return;
  }

  const duration = 1.35;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    const t = i / sampleRate;
    const burst = Math.sin(t * 88) * Math.sin(t * 143);
    const noise = Math.random() * 2 - 1;
    const envelope = Math.min(1, t * 5) * Math.max(0, 1 - t / duration);
    data[i] = (noise * 0.32 + burst * 0.18) * envelope;
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1600;
  filter.Q.value = 0.8;
  gain.gain.value = 0.55;
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  source.start();
}

function resizeCelebrationCanvas() {
  celebrationCanvas.width = window.innerWidth * window.devicePixelRatio;
  celebrationCanvas.height = window.innerHeight * window.devicePixelRatio;
  celebrationCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function startFireworks() {
  if (reducedMotion) {
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  confetti = [];

  for (let i = 0; i < 150; i += 1) {
    confetti.push({
      x: width * (0.2 + Math.random() * 0.6),
      y: height * (0.18 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 8,
      size: 4 + Math.random() * 6,
      color: COLORS[randomIndex(COLORS.length)],
      life: 80 + randomIndex(45),
      spin: Math.random() * Math.PI,
    });
  }

  cancelAnimationFrame(fireworkFrame);
  animateFireworks();
}

function animateFireworks() {
  celebrationCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confetti = confetti.filter((piece) => piece.life > 0);

  confetti.forEach((piece) => {
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.vy += 0.12;
    piece.vx *= 0.99;
    piece.life -= 1;
    piece.spin += 0.18;

    celebrationCtx.save();
    celebrationCtx.translate(piece.x, piece.y);
    celebrationCtx.rotate(piece.spin);
    celebrationCtx.globalAlpha = Math.min(1, piece.life / 30);
    celebrationCtx.fillStyle = piece.color;
    celebrationCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.62);
    celebrationCtx.restore();
  });

  if (confetti.length > 0) {
    fireworkFrame = requestAnimationFrame(animateFireworks);
  } else {
    celebrationCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function saveToHash(force = false) {
  clearTimeout(hashWriteTimer);
  const write = () => {
    const payload = {
      names: state.entries,
      remove: state.removeWinner,
      muted: state.muted,
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const nextHash = `#${encoded}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  };

  if (force) {
    write();
  } else {
    hashWriteTimer = setTimeout(write, 120);
  }
}

function loadFromHash() {
  if (!window.location.hash) {
    state.entries = [];
    state.removeWinner = DEFAULT_REMOVE_WINNER;
    state.muted = false;
    state.winner = "";
    return;
  }

  try {
    const payload = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
    state.entries = Array.isArray(payload.names)
      ? payload.names.map((name) => String(name).trim()).filter(Boolean).slice(0, 250)
      : [];
    state.removeWinner = typeof payload.remove === "boolean" ? payload.remove : DEFAULT_REMOVE_WINNER;
    state.muted = Boolean(payload.muted);
    state.winner = "";
  } catch {
    state.entries = [];
    state.removeWinner = DEFAULT_REMOVE_WINNER;
    state.muted = false;
    state.winner = "";
  }
}

init();
