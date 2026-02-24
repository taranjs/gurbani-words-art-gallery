const artworkFiles = Array.from(
  { length: 20 },
  (_, index) => `365GurbaniWords_${String(index + 1).padStart(3, "0")}.jpg`
);

const reflectivePrompts = [
  "Pause here and breathe with gratitude.",
  "Let this word settle softly in your heart.",
  "Listen inwardly before moving forward.",
  "Carry this teaching as quiet strength.",
  "Reflect on one blessing in this moment.",
  "Walk in humility and receive the message.",
  "Let remembrance become your resting place.",
  "Absorb the meaning, not just the sound.",
];

const galleryWall = document.getElementById("galleryWall");
const template = document.getElementById("artCardTemplate");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const centerBtn = document.getElementById("centerBtn");
const floor = document.querySelector(".floor");
const soundBtn = document.getElementById("soundBtn");
const soundPresetSelect = document.getElementById("soundPreset");
const themePresetSelect = document.getElementById("themePreset");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const STORAGE_KEYS = {
  theme: "gurbani-gallery.theme",
  tone: "gurbani-gallery.tone",
  index: "gurbani-gallery.index",
};

let currentIndex = 0;
let dragStartX = 0;
let dragStartOffset = 0;
let isDragging = false;
let xOffset = 0;
let audioContext;
let masterGain;
let ambientNodes;
let soundOn = false;
let soundPreset = "mool";
let themePreset = "navy";
let initialIndex = 0;

const soundPresets = {
  mool: {
    label: "Mool Drone",
    oscAType: "sine",
    oscAFreq: 136.1,
    oscBType: "triangle",
    oscBFreq: 204.15,
    gainA: 0.05,
    gainB: 0.02,
    lfoFreq: 0.09,
    lfoDepth: 0.01,
    master: 0.07,
  },
  tanpura: {
    label: "Tanpura Glow",
    oscAType: "sawtooth",
    oscAFreq: 144,
    oscBType: "triangle",
    oscBFreq: 216,
    gainA: 0.028,
    gainB: 0.018,
    lfoFreq: 0.14,
    lfoDepth: 0.006,
    master: 0.05,
  },
  river: {
    label: "River Shabad",
    oscAType: "sine",
    oscAFreq: 108,
    oscBType: "sine",
    oscBFreq: 162,
    gainA: 0.04,
    gainB: 0.015,
    lfoFreq: 0.06,
    lfoDepth: 0.014,
    master: 0.06,
  },
};

const themePresets = ["navy", "ochre", "crimson"];

function getStoredValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

function loadPersistedPreferences() {
  const storedTheme = getStoredValue(STORAGE_KEYS.theme);
  if (storedTheme && themePresets.includes(storedTheme)) {
    themePreset = storedTheme;
  }

  const storedTone = getStoredValue(STORAGE_KEYS.tone);
  if (storedTone && Object.prototype.hasOwnProperty.call(soundPresets, storedTone)) {
    soundPreset = storedTone;
  }

  const storedIndex = Number.parseInt(getStoredValue(STORAGE_KEYS.index) || "0", 10);
  if (Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < artworkFiles.length) {
    initialIndex = storedIndex;
  }
}

function createGallery() {
  const fragment = document.createDocumentFragment();

  artworkFiles.forEach((fileName, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const img = card.querySelector("img");
    const reflection = card.querySelector(".reflection");

    img.src = `../resources/${fileName}`;
    img.alt = `Gurbani word artwork ${index + 1}`;
    reflection.textContent = reflectivePrompts[index % reflectivePrompts.length];

    fragment.append(card);
  });

  galleryWall.append(fragment);
}

function getCardMetrics() {
  const cards = [...galleryWall.children];
  if (!cards.length) {
    return { cards, cardWidth: 0, gap: 0, viewportCenter: 0 };
  }

  const firstCard = cards[0];
  const wallStyle = window.getComputedStyle(galleryWall);
  const cardWidth = firstCard.offsetWidth;
  const gap = Number.parseFloat(wallStyle.gap) || 0;
  const viewportCenter = window.innerWidth / 2;

  return { cards, cardWidth, gap, viewportCenter };
}

function updateFloorParallax() {
  if (!floor) {
    return;
  }

  const shift = -xOffset * 0.42;
  floor.style.backgroundPosition = `${shift}px 0, ${shift * -0.85}px 0`;
}

function centerOn(index, smooth = true) {
  const { cards, cardWidth, gap, viewportCenter } = getCardMetrics();
  if (!cards.length) {
    return;
  }

  const previousIndex = currentIndex;
  currentIndex = Math.max(0, Math.min(index, cards.length - 1));
  setStoredValue(STORAGE_KEYS.index, currentIndex);
  const cardCenterPosition = currentIndex * (cardWidth + gap) + cardWidth / 2;
  const targetOffset = viewportCenter - cardCenterPosition - parseFloat(getComputedStyle(galleryWall).paddingLeft);
  xOffset = targetOffset;

  galleryWall.style.transition = smooth
    ? "transform 480ms cubic-bezier(0.2, 0.8, 0.2, 1)"
    : "none";
  galleryWall.style.transform = `translateX(${xOffset}px)`;
  updateFloorParallax();

  cards.forEach((card, cardIndex) => {
    card.classList.toggle("active", cardIndex === currentIndex);
  });

  if (currentIndex !== previousIndex && soundOn) {
    playTransitionChime();
  }
}

function navigate(direction) {
  centerOn(currentIndex + direction);
}

function clampNearestIndex() {
  const { cards, cardWidth, gap, viewportCenter } = getCardMetrics();
  if (!cards.length) {
    return;
  }

  const estimatedCenter = viewportCenter - xOffset - parseFloat(getComputedStyle(galleryWall).paddingLeft);
  const nearest = Math.round((estimatedCenter - cardWidth / 2) / (cardWidth + gap));
  currentIndex = Math.max(0, Math.min(nearest, cards.length - 1));
  centerOn(currentIndex);
}

function startDrag(clientX) {
  isDragging = true;
  dragStartX = clientX;
  dragStartOffset = xOffset;
  galleryWall.style.transition = "none";
}

function moveDrag(clientX) {
  if (!isDragging) {
    return;
  }

  const delta = clientX - dragStartX;
  xOffset = dragStartOffset + delta;
  galleryWall.style.transform = `translateX(${xOffset}px)`;
  updateFloorParallax();
}

function endDrag() {
  if (!isDragging) {
    return;
  }

  isDragging = false;
  clampNearestIndex();
}

function bindEvents() {
  prevBtn.addEventListener("click", () => navigate(-1));
  nextBtn.addEventListener("click", () => navigate(1));
  centerBtn.addEventListener("click", () => centerOn(currentIndex));

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      navigate(-1);
    }
    if (event.key === "ArrowRight") {
      navigate(1);
    }
    if (event.key.toLowerCase() === "m") {
      toggleAmbientSound();
    }
    if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    }
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) < 5 && Math.abs(event.deltaX) < 5) {
        return;
      }

      if (event.deltaY > 0 || event.deltaX > 0) {
        navigate(1);
      } else {
        navigate(-1);
      }
    },
    { passive: true }
  );

  galleryWall.addEventListener("pointerdown", (event) => {
    startDrag(event.clientX);
    galleryWall.setPointerCapture(event.pointerId);
  });

  galleryWall.addEventListener("pointermove", (event) => {
    moveDrag(event.clientX);
  });

  galleryWall.addEventListener("pointerup", () => {
    endDrag();
  });

  galleryWall.addEventListener("pointercancel", () => {
    endDrag();
  });

  window.addEventListener("resize", () => {
    centerOn(currentIndex, false);
  });

  soundBtn.addEventListener("click", () => {
    toggleAmbientSound();
  });

  soundPresetSelect.addEventListener("change", () => {
    soundPreset = soundPresetSelect.value;
    setStoredValue(STORAGE_KEYS.tone, soundPreset);
    applySoundPreset();
    syncSoundUi();
  });

  themePresetSelect.addEventListener("change", () => {
    themePreset = themePresetSelect.value;
    applyThemePreset();
  });

  fullscreenBtn.addEventListener("click", () => {
    toggleFullscreen();
  });

  document.addEventListener("fullscreenchange", syncFullscreenUi);
}

function applyThemePreset() {
  document.body.classList.remove(...themePresets.map((preset) => `theme-${preset}`));
  document.body.classList.add(`theme-${themePreset}`);
  themePresetSelect.value = themePreset;
  setStoredValue(STORAGE_KEYS.theme, themePreset);
}

function ensureAudioGraph() {
  if (audioContext) {
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  audioContext = new AudioCtx();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.00001;
  masterGain.connect(audioContext.destination);

  const oscillatorA = audioContext.createOscillator();
  const oscillatorB = audioContext.createOscillator();
  const droneGainA = audioContext.createGain();
  const droneGainB = audioContext.createGain();
  const lfo = audioContext.createOscillator();
  const lfoDepth = audioContext.createGain();

  oscillatorA.type = "sine";
  oscillatorA.frequency.value = 136.1;

  oscillatorB.type = "triangle";
  oscillatorB.frequency.value = 204.15;

  droneGainA.gain.value = 0.05;
  droneGainB.gain.value = 0.02;

  lfo.type = "sine";
  lfo.frequency.value = 0.09;
  lfoDepth.gain.value = 0.01;

  oscillatorA.connect(droneGainA);
  oscillatorB.connect(droneGainB);
  droneGainA.connect(masterGain);
  droneGainB.connect(masterGain);
  lfo.connect(lfoDepth);
  lfoDepth.connect(droneGainA.gain);

  oscillatorA.start();
  oscillatorB.start();
  lfo.start();

  ambientNodes = { oscillatorA, oscillatorB, lfo, droneGainA, droneGainB, lfoDepth };
  applySoundPreset();
}

function applySoundPreset() {
  if (!ambientNodes) {
    return;
  }

  const preset = soundPresets[soundPreset] || soundPresets.mool;
  const now = audioContext?.currentTime || 0;
  const rampTime = 0.22;

  ambientNodes.oscillatorA.type = preset.oscAType;
  ambientNodes.oscillatorB.type = preset.oscBType;
  ambientNodes.oscillatorA.frequency.setTargetAtTime(preset.oscAFreq, now, rampTime);
  ambientNodes.oscillatorB.frequency.setTargetAtTime(preset.oscBFreq, now, rampTime);
  ambientNodes.droneGainA.gain.setTargetAtTime(preset.gainA, now, rampTime);
  ambientNodes.droneGainB.gain.setTargetAtTime(preset.gainB, now, rampTime);
  ambientNodes.lfo.frequency.setTargetAtTime(preset.lfoFreq, now, rampTime);
  ambientNodes.lfoDepth.gain.setTargetAtTime(preset.lfoDepth, now, rampTime);

  if (soundOn && masterGain) {
    masterGain.gain.setTargetAtTime(preset.master, now, rampTime);
  }
}

function playTransitionChime() {
  if (!audioContext || !masterGain) {
    return;
  }

  const now = audioContext.currentTime;
  const bellFrequencies = [329.63, 493.88, 659.25];
  const bellLevels = [0.014, 0.008, 0.0045];

  bellFrequencies.forEach((frequency, idx) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const peak = bellLevels[idx];
    const release = 0.9 + idx * 0.18;

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.994, now + release);

    gain.gain.setValueAtTime(0.00001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.05 + idx * 0.01);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + release);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + release + 0.02);
  });
}

async function toggleAmbientSound() {
  ensureAudioGraph();
  if (!audioContext || !masterGain) {
    return;
  }

  const now = audioContext.currentTime;

  if (!soundOn) {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    applySoundPreset();
    const preset = soundPresets[soundPreset] || soundPresets.mool;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.00001), now);
    masterGain.gain.exponentialRampToValueAtTime(preset.master, now + 0.8);
    soundOn = true;
  } else {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.00001), now);
    masterGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.55);
    soundOn = false;
  }

  syncSoundUi();
}

function syncSoundUi() {
  const preset = soundPresets[soundPreset] || soundPresets.mool;
  soundBtn.textContent = soundOn ? `Sound: On (${preset.label})` : "Sound: Off";
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  soundBtn.classList.toggle("is-active", soundOn);
  soundPresetSelect.value = soundPreset;
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

function syncFullscreenUi() {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenBtn.textContent = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
  fullscreenBtn.setAttribute("aria-pressed", String(isFullscreen));
  fullscreenBtn.classList.toggle("is-active", isFullscreen);
}

createGallery();
loadPersistedPreferences();
bindEvents();
applyThemePreset();
setStoredValue(STORAGE_KEYS.tone, soundPreset);
centerOn(initialIndex, false);
syncSoundUi();
syncFullscreenUi();
