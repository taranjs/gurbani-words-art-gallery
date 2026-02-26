(function () {
  var artworkFiles = [];
  var i;
  for (i = 1; i <= 20; i += 1) {
    var fileNo = String(i);
    while (fileNo.length < 3) {
      fileNo = "0" + fileNo;
    }
    artworkFiles.push("365GurbaniWords_" + fileNo + ".jpg");
  }

  var reflectivePrompts = [
    "Pause here and breathe with gratitude.",
    "Let this word settle softly in your heart.",
    "Listen inwardly before moving forward.",
    "Carry this teaching as quiet strength.",
    "Reflect on one blessing in this moment.",
    "Walk in humility and receive the message.",
    "Let remembrance become your resting place.",
    "Absorb the meaning, not just the sound."
  ];

  var galleryWall = document.getElementById("galleryWall");
  var experience = document.querySelector(".experience");
  var template = document.getElementById("artCardTemplate");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var floor = document.querySelector(".floor");
  var soundBtn = document.getElementById("soundBtn");
  var soundPresetSelect = document.getElementById("soundPreset");
  var themePresetSelect = document.getElementById("themePreset");
  var fullscreenBtn = document.getElementById("fullscreenBtn");
  var settingsBtn = document.getElementById("settingsBtn");
  var settingsPanel = document.getElementById("settingsPanel");

  var STORAGE_KEYS = {
    theme: "gurbani-gallery.theme",
    tone: "gurbani-gallery.tone",
    index: "gurbani-gallery.index"
  };

  var currentIndex = 0;
  var dragStartX = 0;
  var dragStartOffset = 0;
  var isDragging = false;
  var xOffset = 0;
  var audioContext;
  var masterGain;
  var ambientNodes;
  var soundOn = false;
  var soundPreset = "mool";
  var themePreset = "navy";
  var initialIndex = 0;
  var settingsOpen = false;
  var viewModes = {
    walk: "walk",
    immersive: "immersive",
    wall: "wall"
  };
  var currentViewMode = viewModes.walk;

  var soundPresets = {
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
      master: 0.07
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
      master: 0.05
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
      master: 0.06
    }
  };

  var themePresets = ["navy", "ochre", "crimson"];

  function safeParseInt(value, fallbackValue) {
    var parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return fallbackValue;
    }
    return parsed;
  }

  function getStoredValue(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function setStoredValue(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      return;
    }
  }

  function includes(array, value) {
    var idx;
    for (idx = 0; idx < array.length; idx += 1) {
      if (array[idx] === value) {
        return true;
      }
    }
    return false;
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function loadPersistedPreferences() {
    var storedTheme = getStoredValue(STORAGE_KEYS.theme);
    if (storedTheme && includes(themePresets, storedTheme)) {
      themePreset = storedTheme;
    }

    var storedTone = getStoredValue(STORAGE_KEYS.tone);
    if (storedTone && hasOwn(soundPresets, storedTone)) {
      soundPreset = storedTone;
    }

    var storedIndex = safeParseInt(getStoredValue(STORAGE_KEYS.index) || "0", 0);
    if (storedIndex >= 0 && storedIndex < artworkFiles.length) {
      initialIndex = storedIndex;
    }
  }

  function createCardElement() {
    var card = document.createElement("article");
    card.className = "art-card";
    card.setAttribute("role", "listitem");

    var frame = document.createElement("div");
    frame.className = "frame";

    var img = document.createElement("img");
    img.setAttribute("alt", "Gurbani word artwork");
    frame.appendChild(img);

    var reflection = document.createElement("p");
    reflection.className = "reflection";

    card.appendChild(frame);
    card.appendChild(reflection);

    return card;
  }

  function createGallery() {
    var fragment = document.createDocumentFragment();
    var supportsTemplate = template && template.content && template.content.firstElementChild;

    for (i = 0; i < artworkFiles.length; i += 1) {
      var card;
      if (supportsTemplate) {
        card = template.content.firstElementChild.cloneNode(true);
      } else {
        card = createCardElement();
      }

      var img = card.querySelector("img");
      var reflection = card.querySelector(".reflection");

      img.src = "../resources/" + artworkFiles[i];
      img.alt = "Gurbani word artwork " + (i + 1);
      reflection.textContent = reflectivePrompts[i % reflectivePrompts.length];

      fragment.appendChild(card);
    }

    galleryWall.appendChild(fragment);
  }

  function getCardCenter(card) {
    return card.offsetLeft + card.offsetWidth / 2;
  }

  function getCardMetrics() {
    var cards = galleryWall.children;
    if (!cards.length) {
      return { cards: cards, viewportCenter: 0 };
    }

    var viewportCenter = window.innerWidth / 2;

    return { cards: cards, viewportCenter: viewportCenter };
  }

  function setActiveCard(cards, activeIndex) {
    var cardIndex;
    for (cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
      if (cardIndex === activeIndex) {
        cards[cardIndex].classList.add("active");
      } else {
        cards[cardIndex].classList.remove("active");
      }
    }
  }

  function getCardIndex(cardEl) {
    var cards = galleryWall.children;
    var idx;

    for (idx = 0; idx < cards.length; idx += 1) {
      if (cards[idx] === cardEl) {
        return idx;
      }
    }

    return -1;
  }

  function syncViewModeClasses() {
    if (!experience) {
      return;
    }

    experience.classList.toggle("mode-walk", currentViewMode === viewModes.walk);
    experience.classList.toggle("mode-immersive", currentViewMode === viewModes.immersive);
    experience.classList.toggle("mode-wall", currentViewMode === viewModes.wall);
  }

  function setViewMode(mode, smooth) {
    var shouldAnimate = smooth !== false;
    if (!hasOwn(viewModes, mode)) {
      return;
    }

    currentViewMode = mode;
    syncViewModeClasses();
    centerOn(currentIndex, shouldAnimate);
  }

  function updateFloorParallax() {
    if (!floor) {
      return;
    }

    var shift = -xOffset * 0.42;
    floor.style.backgroundPosition = shift + "px 0, " + (shift * -0.85) + "px 0";
  }

  function centerOn(index, smooth) {
    var shouldAnimate = smooth !== false;
    var metrics = getCardMetrics();
    var cards = metrics.cards;
    var viewportCenter = metrics.viewportCenter;

    if (!cards.length) {
      return;
    }

    var previousIndex = currentIndex;
    currentIndex = Math.max(0, Math.min(index, cards.length - 1));
    setStoredValue(STORAGE_KEYS.index, currentIndex);

    if (currentViewMode === viewModes.wall) {
      xOffset = 0;
      galleryWall.style.transition = shouldAnimate
        ? "transform 480ms cubic-bezier(0.2, 0.8, 0.2, 1)"
        : "none";
      galleryWall.style.transform = "translateX(0px)";
      updateFloorParallax();
      setActiveCard(cards, currentIndex);

      if (currentIndex !== previousIndex && soundOn) {
        playTransitionChime();
      }
      return;
    }

    var cardCenterPosition = getCardCenter(cards[currentIndex]);
    var targetOffset = viewportCenter - cardCenterPosition;
    xOffset = targetOffset;

    galleryWall.style.transition = shouldAnimate
      ? "transform 480ms cubic-bezier(0.2, 0.8, 0.2, 1)"
      : "none";
    galleryWall.style.transform = "translateX(" + xOffset + "px)";
    updateFloorParallax();

    setActiveCard(cards, currentIndex);

    if (currentIndex !== previousIndex && soundOn) {
      playTransitionChime();
    }
  }

  function navigate(direction) {
    centerOn(currentIndex + direction, true);
  }

  function clampNearestIndex() {
    var metrics = getCardMetrics();
    var cards = metrics.cards;
    var viewportCenter = metrics.viewportCenter;
    var nearest = 0;
    var minDistance = Infinity;
    var idx;

    if (!cards.length) {
      return;
    }

    var estimatedCenter = viewportCenter - xOffset;
    for (idx = 0; idx < cards.length; idx += 1) {
      var distance = Math.abs(getCardCenter(cards[idx]) - estimatedCenter);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = idx;
      }
    }

    currentIndex = nearest;
    centerOn(currentIndex, true);
  }

  function setSettingsOpen(shouldOpen) {
    if (!settingsBtn || !settingsPanel) {
      return;
    }

    settingsOpen = !!shouldOpen;
    settingsPanel.hidden = !settingsOpen;
    settingsBtn.setAttribute("aria-expanded", String(settingsOpen));

    if (settingsOpen) {
      settingsBtn.classList.add("is-active");
    } else {
      settingsBtn.classList.remove("is-active");
    }
  }

  function startDrag(clientX) {
    if (currentViewMode === viewModes.wall) {
      return;
    }

    isDragging = true;
    dragStartX = clientX;
    dragStartOffset = xOffset;
    galleryWall.style.transition = "none";
  }

  function moveDrag(clientX) {
    if (!isDragging) {
      return;
    }

    var delta = clientX - dragStartX;
    xOffset = dragStartOffset + delta;
    galleryWall.style.transform = "translateX(" + xOffset + "px)";
    updateFloorParallax();
  }

  function endDrag() {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    clampNearestIndex();
  }

  function bindPointerFallbacks() {
    if (window.PointerEvent) {
      galleryWall.addEventListener("pointerdown", function (event) {
        startDrag(event.clientX);
        if (galleryWall.setPointerCapture) {
          galleryWall.setPointerCapture(event.pointerId);
        }
      });

      galleryWall.addEventListener("pointermove", function (event) {
        moveDrag(event.clientX);
      });

      galleryWall.addEventListener("pointerup", function () {
        endDrag();
      });

      galleryWall.addEventListener("pointercancel", function () {
        endDrag();
      });

      return;
    }

    galleryWall.addEventListener("mousedown", function (event) {
      event.preventDefault();
      startDrag(event.clientX);
    });

    window.addEventListener("mousemove", function (event) {
      moveDrag(event.clientX);
    });

    window.addEventListener("mouseup", function () {
      endDrag();
    });

    galleryWall.addEventListener("touchstart", function (event) {
      if (!event.touches || !event.touches.length) {
        return;
      }
      startDrag(event.touches[0].clientX);
    }, false);

    window.addEventListener("touchmove", function (event) {
      if (!event.touches || !event.touches.length) {
        return;
      }
      moveDrag(event.touches[0].clientX);
    }, false);

    window.addEventListener("touchend", function () {
      endDrag();
    });

    window.addEventListener("touchcancel", function () {
      endDrag();
    });
  }

  function removeThemeClasses() {
    var t;
    for (t = 0; t < themePresets.length; t += 1) {
      document.body.classList.remove("theme-" + themePresets[t]);
    }
  }

  function hasPromise(value) {
    return value && typeof value.then === "function";
  }

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function requestFullscreenCompat(el) {
    var request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitRequestFullScreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (!request) {
      return null;
    }

    try {
      return request.call(el);
    } catch (error) {
      return null;
    }
  }

  function exitFullscreenCompat() {
    var exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.webkitCancelFullScreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;

    if (!exit) {
      return null;
    }

    try {
      return exit.call(document);
    } catch (error) {
      return null;
    }
  }

  function bindEvents() {
    prevBtn.addEventListener("click", function () {
      navigate(-1);
    });

    nextBtn.addEventListener("click", function () {
      navigate(1);
    });

    window.addEventListener("keydown", function (event) {
      var key = event.key || "";
      if (key === "ArrowLeft") {
        if (currentViewMode === viewModes.wall) {
          setViewMode(viewModes.walk, true);
        }
        navigate(-1);
      }
      if (key === "ArrowRight") {
        if (currentViewMode === viewModes.wall) {
          setViewMode(viewModes.walk, true);
        }
        navigate(1);
      }
      if (key === "ArrowDown") {
        setViewMode(viewModes.immersive, true);
      }
      if (key === "ArrowUp") {
        setViewMode(viewModes.wall, true);
      }
      if (key && key.toLowerCase && key.toLowerCase() === "m") {
        toggleAmbientSound();
      }
      if (key && key.toLowerCase && key.toLowerCase() === "f") {
        toggleFullscreen();
      }
      if (key === "Escape") {
        setSettingsOpen(false);
      }
    });

    window.addEventListener("wheel", function (event) {
      if (Math.abs(event.deltaY) < 5 && Math.abs(event.deltaX) < 5) {
        return;
      }

      if (event.deltaY > 0 || event.deltaX > 0) {
        if (currentViewMode === viewModes.wall) {
          setViewMode(viewModes.walk, true);
        }
        navigate(1);
      } else {
        if (currentViewMode === viewModes.wall) {
          setViewMode(viewModes.walk, true);
        }
        navigate(-1);
      }
    });

    galleryWall.addEventListener("click", function (event) {
      var card = event.target && event.target.closest ? event.target.closest(".art-card") : null;
      if (!card) {
        return;
      }

      var clickedIndex = getCardIndex(card);
      if (clickedIndex < 0) {
        return;
      }

      if (clickedIndex !== currentIndex) {
        centerOn(clickedIndex, true);
        return;
      }

      setViewMode(viewModes.immersive, true);
    });

    bindPointerFallbacks();

    window.addEventListener("resize", function () {
      centerOn(currentIndex, false);
    });

    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        toggleAmbientSound();
      });
    }

    if (soundPresetSelect) {
      soundPresetSelect.addEventListener("change", function () {
        soundPreset = soundPresetSelect.value;
        setStoredValue(STORAGE_KEYS.tone, soundPreset);
        applySoundPreset();
        syncSoundUi();
      });
    }

    if (themePresetSelect) {
      themePresetSelect.addEventListener("change", function () {
        themePreset = themePresetSelect.value;
        applyThemePreset();
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", function () {
        toggleFullscreen();
      });
    }

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        setSettingsOpen(!settingsOpen);
      });

      settingsPanel.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      document.addEventListener("pointerdown", function (event) {
        if (!settingsOpen) {
          return;
        }

        var target = event.target;
        if (settingsBtn.contains(target) || settingsPanel.contains(target)) {
          return;
        }

        setSettingsOpen(false);
      });
    }

    document.addEventListener("fullscreenchange", syncFullscreenUi);
    document.addEventListener("webkitfullscreenchange", syncFullscreenUi);
    document.addEventListener("mozfullscreenchange", syncFullscreenUi);
    document.addEventListener("MSFullscreenChange", syncFullscreenUi);
  }

  function applyThemePreset() {
    removeThemeClasses();
    document.body.classList.add("theme-" + themePreset);
    if (themePresetSelect) {
      themePresetSelect.value = themePreset;
    }
    setStoredValue(STORAGE_KEYS.theme, themePreset);
  }

  function ensureAudioGraph() {
    if (audioContext) {
      return;
    }

    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    audioContext = new AudioCtx();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.00001;
    masterGain.connect(audioContext.destination);

    var oscillatorA = audioContext.createOscillator();
    var oscillatorB = audioContext.createOscillator();
    var droneGainA = audioContext.createGain();
    var droneGainB = audioContext.createGain();
    var lfo = audioContext.createOscillator();
    var lfoDepth = audioContext.createGain();

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

    ambientNodes = {
      oscillatorA: oscillatorA,
      oscillatorB: oscillatorB,
      lfo: lfo,
      droneGainA: droneGainA,
      droneGainB: droneGainB,
      lfoDepth: lfoDepth
    };

    applySoundPreset();
  }

  function applySoundPreset() {
    if (!ambientNodes || !audioContext) {
      return;
    }

    var preset = soundPresets[soundPreset] || soundPresets.mool;
    var now = audioContext.currentTime || 0;
    var rampTime = 0.22;

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

    var now = audioContext.currentTime;
    var bellFrequencies = [329.63, 493.88, 659.25];
    var bellLevels = [0.014, 0.008, 0.0045];

    for (i = 0; i < bellFrequencies.length; i += 1) {
      (function (idx) {
        var frequency = bellFrequencies[idx];
        var peak = bellLevels[idx];
        var release = 0.9 + idx * 0.18;
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();

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
      }(i));
    }
  }

  function toggleAmbientSound() {
    ensureAudioGraph();
    if (!audioContext || !masterGain) {
      return;
    }

    var activate = function () {
      var now = audioContext.currentTime;
      if (!soundOn) {
        applySoundPreset();
        var preset = soundPresets[soundPreset] || soundPresets.mool;
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
    };

    if (audioContext.state === "suspended" && audioContext.resume) {
      var resumed = audioContext.resume();
      if (hasPromise(resumed)) {
        resumed.then(function () {
          activate();
        }, function () {
          activate();
        });
      } else {
        activate();
      }
      return;
    }

    activate();
  }

  function syncSoundUi() {
    var preset = soundPresets[soundPreset] || soundPresets.mool;
    if (!soundBtn || !soundPresetSelect) {
      return;
    }

    soundBtn.textContent = soundOn ? "Sound: On (" + preset.label + ")" : "Sound: Off";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) {
      soundBtn.classList.add("is-active");
    } else {
      soundBtn.classList.remove("is-active");
    }
    soundPresetSelect.value = soundPreset;
  }

  function toggleFullscreen() {
    var activeElement = getFullscreenElement();
    if (!activeElement) {
      var req = requestFullscreenCompat(document.documentElement);
      if (hasPromise(req)) {
        req.then(syncFullscreenUi, syncFullscreenUi);
      } else {
        syncFullscreenUi();
      }
    } else {
      var ex = exitFullscreenCompat();
      if (hasPromise(ex)) {
        ex.then(syncFullscreenUi, syncFullscreenUi);
      } else {
        syncFullscreenUi();
      }
    }
  }

  function syncFullscreenUi() {
    if (!fullscreenBtn) {
      return;
    }

    var isFullscreen = !!getFullscreenElement();
    fullscreenBtn.textContent = isFullscreen ? "✕" : "⛶";
    fullscreenBtn.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
    fullscreenBtn.setAttribute("title", isFullscreen ? "Exit fullscreen" : "Toggle fullscreen");
    fullscreenBtn.setAttribute("aria-pressed", String(isFullscreen));
    if (isFullscreen) {
      fullscreenBtn.classList.add("is-active");
    } else {
      fullscreenBtn.classList.remove("is-active");
    }
  }

  createGallery();
  loadPersistedPreferences();
  bindEvents();
  applyThemePreset();
  setStoredValue(STORAGE_KEYS.tone, soundPreset);
  syncViewModeClasses();
  centerOn(initialIndex, false);
  setSettingsOpen(false);
  syncSoundUi();
  syncFullscreenUi();
}());
