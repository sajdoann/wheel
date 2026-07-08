const DEFAULT_ENTRIES = [
  "Ada Lovelace",
  "Grace Hopper",
  "Katherine Johnson",
  "Alan Turing",
  "Margaret Hamilton",
  "Linus Torvalds",
];

const DEFAULT_REMOVE_WINNER = true;
const SLOWDOWN_SOUND_FALLBACK_MS = 2424;
const SLOWDOWN_SOUND_START_RATE = 0.75;
const SLOWDOWN_SOUND_END_RATE = 0.42;
const SLICE_EDGE_SAFE_ZONE = 0.14;

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

const PARTY_COLORS = [
  ...COLORS,
  "#facc15",
  "#fef3c7",
  "#f472b6",
  "#22d3ee",
  "#ffffff",
  "#c4b5fd",
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
const wheelWrap = document.querySelector(".wheel-wrap");
const spinButton = document.querySelector("#spinButton");
const muteButton = document.querySelector("#muteButton");
const winnerText = document.querySelector("#winnerText");
const addForm = document.querySelector("#addForm");
const nameInput = document.querySelector("#nameInput");
const removeWinnerInput = document.querySelector("#removeWinner");
const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");
const entriesList = document.querySelector("#entriesList");
const entryCount = document.querySelector("#entryCount");
const emptyState = document.querySelector("#emptyState");
const winnerDialog = document.querySelector("#winnerDialog");
const dialogWinner = document.querySelector("#dialogWinner");
const dialogDetail = document.querySelector("#dialogDetail");
const spinAgainButton = document.querySelector("#spinAgainButton");
const winnerSound = new Audio("pwlpl-applause-sound-effect-521104.mp3");
const slowdownSound = new Audio("freesound_community-wheel-spin-click-slow-down-101152.mp3");
winnerSound.preload = "auto";
winnerSound.volume = 0.9;
slowdownSound.preload = "auto";
slowdownSound.volume = 0.8;

let hashWriteTimer;
let confetti = [];
let fireworkFrame;
let celebrationClassTimer;
let pendingWinnerRemoval;

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
    removePendingWinner();
    winnerDialog.close();
    spinWheel();
  });
  winnerDialog.addEventListener("close", removePendingWinner);

  muteButton.addEventListener("click", () => {
    state.muted = !state.muted;
    if (state.muted) {
      stopSlowdownClicks();
      winnerSound.pause();
    }
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
  wheelWrap.classList.toggle("is-empty", state.entries.length === 0);
  entryCount.textContent = `${state.entries.length} ${state.entries.length === 1 ? "entry" : "entries"}`;
  emptyState.style.display = state.entries.length === 0 ? "block" : "none";
  spinButton.disabled = state.entries.length === 0 || state.spinning;
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
    wheelCtx.beginPath();
    wheelCtx.moveTo(0, 0);
    wheelCtx.arc(0, 0, radius, start, end);
    wheelCtx.closePath();
    wheelCtx.clip();
    wheelCtx.rotate(start + arc / 2);
    drawWheelLabel(entry, state.entries.length, radius, arc);
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
  wheelCtx.fillStyle = "#eef4ff";
  wheelCtx.fill();
  wheelCtx.lineWidth = 12;
  wheelCtx.strokeStyle = "#ffffff";
  wheelCtx.stroke();
}

function drawWheelLabel(entry, count, radius, arc) {
  const outerPadding = 30;
  const centerClearance = radius * 0.35;
  const labelX = radius - outerPadding;
  const maxTextWidth = Math.max(36, labelX - centerClearance);
  const fontSize = Math.round(clamp(arc * radius * 0.38, 11, 22));

  if (count > 64 || fontSize < 11) {
    return;
  }

  wheelCtx.textAlign = "right";
  wheelCtx.textBaseline = "middle";
  wheelCtx.fillStyle = "#fff";
  wheelCtx.font = `800 ${fontSize}px system-ui, sans-serif`;
  wheelCtx.shadowColor = "rgba(0, 0, 0, 0.3)";
  wheelCtx.shadowBlur = 4;

  const label = fitLabelToWidth(entry, maxTextWidth);
  if (label) {
    wheelCtx.fillText(label, labelX, 0);
  }
}

function fitLabelToWidth(entry, maxWidth) {
  const label = entry.trim();
  if (wheelCtx.measureText(label).width <= maxWidth) {
    return label;
  }

  const suffix = "...";
  for (let length = label.length - 1; length > 1; length -= 1) {
    const truncated = `${label.slice(0, length)}${suffix}`;
    if (wheelCtx.measureText(truncated).width <= maxWidth) {
      return truncated;
    }
  }

  return "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function spinWheel() {
  if (state.spinning || state.entries.length === 0) {
    return;
  }

  unlockAudio();
  const winnerIndex = randomIndex(state.entries.length);
  const arc = (Math.PI * 2) / state.entries.length;
  const targetPoint = winnerIndex * arc + getSliceLandingOffset(arc);
  const fullTurns = reducedMotion ? 1 : 6 + randomIndex(3);
  const startRotation = state.rotation;
  const endRotation = getForwardTargetRotation(startRotation, targetPoint, fullTurns);
  const duration = reducedMotion ? 350 : getSinglePassSlowdownDuration();
  const startedAt = performance.now();

  state.spinning = true;
  spinButton.disabled = true;
  clearButton.disabled = true;
  startSlowdownClicks();

  function tick(now) {
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeOutQuart(progress);
    state.rotation = normalizeRotation(startRotation + (endRotation - startRotation) * eased);
    drawWheel();
    updateSlowdownClicks(progress);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    finishSpin(winnerIndex);
  }

  requestAnimationFrame(tick);
}

function finishSpin(winnerIndex) {
  stopSlowdownClicks();

  const winner = state.entries[winnerIndex];
  state.winner = winner;
  state.spinning = false;
  pendingWinnerRemoval = {
    index: winnerIndex,
    name: winner,
    remove: state.removeWinner,
  };

  render();
  saveToHash();
  announceWinner(winner);
}

function announceWinner(winner) {
  winnerText.textContent = winner;
  dialogWinner.textContent = winner;
  dialogDetail.textContent = state.removeWinner
    ? "Selected and will be removed after this dialog closes."
    : "Selected and still available for future spins.";

  playPartyCheer();
  startPartyBurst();

  if (typeof winnerDialog.showModal === "function") {
    winnerDialog.showModal();
  }
}

function removePendingWinner() {
  if (!pendingWinnerRemoval) {
    return;
  }

  const { index, name, remove } = pendingWinnerRemoval;
  pendingWinnerRemoval = undefined;

  if (!remove) {
    return;
  }

  const removalIndex = state.entries[index] === name ? index : state.entries.indexOf(name);
  if (removalIndex === -1) {
    return;
  }

  state.entries.splice(removalIndex, 1);
  render();
  saveToHash();
}

function randomIndex(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function randomFloat() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 4294967296;
}

function getSliceLandingOffset(arc) {
  const landingRange = 1 - SLICE_EDGE_SAFE_ZONE * 2;
  return arc * (SLICE_EDGE_SAFE_ZONE + randomFloat() * landingRange);
}

function getForwardTargetRotation(startRotation, targetPoint, fullTurns) {
  const full = Math.PI * 2;
  const targetRotation = normalizeRotation(-targetPoint);
  const forwardDistance = normalizeRotation(targetRotation - startRotation);
  return startRotation + fullTurns * full + forwardDistance;
}

function easeOutQuart(value) {
  return 1 - Math.pow(1 - value, 4);
}

function normalizeRotation(value) {
  const full = Math.PI * 2;
  return ((value % full) + full) % full;
}

function unlockAudio() {
  if (state.muted) {
    return;
  }

  winnerSound.load();
  slowdownSound.load();
}

function playPartyCheer() {
  if (state.muted) {
    return;
  }

  winnerSound.pause();
  winnerSound.currentTime = 0;
  winnerSound.play().catch(() => {});
}

function getSinglePassSlowdownDuration() {
  const audioDuration =
    Number.isFinite(slowdownSound.duration) && slowdownSound.duration > 0
      ? slowdownSound.duration * 1000
      : SLOWDOWN_SOUND_FALLBACK_MS;
  const averagePlaybackRate = (SLOWDOWN_SOUND_START_RATE + SLOWDOWN_SOUND_END_RATE) / 2;

  return Math.round(
    clamp(audioDuration / averagePlaybackRate - 120 + randomIndex(360), 3600, 5200),
  );
}

function startSlowdownClicks() {
  if (state.muted) {
    return;
  }

  slowdownSound.pause();
  slowdownSound.loop = false;
  slowdownSound.playbackRate = SLOWDOWN_SOUND_START_RATE;
  slowdownSound.currentTime = 0;
  slowdownSound.play().catch(() => {});
}

function updateSlowdownClicks(progress) {
  if (state.muted || slowdownSound.paused) {
    return;
  }

  const drag = progress;
  slowdownSound.playbackRate =
    SLOWDOWN_SOUND_START_RATE -
    (SLOWDOWN_SOUND_START_RATE - SLOWDOWN_SOUND_END_RATE) * drag;
}

function stopSlowdownClicks() {
  slowdownSound.pause();
  slowdownSound.loop = false;
  slowdownSound.playbackRate = 1;
  slowdownSound.currentTime = 0;
}

function resizeCelebrationCanvas() {
  celebrationCanvas.width = window.innerWidth * window.devicePixelRatio;
  celebrationCanvas.height = window.innerHeight * window.devicePixelRatio;
  celebrationCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function startPartyBurst() {
  if (reducedMotion) {
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  confetti = [];
  document.body.classList.add("celebrating");
  clearTimeout(celebrationClassTimer);
  celebrationClassTimer = setTimeout(() => {
    document.body.classList.remove("celebrating");
  }, 3000);

  for (let i = 0; i < 260; i += 1) {
    confetti.push({
      type: "confetti",
      x: width * (0.2 + Math.random() * 0.6),
      y: height * (0.18 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 13,
      vy: -8 - Math.random() * 10,
      gravity: 0.16 + Math.random() * 0.09,
      drag: 0.985,
      size: 4 + Math.random() * 10,
      color: PARTY_COLORS[randomIndex(PARTY_COLORS.length)],
      life: 110 + randomIndex(80),
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.42,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  for (let i = 0; i < 160; i += 1) {
    confetti.push({
      type: "glitter",
      x: Math.random() * width,
      y: height * (0.05 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 5,
      gravity: 0.07 + Math.random() * 0.08,
      drag: 0.995,
      size: 1.5 + Math.random() * 4,
      color: PARTY_COLORS[randomIndex(PARTY_COLORS.length)],
      life: 90 + randomIndex(100),
      spin: Math.random() * Math.PI,
      spinSpeed: 0.08 + Math.random() * 0.22,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  for (let i = 0; i < 70; i += 1) {
    const fromLeft = i % 2 === 0;
    confetti.push({
      type: "streamer",
      x: fromLeft ? -20 : width + 20,
      y: height * (0.38 + Math.random() * 0.34),
      vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 8),
      vy: -7 - Math.random() * 7,
      gravity: 0.13 + Math.random() * 0.07,
      drag: 0.99,
      size: 12 + Math.random() * 20,
      color: PARTY_COLORS[randomIndex(PARTY_COLORS.length)],
      life: 120 + randomIndex(70),
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.28,
      twinkle: Math.random() * Math.PI * 2,
    });
  }

  cancelAnimationFrame(fireworkFrame);
  animatePartyBurst();
}

function animatePartyBurst() {
  celebrationCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confetti = confetti.filter((piece) => piece.life > 0);

  confetti.forEach((piece) => {
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.vy += piece.gravity;
    piece.vx *= piece.drag;
    piece.life -= 1;
    piece.spin += piece.spinSpeed;
    piece.twinkle += 0.22;

    celebrationCtx.save();
    celebrationCtx.translate(piece.x, piece.y);
    celebrationCtx.rotate(piece.spin);
    celebrationCtx.globalAlpha = Math.min(1, piece.life / 35);
    celebrationCtx.fillStyle = piece.color;

    if (piece.type === "glitter") {
      drawGlitter(piece);
    } else if (piece.type === "streamer") {
      drawStreamer(piece);
    } else {
      celebrationCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.55);
    }

    celebrationCtx.restore();
  });

  if (confetti.length > 0) {
    fireworkFrame = requestAnimationFrame(animatePartyBurst);
  } else {
    celebrationCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    document.body.classList.remove("celebrating");
  }
}

function drawGlitter(piece) {
  const pulse = 0.65 + Math.sin(piece.twinkle) * 0.35;
  const size = piece.size * pulse;
  celebrationCtx.shadowColor = piece.color;
  celebrationCtx.shadowBlur = 14;
  celebrationCtx.beginPath();
  celebrationCtx.moveTo(0, -size * 1.8);
  celebrationCtx.lineTo(size * 0.45, -size * 0.45);
  celebrationCtx.lineTo(size * 1.8, 0);
  celebrationCtx.lineTo(size * 0.45, size * 0.45);
  celebrationCtx.lineTo(0, size * 1.8);
  celebrationCtx.lineTo(-size * 0.45, size * 0.45);
  celebrationCtx.lineTo(-size * 1.8, 0);
  celebrationCtx.lineTo(-size * 0.45, -size * 0.45);
  celebrationCtx.closePath();
  celebrationCtx.fill();
}

function drawStreamer(piece) {
  celebrationCtx.lineWidth = Math.max(2, piece.size * 0.14);
  celebrationCtx.lineCap = "round";
  celebrationCtx.strokeStyle = piece.color;
  celebrationCtx.shadowColor = piece.color;
  celebrationCtx.shadowBlur = 8;
  celebrationCtx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const x = (i - 2) * piece.size * 0.28;
    const y = Math.sin(piece.twinkle + i * 0.8) * piece.size * 0.22;
    if (i === 0) {
      celebrationCtx.moveTo(x, y);
    } else {
      celebrationCtx.lineTo(x, y);
    }
  }
  celebrationCtx.stroke();
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
  pendingWinnerRemoval = undefined;

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
