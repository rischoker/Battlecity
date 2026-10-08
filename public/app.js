(() => {
  class RetroAudio {
    constructor() {
      this.ctx = null, this.bgmTimer = null, this.bgmPlaying = !1, this.bgmStep = 0, this.isMuted = !1, this.voiceOn = !0, this.voice = null, this.lastVoice = {}, this.lastSfx = {};
    }
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14, comp.ratio.value = 4, this.master = this.ctx.createGain(), this.master.gain.value = 0.9, this.master.connect(comp), comp.connect(this.ctx.destination), this.sfx = this.ctx.createGain(), this.sfx.gain.value = 1, this.sfx.connect(this.master), this.music = this.ctx.createGain(), this.music.gain.value = 0.7, this.music.connect(this.master);
        const len = this.ctx.sampleRate * 1.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.pickVoice();
      }
      this.ctx.state === "suspended" && this.ctx.resume();
    }
    throttle(key, ms) {
      const n = performance.now();
      return this.lastSfx[key] && n - this.lastSfx[key] < ms ? !1 : (this.lastSfx[key] = n, !0);
    }
    tone(freq, dur, o = {}) {
      if (this.ctx)
        try {
          const now = this.ctx.currentTime + (o.delay || 0), osc = this.ctx.createOscillator(), g = this.ctx.createGain();
          osc.type = o.type || "square", osc.frequency.setValueAtTime(freq, now), o.slideTo && osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), now + dur), o.detune && (osc.detune.value = o.detune);
          const vol = o.vol == null ? 0.15 : o.vol;
          g.gain.setValueAtTime(1e-4, now), g.gain.exponentialRampToValueAtTime(vol, now + (o.attack || 5e-3)), g.gain.exponentialRampToValueAtTime(8e-4, now + dur), osc.connect(g), g.connect(o.dest || this.sfx), osc.start(now), osc.stop(now + dur + 0.02);
        } catch {
        }
    }
    noise(dur, o = {}) {
      if (this.ctx)
        try {
          const now = this.ctx.currentTime + (o.delay || 0), src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuf;
          const f = this.ctx.createBiquadFilter();
          f.type = o.filter || "lowpass", f.Q.value = o.q || 0.8, f.frequency.setValueAtTime(o.freq || 800, now), o.freqTo && f.frequency.exponentialRampToValueAtTime(o.freqTo, now + dur);
          const g = this.ctx.createGain(), vol = o.vol == null ? 0.3 : o.vol;
          g.gain.setValueAtTime(1e-4, now), g.gain.exponentialRampToValueAtTime(vol, now + (o.attack || 4e-3)), g.gain.exponentialRampToValueAtTime(8e-4, now + dur), src.connect(f), f.connect(g), g.connect(this.sfx), src.start(now), src.stop(now + dur + 0.02);
        } catch {
        }
    }
    toggleBGM() {
      return this.isMuted = !this.isMuted, this.isMuted ? this.stopBGM() : this.startBGM(), !this.isMuted;
    }
    startBGM() {
      if (this.bgmPlaying || this.isMuted) return;
      this.init(), this.bgmPlaying = !0, this.bgmStep = 0;
      const bassline = [110, 110, 130.81, 110, 146.83, 110, 130.81, 123.47], melody = [220, 0, 261.63, 293.66, 329.63, 293.66, 261.63, 220, 330, 330, 392, 440, 392, 330, 293.66, 261.63, 220, 261.63, 293.66, 329.63, 349.23, 329.63, 293.66, 261.63, 196, 220, 246.94, 261.63, 293.66, 261.63, 220, 196];
      this.bgmTimer = setInterval(() => {
        if (!this.ctx || !this.bgmPlaying) return;
        const bassFreq = bassline[this.bgmStep % bassline.length];
        bassFreq > 0 && this.tone(bassFreq, 0.12, { type: "sawtooth", vol: 0.06, dest: this.music });
        const melFreq = melody[this.bgmStep % melody.length];
        melFreq > 0 && this.tone(melFreq, 0.14, { type: "square", vol: 0.04, dest: this.music }), this.bgmStep % 4 === 0 && this.noiseKick(), this.bgmStep % 4 === 2 && this.noiseHat(), this.bgmStep++;
      }, 150);
    }
    noiseKick() {
      this.tone(120, 0.12, { type: "sine", slideTo: 40, vol: 0.12, dest: this.music });
    }
    noiseHat() {
      if (this.ctx)
        try {
          const now = this.ctx.currentTime, src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuf;
          const f = this.ctx.createBiquadFilter();
          f.type = "highpass", f.frequency.value = 7e3;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.03, now), g.gain.exponentialRampToValueAtTime(8e-4, now + 0.05), src.connect(f), f.connect(g), g.connect(this.music), src.start(now), src.stop(now + 0.06);
        } catch {
        }
    }
    stopBGM() {
      this.bgmPlaying = !1, this.bgmTimer && (clearInterval(this.bgmTimer), this.bgmTimer = null);
    }
    // ---------------- SFX ----------------
    playShoot() {
      this.throttle("shoot", 35) && (this.tone(520, 0.09, { slideTo: 80, vol: 0.13 }), this.noise(0.07, { freq: 2400, freqTo: 400, vol: 0.12 }));
    }
    playEnemyShoot() {
      this.throttle("eshoot", 70) && this.tone(300, 0.1, { type: "sawtooth", slideTo: 60, vol: 0.06 });
    }
    playExplosion(isLarge = !1) {
      const d = isLarge ? 0.9 : 0.38;
      this.noise(d, { freq: isLarge ? 900 : 1400, freqTo: 30, vol: isLarge ? 0.65 : 0.38 }), this.tone(isLarge ? 90 : 130, d * 0.8, { type: "sine", slideTo: 28, vol: isLarge ? 0.45 : 0.25 }), isLarge && this.noise(0.5, { freq: 300, freqTo: 40, vol: 0.4, delay: 0.08 });
    }
    playHit() {
      this.throttle("hit", 40) && this.tone(160, 0.07, { type: "triangle", slideTo: 45, vol: 0.22 });
    }
    playSteelPing() {
      this.throttle("ping", 50) && (this.tone(1400, 0.16, { type: "triangle", slideTo: 1100, vol: 0.08 }), this.tone(2100, 0.1, { type: "sine", vol: 0.05 }));
    }
    playBrick() {
      this.throttle("brick", 45) && (this.noise(0.22, { freq: 1600, freqTo: 200, vol: 0.28, filter: "bandpass", q: 0.6 }), this.tone(110, 0.12, { type: "triangle", slideTo: 50, vol: 0.15 }));
    }
    playPowerup() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.16, { type: "square", vol: 0.09, delay: i * 0.055 })), [1046.5, 1568].forEach((f, i) => this.tone(f, 0.35, { type: "sine", vol: 0.06, delay: 0.3 + i * 0.05 }));
    }
    playPowerupSpawn() {
      [1318.5, 1760, 2093].forEach((f, i) => this.tone(f, 0.18, { type: "sine", vol: 0.07, delay: i * 0.07 }));
    }
    playBossSiren() {
      for (let k = 0; k < 2; k++)
        this.tone(150, 0.6, { type: "sawtooth", slideTo: 460, vol: 0.16, delay: k * 0.65 });
    }
    playLaser() {
      this.throttle("laser", 40) && (this.tone(1200, 0.2, { type: "sawtooth", slideTo: 160, vol: 0.13 }), this.tone(1800, 0.14, { type: "sine", slideTo: 400, vol: 0.06 }));
    }
    playBaseHit() {
      this.throttle("basehit", 700) && (this.tone(880, 0.16, { type: "square", vol: 0.12 }), this.tone(660, 0.16, { type: "square", vol: 0.12, delay: 0.18 }), this.tone(880, 0.16, { type: "square", vol: 0.12, delay: 0.36 }));
    }
    playEnemySpawn() {
      this.throttle("espawn", 200) && (this.tone(90, 0.45, { type: "sawtooth", slideTo: 320, vol: 0.05 }), this.noise(0.35, { freq: 400, freqTo: 2400, vol: 0.06, filter: "bandpass" }));
    }
    playBoost() {
      this.throttle("boost", 400) && this.noise(0.35, { freq: 500, freqTo: 3e3, vol: 0.12, filter: "bandpass", q: 1.5 });
    }
    playCountdown(isGo) {
      isGo ? (this.tone(1046.5, 0.5, { type: "square", vol: 0.16 }), this.tone(523.25, 0.5, { type: "square", vol: 0.12 }), this.tone(1568, 0.45, { type: "sine", vol: 0.08 })) : (this.tone(523.25, 0.22, { type: "square", vol: 0.15 }), this.tone(261.6, 0.22, { type: "triangle", vol: 0.1 }));
    }
    playWaveStart() {
      [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, i === 3 ? 0.4 : 0.14, { type: "square", vol: 0.11, delay: i * 0.12 }));
    }
    playNuke() {
      this.noise(1.6, { freq: 1800, freqTo: 25, vol: 0.8 }), this.tone(70, 1.4, { type: "sine", slideTo: 22, vol: 0.55 });
    }
    playFreeze() {
      [2093, 1760, 2349, 1975].forEach((f, i) => this.tone(f, 0.3, { type: "sine", vol: 0.06, delay: i * 0.06 })), this.noise(0.6, { freq: 6e3, vol: 0.06, filter: "highpass" });
    }
    playShieldUp() {
      this.tone(300, 0.5, { type: "sine", slideTo: 1200, vol: 0.12 });
    }
    playRepair() {
      [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.22, { type: "triangle", vol: 0.12, delay: i * 0.09 }));
    }
    playFortify() {
      for (let i = 0; i < 4; i++) this.tone(200 + i * 40, 0.12, { type: "square", vol: 0.1, delay: i * 0.1 });
      this.playSteelPing();
    }
    playRumble(d = 2.5) {
      this.noise(d, { freq: 160, vol: 0.32, attack: 0.6 }), this.tone(48, d, { type: "sine", vol: 0.2, attack: 0.5 });
    }
    playImpact() {
      this.tone(70, 0.7, { type: "sine", slideTo: 30, vol: 0.6 }), this.noise(0.5, { freq: 1200, freqTo: 60, vol: 0.45 }), this.tone(196, 0.5, { type: "sawtooth", vol: 0.08 });
    }
    playWhoosh() {
      this.noise(0.45, { freq: 300, freqTo: 3500, vol: 0.15, filter: "bandpass", q: 1.2 });
    }
    playGameOver() {
      [392, 349.23, 311.13, 261.63, 196].forEach((f, i) => this.tone(f, i === 4 ? 0.9 : 0.24, { type: "square", vol: 0.12, delay: i * 0.22 }));
    }
    playPlayerDown() {
      this.tone(600, 0.6, { type: "square", slideTo: 80, vol: 0.12 });
    }
    // ---------------- Announcer voice (Web Speech API) ----------------
    pickVoice() {
      if (!("speechSynthesis" in window)) return;
      const vs = speechSynthesis.getVoices();
      if (!vs.length) {
        speechSynthesis.onvoiceschanged = () => this.pickVoice();
        return;
      }
      const en = vs.filter((v) => /^en/i.test(v.lang));
      this.voice = en.find((v) => /Google UK English Male|Daniel|Microsoft (Guy|Davis|David|Mark|Ryan)|Alex|Fred|Arthur/i.test(v.name)) || en.find((v) => /male/i.test(v.name) && !/female/i.test(v.name)) || en[0] || vs[0];
    }
    say(text, o = {}) {
      if (!this.voiceOn || !("speechSynthesis" in window)) return;
      const key = o.key || text, now = performance.now();
      if (!(o.cooldown && this.lastVoice[key] && now - this.lastVoice[key] < o.cooldown * 1e3) && !(!o.priority && (speechSynthesis.speaking || speechSynthesis.pending))) {
        this.lastVoice[key] = now;
        try {
          o.priority && speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          this.voice && (u.voice = this.voice), u.lang = this.voice && this.voice.lang || "en-US", u.rate = o.rate || 1.02, u.pitch = o.pitch == null ? 0.72 : o.pitch, u.volume = o.volume == null ? 1 : o.volume, speechSynthesis.speak(u);
        } catch {
        }
      }
    }
    toggleVoice() {
      return this.voiceOn = !this.voiceOn, !this.voiceOn && "speechSynthesis" in window && speechSynthesis.cancel(), this.voiceOn;
    }
  }
  const audio = new RetroAudio(), PLAYER_PALETTE = [
    { name: "P1 Yellow", hex: 15381256, tailwind: "bg-yellow-500", text: "text-yellow-400", css: "#eab308" },
    { name: "P2 Green", hex: 2278750, tailwind: "bg-green-500", text: "text-green-400", css: "#22c55e" },
    { name: "P3 Blue", hex: 3900150, tailwind: "bg-blue-500", text: "text-blue-400", css: "#3b82f6" },
    { name: "P4 Red", hex: 15680580, tailwind: "bg-red-500", text: "text-red-400", css: "#ef4444" },
    { name: "P5 Purple", hex: 11032055, tailwind: "bg-purple-500", text: "text-purple-400", css: "#a855f7" },
    { name: "P6 Cyan", hex: 440020, tailwind: "bg-cyan-500", text: "text-cyan-400", css: "#06b6d4" },
    { name: "P7 Orange", hex: 16347926, tailwind: "bg-orange-500", text: "text-orange-400", css: "#f97316" }
  ], POWERUP_TYPES = [
    { id: "star", name: "DUAL CANNON", icon: "\u{1F31F}", color: 16769357, css: "#ffe14d", msg: "RAPID DUAL SHOT!", voice: "Dual cannon!" },
    { id: "laser", name: "PLASMA LASER", icon: "\u{1F526}", color: 16727212, css: "#ff3cac", msg: "PIERCING LASER BEAM!", voice: "Plasma laser!" },
    { id: "shield", name: "FORCE SHIELD", icon: "\u{1F6E1}\uFE0F", color: 2282478, css: "#22d3ee", msg: "INVINCIBILITY SHIELD!", voice: "Shield up!" },
    { id: "nuke", name: "GRENADE NUKE", icon: "\u{1F4A3}", color: 16731501, css: "#ff4d6d", msg: "ALL ENEMIES DESTROYED!", voice: "Nuke incoming!" },
    { id: "shovel", name: "BASE FORTIFY", icon: "\u{1F6E0}\uFE0F", color: 14870768, css: "#e2e8f0", msg: "EAGLE BASE STEEL WALLS!", voice: "Base fortified!" },
    { id: "clock", name: "FREEZE ENEMIES", icon: "\u23F1\uFE0F", color: 12616956, css: "#c084fc", msg: "ENEMIES FROZEN!", voice: "Enemies frozen!" },
    { id: "medkit", name: "REPAIR KIT", icon: "\u{1F496}", color: 4906624, css: "#4ade80", msg: "HEALTH RESTORED!", voice: "Repaired!" }
  ], PLAYER_GRACE_MS = 45e3, CONNECT_HELP_MS = 12e3, ROOM_RE = /^[A-Z]{5}$/, safeStore = {
    get(k, s) {
      try {
        return (s || localStorage).getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v, s) {
      try {
        (s || localStorage).setItem(k, v);
      } catch {
      }
    },
    del(k, s) {
      try {
        (s || localStorage).removeItem(k);
      } catch {
      }
    }
  };
  function makeSocket() {
    const forcePoll = /[?&]poll=1/.test(location.search);
    return io({
      transports: forcePoll ? ["polling"] : ["polling", "websocket"],
      reconnection: !0,
      reconnectionAttempts: 1 / 0,
      reconnectionDelay: 600,
      reconnectionDelayMax: 5e3,
      randomizationFactor: 0.3,
      timeout: 1e4
    });
  }
  const transportName = (s) => s && s.io && s.io.engine && s.io.engine.transport && s.io.engine.transport.name === "websocket" ? "WS" : "HTTPS", isTypingTarget = (t) => !!(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)), urlParams = new URLSearchParams(window.location.search), targetRoomCode = String(urlParams.get("room") || "").toUpperCase().replace(/[^A-Z]/g, ""), isHostRoute = /^\/host\/?$/i.test(location.pathname);
  isHostRoute ? (document.getElementById("host-view").classList.remove("hidden"), initHostApp()) : targetRoomCode ? (document.body.classList.add("is-controller"), document.getElementById("controller-view").classList.remove("hidden"), initControllerApp(targetRoomCode)) : (document.body.classList.add("is-controller"), document.getElementById("landing-view").classList.remove("hidden"), initLanding());
  function installZoomLock() {
    const interactive = (t) => !!(t && t.closest && t.closest("button, a, input, textarea, select, label, [data-tap]"));
    ["gesturestart", "gesturechange", "gestureend"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: !1 })), document.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      !interactive(e.target) && !(e.target.closest && e.target.closest(".scrollable")) && e.preventDefault();
    }, { passive: !1 });
    let lastTouchEnd = 0;
    document.addEventListener("touchend", (e) => {
      const n = Date.now();
      n - lastTouchEnd < 300 && !interactive(e.target) && e.preventDefault(), lastTouchEnd = n;
    }, { passive: !1 }), document.addEventListener("dblclick", (e) => {
      interactive(e.target) || e.preventDefault();
    }, { passive: !1 }), document.addEventListener("contextmenu", (e) => {
      isTypingTarget(e.target) || e.preventDefault();
    });
  }
  function initLanding() {
    installZoomLock();
    const input = document.getElementById("landing-code"), go = () => {
      const code = input.value.toUpperCase().replace(/[^A-Z]/g, "");
      if (!ROOM_RE.test(code)) {
        document.getElementById("landing-msg").innerText = "THE ROOM CODE HAS 5 LETTERS", input.focus();
        return;
      }
      location.href = "/?room=".concat(code);
    };
    input.addEventListener("input", () => {
      const v = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
      v !== input.value && (input.value = v), document.getElementById("landing-msg").innerText = "";
    }), input.addEventListener("keydown", (e) => {
      e.key === "Enter" && go();
    }), document.getElementById("landing-join").addEventListener("click", go), document.getElementById("landing-host").addEventListener("click", () => {
      location.href = "/host";
    });
  }
  function initControllerApp(roomCode) {
    installZoomLock(), document.getElementById("ctrl-room").innerText = roomCode;
    let cid = safeStore.get("bc3d_cid", sessionStorage) || safeStore.get("bc3d_cid");
    cid || (cid = "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)), safeStore.set("bc3d_cid", cid, sessionStorage), safeStore.set("bc3d_cid", cid);
    const nameInput = document.getElementById("ctrl-nickname-input"), savedName = safeStore.get("bc3d_name");
    savedName && (nameInput.value = savedName);
    let sock = null, joyManager = null, nickname = "TANKER", kicked = !1, joined = !1, inRoom = !1, lastHostMsg = 0, pingMs = null, lastKey = "", lastSend = 0, loopsStarted = !1, soundOn = !0, lastError = "", helpTimer = null, retryTimer = null, everJoined = !1;
    const inputState = { dirX: 0, dirZ: 0, shoot: !1, boost: !1 }, statusText = document.getElementById("ctrl-status-text"), playerBadge = document.getElementById("ctrl-player-badge"), playerName = document.getElementById("ctrl-player-name"), overlay = document.getElementById("ctrl-join-overlay"), connOverlay = document.getElementById("ctrl-conn-overlay"), pwrBadge = document.getElementById("ctrl-powerup-badge");
    let badgeTimer = null;
    function flashBadge(text, ms = 3e3) {
      pwrBadge.innerText = text, pwrBadge.classList.remove("hidden"), clearTimeout(badgeTimer), badgeTimer = setTimeout(() => pwrBadge.classList.add("hidden"), ms);
    }
    function setStatus(text, color) {
      statusText.innerText = text, statusText.className = "text-[9px] font-bold ".concat({ green: "text-green-400", yellow: "text-yellow-400", orange: "text-orange-400", red: "text-red-500" }[color] || "text-yellow-400");
    }
    function showConnOverlay(on, title, detail) {
      connOverlay.classList.toggle("hidden", !on), connOverlay.classList.toggle("flex", on), title && (document.getElementById("ctrl-conn-title").innerText = title), detail != null && (document.getElementById("ctrl-conn-detail").innerText = detail);
    }
    function showHelp(on) {
      document.getElementById("ctrl-conn-help").classList.toggle("hidden", !on), on && (document.getElementById("ctrl-conn-reason").innerText = lastError || "NO ANSWER FROM THE SERVER", showConnOverlay(!0, "\u26A0 CAN'T CONNECT YET", "Still trying in the background\u2026"));
    }
    function armHelpTimer() {
      clearTimeout(helpTimer), helpTimer = setTimeout(() => {
        !inRoom && joined && !kicked && showHelp(!0);
      }, CONNECT_HELP_MS);
    }
    function connectedOK() {
      inRoom = !0, everJoined = !0, clearTimeout(helpTimer), showHelp(!1), showConnOverlay(!1), setStatus("CONNECTED (".concat(transportName(sock), ")"), "green");
    }
    function renderPing() {
      const bars = pingMs == null ? 0 : pingMs < 80 ? 4 : pingMs < 160 ? 3 : pingMs < 300 ? 2 : 1, col = bars >= 3 ? "#4ade80" : bars === 2 ? "#facc15" : "#f87171";
      document.getElementById("ctrl-sig").innerHTML = [6, 9, 12, 15].map((h, i) => '<span class="sig-bar" style="height:'.concat(h, "px;").concat(i < bars ? "background:" + col : "", '"></span>')).join(""), document.getElementById("ctrl-ping-ms").innerText = pingMs == null ? "--" : "".concat(Math.round(pingMs), " ms");
    }
    const soundBtn = document.getElementById("ctrl-sound-btn");
    soundBtn.addEventListener("click", () => {
      audio.init(), soundOn = !soundOn, audio.master && (audio.master.gain.value = soundOn ? 0.9 : 0), soundBtn.innerText = soundOn ? "\u{1F50A}" : "\u{1F507}";
    });
    function sfx(name) {
      if (!soundOn || !audio.ctx) return;
      const map = {
        hit: () => audio.playHit(),
        die: () => {
          audio.playExplosion(!0), audio.playPlayerDown();
        },
        kill: () => audio.playExplosion(!1),
        power: () => audio.playPowerup(),
        respawn: () => audio.playShieldUp(),
        wave: () => audio.playWaveStart(),
        boss: () => audio.playBossSiren(),
        base: () => audio.playBaseHit(),
        over: () => audio.playGameOver(),
        go: () => audio.playCountdown(!0),
        tick: () => audio.playCountdown(!1),
        join: () => audio.playPowerupSpawn(),
        intro: () => audio.playImpact()
      };
      map[name] && map[name]();
    }
    let lastLocalShot = 0;
    setInterval(() => {
      inputState.shoot && soundOn && audio.ctx && performance.now() - lastLocalShot > 210 && (lastLocalShot = performance.now(), audio.tone(520, 0.08, { slideTo: 90, vol: 0.07 }));
    }, 50), document.getElementById("ctrl-connect-btn").addEventListener("click", () => {
      audio.init(), audio.playPowerupSpawn(), nickname = (nameInput.value.trim() || "TANKER").toUpperCase().slice(0, 8), safeStore.set("bc3d_name", nickname), "wakeLock" in navigator && navigator.wakeLock.request("screen").catch(() => {
      }), nameInput.blur(), overlay.classList.add("hidden"), playerName.innerText = nickname, joined = !0, kicked = !1, document.getElementById("ctrl-join-msg").innerText = "", connect();
    });
    const fsBtn = document.getElementById("ctrl-fullscreen-btn");
    document.documentElement.requestFullscreen || fsBtn.classList.add("hidden"), fsBtn.addEventListener("click", () => {
      document.fullscreenElement ? document.exitFullscreen().catch(() => {
      }) : document.documentElement.requestFullscreen().catch(() => {
      });
    }), document.getElementById("ctrl-retry-btn").addEventListener("click", () => reconnectNow());
    function reconnectNow() {
      if (!(!joined || kicked)) {
        if (sock && sock.connected) {
          inRoom ? send({ type: "hello", cid, name: nickname }) : joinRoom();
          return;
        }
        sock ? (sock.disconnect(), sock.connect()) : connect(), armHelpTimer();
      }
    }
    document.addEventListener("visibilitychange", () => {
      document.visibilityState === "visible" && ("wakeLock" in navigator && joined && navigator.wakeLock.request("screen").catch(() => {
      }), reconnectNow());
    }), window.addEventListener("pageshow", (e) => {
      e.persisted && reconnectNow();
    }), window.addEventListener("online", () => reconnectNow());
    function send(msg) {
      return !sock || !sock.connected || !inRoom ? !1 : (msg.type === "input" ? sock.volatile.emit("p", msg) : sock.emit("p", msg), !0);
    }
    function connect() {
      if (sock) {
        reconnectNow();
        return;
      }
      setStatus("CONNECTING TO SERVER...", "yellow"), armHelpTimer(), sock = makeSocket(), sock.on("connect", () => {
        lastError = "", joinRoom();
      }), sock.on("connect_error", (err) => {
        lastError = /timeout/i.test(String(err && err.message)) ? "THE SERVER DID NOT ANSWER (TIMEOUT)" : "NETWORK BLOCKED OR OFFLINE (".concat(String(err && err.message || "error").slice(0, 40), ")"), setStatus("CAN'T REACH THE SERVER \xB7 RETRYING", "orange");
      }), sock.on("disconnect", (reason) => {
        inRoom = !1, pingMs = null, renderPing(), !kicked && (lastError = "CONNECTION LOST (".concat(reason, ")"), setStatus("RECONNECTING\u2026", "orange"), everJoined && showConnOverlay(!0, "\u{1F4E1} RECONNECTING\u2026", "Your tank, colour and score are kept for 45 s"), armHelpTimer());
      }), sock.io.on("reconnect_attempt", (n) => setStatus("RECONNECTING (".concat(n, ")\u2026"), "orange")), sock.on("m", (d) => handleHostMessage(d)), sock.on("sys", (s) => {
        s && (s.sys === "nohost" ? (inRoom = !0, setStatus("WAITING FOR THE HOST SCREEN\u2026", "orange"), lastError = "THE HOST SCREEN IS OFFLINE", everJoined && showConnOverlay(!0, "\u{1F5A5} HOST SCREEN OFFLINE", "Waiting for it to come back\u2026"), armHelpTimer()) : s.sys === "hostup" ? send({ type: "hello", cid, name: nickname }) : s.sys === "closed" && (inRoom = !1, lastError = "THE ROOM WAS CLOSED", showConnOverlay(!0, "ROOM CLOSED", "Ask the teacher for the new code.")));
      });
    }
    function joinRoom() {
      !sock || !sock.connected || kicked || (clearTimeout(retryTimer), sock.emit("player:join", { code: roomCode, cid, name: nickname }, (r) => {
        if (r && r.ok) {
          connectedOK(), send({ type: "hello", cid, name: nickname }), r.hostOnline || (setStatus("WAITING FOR THE HOST SCREEN\u2026", "orange"), lastError = "THE HOST SCREEN IS OFFLINE"), setupJoystick(), startLoops(), renderPing(), sock.io.engine && sock.io.engine.once("upgrade", () => {
            inRoom && setStatus("CONNECTED (".concat(transportName(sock), ")"), "green");
          });
          return;
        }
        inRoom = !1, r && r.error === "NO_ROOM" ? (lastError = "ROOM ".concat(roomCode, " NOT FOUND \u2014 CHECK THE CODE ON THE BOARD"), setStatus("WAITING FOR ROOM " + roomCode + "\u2026", "orange"), retryTimer = setTimeout(joinRoom, 2500)) : (lastError = r && r.error || "JOIN FAILED", retryTimer = setTimeout(joinRoom, 3e3));
      }));
    }
    function stopAll(reasonText) {
      kicked = !0, joined = !1, inRoom = !1, clearTimeout(retryTimer), clearTimeout(helpTimer);
      try {
        sock && sock.disconnect();
      } catch {
      }
      sock = null, showHelp(!1), showConnOverlay(!1), overlay.classList.remove("hidden"), document.getElementById("ctrl-join-msg").innerText = reasonText;
    }
    function handleHostMessage(data) {
      if (data) {
        if (lastHostMsg = performance.now(), inRoom && statusText.innerText.indexOf("CONNECTED") !== 0 && data.type !== "pong" && connectedOK(), data.type === "pong") {
          pingMs = pingMs == null ? performance.now() - data.t : pingMs * 0.6 + (performance.now() - data.t) * 0.4, renderPing(), statusText.innerText.indexOf("CONNECTED") !== 0 && connectedOK();
          return;
        }
        if (data.type === "init_slot") {
          const palette = PLAYER_PALETTE[data.slotIndex % PLAYER_PALETTE.length];
          playerBadge.className = "w-5 h-5 rounded-full ".concat(palette.tailwind, " border border-white shadow"), playerName.innerText = "".concat(data.name || nickname, " \xB7 ").concat(palette.name), document.documentElement.style.setProperty("--pc", palette.css), document.getElementById("ctrl-footer").innerText = data.rejoined ? "\u2714 RECONNECTED \xB7 YOUR TANK WAS KEPT" : "BATTLE CITY 3D REMOTE CONTROLLER \u2022 KEEP SCREEN ON", data.rejoined && flashBadge("\u2714 RECONNECTED!", 1800), connectedOK(), sfx("join");
        } else data.type === "powerup_acquired" ? (navigator.vibrate && navigator.vibrate([40, 30, 40]), flashBadge("".concat(data.icon, " ").concat(data.msg)), sfx("power")) : data.type === "hit_vibrate" ? (navigator.vibrate && navigator.vibrate(100), sfx("hit")) : data.type === "sfx" ? (sfx(data.s), data.s === "die" && (navigator.vibrate && navigator.vibrate([200, 80, 200]), flashBadge(data.text || "\u{1F4A5} TANK DESTROYED", 1800)), (data.s === "wave" || data.s === "boss") && flashBadge(data.text || "", 2e3)) : data.type === "countdown" ? (flashBadge(data.text === "GO!" ? "\u{1F680} GO! GO! GO!" : "\u23F1 ".concat(data.text), 900), navigator.vibrate && navigator.vibrate(data.text === "GO!" ? [80, 40, 160] : 40), sfx(data.text === "GO!" ? "go" : "tick")) : data.type === "intro" ? (flashBadge("\u{1F985} DEFEND YOUR BASE!", 4500), sfx("intro"), navigator.vibrate && navigator.vibrate([60, 60, 60])) : (data.type === "kicked" || data.type === "full") && (setStatus(data.type === "full" ? "ROOM FULL" : "REMOVED", "red"), stopAll(data.type === "full" ? "ROOM IS FULL (7/7)" : "YOU WERE REMOVED BY THE HOST"));
      }
    }
    function sendInputIfNeeded(force) {
      const key = "".concat(inputState.dirX, "|").concat(inputState.dirZ, "|").concat(inputState.shoot ? 1 : 0, "|").concat(inputState.boost ? 1 : 0), now = performance.now();
      if (force || key !== lastKey || now - lastSend > 250) {
        if (!force && now - lastSend < 33 && key !== lastKey && lastKey.split("|")[2] === key.split("|")[2]) return;
        lastKey = key, lastSend = now, send({ type: "input", dirX: inputState.dirX, dirZ: inputState.dirZ, shoot: inputState.shoot, boost: inputState.boost });
      }
    }
    function startLoops() {
      loopsStarted || (loopsStarted = !0, setInterval(() => sendInputIfNeeded(!1), 40), setInterval(() => {
        inRoom && (send({ type: "ping", t: performance.now(), ms: pingMs == null ? null : Math.round(pingMs) }), performance.now() - lastHostMsg > 6e3 && send({ type: "hello", cid, name: nickname }));
      }, 2e3));
    }
    function setupJoystick() {
      if (joyManager) return;
      joyManager = nipplejs.create({ zone: document.getElementById("joystick-zone"), mode: "static", position: { left: "50%", top: "50%" }, color: "#06b6d4", size: 120 }), joyManager.on("move", (evt, data) => {
        data && data.vector && (inputState.dirX = Math.round(data.vector.x * 100) / 100, inputState.dirZ = Math.round(-data.vector.y * 100) / 100, sendInputIfNeeded(!1));
      }), joyManager.on("end", () => {
        inputState.dirX = 0, inputState.dirZ = 0, sendInputIfNeeded(!0);
      });
      const bindHold = (el, key) => {
        const on = (e) => {
          e.preventDefault(), el.classList.add("fire-btn-active"), inputState[key] = !0, sendInputIfNeeded(!0), key === "shoot" && navigator.vibrate && navigator.vibrate(15);
        }, off = (e) => {
          e.preventDefault(), el.classList.remove("fire-btn-active"), inputState[key] = !1, sendInputIfNeeded(!0);
        };
        el.addEventListener("touchstart", on, { passive: !1 }), el.addEventListener("touchend", off, { passive: !1 }), el.addEventListener("touchcancel", off, { passive: !1 }), el.addEventListener("mousedown", on), el.addEventListener("mouseup", off), el.addEventListener("mouseleave", off);
      };
      bindHold(document.getElementById("fire-btn"), "shoot"), bindHold(document.getElementById("boost-btn"), "boost");
    }
  }
  function initHostApp() {
    let roomCode = null, joinUrl = "";
    const HOST_KEY = "bc3d_host_room";
    function loadHostRoom() {
      const raw = safeStore.get(HOST_KEY, sessionStorage) || safeStore.get(HOST_KEY);
      try {
        const v = JSON.parse(raw || "null");
        return v && ROOM_RE.test(v.code) && v.token ? v : null;
      } catch {
        return null;
      }
    }
    function saveHostRoom(code, token) {
      const v = JSON.stringify({ code, token, t: Date.now() });
      safeStore.set(HOST_KEY, v, sessionStorage), safeStore.set(HOST_KEY, v);
    }
    function setRoom(code, token) {
      saveHostRoom(code, token), code !== roomCode && (roomCode = code, joinUrl = "".concat(location.origin, "/?room=").concat(code), document.getElementById("hud-room-code").innerText = code, document.getElementById("lobby-room-code").innerText = code, ["qrcode", "qrcode-hud"].forEach((id) => {
        const el = document.getElementById(id);
        el.innerHTML = "", el.title = joinUrl, new QRCode(el, { text: joinUrl, width: id === "qrcode" ? 150 : 128, height: id === "qrcode" ? 150 : 128, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
      }), document.getElementById("lobby-join-url").innerText = joinUrl.replace(/^https?:\/\//, ""));
    }
    ["qrcode", "qrcode-hud"].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener("click", () => el.classList.toggle("zoomed"));
    });
    const activePlayers = /* @__PURE__ */ new Map(), hostPlayerId = "HOST_LOCAL", banned = /* @__PURE__ */ new Map(), connToPlayer = /* @__PURE__ */ new Map();
    let hostPlays = !1;
    function makePlayer(id, name, conn, slotIndex) {
      return {
        id,
        conn,
        slotIndex,
        name,
        input: { dirX: 0, dirZ: 0, shoot: !1, boost: !1 },
        tank: null,
        hp: 100,
        lives: 3,
        kills: 0,
        score: 0,
        starTimer: 0,
        laserTimer: 0,
        shieldTimer: 0,
        combo: 0,
        comboTimer: 0,
        connected: !0,
        lastSeen: performance.now(),
        disconnectedAt: 0,
        ping: null,
        isHost: id === hostPlayerId
      };
    }
    const inMatch = () => gameState === "PLAYING" || gameState === "COUNTDOWN" || gameState === "INTRO";
    function sendTo(p, msg) {
      if (p && p.conn && p.conn.send && p.connected)
        try {
          p.conn.send(msg);
        } catch {
        }
    }
    function broadcastToControllers(msg) {
      activePlayers.forEach((p) => sendTo(p, msg));
    }
    function cleanName(n) {
      return String(n || "").toUpperCase().replace(/[^A-Z0-9 _\-ÑÁÉÍÓÚÜ]/g, "").trim().slice(0, 8) || "PILOT";
    }
    function toast(text, color = "#facc15") {
      const el = document.getElementById("toast");
      el.innerText = text, el.style.borderColor = color, el.classList.add("show"), clearTimeout(toast._t), toast._t = setTimeout(() => el.classList.remove("show"), 2600);
    }
    function setHostPlays(on) {
      if (on && !activePlayers.has(hostPlayerId))
        if (activePlayers.size >= 7)
          toast("ROOM IS FULL (7/7)", "#f87171"), on = !1;
        else {
          const p = makePlayer(hostPlayerId, "HOST", null, findNextAvailableSlot());
          activePlayers.set(hostPlayerId, p), inMatch() && gameState !== "INTRO" && spawnPlayerTank(p);
        }
      else !on && activePlayers.has(hostPlayerId) && removePlayer(hostPlayerId);
      hostPlays = on;
      const label = on ? "ON" : "OFF";
      document.getElementById("host-play-toggle").innerText = "\u{1F3AE} HOST PLAYER (KEYBOARD): ".concat(label), document.getElementById("host-play-toggle").classList.toggle("border-yellow-400", on), document.getElementById("host-play-toggle-hud").innerText = "HOST PLAYER: ".concat(label), updateLobbyUI();
    }
    document.getElementById("host-play-toggle").addEventListener("click", () => setHostPlays(!hostPlays)), document.getElementById("host-play-toggle-hud").addEventListener("click", () => setHostPlays(!hostPlays));
    function removePlayer(id) {
      const p = activePlayers.get(id);
      p && (p.tank && (p.tank.dispose(), p.tank = null), activePlayers.delete(id), p.conn && connToPlayer.delete(p.conn), updateLobbyUI(), gameState === "PLAYING" && activePlayers.size > 0 && ![...activePlayers.values()].some((q) => q.lives > 0) && triggerGameOver(!1, "ALL PILOTS DOWN"));
    }
    function kickPlayer(id) {
      if (id === hostPlayerId) {
        setHostPlays(!1);
        return;
      }
      const p = activePlayers.get(id);
      p && (banned.set(id, performance.now() + 12e4), p.conn && p.conn.drop && p.conn.drop({ type: "kicked" }), toast("".concat(p.name, " WAS REMOVED"), "#f87171"), removePlayer(id));
    }
    function onHello(conn, cid, name) {
      const now = performance.now();
      if (banned.get(cid) > now) {
        conn.drop && conn.drop({ type: "kicked" });
        return;
      }
      let p = activePlayers.get(cid);
      if (p) {
        p.conn && p.conn !== conn && connToPlayer.delete(p.conn);
        const wasOffline = !p.connected;
        p.conn = conn, p.connected = !0, p.lastSeen = now, p.disconnectedAt = 0, connToPlayer.set(conn, cid), sendTo(p, { type: "init_slot", slotIndex: p.slotIndex, name: p.name, rejoined: wasOffline }), wasOffline && toast("\u{1F4E1} ".concat(p.name, " RECONNECTED"), "#4ade80"), inMatch() && gameState !== "INTRO" && !p.tank && spawnPlayerTank(p), updateLobbyUI();
        return;
      }
      if (activePlayers.size >= 7) {
        conn.drop && conn.drop({ type: "full" });
        return;
      }
      p = makePlayer(cid, cleanName(name), conn, findNextAvailableSlot()), activePlayers.set(cid, p), connToPlayer.set(conn, cid), sendTo(p, { type: "init_slot", slotIndex: p.slotIndex, name: p.name }), toast("\u{1F396} ".concat(p.name, " JOINED THE SQUAD"), PLAYER_PALETTE[p.slotIndex % 7].css), (gameState === "PLAYING" || gameState === "COUNTDOWN") && (spawnPlayerTank(p), audio.say("".concat(p.name, " joined"), { key: "join", cooldown: 2 })), audio.playPowerupSpawn(), updateLobbyUI();
    }
    function onPlayerMessage(conn, data) {
      if (!data || !data.type) return;
      if (data.type === "hello") {
        onHello(conn, conn.cid, data.name);
        return;
      }
      const id = connToPlayer.get(conn), p = id && activePlayers.get(id);
      if (!p) {
        (data.type === "input" || data.type === "ping") && conn.send({ type: "pong", t: data.t || 0 });
        return;
      }
      p.lastSeen = performance.now(), (!p.connected || p.conn !== conn) && (p.conn = conn, p.connected = !0, p.disconnectedAt = 0, updateLobbyUI()), data.type === "input" ? (p.input.dirX = Math.max(-1, Math.min(1, +data.dirX || 0)), p.input.dirZ = Math.max(-1, Math.min(1, +data.dirZ || 0)), p.input.shoot = !!data.shoot, p.input.boost = !!data.boost) : data.type === "ping" && (sendTo(p, { type: "pong", t: data.t }), data.ms != null && (p.ping = Math.round(data.ms)));
    }
    function markDisconnected(p) {
      p.connected && (p.connected = !1, p.disconnectedAt = performance.now(), p.input.dirX = 0, p.input.dirZ = 0, p.input.shoot = !1, p.input.boost = !1, updateLobbyUI(), gameState === "PLAYING" && toast("\u26A0 ".concat(p.name, " LOST CONNECTION \xB7 WAITING 45s"), "#fb923c"));
    }
    setInterval(() => {
      const now = performance.now();
      activePlayers.forEach((p) => {
        p.isHost || (p.connected && now - p.lastSeen > 9e3 && markDisconnected(p), !p.connected && p.disconnectedAt && now - p.disconnectedAt > PLAYER_GRACE_MS && (toast("".concat(p.name, " LEFT THE BATTLE"), "#94a3b8"), removePlayer(p.id)));
      }), banned.forEach((t, id) => {
        t < now && banned.delete(id);
      }), updateLobbyUI();
    }, 1e3);
    const netModeBadge = document.getElementById("net-mode-badge");
    function setNet(text, color) {
      const cls = { green: "bg-green-900/80 text-green-300 border-green-500", yellow: "bg-yellow-900/80 text-yellow-300 border-yellow-500", orange: "bg-orange-900/80 text-orange-300 border-orange-500", red: "bg-red-900/80 text-red-300 border-red-500" }[color];
      netModeBadge.innerText = text, netModeBadge.className = "mt-2 text-[9px] px-2 py-0.5 rounded border text-center ".concat(cls);
      const dot = document.getElementById("network-status-dot");
      dot.className = "w-2 h-2 rounded-full animate-pulse ".concat(color === "green" ? "bg-green-500" : color === "red" ? "bg-red-500" : "bg-yellow-400");
    }
    const phoneConns = /* @__PURE__ */ new Map();
    function phoneConn(cid) {
      let c = phoneConns.get(cid);
      return c || (c = { cid, send: (msg) => {
        sock.connected && sock.emit("h", { to: cid, d: msg });
      }, drop: (msg) => {
        sock.connected && sock.emit("h", { sys: "drop", cid, d: msg });
      } }, phoneConns.set(cid, c)), c;
    }
    setNet("CONNECTING TO SERVER\u2026", "yellow");
    const sock = makeSocket();
    function claimRoom() {
      const saved = loadHostRoom(), create = () => sock.emit("host:create", {}, (r) => {
        r && r.ok ? (setRoom(r.code, r.token), setNet("SERVER ONLINE (".concat(transportName(sock), ")"), "green")) : (setNet("COULD NOT CREATE ROOM \xB7 RETRYING", "orange"), setTimeout(claimRoom, 2e3));
      });
      if (!saved) return create();
      sock.emit("host:resume", { code: saved.code, token: saved.token }, (r) => {
        r && r.ok ? (setRoom(r.code, saved.token), setNet("SERVER ONLINE (".concat(transportName(sock), ")"), "green"), r.restored && toast("\u{1F501} ROOM ".concat(r.code, " RESTORED"), "#4ade80")) : create();
      });
    }
    sock.on("connect", () => {
      claimRoom(), sock.io.engine && sock.io.engine.once("upgrade", () => {
        roomCode && setNet("SERVER ONLINE (".concat(transportName(sock), ")"), "green");
      });
    }), sock.on("connect_error", () => setNet("CAN'T REACH SERVER \xB7 RETRYING", "orange")), sock.on("disconnect", () => setNet("SERVER LINK LOST \xB7 RECONNECTING", "orange")), sock.io.on("reconnect_attempt", (n) => setNet("RECONNECTING TO SERVER (".concat(n, ")\u2026"), "orange")), sock.on("m", (m) => {
      m && m.from && onPlayerMessage(phoneConn(m.from), m.d);
    }), sock.on("sys", (m) => {
      if (m)
        if (m.sys === "leave") {
          const p = activePlayers.get(m.cid);
          p && !p.isHost && markDisconnected(p);
        } else m.sys === "join" ? phoneConn(m.cid).send({ type: "pong", t: 0 }) : m.sys === "replaced" && setNet("THIS ROOM WAS OPENED IN ANOTHER TAB", "red");
    }), document.addEventListener("visibilitychange", () => {
      document.visibilityState === "visible" && !sock.connected && (sock.disconnect(), sock.connect());
    });
    function findNextAvailableSlot() {
      const usedSlots = new Set([...activePlayers.values()].map((p) => p.slotIndex));
      for (let i = 0; i < 7; i++) if (!usedSlots.has(i)) return i;
      return activePlayers.size;
    }
    function playerStatus(p) {
      const palette = PLAYER_PALETTE[p.slotIndex % PLAYER_PALETTE.length];
      return p.isHost ? { cls: "text-cyan-300", txt: "KEYBOARD" } : p.connected ? { cls: palette.text, txt: p.ping != null ? p.ping + "ms" : "READY" } : { cls: "text-orange-400", txt: "OFFLINE ".concat(Math.max(0, Math.ceil((PLAYER_GRACE_MS - (performance.now() - p.disconnectedAt)) / 1e3)), "s") };
    }
    function playerRowHTML(p) {
      const st = playerStatus(p), stats = inMatch() || gameState === "OVER" ? '<span class="text-gray-400">\u2665'.concat(Math.max(0, p.lives), " \xB7 ").concat(p.kills, "K</span>") : "";
      return '<div class="flex items-center justify-between gap-2 text-xs bg-gray-900/70 p-1.5 rounded border '.concat(p.connected ? "border-gray-700" : "border-orange-700/70 opacity-75", '">\n            <div class="flex items-center gap-2 min-w-0"><img src="').concat(tankThumb(p.slotIndex), '" class="w-9 h-7 shrink-0" alt=""><span class="text-white font-bold truncate">').concat(p.name, '</span></div>\n            <div class="flex items-center gap-2 shrink-0 text-[9px]">').concat(stats, '<span data-status="').concat(p.id, '" class="').concat(st.cls, '">').concat(st.txt, '</span><button class="kick-btn" data-kick="').concat(p.id, '" title="Remove player">').concat(p.isHost ? "OFF" : "KICK", "</button></div></div>");
    }
    function updateLobbyUI() {
      const players = [...activePlayers.values()].sort((a, b) => a.slotIndex - b.slotIndex), html = players.map((p) => playerRowHTML(p)).join("") || '<div class="text-[9px] text-gray-500 p-2">Nobody yet \u2014 scan the QR with a phone, or turn on HOST PLAYER.</div>', key = players.map((p) => [p.id, p.name, p.slotIndex, p.connected, p.isHost, inMatch() || gameState === "OVER" ? p.lives + "/" + p.kills : ""].join(",")).join("|") || "empty";
      ["connected-players-list", "players-hud-list"].forEach((id) => {
        const el = document.getElementById(id);
        el._key !== key && (el.innerHTML = html, el._key = key);
      }), players.forEach((p) => {
        const st = playerStatus(p);
        document.querySelectorAll('[data-status="'.concat(p.id, '"]')).forEach((sp) => {
          sp.textContent !== st.txt && (sp.textContent = st.txt), sp.className !== st.cls && (sp.className = st.cls);
        });
      });
      const online = players.filter((p) => p.connected).length;
      document.getElementById("lobby-count-badge").innerText = "".concat(players.length, "/7 PLAYERS"), document.getElementById("hud-player-count").innerText = "".concat(online, "/").concat(players.length, " Connected"), syncSquad();
    }
    ["connected-players-list", "players-hud-list"].forEach((id) => document.getElementById(id).addEventListener("click", (e) => {
      const b = e.target.closest("[data-kick]");
      if (!b) return;
      const p = activePlayers.get(b.dataset.kick);
      p && kickPlayer(p.id);
    })), [["players-hud-btn", "players-hud-panel"], ["joinqr-hud-btn", "joinqr-hud-panel"]].forEach(([b, pnl]) => {
      const btn = document.getElementById(b), panel = document.getElementById(pnl);
      btn.addEventListener("click", () => {
        const open = !panel.classList.contains("open");
        document.querySelectorAll(".hud-panel").forEach((x) => x.classList.remove("open")), panel.classList.toggle("open", open);
      });
    });
    let simJoyManager = null;
    document.getElementById("toggle-sim-ctrl-btn").addEventListener("click", () => {
      if (hostPlays || setHostPlays(!0), document.getElementById("sim-controller-overlay").classList.remove("hidden"), !simJoyManager) {
        const hp = () => activePlayers.get(hostPlayerId);
        simJoyManager = nipplejs.create({ zone: document.getElementById("sim-joystick-zone"), mode: "static", position: { left: "50%", top: "50%" }, color: "#06b6d4", size: 80 }), simJoyManager.on("move", (evt, data) => {
          const h = hp();
          data && data.vector && h && (h.input.dirX = Math.round(data.vector.x * 100) / 100, h.input.dirZ = Math.round(-data.vector.y * 100) / 100);
        }), simJoyManager.on("end", () => {
          const h = hp();
          h && (h.input.dirX = 0, h.input.dirZ = 0);
        });
        const simFireBtn = document.getElementById("sim-fire-btn"), setShoot = (v) => {
          const h = hp();
          h && (h.input.shoot = v);
        };
        simFireBtn.addEventListener("mousedown", () => setShoot(!0)), simFireBtn.addEventListener("mouseup", () => setShoot(!1)), simFireBtn.addEventListener("touchstart", (e) => {
          e.preventDefault(), setShoot(!0);
        }), simFireBtn.addEventListener("touchend", (e) => {
          e.preventDefault(), setShoot(!1);
        });
      }
    }), document.getElementById("close-sim-ctrl-btn").addEventListener("click", () => document.getElementById("sim-controller-overlay").classList.add("hidden"));
    const canvas = document.getElementById("webgl-canvas"), renderer = new THREE.WebGLRenderer({ canvas, antialias: !0, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight), renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)), renderer.shadowMap.enabled = !0, renderer.shadowMap.type = THREE.PCFSoftShadowMap, renderer.outputEncoding = THREE.sRGBEncoding, renderer.toneMapping = THREE.NoToneMapping;
    const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    function std(hex, o = {}) {
      var _a, _b, _c, _d;
      return new THREE.MeshStandardMaterial({
        color: C(hex),
        flatShading: o.flat !== !1,
        roughness: (_a = o.rough) != null ? _a : 0.6,
        metalness: (_b = o.metal) != null ? _b : 0.1,
        emissive: o.emissive != null ? C(o.emissive) : new THREE.Color(0),
        emissiveIntensity: (_c = o.ei) != null ? _c : 1,
        transparent: !!o.transparent,
        opacity: (_d = o.opacity) != null ? _d : 1
      });
    }
    function glowMat(hex, opacity = 0.6) {
      return new THREE.MeshBasicMaterial({ color: C(hex), transparent: !0, opacity, blending: THREE.AdditiveBlending, depthWrite: !1 });
    }
    const geoCache = /* @__PURE__ */ new Map();
    function G(key, fn) {
      return geoCache.has(key) || geoCache.set(key, fn()), geoCache.get(key);
    }
    const scene = new THREE.Scene();
    scene.background = C(1332013), scene.fog = new THREE.Fog(C(1332013), 110, 230);
    const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 400), camBase = new THREE.Vector3(0, 60, 30), camLook = new THREE.Vector3(0, 0, 0), CAM_ELEV = THREE.MathUtils.degToRad(66), CAM_DIR = new THREE.Vector3(0, Math.sin(CAM_ELEV), Math.cos(CAM_ELEV));
    let camDist = 60, PLATE_UNIT = 1.4, plateZoom = 1, shakeAmp = 0;
    camera.position.copy(camBase), camera.lookAt(camLook);
    const hemi = new THREE.HemisphereLight(C(15003391), C(4866098), 0.62);
    scene.add(hemi);
    const ambientLight = new THREE.AmbientLight(16777215, 0.12);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(C(16773596), 0.95);
    dirLight.position.set(-22, 46, 26), dirLight.castShadow = !0, dirLight.shadow.mapSize.set(2048, 2048), dirLight.shadow.bias = -6e-4, dirLight.shadow.normalBias = 0.02, scene.add(dirLight), scene.add(dirLight.target);
    const rim = new THREE.DirectionalLight(C(10205439), 0.28);
    rim.position.set(24, 14, -20), scene.add(rim);
    const lightPool = [];
    for (let i = 0; i < 4; i++) {
      const L = new THREE.PointLight(16755285, 0, 10, 2);
      L.position.set(0, -50, 0), scene.add(L), lightPool.push({ L, t: 0, max: 1, I: 0 });
    }
    function flashLight(pos, color, intensity = 3, dur = 0.25, dist = 10) {
      let slot = lightPool[0];
      for (const s of lightPool) s.t < slot.t && (slot = s);
      slot.L.color.copy(C(color)), slot.L.distance = dist, slot.L.position.set(pos.x, (pos.y || 0) + 1.2, pos.z), slot.t = dur, slot.max = dur, slot.I = intensity, slot.L.intensity = intensity;
    }
    function updateLights(delta) {
      lightPool.forEach((s) => {
        s.t > 0 ? (s.t -= delta, s.L.intensity = s.I * Math.max(0, s.t / s.max)) : s.L.intensity = 0;
      });
    }
    const MAP_COLS = 37, MAP_ROWS = 15, CELL_SIZE = 2, MAP_OFFSET_X = MAP_COLS * CELL_SIZE / 2 - CELL_SIZE / 2, MAP_OFFSET_Z = MAP_ROWS * CELL_SIZE / 2 - CELL_SIZE / 2, EAGLE_C = 18, EAGLE_R = 13;
    function gridToWorld(col, row) {
      return new THREE.Vector3(col * CELL_SIZE - MAP_OFFSET_X, 0, row * CELL_SIZE - MAP_OFFSET_Z);
    }
    const _v = new THREE.Vector3();
    function projectBounds(dist, zShift) {
      camera.position.set(0, 0, zShift).addScaledVector(CAM_DIR, dist), camera.lookAt(0, 0, zShift), camera.updateMatrixWorld();
      const hw = MAP_COLS * CELL_SIZE / 2, hd = MAP_ROWS * CELL_SIZE / 2;
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const x of [-hw, hw]) for (const z of [-hd, hd]) for (const y of [0, 1.8])
        _v.set(x, y, z).project(camera), minX = Math.min(minX, _v.x), maxX = Math.max(maxX, _v.x), minY = Math.min(minY, _v.y), maxY = Math.max(maxY, _v.y);
      return { minX, maxX, minY, maxY };
    }
    function fitCamera() {
      const W = window.innerWidth, H = Math.max(1, window.innerHeight);
      camera.aspect = W / H, camera.updateProjectionMatrix();
      const topPx = Math.min(124, H * 0.155), bottomPx = Math.min(74, H * 0.085), sidePx = 14, nTop = 1 - 2 * topPx / H, nBot = -1 + 2 * bottomPx / H, nL = -1 + 2 * sidePx / W, nR = -nL;
      let zShift = 0, dist = 60;
      for (let iter = 0; iter < 4; iter++) {
        let lo = 8, hi = 400;
        for (let k = 0; k < 28; k++) {
          const mid = (lo + hi) / 2, b2 = projectBounds(mid, zShift);
          b2.minX >= nL && b2.maxX <= nR && b2.maxY - b2.minY <= nTop - nBot ? hi = mid : lo = mid;
        }
        dist = hi;
        const b = projectBounds(dist, zShift), visibleH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        zShift += ((nTop + nBot) / 2 - (b.minY + b.maxY) / 2) * visibleH / 2 / Math.sin(CAM_ELEV);
      }
      camDist = dist, camLook.set(0, 0, zShift), camBase.copy(camLook).addScaledVector(CAM_DIR, dist), camera.position.copy(camBase), camera.lookAt(camLook), camera.far = dist * 4 + 120, camera.updateProjectionMatrix();
      const worldPerPx = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H;
      PLATE_UNIT = Math.max(58, Math.min(112, H * 0.095)) * worldPerPx;
      const sd = MAP_COLS * CELL_SIZE / 2 + 6;
      dirLight.shadow.camera.left = -sd, dirLight.shadow.camera.right = sd, dirLight.shadow.camera.top = sd * 0.75, dirLight.shadow.camera.bottom = -sd * 0.75, dirLight.shadow.camera.far = 140, dirLight.shadow.camera.updateProjectionMatrix();
    }
    const materials = {
      treads: std(1777446, { rough: 0.9 }),
      metal: std(5989747, { metal: 0.45, rough: 0.42 }),
      darkMetal: std(2830651, { metal: 0.4, rough: 0.5 }),
      brick: std(13132858, { rough: 0.75 }),
      steel: std(8095636, { metal: 0.5, rough: 0.35 }),
      conveyor: std(3818320, { metal: 0.4, rough: 0.45 }),
      chevron: std(16498468, { emissive: 16096779, ei: 0.6 }),
      barrel: std(14034984, { rough: 0.45, metal: 0.2 }),
      barrelBand: std(16436245, { rough: 0.5 }),
      bulletPlayer: new THREE.MeshBasicMaterial({ color: C(16774051) }),
      bulletEnemy: new THREE.MeshBasicMaterial({ color: C(16747100) }),
      haloPlayer: glowMat(16767053, 0.55),
      haloEnemy: glowMat(16731438, 0.55),
      trailPlayer: glowMat(16638023, 0.5),
      trailEnemy: glowMat(16281969, 0.5),
      flash: new THREE.MeshBasicMaterial({ color: C(16775086) }),
      lamp: new THREE.MeshBasicMaterial({ color: C(16639626) }),
      enemyEye: new THREE.MeshBasicMaterial({ color: C(16722474) }),
      ice: std(9430015, { transparent: !0, opacity: 0.62, rough: 0.08, metal: 0.3, emissive: 959977, ei: 0.75 }),
      iceWire: new THREE.MeshBasicMaterial({ color: C(14743551), wireframe: !0, transparent: !0, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: !1 }),
      scorch: new THREE.MeshBasicMaterial({ color: 0, transparent: !0, opacity: 0.45, depthWrite: !1 })
    };
    function makeCanvasTexture(w, h, draw, repeat) {
      const c = document.createElement("canvas");
      c.width = w, c.height = h, draw(c.getContext("2d"), w, h);
      const t = new THREE.CanvasTexture(c);
      return t.encoding = THREE.sRGBEncoding, t.anisotropy = renderer.capabilities.getMaxAnisotropy(), repeat && (t.wrapS = t.wrapT = THREE.RepeatWrapping, t.repeat.set(repeat[0], repeat[1])), t;
    }
    function drawFloorTile(g, w, h) {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, "#9aa6b4"), grd.addColorStop(1, "#8794a3"), g.fillStyle = grd, g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++)
        g.fillStyle = "rgba(".concat(Math.random() < 0.5 ? "255,255,255" : "40,50,64", ",").concat(0.05 + Math.random() * 0.06, ")"), g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 5, 3 + Math.random() * 5);
      g.strokeStyle = "rgba(52,62,78,0.55)", g.lineWidth = 5, g.strokeRect(2.5, 2.5, w - 5, h - 5), g.strokeStyle = "rgba(255,255,255,0.22)", g.lineWidth = 3, g.beginPath(), g.moveTo(7, h - 7), g.lineTo(7, 7), g.lineTo(w - 7, 7), g.stroke();
    }
    const floorTex = makeCanvasTexture(128, 128, drawFloorTile, [MAP_COLS, MAP_ROWS]);
    materials.floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0 });
    const CAMO_GLSL = "\n        float camoHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n        float camoNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);\n            return mix(mix(mix(camoHash(i), camoHash(i + vec3(1.0,0.0,0.0)), f.x), mix(camoHash(i + vec3(0.0,1.0,0.0)), camoHash(i + vec3(1.0,1.0,0.0)), f.x), f.y),\n                       mix(mix(camoHash(i + vec3(0.0,0.0,1.0)), camoHash(i + vec3(1.0,0.0,1.0)), f.x), mix(camoHash(i + vec3(0.0,1.0,1.0)), camoHash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z); }\n        float camoFbm(vec3 p){ return camoNoise(p) * 0.65 + camoNoise(p * 2.03 + 3.1) * 0.35; }\n    ";
    function makeCamoMaterial(colors, o = {}) {
      var _a, _b;
      const mat = new THREE.MeshStandardMaterial({ color: 16777215, flatShading: !0, roughness: (_a = o.rough) != null ? _a : 0.7, metalness: (_b = o.metal) != null ? _b : 0.15, map: o.map || null }), uni = { uC0: { value: C(colors[0]) }, uC1: { value: C(colors[1]) }, uC2: { value: C(colors[2]) }, uC3: { value: C(colors[3]) }, uCamoScale: { value: o.scale || 2.1 } };
      return mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uni), shader.vertexShader = "varying vec3 vCamoPos;\n" + shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n vCamoPos = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));"
        ), shader.fragmentShader = "uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uCamoScale;\nvarying vec3 vCamoPos;\n" + CAMO_GLSL + shader.fragmentShader.replace("vec4 diffuseColor = vec4( diffuse, opacity );", "\n                vec3 cp = vCamoPos * uCamoScale;\n                vec3 camo = uC0;\n                if (camoFbm(cp) > 0.52) camo = uC1;\n                if (camoFbm(cp * 1.35 + 11.7) > 0.6) camo = uC2;\n                if (camoFbm(cp * 1.8 + 27.1) > 0.66) camo = uC3;\n                vec4 diffuseColor = vec4( diffuse * camo, opacity );");
      }, mat.customProgramCacheKey = () => "camo-v1", mat;
    }
    const PAINTS = {
      black: { color: 1842464, metal: 0.45, rough: 0.38 },
      brown: { color: 4007445, metal: 0.25, rough: 0.55 },
      camo: { camo: [4938275, 2898459, 7032620, 10720359] },
      titan: { camo: [2829346, 4868910, 1447698, 7166519], scale: 1.4 }
    }, BLOCK_PATH = "/KayKit_BlockBits_1.0_FREE/Assets/gltf/", BLOCK_NAMES = ["bricks_B", "bricks_A", "metal", "stone_dark", "stone", "water", "tree", "snow", "lava", "grass", "dirt_with_grass", "gravel_with_grass", "stone_with_gold", "wood", "tree_with_snow"], blockTemplates = {};
    let blocksReady = !1;
    const assetStatus = document.getElementById("asset-status");
    function loadBlocks() {
      if (typeof THREE.GLTFLoader != "function") {
        onBlocksLoaded();
        return;
      }
      const loader = new THREE.GLTFLoader();
      let pending = BLOCK_NAMES.length, ok = 0;
      const done = () => {
        --pending === 0 && (assetStatus.innerText = ok ? "\u2714 ".concat(ok, " KAYKIT BLOCKS READY") : "\u26A0 BLOCKS NOT FOUND \xB7 USING BASIC SHAPES", onBlocksLoaded());
      };
      BLOCK_NAMES.forEach((n) => loader.load(BLOCK_PATH + n + ".gltf", (g) => {
        g.scene.traverse((c) => {
          c.isMesh && (c.castShadow = !0, c.receiveShadow = !0, c.material.map && (c.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy()));
        }), blockTemplates[n] = g.scene, ok++, done();
      }, void 0, () => done()));
    }
    function makeBlock(name, sy = 1, sxz = 1) {
      const t = blockTemplates[name];
      if (!t) return null;
      const o = t.clone(!0);
      return o.scale.set(sxz, sy, sxz), o;
    }
    function blockMesh(name) {
      const t = blockTemplates[name];
      if (!t) return null;
      let m = null;
      return t.traverse((c) => {
        !m && c.isMesh && (m = c);
      }), m;
    }
    let artizauTemplate = null;
    function tintGroup(root, paint) {
      const mats = [];
      return root.traverse((child) => {
        var _a, _b;
        if (child.isMesh) {
          child.castShadow = !0, child.receiveShadow = !0;
          let m;
          paint.camo ? m = makeCamoMaterial(paint.camo, { map: child.material.map, scale: (paint.scale || 1) * 2.1 }) : (m = child.material.clone(), m.color = C(paint.color), m.metalness = (_a = paint.metal) != null ? _a : 0.35, m.roughness = (_b = paint.rough) != null ? _b : 0.45), m.emissive = new THREE.Color(0), m.emissiveIntensity = 1, m.flatShading = !0, child.material = m, mats.push(m);
        }
      }), mats;
    }
    function createProceduralTank(paint, scaleMultiplier = 1, hostile = !1) {
      var _a, _b;
      const s = scaleMultiplier, k = "s" + s, group = new THREE.Group(), hullMat = paint.camo ? makeCamoMaterial(paint.camo, { scale: (paint.scale || 1) * 2.1 }) : std(paint.color, { rough: (_a = paint.rough) != null ? _a : 0.4, metal: (_b = paint.metal) != null ? _b : 0.25 }), dark = materials.treads, metal = materials.metal, B = (w, h, d) => G("box".concat(w, "_").concat(h, "_").concat(d, "_").concat(k), () => new THREE.BoxGeometry(w * s, h * s, d * s)), Cy = (rt, rb, h, seg) => G("cyl".concat(rt, "_").concat(rb, "_").concat(h, "_").concat(seg, "_").concat(k), () => new THREE.CylinderGeometry(rt * s, rb * s, h * s, seg)), add = (geo, mat, x, y, z, parent = group) => {
        const m = new THREE.Mesh(geo, mat);
        return m.position.set(x * s, y * s, z * s), m.castShadow = !0, m.receiveShadow = !0, parent.add(m), m;
      };
      add(B(1.55, 0.42, 1.85), hullMat, 0, 0.42, 0);
      const glacis = add(B(1.35, 0.22, 0.55), hullMat, 0, 0.52, 0.72);
      glacis.rotation.x = -0.28, add(B(0.12, 0.28, 1.9), dark, -0.82, 0.28, 0), add(B(0.12, 0.28, 1.9), dark, 0.82, 0.28, 0), add(B(0.42, 0.16, 0.3), materials.darkMetal, -0.4, 0.66, -0.78), add(B(0.42, 0.16, 0.3), materials.darkMetal, 0.4, 0.66, -0.78);
      for (let side of [-1, 1]) {
        for (let i = -2; i <= 2; i++) {
          const wheel = add(Cy(0.16, 0.16, 0.22, 8), metal, side * 0.78, 0.18, i * 0.32);
          wheel.rotation.z = Math.PI / 2, wheel.userData.spin = !0;
        }
        add(B(0.28, 0.14, 1.95), dark, side * 0.78, 0.08, 0);
      }
      const turret = new THREE.Group();
      turret.name = "turret", add(B(0.92, 0.38, 0.92), hullMat, 0, 0.78, 0, turret), add(B(0.7, 0.12, 0.7), hullMat, 0, 1, -0.04, turret), add(Cy(0.16, 0.16, 0.08, 8), metal, 0.18, 1.08, -0.1, turret);
      const barrel = add(Cy(0.09, 0.11, 1.35, 8), metal, 0, 0.78, 0.85, turret);
      barrel.rotation.x = Math.PI / 2;
      const muzzle = add(Cy(0.13, 0.13, 0.18, 8), dark, 0, 0.78, 1.48, turret);
      muzzle.rotation.x = Math.PI / 2, add(Cy(0.02, 0.02, 0.7, 5), metal, -0.28, 1.3, -0.2, turret), hostile && add(B(0.62, 0.07, 0.05), materials.enemyEye, 0, 0.86, 0.47, turret);
      const flash = new THREE.Mesh(G("flashS" + k, () => new THREE.SphereGeometry(0.2 * s, 8, 8)), materials.flash);
      return flash.position.set(0, 0.78 * s, 1.62 * s), flash.visible = !1, flash.name = "muzzleFlash", turret.add(flash), group.add(turret), add(B(0.12, 0.08, 0.08), materials.lamp, 0.35, 0.5, 0.92), add(B(0.12, 0.08, 0.08), materials.lamp, -0.35, 0.5, 0.92), group.userData.paintMats = [hullMat], group;
    }
    function createTankMesh(paint, scaleMultiplier = 1, hostile = !1) {
      if (artizauTemplate) {
        const clone = artizauTemplate.clone(!0);
        clone.scale.setScalar(4.6 * scaleMultiplier);
        const mats = tintGroup(clone, paint);
        let turret = null;
        clone.traverse((c) => {
          /barrel/i.test(c.name) && (turret = c);
        }), turret || (turret = new THREE.Group(), turret.name = "turret", clone.add(turret));
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), materials.flash);
        return flash.position.set(0, 0.22, 0.42), flash.visible = !1, flash.name = "muzzleFlash", turret.add(flash), clone.userData.turret = turret, clone.userData.paintMats = mats, clone;
      }
      const mesh = createProceduralTank(paint, scaleMultiplier, hostile);
      return mesh.userData.turret = mesh.getObjectByName("turret"), mesh;
    }
    (function() {
      const tryUrls = [
        "/Artizau_Tanks_1.0_FREE/Assets/obj/ArmTank.obj",
        "/Artizau_Tanks_1.0_FREE/Assets/gltf/ArmTank.gltf"
      ];
      typeof THREE.OBJLoader == "function" && new THREE.OBJLoader().load(tryUrls[0], (obj) => {
        artizauTemplate = obj, console.log("Artizau OBJ loaded");
      }, void 0, () => {
      }), typeof THREE.GLTFLoader == "function" && new THREE.GLTFLoader().load(tryUrls[1], (gltf) => {
        artizauTemplate = gltf.scene, console.log("Artizau GLTF loaded");
      }, void 0, () => {
      });
    })();
    function createTeamRing(colorHex, radius = 1.1) {
      const ring = new THREE.Mesh(G("ring" + radius, () => new THREE.RingGeometry(radius * 0.78, radius, 40)), glowMat(colorHex, 0.75));
      return ring.rotation.x = -Math.PI / 2, ring.position.y = 0.06, ring.renderOrder = 2, ring;
    }
    function createShieldMesh() {
      const g = new THREE.Group(), shell = new THREE.Mesh(G("shield1", () => new THREE.IcosahedronGeometry(1.45, 1)), new THREE.MeshBasicMaterial({ color: C(6809849), wireframe: !0, transparent: !0, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: !1 })), inner = new THREE.Mesh(G("shield2", () => new THREE.SphereGeometry(1.38, 20, 14)), new THREE.MeshBasicMaterial({ color: C(2282478), transparent: !0, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: !1 }));
      return g.add(shell), g.add(inner), g.position.y = 0.6, g.visible = !1, g;
    }
    function createIceShell(scale = 1) {
      const m = new THREE.Mesh(G("ice" + scale, () => new THREE.IcosahedronGeometry(1.15 * scale, 0)), materials.ice);
      return m.add(new THREE.Mesh(G("ice" + scale, () => null), materials.iceWire)), m.position.y = 0.6 * scale, m.visible = !1, m;
    }
    const allPlates = /* @__PURE__ */ new Set();
    function roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, h / 2, Math.max(0.01, w / 2)), ctx.beginPath(), ctx.moveTo(x + r, y), ctx.arcTo(x + w, y, x + w, y + h, r), ctx.arcTo(x + w, y + h, x, y + h, r), ctx.arcTo(x, y + h, x, y, r), ctx.arcTo(x, y, x + w, y, r), ctx.closePath();
    }
    function fitFont(ctx, text, size, maxW, weight = "bold") {
      let s = size;
      do {
        if (ctx.font = "".concat(weight, " ").concat(s, 'px "Press Start 2P", monospace'), ctx.measureText(text).width <= maxW) break;
        s -= 2;
      } while (s > 12);
      return s;
    }
    function createNameplate(label, cssColor, kind = "player") {
      const canvas2 = document.createElement("canvas");
      canvas2.width = kind === "enemy" ? 512 : 640, canvas2.height = kind === "enemy" ? 176 : 224;
      const ctx = canvas2.getContext("2d"), tex = new THREE.CanvasTexture(canvas2);
      tex.encoding = THREE.sRGBEncoding, tex.minFilter = THREE.LinearFilter, tex.generateMipmaps = !1;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: !0, depthTest: !1, depthWrite: !1 }), sprite = new THREE.Sprite(mat);
      return sprite.center.set(0.5, 0), sprite.renderOrder = 1e3, sprite.userData = { canvas: canvas2, ctx, tex, label, cssColor, kind, key: "", mul: kind === "enemy" ? 0.6 : kind === "base" ? 0.85 : 1 }, allPlates.add(sprite), scaleNameplate(sprite), sprite;
    }
    function disposeNameplate(sprite) {
      sprite && (allPlates.delete(sprite), sprite.material.map.dispose(), sprite.material.dispose());
    }
    function scaleNameplate(sprite) {
      const ud = sprite.userData, h = PLATE_UNIT * plateZoom * ud.mul * (ud.extraMul || 1);
      sprite.scale.set(h * ud.canvas.width / ud.canvas.height, h, 1);
    }
    function updateNameplate(sprite, hp, maxHp, extra = "") {
      const ud = sprite.userData, key = Math.ceil(hp) + "|" + maxHp + "|" + extra;
      if (scaleNameplate(sprite), key === ud.key) return;
      ud.key = key;
      const { canvas: canvas2, ctx, tex, label, cssColor, kind } = ud, W = canvas2.width, H = canvas2.height;
      ctx.clearRect(0, 0, W, H);
      const pct = Math.max(0, Math.min(1, hp / maxHp));
      if (ctx.lineJoin = "round", kind === "enemy")
        ctx.fillStyle = "rgba(20,6,8,0.82)", roundRect(ctx, 8, 8, W - 16, 112, 18), ctx.fill(), ctx.strokeStyle = cssColor, ctx.lineWidth = 7, ctx.stroke(), fitFont(ctx, label, 40, W - 60), ctx.textAlign = "center", ctx.textBaseline = "middle", ctx.strokeStyle = "#000", ctx.lineWidth = 8, ctx.strokeText(label, W / 2, 48), ctx.fillStyle = "#fecaca", ctx.fillText(label, W / 2, 48), ctx.fillStyle = "#1f0a0c", roundRect(ctx, 34, 78, W - 68, 26, 8), ctx.fill(), ctx.fillStyle = pct > 0.5 ? "#ef4444" : "#f97316", roundRect(ctx, 34, 78, (W - 68) * pct, 26, 8), ctx.fill(), ctx.fillStyle = cssColor, ctx.beginPath(), ctx.moveTo(W / 2 - 20, 120), ctx.lineTo(W / 2 + 20, 120), ctx.lineTo(W / 2, H - 6), ctx.closePath(), ctx.fill();
      else {
        if (extra) {
          fitFont(ctx, extra, 26, W - 120);
          const tw = ctx.measureText(extra).width + 36;
          ctx.fillStyle = cssColor, roundRect(ctx, W / 2 - tw / 2, 2, tw, 40, 14), ctx.fill(), ctx.fillStyle = "#0b0f19", ctx.textAlign = "center", ctx.textBaseline = "middle", ctx.fillText(extra, W / 2, 24);
        }
        ctx.fillStyle = kind === "base" ? "rgba(10,18,36,0.86)" : "rgba(9,12,22,0.86)", roundRect(ctx, 8, 46, W - 16, 132, 24), ctx.fill(), ctx.strokeStyle = cssColor, ctx.lineWidth = 9, ctx.stroke(), fitFont(ctx, label, 48, W - 70), ctx.textAlign = "center", ctx.textBaseline = "middle", ctx.strokeStyle = "#000", ctx.lineWidth = 10, ctx.strokeText(label, W / 2, 90), ctx.fillStyle = "#ffffff", ctx.fillText(label, W / 2, 90);
        const bx = 36, by = 126, bw = W - 72, bh = 34;
        ctx.fillStyle = "#0b1220", roundRect(ctx, bx, by, bw, bh, 10), ctx.fill();
        const fill = kind === "base" ? pct > 0.5 ? "#22d3ee" : pct > 0.25 ? "#facc15" : "#ef4444" : pct > 0.35 ? cssColor : "#ef4444";
        ctx.fillStyle = fill, roundRect(ctx, bx, by, bw * pct, bh, 10), ctx.fill(), ctx.fillStyle = "rgba(255,255,255,0.28)", roundRect(ctx, bx + 4, by + 4, Math.max(0, bw * pct - 8), 9, 4), ctx.fill(), ctx.strokeStyle = "rgba(0,0,0,0.45)", ctx.lineWidth = 3;
        for (let i = 1; i < 10; i++)
          ctx.beginPath(), ctx.moveTo(bx + bw * i / 10, by + 3), ctx.lineTo(bx + bw * i / 10, by + bh - 3), ctx.stroke();
        ctx.fillStyle = cssColor, ctx.beginPath(), ctx.moveTo(W / 2 - 26, 178), ctx.lineTo(W / 2 + 26, 178), ctx.lineTo(W / 2, H - 4), ctx.closePath(), ctx.fill();
      }
      tex.needsUpdate = !0;
    }
    document.fonts && document.fonts.load && document.fonts.load('48px "Press Start 2P"').then(() => {
      allPlates.forEach((p) => p.userData.key = ""), powerIconCache.clear();
    }).catch(() => {
    });
    function createEagleMesh() {
      const group = new THREE.Group(), stoneMat = std(3884630, { rough: 0.7 }), trimMat = std(16498468, { metal: 0.6, rough: 0.3, emissive: 8145411, ei: 0.3 }), goldMat = std(16167178, { metal: 0.55, rough: 0.3, emissive: 7029248, ei: 0.35 }), goldDark = std(13072904, { metal: 0.5, rough: 0.35, emissive: 4860928, ei: 0.3 }), whiteMat = std(16317180, { rough: 0.45, emissive: 3359061, ei: 0.2 }), beakMat = std(16753691, { emissive: 8138002, ei: 0.3 }), blackMat = new THREE.MeshBasicMaterial({ color: 328965 }), add = (geo, mat, x, y, z, parent = group) => {
        const m = new THREE.Mesh(geo, mat);
        return m.position.set(x, y, z), m.castShadow = !0, m.receiveShadow = !0, parent.add(m), m;
      };
      add(new THREE.CylinderGeometry(0.74, 0.78, 0.28, 8), stoneMat, 0, 0.14, 0), add(new THREE.CylinderGeometry(0.66, 0.7, 0.1, 8), trimMat, 0, 0.33, 0), add(new THREE.CylinderGeometry(0.54, 0.62, 0.24, 8), stoneMat, 0, 0.5, 0);
      const eagle = new THREE.Group();
      eagle.name = "eagle", eagle.position.y = 0.62, group.add(eagle), add(new THREE.IcosahedronGeometry(0.33, 0), goldMat, 0, 0.55, 0, eagle).scale.set(1, 1.45, 0.78), add(new THREE.IcosahedronGeometry(0.22, 0), whiteMat, 0, 1.08, 0.06, eagle);
      const beak = add(new THREE.ConeGeometry(0.085, 0.26, 4), beakMat, 0, 1.03, 0.27, eagle);
      beak.rotation.x = Math.PI / 2 + 0.45, add(new THREE.BoxGeometry(0.05, 0.05, 0.05), blackMat, 0.09, 1.12, 0.2, eagle), add(new THREE.BoxGeometry(0.05, 0.05, 0.05), blackMat, -0.09, 1.12, 0.2, eagle);
      for (let side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.name = side < 0 ? "wingL" : "wingR", wing.position.set(side * 0.2, 0.78, -0.02), eagle.add(wing);
        for (let i = 0; i < 5; i++) {
          const len = 0.86 - i * 0.09, pivot = new THREE.Group();
          pivot.rotation.z = side * (0.95 - i * 0.3), wing.add(pivot);
          const f = add(new THREE.BoxGeometry(len, 0.15, 0.13 - i * 0.012), i % 2 ? goldDark : goldMat, side * len / 2, 0, -i * 0.012, pivot);
          f.rotation.x = 0.05 * i;
        }
      }
      return [-0.32, 0, 0.32].forEach((a, i) => {
        const t = add(new THREE.BoxGeometry(0.12, 0.42, 0.06), i === 1 ? goldMat : goldDark, Math.sin(a) * 0.18, 0.18, -0.14, eagle);
        t.rotation.z = a;
      }), add(new THREE.BoxGeometry(0.1, 0.12, 0.14), beakMat, 0.1, 0.06, 0.06, eagle), add(new THREE.BoxGeometry(0.1, 0.12, 0.14), beakMat, -0.1, 0.06, 0.06, eagle), group.scale.setScalar(1.3), group.userData.flashMats = [goldMat, goldDark, whiteMat, trimMat], group.userData.baseEmissive = group.userData.flashMats.map((m) => m.emissive.clone()), group;
    }
    const powerIconCache = /* @__PURE__ */ new Map();
    function powerIconTexture(typeObj) {
      if (powerIconCache.has(typeObj.id)) return powerIconCache.get(typeObj.id);
      const tex = makeCanvasTexture(256, 320, (g, w) => {
        const grd = g.createRadialGradient(98, 94, 10, 128, 124, 108);
        grd.addColorStop(0, "#ffffff"), grd.addColorStop(0.35, typeObj.css), grd.addColorStop(1, "#111827"), g.fillStyle = "rgba(0,0,0,0.45)", g.beginPath(), g.arc(134, 132, 108, 0, Math.PI * 2), g.fill(), g.fillStyle = grd, g.beginPath(), g.arc(128, 124, 108, 0, Math.PI * 2), g.fill(), g.lineWidth = 12, g.strokeStyle = "#ffffff", g.stroke(), g.font = '112px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif', g.textAlign = "center", g.textBaseline = "middle", g.fillText(typeObj.icon, 128, 132), g.fillStyle = "rgba(10,12,20,0.9)", roundRect(g, 6, 252, w - 12, 60, 16), g.fill(), g.strokeStyle = typeObj.css, g.lineWidth = 5, g.stroke(), fitFont(g, typeObj.name, 22, w - 30), g.fillStyle = "#fff", g.fillText(typeObj.name, 128, 284);
      });
      return powerIconCache.set(typeObj.id, tex), tex;
    }
    function createBrickTile() {
      const b = makeBlock("bricks_B", 0.7);
      if (b)
        return b.position.y = 0.7, b;
      const m = new THREE.Mesh(G("brickBox", () => new THREE.BoxGeometry(CELL_SIZE - 0.02, 1.4, CELL_SIZE - 0.02)), materials.brick);
      return m.position.y = 0.7, m.castShadow = !0, m.receiveShadow = !0, m;
    }
    function createSteelTile(isBorder2) {
      const b = isBorder2 ? makeBlock("stone_dark", 0.65) : makeBlock("metal", 0.76);
      if (b)
        return b.position.y = isBorder2 ? 0.65 : 0.76, b;
      const h = isBorder2 ? 1.3 : 1.5, m = new THREE.Mesh(G("steelBox" + h, () => new THREE.BoxGeometry(CELL_SIZE, h, CELL_SIZE)), materials.steel);
      return m.position.y = h / 2, m.castShadow = !0, m.receiveShadow = !0, m;
    }
    function createTreeTile() {
      const b = makeBlock("tree", 0.7, 0.92);
      if (b) {
        b.position.y = 0.7, b.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;
        const mats2 = [];
        return b.traverse((c) => {
          c.isMesh && (c.material = c.material.clone(), c.material.transparent = !0, mats2.push(c.material));
        }), b.userData.fadeMats = mats2, b.userData.sway = Math.random() * Math.PI * 2, b;
      }
      const group = new THREE.Group(), trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.7, 5), std(5519392));
      trunk.position.y = 0.35, group.add(trunk);
      const mats = [];
      return [0.85, 0.68, 0.45].forEach((rad, i) => {
        const mat = std([1409085, 1483594, 2278750][i], { transparent: !0 });
        mats.push(mat);
        const layer = new THREE.Mesh(new THREE.ConeGeometry(rad, 0.7 - i * 0.08, 6), mat);
        layer.position.y = 0.85 + i * 0.38, layer.castShadow = !0, group.add(layer);
      }), group.userData.fadeMats = mats, group.userData.sway = Math.random() * Math.PI * 2, group;
    }
    function createWaterTile() {
      const b = makeBlock("water");
      if (b)
        return b.position.y = -1.08, b;
      const geo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE, 2, 2);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, std(2450411, { rough: 0.25 }));
      return m.position.y = 0.08, m;
    }
    function createIceTile() {
      const b = makeBlock("snow");
      if (b)
        return b.position.y = -0.95, b;
      const m = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE - 0.05, 0.12, CELL_SIZE - 0.05), std(14412542, { rough: 0.2 }));
      return m.position.y = 0.06, m;
    }
    let lavaMat = null;
    function createLavaTile() {
      const b = makeBlock("lava");
      if (b)
        return b.position.y = -0.93, b.traverse((c) => {
          c.isMesh && (lavaMat || (lavaMat = c.material.clone(), lavaMat.emissive = new THREE.Color(16777215), lavaMat.emissiveMap = lavaMat.map, lavaMat.emissiveIntensity = 0.6), c.material = lavaMat);
        }), b;
      const m = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE - 0.3, 0.15, CELL_SIZE - 0.3), std(15357964, { emissive: 16347926, ei: 0.6 }));
      return m.position.y = 0.08, m;
    }
    function createConveyorTile(dir) {
      const g = new THREE.Group(), base = makeBlock("metal");
      if (base)
        base.position.y = -0.92, g.add(base);
      else {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE - 0.1, 0.12, CELL_SIZE - 0.1), materials.conveyor);
        pad.position.y = 0.06, g.add(pad);
      }
      const chevGeo = G("chev", () => new THREE.ConeGeometry(0.22, 0.38, 3));
      for (let i = -1; i <= 1; i++) {
        const chev = new THREE.Mesh(chevGeo, materials.chevron);
        chev.rotation.x = Math.PI / 2, chev.position.set(0, 0.16, i * 0.5), chev.userData.baseZ = i * 0.5, g.add(chev);
      }
      const ang = dir === 1 ? Math.PI / 2 : 0;
      return g.rotation.y = ang, g.userData.conveyorDir = dir, g;
    }
    function createBarrelProp() {
      const g = new THREE.Group(), drum = new THREE.Mesh(G("drum", () => new THREE.CylinderGeometry(0.58, 0.58, 1.2, 14)), materials.barrel);
      drum.position.y = 0.6, drum.castShadow = !0, drum.receiveShadow = !0, g.add(drum);
      for (const y of [0.26, 0.94]) {
        const band = new THREE.Mesh(G("band", () => new THREE.TorusGeometry(0.59, 0.06, 6, 18)), materials.barrelBand);
        band.rotation.x = Math.PI / 2, band.position.y = y, g.add(band);
      }
      const lid = new THREE.Mesh(G("lid", () => new THREE.CylinderGeometry(0.5, 0.5, 0.04, 14)), materials.barrelBand);
      lid.position.y = 1.22, g.add(lid);
      const sym = new THREE.Mesh(G("sym", () => new THREE.RingGeometry(0.16, 0.3, 14)), new THREE.MeshBasicMaterial({ color: C(8330525) }));
      return sym.rotation.x = -Math.PI / 2, sym.position.y = 1.25, g.add(sym), g;
    }
    const initialMapGrid = [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 8, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 8, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 1, 1, 0, 0, 1, 0, 1, 0, 2, 2, 0, 6, 6, 6, 6, 0, 9, 0, 6, 6, 6, 6, 0, 2, 2, 0, 1, 0, 1, 0, 0, 1, 1, 0, 2],
      [2, 0, 1, 4, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6, 4, 4, 6, 0, 7, 0, 6, 4, 4, 6, 0, 1, 0, 0, 0, 0, 1, 0, 0, 4, 1, 0, 2],
      [2, 0, 0, 4, 0, 0, 2, 2, 0, 4, 4, 4, 0, 0, 3, 3, 0, 0, 7, 0, 0, 3, 3, 0, 0, 4, 4, 4, 0, 2, 2, 0, 0, 4, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 1, 0, 4, 3, 3, 4, 0, 3, 3, 0, 0, 7, 0, 0, 3, 3, 0, 4, 3, 3, 4, 0, 1, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 3, 3, 0, 1, 0, 0, 8, 0, 0, 0, 0, 1, 1, 0, 10, 10, 0, 10, 10, 0, 1, 1, 0, 0, 0, 0, 8, 0, 0, 1, 0, 3, 3, 0, 2],
      [2, 0, 3, 3, 0, 0, 0, 2, 2, 0, 1, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 1, 0, 2, 2, 0, 0, 0, 3, 3, 0, 2],
      [2, 0, 0, 8, 0, 0, 1, 1, 0, 10, 10, 10, 10, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 10, 10, 10, 10, 0, 1, 1, 0, 0, 8, 0, 0, 2],
      [2, 0, 1, 1, 0, 0, 1, 0, 0, 2, 0, 1, 0, 9, 0, 1, 0, 0, 0, 0, 0, 1, 0, 9, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 1, 0, 2],
      [2, 0, 4, 1, 0, 0, 0, 0, 0, 2, 0, 6, 6, 6, 0, 0, 0, 2, 2, 2, 0, 0, 0, 6, 6, 6, 0, 2, 0, 0, 0, 0, 0, 1, 4, 0, 2],
      [2, 0, 4, 0, 0, 1, 0, 1, 0, 0, 8, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 8, 0, 0, 1, 0, 1, 0, 0, 4, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 1, 1, 0, 0, 1, 1, 0, 2, 0, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 1, 0, 0, 0, 0, 0, 2, 0, 1, 1, 0, 0, 1, 1, 0, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ];
    let mapGrid = JSON.parse(JSON.stringify(initialMapGrid));
    const tileMeshes = /* @__PURE__ */ new Map(), waterMeshes = [], iceMeshes = [], conveyorMeshes = [], treeMeshes = [], ventMeshes = [], barrelTiles = /* @__PURE__ */ new Map();
    let eagleMesh = null, eagleAura = null, eaglePlate = null, eagleBeacon = null, eagleFlash = 0;
    const dust = [], GATE_C = 18, GATE_R = 7, isBorder = (c, r) => r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1, ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_COLS * CELL_SIZE, MAP_ROWS * CELL_SIZE, 1, 1), materials.floor);
    ground.rotation.x = -Math.PI / 2, ground.receiveShadow = !0, scene.add(ground);
    const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), std(2001992, { rough: 1 }));
    outerGround.rotation.x = -Math.PI / 2, outerGround.position.y = -0.04, outerGround.receiveShadow = !0, scene.add(outerGround), fitCamera();
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Mesh(G("dustp", () => new THREE.BoxGeometry(0.09, 0.09, 0.09)), new THREE.MeshBasicMaterial({ color: C(16775126), transparent: !0, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: !1 }));
      p.position.set((Math.random() - 0.5) * 72, 0.4 + Math.random() * 4, (Math.random() - 0.5) * 30), p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.3), scene.add(p), dust.push(p);
    }
    let outerBuilt = !1, borderInstanced = !1;
    function buildOuterTerrain() {
      if (outerBuilt) return;
      const grass = blockMesh("grass");
      if (!grass) return;
      outerBuilt = !0;
      const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), frame = blockMesh("stone_dark");
      if (frame) {
        const cells2 = [];
        for (let r = 0; r < MAP_ROWS; r++) for (let c = 0; c < MAP_COLS; c++) isBorder(c, r) && cells2.push([c, r]);
        const im = new THREE.InstancedMesh(frame.geometry, frame.material, cells2.length);
        im.receiveShadow = !0, cells2.forEach(([c, r], i) => {
          const p = gridToWorld(c, r);
          q.setFromAxisAngle(up, (c * 7 + r * 3) % 4 * Math.PI / 2), mtx.compose(new THREE.Vector3(p.x, 0.65, p.z), q, new THREE.Vector3(1, 0.65, 1)), im.setMatrixAt(i, mtx);
        }), scene.add(im), borderInstanced = !0;
      }
      const cells = [];
      for (let r = -2; r < MAP_ROWS + 2; r++) for (let c = -2; c < MAP_COLS + 2; c++)
        r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS || cells.push([c, r]);
      const inst = new THREE.InstancedMesh(grass.geometry, grass.material, cells.length);
      inst.receiveShadow = !0;
      const decorSpots = [];
      cells.forEach(([c, r], i) => {
        const p = gridToWorld(c, r), d = Math.max(c < 0 ? -c : c - MAP_COLS + 1, r < 0 ? -r : r - MAP_ROWS + 1), lift = d >= 2 && Math.random() < 0.3 ? 0.5 : 0;
        q.setFromAxisAngle(up, Math.floor(Math.random() * 4) * Math.PI / 2), mtx.compose(new THREE.Vector3(p.x, -1 + lift, p.z), q, sc), inst.setMatrixAt(i, mtx), d >= 2 && Math.random() < 0.16 && decorSpots.push([p, lift]);
      }), scene.add(inst);
      for (let i = 0; i < 70; i++) {
        const c = Math.floor(-9 + Math.random() * (MAP_COLS + 18)), r = Math.floor(-7 + Math.random() * (MAP_ROWS + 14));
        Math.max(c < 0 ? -c : c - MAP_COLS + 1, r < 0 ? -r : r - MAP_ROWS + 1) >= 3 && decorSpots.push([gridToWorld(c, r), -1]);
      }
      const decoNames = ["tree", "tree", "tree", "tree", "tree", "stone", "gravel_with_grass"], groups = {};
      decorSpots.forEach(([p, lift]) => {
        const n = decoNames[Math.floor(Math.random() * decoNames.length)];
        (groups[n] = groups[n] || []).push([p, lift]);
      }), Object.keys(groups).forEach((n) => {
        const m = blockMesh(n);
        if (!m) return;
        const list = groups[n], im = new THREE.InstancedMesh(m.geometry, m.material, list.length);
        im.castShadow = !0, im.receiveShadow = !0, list.forEach(([p, lift], i) => {
          const s = n === "tree" ? 1 : 0.7 + Math.random() * 0.25;
          q.setFromAxisAngle(up, Math.floor(Math.random() * 4) * Math.PI / 2), mtx.compose(new THREE.Vector3(p.x, lift + s, p.z), q, new THREE.Vector3(s, s, s)), im.setMatrixAt(i, mtx);
        }), scene.add(im);
      });
    }
    function ensureEagle(pos) {
      if (!eagleMesh) {
        eagleMesh = createEagleMesh(), scene.add(eagleMesh), eagleAura = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.98, 48), glowMat(3718648, 0.85));
        ring.rotation.x = -Math.PI / 2, ring.position.y = 0.08, ring.name = "ring", eagleAura.add(ring), eagleBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 7, 20, 1, !0), glowMat(16498468, 0.14)), eagleBeacon.material.side = THREE.DoubleSide, eagleBeacon.position.y = 4.6, eagleAura.add(eagleBeacon), eaglePlate = createNameplate("EAGLE BASE", "#fbbf24", "base"), eaglePlate.position.y = 3.6, eagleAura.add(eaglePlate), scene.add(eagleAura);
      }
      eagleMesh.position.set(pos.x, 0, pos.z), eagleMesh.visible = !0, eagleAura.position.set(pos.x, 0, pos.z), eagleAura.visible = !0;
    }
    function buildMap() {
      tileMeshes.forEach((m) => scene.remove(m)), tileMeshes.clear(), waterMeshes.length = 0, iceMeshes.length = 0, conveyorMeshes.length = 0, treeMeshes.length = 0, ventMeshes.length = 0, barrelTiles.clear();
      for (let r = 0; r < MAP_ROWS; r++)
        for (let c = 0; c < MAP_COLS; c++) {
          const type = mapGrid[r][c], pos = gridToWorld(c, r);
          let mesh = null;
          if (type === 1 ? mesh = createBrickTile() : type === 2 ? borderInstanced && isBorder(c, r) || (mesh = createSteelTile(isBorder(c, r))) : type === 3 ? (mesh = createWaterTile(), waterMeshes.push(mesh)) : type === 4 ? (mesh = createTreeTile(), treeMeshes.push(mesh)) : type === 5 ? ensureEagle(pos) : type === 6 ? (mesh = createIceTile(), iceMeshes.push(mesh)) : type === 7 || type === 10 ? (mesh = createConveyorTile(type === 7 ? 0 : 1), conveyorMeshes.push(mesh)) : type === 8 ? (mesh = createBarrelProp(), barrelTiles.set("".concat(c, ",").concat(r), mesh)) : type === 9 && (mesh = createLavaTile(), ventMeshes.push(mesh)), mesh) {
            const y = mesh.position.y;
            mesh.position.set(pos.x, y, pos.z), mesh.userData.baseY = y, scene.add(mesh), tileMeshes.set("".concat(c, ",").concat(r), mesh);
          }
        }
    }
    function onBlocksLoaded() {
      blocksReady = !0, buildOuterTerrain(), buildMap();
    }
    buildMap(), loadBlocks();
    const bgmHudBtn = document.getElementById("bgm-hud-toggle"), bgmLobbyBtn = document.getElementById("bgm-lobby-toggle");
    function handleBgmToggle() {
      audio.init();
      const active = audio.toggleBGM();
      gameState !== "PLAYING" && audio.stopBGM(), bgmHudBtn && (bgmHudBtn.innerText = active ? "\u{1F3B5} BGM" : "\u{1F507} MUTE"), bgmLobbyBtn && (bgmLobbyBtn.innerText = active ? "\u{1F3B5} MUSIC: ON" : "\u{1F507} MUSIC: OFF");
    }
    bgmHudBtn && bgmHudBtn.addEventListener("click", handleBgmToggle), bgmLobbyBtn && bgmLobbyBtn.addEventListener("click", handleBgmToggle);
    const voiceHudBtn = document.getElementById("voice-hud-toggle"), voiceLobbyBtn = document.getElementById("voice-lobby-toggle");
    function handleVoiceToggle() {
      audio.init();
      const on = audio.toggleVoice();
      voiceHudBtn.innerText = on ? "\u{1F399} VOICE" : "\u{1F507} VOICE", voiceLobbyBtn.innerText = on ? "\u{1F399} VOICE: ON" : "\u{1F507} VOICE: OFF", on && audio.say("Voice on", { priority: !0 });
    }
    voiceHudBtn.addEventListener("click", handleVoiceToggle), voiceLobbyBtn.addEventListener("click", handleVoiceToggle);
    const keysPressed = {};
    window.addEventListener("keydown", (e) => {
      isTypingTarget(e.target) || (keysPressed[e.code] = !0, e.code === "Space" && e.preventDefault(), gameState === "INTRO" && (e.code === "Space" || e.code === "Enter" || e.code === "Escape") && skipIntro(), updateHostKeyboard());
    }), window.addEventListener("keyup", (e) => {
      isTypingTarget(e.target) || (keysPressed[e.code] = !1, updateHostKeyboard());
    });
    function updateHostKeyboard() {
      const hostP = activePlayers.get(hostPlayerId);
      if (!hostP) return;
      let dx = 0, dz = 0;
      (keysPressed.KeyA || keysPressed.ArrowLeft) && (dx -= 1), (keysPressed.KeyD || keysPressed.ArrowRight) && (dx += 1), (keysPressed.KeyW || keysPressed.ArrowUp) && (dz -= 1), (keysPressed.KeyS || keysPressed.ArrowDown) && (dz += 1), dx !== 0 && dz !== 0 && (dx *= 0.7071, dz *= 0.7071), hostP.input.dirX = dx, hostP.input.dirZ = dz, hostP.input.shoot = !!keysPressed.Space, hostP.input.boost = !!(keysPressed.ShiftLeft || keysPressed.ShiftRight);
    }
    const PLAYER_SPEED = 11.2, ENEMY_SPEED = 6, BULLET_SPEED = 36;
    let gameState = "LOBBY", gameTime = 0, currentWave = 1, waveKills = 0, killsToNextWave = 10, score = 0, totalKills = 0, baseHp = 100, freezeTimer = 0, fortifyTimer = 0, bossRef = null, comboDisplay = 0;
    const enemies = [], bullets = [], powerups = [], particles = [], lasers = [], fxBursts = [], scorches = [], playerSpawns = [gridToWorld(7, 12), gridToWorld(29, 12), gridToWorld(11, 12), gridToWorld(25, 12), gridToWorld(13, 12), gridToWorld(23, 12), gridToWorld(4, 12)], enemySpawnPoints = [gridToWorld(2, 1), gridToWorld(6, 1), gridToWorld(13, 1), gridToWorld(18, 1), gridToWorld(23, 1), gridToWorld(30, 1), gridToWorld(34, 1)], easeOutBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2), easeInOut = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    function tileAtWorld(pos) {
      const col = Math.floor((pos.x + MAP_OFFSET_X + CELL_SIZE / 2) / CELL_SIZE), row = Math.floor((pos.z + MAP_OFFSET_Z + CELL_SIZE / 2) / CELL_SIZE);
      return col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS ? { col, row, type: 2 } : { col, row, type: mapGrid[row][col] };
    }
    function applySurfaceMotion(entity, delta) {
      const t = tileAtWorld(entity.mesh.position);
      entity.ice = t.type === 6, t.type === 7 && (entity.vel.z += 7.5 * delta), t.type === 10 && (entity.vel.x += 7.5 * delta), t.type === 9 && gameState === "PLAYING" && (entity.playerObj ? damagePlayer(entity.playerObj, 10 * delta) : entity.hp && !entity.isBoss && (entity.hp -= 6 * delta));
    }
    const PGEO = { box: new THREE.BoxGeometry(1, 1, 1), puff: new THREE.IcosahedronGeometry(1, 0) }, MAX_PARTICLES = 650;
    class Particle {
      constructor(pos, colorHex, scale, velocity, o = {}) {
        var _a, _b;
        this.kind = o.kind || "spark";
        let mat;
        this.kind === "smoke" ? mat = new THREE.MeshLambertMaterial({ color: C(colorHex), transparent: !0, opacity: (_a = o.opacity) != null ? _a : 0.55, depthWrite: !1 }) : this.kind === "debris" ? mat = new THREE.MeshLambertMaterial({ color: C(colorHex) }) : mat = new THREE.MeshBasicMaterial({ color: C(colorHex), transparent: !0, opacity: 1, blending: o.glow === !1 ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: !1 }), this.mesh = new THREE.Mesh(this.kind === "smoke" ? PGEO.puff : PGEO.box, mat), this.mesh.scale.setScalar(scale), this.baseOpacity = mat.opacity, this.mesh.position.copy(pos), this.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3), this.velocity = velocity, this.life = 1, this.decay = o.decay || (this.kind === "smoke" ? 0.9 : this.kind === "debris" ? 0.8 : 2.4), this.gravity = (_b = o.gravity) != null ? _b : this.kind === "smoke" ? -1.2 : 14, this.spin = (Math.random() - 0.5) * 10, this.scn = o.scene || scene, this.scn.add(this.mesh), this.kind === "debris" && (this.mesh.castShadow = !0);
      }
      update(delta) {
        const m = this.mesh;
        return m.position.addScaledVector(this.velocity, delta), this.velocity.y -= this.gravity * delta, this.kind === "smoke" ? (m.scale.multiplyScalar(1 + delta * 1.5), this.velocity.multiplyScalar(Math.pow(0.2, delta)), m.material.opacity = Math.max(0, this.life) * this.baseOpacity) : this.kind === "debris" ? (m.rotation.x += this.spin * delta, m.rotation.z += this.spin * delta, m.position.y < 0.12 && this.velocity.y < 0 && (m.position.y = 0.12, this.velocity.y *= -0.35, this.velocity.x *= 0.6, this.velocity.z *= 0.6, this.spin *= 0.5), this.life < 0.3 && m.scale.multiplyScalar(Math.pow(0.02, delta))) : (m.scale.multiplyScalar(Math.pow(0.03, delta)), m.material.opacity = Math.max(0, this.life)), this.life -= delta * this.decay, this.life > 0;
      }
      destroy() {
        this.scn.remove(this.mesh), this.mesh.material.dispose();
      }
    }
    function addParticle(list, ...args) {
      list.length < MAX_PARTICLES && list.push(new Particle(...args));
    }
    function rv(sx, sy, sz, by = 0) {
      return new THREE.Vector3((Math.random() - 0.5) * sx, Math.random() * sy + by, (Math.random() - 0.5) * sz);
    }
    function createExplosionVFX(pos, colorHex, count = 15, o = {}) {
      const scn = o.scene || scene, list = o.list || particles, p0 = pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z);
      p0.y < 0.3 && (p0.y = 0.5);
      for (let i = 0; i < count; i++) addParticle(list, p0, colorHex, 0.22 + Math.random() * 0.22, rv(13, 8, 13, 2), { scene: scn });
      for (let i = 0; i < Math.ceil(count / 2); i++) addParticle(list, p0, i % 2 ? 16765286 : 16743209, 0.3 + Math.random() * 0.3, rv(7, 5, 7, 1.5), { scene: scn, decay: 2.8 });
      for (let i = 0; i < Math.ceil(count / 3); i++) addParticle(list, p0.clone().add(rv(0.8, 0.4, 0.8)), i % 2 ? 4144966 : 7041664, 0.35 + Math.random() * 0.3, rv(2.5, 2.5, 2.5, 0.8), { scene: scn, kind: "smoke" });
      !o.noLight && scn === scene && flashLight(p0, colorHex === 11817737 ? 16756838 : 16747578, count > 20 ? 5 : 2.6, count > 20 ? 0.45 : 0.22, count > 20 ? 16 : 9);
    }
    function createDebris(pos, colors, count = 8, o = {}) {
      const scn = o.scene || scene, list = o.list || particles;
      for (let i = 0; i < count; i++) addParticle(list, pos.clone().add(rv(1.2, 0.8, 1.2)), colors[i % colors.length], 0.18 + Math.random() * 0.22, rv(9, 7, 9, 2.5), { scene: scn, kind: "debris" });
    }
    function createSparks(pos, colorHex, count = 6) {
      for (let i = 0; i < count; i++) addParticle(particles, pos, colorHex, 0.12 + Math.random() * 0.1, rv(10, 5, 10, 1), { decay: 4 });
    }
    function spawnDust(pos, colorHex = 15129798, scale = 0.24, scn = scene, list = particles) {
      addParticle(list, new THREE.Vector3(pos.x + (Math.random() - 0.5) * 0.6, 0.2, pos.z + (Math.random() - 0.5) * 0.6), colorHex, scale, rv(0.8, 0.6, 0.8, 0.2), { scene: scn, kind: "smoke", opacity: 0.22, decay: 1.7 });
    }
    class RingPulse {
      constructor(pos, colorHex, o = {}) {
        var _a, _b, _c, _d, _e;
        this.from = (_a = o.from) != null ? _a : 0.3, this.to = (_b = o.to) != null ? _b : 4, this.life = (_c = o.life) != null ? _c : 0.6, this.t = 0, this.base = (_d = o.opacity) != null ? _d : 0.9, this.scn = o.scene || scene, this.mesh = new THREE.Mesh(G("pulse" + (o.width || 0.16), () => new THREE.RingGeometry(1 - (o.width || 0.16), 1, 48)), glowMat(colorHex, this.base)), this.mesh.rotation.x = -Math.PI / 2, this.mesh.position.set(pos.x, (_e = o.y) != null ? _e : 0.1, pos.z), this.mesh.scale.setScalar(this.from), this.scn.add(this.mesh);
      }
      update(delta) {
        this.t += delta;
        const k = Math.min(1, this.t / this.life);
        return this.mesh.scale.setScalar(this.from + (this.to - this.from) * (1 - Math.pow(1 - k, 3))), this.mesh.material.opacity = (1 - k) * this.base, k < 1;
      }
      destroy() {
        this.scn.remove(this.mesh), this.mesh.material.dispose();
      }
    }
    function spawnScorch(pos, size = 1.6) {
      const m = new THREE.Mesh(G("scorch", () => new THREE.CircleGeometry(1, 12)), materials.scorch.clone());
      if (m.rotation.x = -Math.PI / 2, m.rotation.z = Math.random() * 6, m.position.set(pos.x, 0.025, pos.z), m.scale.setScalar(size), m.userData.life = 9, scene.add(m), scorches.push(m), scorches.length > 28) {
        const old = scorches.shift();
        scene.remove(old), old.material.dispose();
      }
    }
    function screenFlash(kind) {
      const el = document.getElementById("screen-flash");
      el.className = kind, el.style.transition = "none", el.style.opacity = "1", requestAnimationFrame(() => {
        el.style.transition = "opacity 0.5s ease-out", el.style.opacity = "0";
      });
    }
    class PlayerTankEntity {
      constructor(playerObj) {
        this.playerObj = playerObj;
        const palette = PLAYER_PALETTE[playerObj.slotIndex % PLAYER_PALETTE.length];
        this.palette = palette, this.mesh = new THREE.Group(), this.body = createTankMesh({ color: palette.hex, rough: 0.36, metal: 0.25 }), this.mesh.add(this.body), this.turret = this.body.userData.turret || null, this.ring = createTeamRing(palette.hex, 1.18), this.mesh.add(this.ring), this.shieldMesh = createShieldMesh(), this.mesh.add(this.shieldMesh), this.nameplate = createNameplate(playerObj.name, palette.css, "player"), this.nameplate.position.y = 2.05, this.mesh.add(this.nameplate), scene.add(this.mesh), this.lastShotTime = 0, this.radius = 0.82, this.vel = new THREE.Vector3(), this.boostFuel = 1, this.flash = this.body.getObjectByName("muzzleFlash"), this.flashTimer = 0, this.hullYaw = 0, this.turretYaw = 0, this.dustT = 0, this.wasBoosting = !1, this.resetPosition(), updateNameplate(this.nameplate, playerObj.hp, 100, "");
      }
      resetPosition() {
        const sp = playerSpawns[this.playerObj.slotIndex % playerSpawns.length];
        this.mesh.position.copy(sp), this.vel.set(0, 0, 0), this.hullYaw = Math.PI, this.turretYaw = Math.PI, this.body.rotation.y = Math.PI, this.turret && this.turret !== this.body && (this.turret.rotation.y = 0), fxBursts.push(new RingPulse(sp, this.palette.hex, { from: 0.4, to: 3.2, life: 0.7 }));
      }
      dispose() {
        scene.remove(this.mesh), disposeNameplate(this.nameplate);
      }
      update(delta, nowSec) {
        const P = this.playerObj;
        if (P.hp <= 0) {
          this.mesh.visible = !1;
          return;
        }
        this.mesh.visible = !0, unstick(this, this.radius), P.starTimer > 0 && (P.starTimer -= delta), P.laserTimer > 0 && (P.laserTimer -= delta), P.comboTimer > 0 ? P.comboTimer -= delta : P.combo = 0, P.shieldTimer > 0 ? (P.shieldTimer -= delta, this.shieldMesh.visible = P.shieldTimer > 2 || Math.floor(P.shieldTimer * 8) % 2 === 0, this.shieldMesh.rotation.y += delta * 2, this.shieldMesh.children[0].rotation.x += delta * 1.3) : this.shieldMesh.visible = !1, this.ring.material.opacity = 0.55 + Math.sin(nowSec * 5) * 0.2;
        const input = P.input, boosting = input.boost && this.boostFuel > 0.12;
        boosting && !this.wasBoosting && audio.playBoost(), this.wasBoosting = boosting, boosting ? this.boostFuel = Math.max(0, this.boostFuel - delta * 0.55) : this.boostFuel = Math.min(1, this.boostFuel + delta * 0.28);
        const target = new THREE.Vector3(input.dirX, 0, input.dirZ);
        target.length() > 1 && target.normalize();
        const lerp = tileAtWorld(this.mesh.position).type === 6 ? 1.6 : 8.5;
        this.vel.x += (target.x * PLAYER_SPEED * (boosting ? 1.55 : 1) - this.vel.x) * Math.min(1, delta * lerp), this.vel.z += (target.z * PLAYER_SPEED * (boosting ? 1.55 : 1) - this.vel.z) * Math.min(1, delta * lerp), applySurfaceMotion(this, delta);
        const step = this.vel.clone().multiplyScalar(delta), tryX = this.mesh.position.clone();
        tryX.x += step.x, !checkWallCollision(tryX, this.radius) && !checkTankOverlap(tryX, this.radius, this) ? this.mesh.position.x = tryX.x : this.vel.x *= -0.25;
        const tryZ = this.mesh.position.clone();
        tryZ.z += step.z, !checkWallCollision(tryZ, this.radius) && !checkTankOverlap(tryZ, this.radius, this) ? this.mesh.position.z = tryZ.z : this.vel.z *= -0.25;
        const speed = Math.abs(this.vel.x) + Math.abs(this.vel.z);
        if (speed > 0.4 && (this.hullYaw = Math.atan2(this.vel.x, this.vel.z)), this.body.rotation.y = this.hullYaw, target.length() > 0.15 && (this.turretYaw = Math.atan2(target.x, target.z)), this.turret && this.turret !== this.body) {
          let dy = this.turretYaw - this.hullYaw;
          for (; dy > Math.PI; ) dy -= Math.PI * 2;
          for (; dy < -Math.PI; ) dy += Math.PI * 2;
          this.turret.rotation.y = THREE.MathUtils.lerp(this.turret.rotation.y, dy, 1 - Math.pow(1e-3, delta));
        }
        if (this.body.traverse((c) => {
          c.userData && c.userData.spin && (c.rotation.x += this.vel.length() * delta * 2.5);
        }), this.dustT -= delta, speed > 3 && this.dustT <= 0) {
          this.dustT = boosting ? 0.04 : 0.11;
          const back = this.mesh.position.clone().add(new THREE.Vector3(-Math.sin(this.hullYaw), 0, -Math.cos(this.hullYaw)).multiplyScalar(0.9));
          spawnDust(back, boosting ? 16755021 : 15129798, boosting ? 0.3 : 0.24);
        }
        const cooldown = P.laserTimer > 0 ? 0.32 : P.starTimer > 0 ? 0.09 : 0.2;
        input.shoot && nowSec - this.lastShotTime >= cooldown && (this.shoot(), this.lastShotTime = nowSec), this.flash && (this.flashTimer -= delta, this.flash.visible = this.flashTimer > 0);
        const tags = [];
        P.combo > 1 && tags.push("x" + P.combo), P.laserTimer > 0 && tags.push("LASER"), P.starTimer > 0 && tags.push("DUAL"), P.shieldTimer > 0 && tags.push("SHIELD"), !P.connected && !P.isHost && tags.unshift("\u{1F4E1} OFFLINE"), updateNameplate(this.nameplate, P.hp, 100, tags.join(" "));
      }
      shoot() {
        const P = this.playerObj, yaw = this.turretYaw, dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        this.vel.add(dir.clone().multiplyScalar(-2.2)), this.flashTimer = P.laserTimer > 0 ? 0.12 : 0.06, shakeAmp = Math.max(shakeAmp, P.laserTimer > 0 ? 0.24 : 0.12);
        const muzzle = this.mesh.position.clone().add(dir.clone().multiplyScalar(1.5));
        if (muzzle.y = 0.8, flashLight(muzzle, P.laserTimer > 0 ? 16727212 : 16765803, 1.6, 0.08, 6), P.laserTimer > 0)
          fireLaser(this.mesh.position.clone().add(dir.clone().multiplyScalar(1.1)), dir, P);
        else if (P.starTimer > 0) {
          const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.35), a = this.mesh.position.clone().add(dir.clone().multiplyScalar(1.25)).add(perp);
          a.y = 0.75;
          const b = this.mesh.position.clone().add(dir.clone().multiplyScalar(1.25)).sub(perp);
          b.y = 0.75, bullets.push(new Bullet(a, dir, "player", P)), bullets.push(new Bullet(b, dir, "player", P)), audio.playShoot();
        } else {
          const spawnPos = this.mesh.position.clone().add(dir.clone().multiplyScalar(1.25));
          spawnPos.y = 0.75, bullets.push(new Bullet(spawnPos, dir, "player", P)), audio.playShoot();
        }
      }
    }
    const ENEMY_STYLE = {
      basic: { paint: "black", label: "RAIDER", plate: "#ef4444" },
      fast: { paint: "brown", label: "SCOUT", plate: "#f97316" },
      heavy: { paint: "camo", label: "HEAVY", plate: "#eab308" },
      boss: { paint: "titan", label: "TITAN", plate: "#dc2626" }
    };
    class EnemyTankEntity {
      constructor(spawnPos, type = "basic") {
        this.type = type, this.isBoss = type === "boss";
        const style = ENEMY_STYLE[type] || ENEMY_STYLE.basic;
        let scale = 1;
        this.hp = 1, this.maxHp = 1, this.speed = ENEMY_SPEED, this.shootInterval = 1.55, type === "fast" ? (this.speed = ENEMY_SPEED * 1.4, this.shootInterval = 1) : type === "heavy" ? (this.hp = 3, this.maxHp = 3, this.speed = ENEMY_SPEED * 0.72, this.shootInterval = 1.25) : type === "boss" && (scale = 1.75, this.hp = 25 + Math.min(40, currentWave * 5), this.maxHp = this.hp, this.speed = ENEMY_SPEED * 0.42, this.shootInterval = 1), this.scale = scale, this.mesh = new THREE.Group(), this.mesh.position.copy(spawnPos), this.body = createTankMesh(PAINTS[style.paint], scale, !0), this.mesh.add(this.body), this.baseScale = this.body.scale.x, this.turret = this.body.userData.turret || null, this.paintMats = this.body.userData.paintMats || [], this.ring = createTeamRing(16723245, 1.1 * scale), this.mesh.add(this.ring), this.iceShell = createIceShell(scale), this.mesh.add(this.iceShell), this.nameplate = createNameplate(style.label, style.plate, "enemy"), this.isBoss && (this.nameplate.userData.extraMul = 1.4), this.nameplate.position.y = 1.75 * scale + 0.1, this.mesh.add(this.nameplate), scene.add(this.mesh), this.radius = 0.8 * scale, this.wallR = this.isBoss ? 0.9 : this.radius, this.rotationAngle = Math.PI, this.body.rotation.y = this.rotationAngle, this.stuckT = 0, this.stuckRef = spawnPos.clone(), this.lastShotTime = performance.now() / 1e3, this.changeDirTimer = 0, this.swarmOffset = (Math.random() - 0.5) * 0.6, this.vel = new THREE.Vector3(), this.playerObj = null, this.hitFlash = 0, this.flashOn = !1, this.dustT = 0, this.flash = this.body.getObjectByName("muzzleFlash"), this.flashTimer = 0, this.spawnT = 0.6, this.body.scale.setScalar(this.baseScale * 0.01), fxBursts.push(new RingPulse(spawnPos, 16726843, { from: 2.6, to: 0.3, life: 0.6 })), fxBursts.push(new RingPulse(spawnPos, 16757940, { from: 0.2, to: 2.2, life: 0.6, width: 0.3 })), audio.playEnemySpawn(), updateNameplate(this.nameplate, this.hp, this.maxHp);
      }
      findTargetPosition() {
        let closest = null, minD = this.isBoss ? 30 : 22;
        return activePlayers.forEach((p) => {
          if (p.tank && p.hp > 0) {
            const d = this.mesh.position.distanceTo(p.tank.mesh.position);
            d < minD && (minD = d, closest = p.tank.mesh.position);
          }
        }), closest || gridToWorld(EAGLE_C, EAGLE_R);
      }
      setHitLook(on) {
        on !== this.flashOn && (this.flashOn = on, this.paintMats.forEach((m) => {
          m.emissive.setRGB(on ? 1 : 0, on ? 0.85 : 0, on ? 0.7 : 0), m.emissiveIntensity = on ? 0.8 : 1;
        }));
      }
      update(delta, nowSec) {
        if (this.ring.material.opacity = 0.5 + Math.sin(nowSec * 6 + this.swarmOffset * 10) * 0.18, this.spawnT > 0) {
          this.spawnT -= delta;
          const k = 1 - Math.max(0, this.spawnT) / 0.6;
          this.body.scale.setScalar(this.baseScale * Math.max(0.01, easeOutBack(k))), this.spawnT <= 0 && this.body.scale.setScalar(this.baseScale), updateNameplate(this.nameplate, this.hp, this.maxHp);
          return;
        }
        if (this.hitFlash > 0 && (this.hitFlash -= delta), this.setHitLook(this.hitFlash > 0), this.flash && (this.flashTimer -= delta, this.flash.visible = this.flashTimer > 0), this.iceShell.visible = freezeTimer > 0, freezeTimer > 0) {
          this.iceShell.rotation.y += delta * 0.6, updateNameplate(this.nameplate, this.hp, this.maxHp), this.hp <= 0 && (this.pendingDestroy = !0);
          return;
        }
        if (unstick(this, this.wallR), this.stuckT += delta, this.stuckT > 1.4) {
          if (this.mesh.position.distanceTo(this.stuckRef) < 0.35) {
            const opts = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((a) => !checkWallCollision(this.mesh.position.clone().add(new THREE.Vector3(Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2)), this.wallR, this.isBoss));
            opts.length && (this.rotationAngle = opts[Math.floor(Math.random() * opts.length)], this.changeDirTimer = 1.2 + Math.random());
          }
          this.stuckT = 0, this.stuckRef.copy(this.mesh.position);
        }
        if (this.changeDirTimer -= delta, this.changeDirTimer <= 0) {
          this.changeDirTimer = 0.55 + Math.random() * 0.9;
          const diff = this.findTargetPosition().clone().sub(this.mesh.position), primaryAngle = Math.atan2(diff.x, diff.z) + this.swarmOffset, candidateAngles = [primaryAngle, primaryAngle + Math.PI / 2, primaryAngle - Math.PI / 2, primaryAngle + Math.PI];
          let chosenAngle = primaryAngle;
          for (let angle of candidateAngles) {
            const snapAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2), testPos = this.mesh.position.clone().add(new THREE.Vector3(Math.sin(snapAngle) * 1.5, 0, Math.cos(snapAngle) * 1.5));
            if (!checkWallCollision(testPos, this.wallR, this.isBoss)) {
              chosenAngle = snapAngle;
              break;
            }
          }
          this.rotationAngle = chosenAngle;
        }
        let dyaw = this.rotationAngle - this.body.rotation.y;
        for (; dyaw > Math.PI; ) dyaw -= Math.PI * 2;
        for (; dyaw < -Math.PI; ) dyaw += Math.PI * 2;
        this.body.rotation.y += dyaw * Math.min(1, delta * 14), this.vel.set(Math.sin(this.rotationAngle) * this.speed, 0, Math.cos(this.rotationAngle) * this.speed), applySurfaceMotion(this, delta);
        const newPos = this.mesh.position.clone().add(this.vel.clone().multiplyScalar(delta)), lane = tileAtWorld(newPos), laneC = gridToWorld(lane.col, lane.row);
        Math.abs(Math.sin(this.rotationAngle)) > 0.5 ? newPos.z += (laneC.z - newPos.z) * Math.min(1, delta * 4) : newPos.x += (laneC.x - newPos.x) * Math.min(1, delta * 4), this.isBoss && crushBricksAt(newPos, this.wallR + 0.15), !checkWallCollision(newPos, this.wallR) && !checkTankOverlap(newPos, this.radius, this) ? (this.mesh.position.copy(newPos), this.body.traverse((c) => {
          c.userData && c.userData.spin && (c.rotation.x += this.speed * delta * 2.5);
        }), this.dustT -= delta, this.dustT <= 0 && (this.dustT = 0.16, spawnDust(this.mesh.position.clone().add(new THREE.Vector3(-Math.sin(this.rotationAngle), 0, -Math.cos(this.rotationAngle)).multiplyScalar(0.9 * this.scale)), 14734523, 0.22 * this.scale))) : this.changeDirTimer = 0, nowSec - this.lastShotTime >= this.shootInterval && (this.shoot(), this.lastShotTime = nowSec), updateNameplate(this.nameplate, this.hp, this.maxHp), this.hp <= 0 && (this.pendingDestroy = !0);
      }
      shoot() {
        let dir = new THREE.Vector3(Math.sin(this.rotationAngle), 0, Math.cos(this.rotationAngle));
        if (this.isBoss) {
          const d = this.findTargetPosition().clone().sub(this.mesh.position);
          d.y = 0, d.lengthSq() > 0.01 && (dir = d.normalize()), this.turret && this.turret !== this.body && (this.turret.rotation.y = Math.atan2(dir.x, dir.z) - this.body.rotation.y);
        }
        if (this.flashTimer = 0.07, audio.playEnemyShoot(), this.isBoss)
          for (let angleOffset of [-0.25, 0, 0.25]) {
            const bDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset), spawnPos = this.mesh.position.clone().add(bDir.clone().multiplyScalar(2));
            spawnPos.y = 0.9, bullets.push(new Bullet(spawnPos, bDir, "enemy", null));
          }
        else {
          const spawnPos = this.mesh.position.clone().add(dir.clone().multiplyScalar(1.2));
          spawnPos.y = 0.7, bullets.push(new Bullet(spawnPos, dir, "enemy", null));
        }
      }
      destroy() {
        scene.remove(this.mesh), disposeNameplate(this.nameplate);
        const p = this.mesh.position.clone();
        p.y = 0.6, createExplosionVFX(p, this.isBoss ? 16720384 : 16738877, this.isBoss ? 40 : 16), createDebris(p, this.type === "basic" ? [1842464, 3816772] : this.type === "fast" ? [4007445, 6044194] : [4938275, 7032620, 2898459], this.isBoss ? 18 : 7), fxBursts.push(new RingPulse(p, 16752704, { from: 0.4, to: this.isBoss ? 7 : 3.4, life: 0.45 })), spawnScorch(p, this.isBoss ? 2.8 : 1.5);
      }
    }
    const BGEO = { core: new THREE.SphereGeometry(0.17, 10, 8), halo: new THREE.SphereGeometry(0.36, 10, 8), trail: new THREE.CylinderGeometry(0.07, 0.01, 1.1, 6) };
    class Bullet {
      constructor(pos, dir, ownerType, ownerPlayer) {
        this.ownerType = ownerType, this.ownerPlayer = ownerPlayer, this.dir = dir.clone().normalize();
        const isP = ownerType === "player";
        this.mesh = new THREE.Mesh(BGEO.core, isP ? materials.bulletPlayer : materials.bulletEnemy), this.mesh.position.copy(pos), scene.add(this.mesh), this.mesh.add(new THREE.Mesh(BGEO.halo, isP ? materials.haloPlayer : materials.haloEnemy));
        const trail = new THREE.Mesh(BGEO.trail, isP ? materials.trailPlayer : materials.trailEnemy);
        trail.rotation.x = Math.PI / 2, trail.position.z = -0.6, this.mesh.add(trail), this.active = !0, this.radius = 0.2;
      }
      update(delta) {
        if (!this.active) return;
        this.mesh.position.add(this.dir.clone().multiplyScalar(BULLET_SPEED * delta)), this.mesh.lookAt(this.mesh.position.clone().add(this.dir));
        const pos = this.mesh.position, { col, row, type } = tileAtWorld(pos);
        if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
          this.destroy();
          return;
        }
        if (type === 1) {
          destroyBrick(col, row), this.destroy();
          return;
        }
        if (type === 2) {
          audio.playSteelPing(), createSparks(pos, 16773544, 6), this.destroy();
          return;
        }
        if (type === 5) {
          damageBase(22), createSparks(pos, 16765286, 8), this.destroy();
          return;
        }
        if (type === 8) {
          explodeBarrel(col, row), this.destroy();
          return;
        }
        if (this.ownerType === "player")
          for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (pos.distanceTo(enemy.mesh.position) < this.radius + enemy.radius) {
              enemy.hp -= 1, enemy.hitFlash = 0.1, enemy.isBoss && updateBossHP(enemy.hp), enemy.hp <= 0 ? (creditKill(enemy, this.ownerPlayer), enemies.splice(i, 1)) : (audio.playHit(), createSparks(pos, 16769162, 6)), this.destroy();
              return;
            }
          }
        else
          for (const p of activePlayers.values())
            if (p.tank && p.hp > 0 && pos.distanceTo(p.tank.mesh.position) < this.radius + p.tank.radius) {
              p.shieldTimer <= 0 ? damagePlayer(p, 25) : (createSparks(pos, 6809849, 8), audio.playSteelPing()), this.destroy();
              return;
            }
      }
      destroy() {
        this.active = !1, scene.remove(this.mesh);
      }
    }
    class PowerUpEntity {
      constructor(pos, typeObj) {
        this.type = typeObj, this.mesh = new THREE.Group(), this.mesh.position.set(pos.x, 0, pos.z), this.mats = [];
        const core = new THREE.Mesh(G("puCore", () => new THREE.OctahedronGeometry(0.62, 0)), std(typeObj.color, { emissive: typeObj.color, ei: 0.85, metal: 0.3, rough: 0.25 }));
        core.position.y = 1.15, core.castShadow = !0, this.core = core, this.mesh.add(core), this.mats.push(core.material);
        const cageMat = new THREE.MeshBasicMaterial({ color: C(typeObj.color), wireframe: !0, transparent: !0, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: !1 });
        this.cage = new THREE.Mesh(G("puCage", () => new THREE.IcosahedronGeometry(1, 0)), cageMat), this.cage.position.y = 1.15, this.mesh.add(this.cage), this.mats.push(cageMat), this.groundRing = new THREE.Mesh(G("puRing", () => new THREE.RingGeometry(0.95, 1.3, 40)), glowMat(typeObj.color, 0.85)), this.groundRing.rotation.x = -Math.PI / 2, this.groundRing.position.y = 0.07, this.mesh.add(this.groundRing), this.mats.push(this.groundRing.material);
        const disc = new THREE.Mesh(G("puDisc", () => new THREE.CircleGeometry(0.95, 32)), glowMat(typeObj.color, 0.25));
        disc.rotation.x = -Math.PI / 2, disc.position.y = 0.06, this.mesh.add(disc), this.mats.push(disc.material), this.beam = new THREE.Mesh(G("puBeam", () => new THREE.CylinderGeometry(0.3, 0.7, 9, 18, 1, !0)), glowMat(typeObj.color, 0.22)), this.beam.material.side = THREE.DoubleSide, this.beam.position.y = 4.5, this.mesh.add(this.beam), this.mats.push(this.beam.material), this.icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: powerIconTexture(typeObj), transparent: !0, depthTest: !1, depthWrite: !1 })), this.icon.center.set(0.5, 0), this.icon.renderOrder = 900, this.icon.position.y = 2.1, this.mesh.add(this.icon), this.mats.push(this.icon.material), scene.add(this.mesh), this.radius = 1.15, this.life = 15, this.age = 0, this.pulseT = 0, fxBursts.push(new RingPulse(pos, typeObj.color, { from: 0.3, to: 4.5, life: 0.7 })), audio.playPowerupSpawn();
      }
      update(delta) {
        this.age += delta, this.life -= delta;
        const pop = Math.min(1, this.age / 0.4);
        this.mesh.scale.setScalar(Math.max(0.01, easeOutBack(pop))), this.core.rotation.y += delta * 2.5, this.core.position.y = 1.15 + Math.sin(this.age * 4) * 0.18, this.cage.rotation.y -= delta * 1.2, this.cage.rotation.x += delta * 0.7, this.cage.position.y = this.core.position.y, this.groundRing.scale.setScalar(1 + Math.sin(this.age * 5) * 0.12), this.beam.material.opacity = 0.16 + Math.sin(this.age * 6) * 0.07;
        const h = PLATE_UNIT * 1.45;
        return this.icon.scale.set(h * 0.8, h, 1), this.icon.position.y = 2.1 + Math.sin(this.age * 4) * 0.15, this.pulseT -= delta, this.pulseT <= 0 && (this.pulseT = 1.1, fxBursts.push(new RingPulse(this.mesh.position, this.type.color, { from: 0.9, to: 2.8, life: 0.9, opacity: 0.6 }))), this.mesh.visible = this.life > 4 || Math.floor(this.life * 8) % 2 === 0, this.life > 0;
      }
      destroy() {
        scene.remove(this.mesh), this.mats.forEach((m) => m.dispose());
      }
    }
    function spawnPowerup(pos) {
      powerups.push(new PowerUpEntity(pos, POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]));
    }
    function triggerPowerup(playerObj, typeObj) {
      audio.playPowerup(), showPowerupBanner(typeObj.icon, typeObj.msg, typeObj.css), audio.say(typeObj.voice, { priority: !0 }), playerObj.conn && playerObj.conn.send && playerObj.conn.send({ type: "powerup_acquired", icon: typeObj.icon, msg: typeObj.msg });
      const ppos = playerObj.tank ? playerObj.tank.mesh.position : gridToWorld(EAGLE_C, EAGLE_R);
      fxBursts.push(new RingPulse(ppos, typeObj.color, { from: 0.5, to: 5, life: 0.6 })), createSparks(new THREE.Vector3(ppos.x, 1, ppos.z), typeObj.color, 16), typeObj.id === "star" ? playerObj.starTimer = 12 : typeObj.id === "laser" ? playerObj.laserTimer = 10 : typeObj.id === "shield" ? (playerObj.shieldTimer = 10, audio.playShieldUp()) : typeObj.id === "nuke" ? (audio.playNuke(), screenFlash("white"), shakeAmp = Math.max(shakeAmp, 1.1), fxBursts.push(new RingPulse(ppos, 16777215, { from: 0.5, to: 60, life: 0.9, width: 0.06 })), enemies.forEach((e) => {
        e.destroy(), totalKills++, waveKills++, score += 100;
      }), enemies.length = 0, bossRef = null, document.getElementById("boss-hp-container").classList.add("hidden")) : typeObj.id === "shovel" ? (activateBaseFortify(), audio.playFortify()) : typeObj.id === "clock" ? (freezeTimer = 8, audio.playFreeze()) : typeObj.id === "medkit" && (playerObj.hp = 100, audio.playRepair()), updateHUD();
    }
    const FORTIFY = [[12, 15], [12, 16], [12, 17], [12, 18], [12, 19], [12, 20], [12, 21], [13, 15], [13, 16], [13, 17], [13, 19], [13, 20], [13, 21]];
    let fortifyPending = [];
    function activateBaseFortify() {
      fortifyTimer = 15, fortifyPending = [], FORTIFY.forEach(([r, c]) => {
        cellOccupied(c, r) ? fortifyPending.push([r, c]) : mapGrid[r][c] = 2;
      }), buildMap();
      const ep = gridToWorld(EAGLE_C, EAGLE_R);
      fxBursts.push(new RingPulse(ep, 14870768, { from: 0.5, to: 7, life: 0.7 }));
    }
    function retryFortify() {
      if (!fortifyPending.length) return;
      const still = [];
      fortifyPending.forEach(([r, c]) => {
        cellOccupied(c, r) ? still.push([r, c]) : mapGrid[r][c] = 2;
      }), still.length !== fortifyPending.length && buildMap(), fortifyPending = still;
    }
    function deactivateBaseFortify() {
      fortifyPending = [], FORTIFY.forEach(([r, c]) => {
        mapGrid[r][c] = cellOccupied(c, r) ? 0 : 1;
      }), buildMap();
    }
    let bannerTimer = null;
    function showPowerupBanner(icon, text, css) {
      const banner = document.getElementById("powerup-banner");
      document.getElementById("powerup-icon").innerText = icon || "", document.getElementById("powerup-msg").innerText = text, banner.style.backgroundColor = css || "#facc15", banner.classList.remove("scale-0"), banner.classList.add("scale-100"), clearTimeout(bannerTimer), bannerTimer = setTimeout(() => {
        banner.classList.remove("scale-100"), banner.classList.add("scale-0");
      }, 2500);
    }
    function damagePlayer(playerObj, amount) {
      if (!(playerObj.hp <= 0 || gameState !== "PLAYING")) {
        if (playerObj.hp = Math.max(0, playerObj.hp - amount), audio.playHit(), playerObj.conn && playerObj.conn.send && playerObj.conn.send({ type: "hit_vibrate" }), shakeAmp = Math.max(shakeAmp, 0.22), playerObj.tank && amount >= 5 && createSparks(new THREE.Vector3(playerObj.tank.mesh.position.x, 0.9, playerObj.tank.mesh.position.z), 16757575, 8), playerObj.hp <= 0) {
          playerObj.lives -= 1;
          const palette = PLAYER_PALETTE[playerObj.slotIndex % PLAYER_PALETTE.length];
          playerObj.tank && (createDeathExplosion(playerObj.tank.mesh.position.clone(), palette.hex), playerObj.tank.mesh.visible = !1), audio.playExplosion(!0), audio.playPlayerDown(), sendTo(playerObj, { type: "sfx", s: "die", text: playerObj.lives > 0 ? "\u{1F4A5} TANK DOWN \xB7 ".concat(playerObj.lives, " \u2665 LEFT") : "\u2620 OUT OF LIVES" }), playerObj.lives > 0 ? (audio.say("".concat(playerObj.name.replace(/\(.*\)/, "").trim() || "Pilot", " down!"), { key: "pilotdown", cooldown: 2 }), setTimeout(() => {
            gameState === "PLAYING" && (playerObj.hp = 100, playerObj.tank && (playerObj.tank.resetPosition(), playerObj.tank.mesh.visible = !0), sendTo(playerObj, { type: "sfx", s: "respawn" }));
          }, 1800)) : (audio.say("Pilot eliminated!", { priority: !0 }), [...activePlayers.values()].some((p) => p.lives > 0) || triggerGameOver(!1, "ALL PILOTS DOWN"));
        }
        updateHUD();
      }
    }
    function damageBase(amount) {
      if (gameState !== "PLAYING") return;
      baseHp = Math.max(0, baseHp - amount), audio.playHit(), audio.playBaseHit(), updateHUD(), eagleFlash = 0.35, screenFlash("red"), shakeAmp = Math.max(shakeAmp, 0.35), (!damageBase._t || performance.now() - damageBase._t > 2500) && (damageBase._t = performance.now(), broadcastToControllers({ type: "sfx", s: "base" }));
      const ep = gridToWorld(EAGLE_C, EAGLE_R);
      fxBursts.push(new RingPulse(ep, 16726843, { from: 0.6, to: 4.5, life: 0.5 }));
      const box = document.getElementById("base-box");
      if (box.classList.remove("base-alarm"), box.offsetWidth, box.classList.add("base-alarm"), box.classList.toggle("base-critical", baseHp > 0 && baseHp <= 34), baseHp > 0 && audio.say(baseHp <= 34 ? "Base critical!" : "Base under attack!", { key: "base", cooldown: 6, priority: !0 }), baseHp <= 0) {
        if (eagleMesh) {
          const p = eagleMesh.position.clone();
          p.y = 1, createExplosionVFX(p, 16720384, 45), createExplosionVFX(p, 16765286, 25), createDebris(p, [16167178, 13072904, 16317180, 3884630], 22), fxBursts.push(new RingPulse(p, 16752704, { from: 0.5, to: 12, life: 0.8 })), spawnScorch(p, 3.2), eagleMesh.visible = !1, eagleAura && (eagleAura.visible = !1);
        }
        audio.playExplosion(!0), shakeAmp = 1.4, triggerGameOver(!1);
      }
    }
    function updateBossHP(hp) {
      const maxHp = bossRef ? bossRef.maxHp : 25 + Math.min(40, currentWave * 5);
      document.getElementById("boss-hp-bar").style.width = "".concat(Math.max(0, hp / maxHp * 100), "%");
    }
    function destroyBrick(col, row) {
      mapGrid[row][col] = 0;
      const bMesh = tileMeshes.get("".concat(col, ",").concat(row));
      bMesh && (scene.remove(bMesh), tileMeshes.delete("".concat(col, ",").concat(row)));
      const pos = gridToWorld(col, row);
      pos.y = 0.7, createDebris(pos, [13132858, 10636587, 14715487], 9);
      for (let i = 0; i < 3; i++) addParticle(particles, pos.clone().add(rv(1, 0.5, 1)), 11569770, 0.45, rv(2, 2, 2, 0.6), { kind: "smoke", opacity: 0.5 });
      audio.playBrick();
    }
    function explodeBarrel(col, row) {
      if (mapGrid[row][col] !== 8) return;
      mapGrid[row][col] = 0;
      const mesh = tileMeshes.get("".concat(col, ",").concat(row));
      mesh && (scene.remove(mesh), tileMeshes.delete("".concat(col, ",").concat(row)));
      const pos = gridToWorld(col, row);
      pos.y = 0.5, createExplosionVFX(pos, 16486972, 30), audio.playExplosion(!0), shakeAmp = Math.max(shakeAmp, 0.55), fxBursts.push(new RingPulse(pos, 16747578, { from: 0.4, to: 5.5, life: 0.5 })), spawnScorch(pos, 2.2);
      const blastR = 2.6;
      enemies.slice().forEach((e) => {
        e.mesh.position.distanceTo(pos) < blastR + e.radius && (e.hp -= 3);
      }), activePlayers.forEach((p) => {
        p.tank && p.hp > 0 && p.tank.mesh.position.distanceTo(pos) < blastR && p.shieldTimer <= 0 && damagePlayer(p, 35);
      });
      for (let rr = row - 1; rr <= row + 1; rr++) for (let cc = col - 1; cc <= col + 1; cc++)
        rr >= 0 && rr < MAP_ROWS && cc >= 0 && cc < MAP_COLS && mapGrid[rr][cc] === 1 && destroyBrick(cc, rr), rr >= 0 && rr < MAP_ROWS && cc >= 0 && cc < MAP_COLS && mapGrid[rr][cc] === 8 && !(rr === row && cc === col) && explodeBarrel(cc, rr);
    }
    const isFortCell = (c, r) => r >= 11 && c >= 15 && c <= 21;
    function crushBricksAt(pos, radius) {
      const minC = Math.floor((pos.x - radius + MAP_OFFSET_X + CELL_SIZE / 2) / CELL_SIZE), maxC = Math.floor((pos.x + radius + MAP_OFFSET_X + CELL_SIZE / 2) / CELL_SIZE), minR = Math.floor((pos.z - radius + MAP_OFFSET_Z + CELL_SIZE / 2) / CELL_SIZE), maxR = Math.floor((pos.z + radius + MAP_OFFSET_Z + CELL_SIZE / 2) / CELL_SIZE);
      for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++)
        r > 0 && r < MAP_ROWS - 1 && c > 0 && c < MAP_COLS - 1 && mapGrid[r][c] === 1 && !isFortCell(c, r) && (destroyBrick(c, r), shakeAmp = Math.max(shakeAmp, 0.3));
    }
    function unstick(entity, radius) {
      const pos = entity.mesh.position;
      if (!checkWallCollision(pos, radius)) return;
      const t = tileAtWorld(pos);
      let best = null, bestD = 1e9;
      for (let ring = 0; ring <= 4 && !best; ring++)
        for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const c = t.col + dc, r = t.row + dr;
          if (r < 1 || r >= MAP_ROWS - 1 || c < 1 || c >= MAP_COLS - 1) continue;
          const w = gridToWorld(c, r);
          if (checkWallCollision(w, Math.min(radius, 0.95))) continue;
          const d = w.distanceTo(pos);
          d < bestD && (bestD = d, best = w);
        }
      best && (pos.x = best.x, pos.z = best.z, entity.vel && entity.vel.set(0, 0, 0));
    }
    function cellOccupied(c, r) {
      const w = gridToWorld(c, r), half = CELL_SIZE / 2, hit = (p, rad) => Math.abs(p.x - w.x) < half + rad && Math.abs(p.z - w.z) < half + rad;
      for (const p of activePlayers.values()) if (p.tank && p.hp > 0 && hit(p.tank.mesh.position, p.tank.radius * 0.9)) return !0;
      for (const e of enemies) if (hit(e.mesh.position, e.radius * 0.9)) return !0;
      return !1;
    }
    function checkWallCollision(pos, radius, ignoreCrushable) {
      const minC = Math.floor((pos.x - radius + MAP_OFFSET_X + CELL_SIZE / 2) / CELL_SIZE), maxC = Math.floor((pos.x + radius + MAP_OFFSET_X + CELL_SIZE / 2) / CELL_SIZE), minR = Math.floor((pos.z - radius + MAP_OFFSET_Z + CELL_SIZE / 2) / CELL_SIZE), maxR = Math.floor((pos.z + radius + MAP_OFFSET_Z + CELL_SIZE / 2) / CELL_SIZE);
      for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
        if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return !0;
        const tile = mapGrid[r][c];
        if (!(tile === 1 && ignoreCrushable && !isFortCell(c, r)) && (tile === 1 || tile === 2 || tile === 3 || tile === 5 || tile === 8))
          return !0;
      }
      return !1;
    }
    function checkTankOverlap(pos, radius, self) {
      if (!!(self && self.playerObj)) {
        for (const p of activePlayers.values())
          if (p.tank && p.hp > 0 && p.tank !== self && pos.distanceTo(p.tank.mesh.position) < radius + p.tank.radius * 0.85) return !0;
        return !1;
      }
      for (const e of enemies)
        if (e !== self && pos.distanceTo(e.mesh.position) < radius + e.radius * 0.8) return !0;
      return !1;
    }
    function createDeathExplosion(pos, colorHex) {
      shakeAmp = Math.max(shakeAmp, 0.85), createExplosionVFX(pos, colorHex, 28), createExplosionVFX(pos, 16774502, 18, { noLight: !0 }), createExplosionVFX(pos, 16723285, 16, { noLight: !0 }), createDebris(pos, [colorHex, 1777446, 5989747], 12), spawnScorch(pos, 2), fxBursts.push(new DeathBurst(pos, colorHex));
    }
    class DeathBurst {
      constructor(pos, colorHex) {
        this.life = 1.15, this.max = 1.15, this.ball = new THREE.Mesh(G("dbBall", () => new THREE.SphereGeometry(0.4, 14, 14)), new THREE.MeshBasicMaterial({ color: C(16775086), transparent: !0, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: !1 })), this.ball.position.copy(pos), this.ball.position.y += 0.5, scene.add(this.ball), this.ring = new THREE.Mesh(G("dbRing", () => new THREE.TorusGeometry(0.5, 0.08, 8, 24)), new THREE.MeshBasicMaterial({ color: C(colorHex), transparent: !0, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: !1 })), this.ring.rotation.x = Math.PI / 2, this.ring.position.copy(pos), this.ring.position.y += 0.2, scene.add(this.ring), flashLight(pos, colorHex, 5, 1, 14);
      }
      update(delta) {
        this.life -= delta;
        const k = 1 - this.life / this.max;
        return this.ball.scale.setScalar(1 + k * 6), this.ball.material.opacity = Math.max(0, this.life / this.max), this.ring.scale.setScalar(1 + k * 8), this.ring.material.opacity = Math.max(0, 0.9 - k), this.life > 0;
      }
      destroy() {
        scene.remove(this.ball), scene.remove(this.ring), this.ball.material.dispose(), this.ring.material.dispose();
      }
    }
    const COMBO_CALLS = { 3: "Triple kill!", 5: "Rampage!", 8: "Unstoppable!", 12: "Godlike!" };
    function creditKill(enemy, ownerPlayer) {
      enemy.isBoss && (bossRef = null, document.getElementById("boss-hp-container").classList.add("hidden"), score += 1e3, spawnPowerup(enemy.mesh.position), audio.say("Titan destroyed!", { priority: !0 }), screenFlash("white")), Math.random() < 0.35 && !enemy.isBoss && spawnPowerup(enemy.mesh.position), enemy.destroy(), ownerPlayer && (ownerPlayer.kills += 1, sendTo(ownerPlayer, { type: "sfx", s: "kill" }), ownerPlayer.combo += 1, ownerPlayer.comboTimer = 3.2, score += ownerPlayer.combo > 1 ? ownerPlayer.combo * 15 : 0, COMBO_CALLS[ownerPlayer.combo] && audio.say(COMBO_CALLS[ownerPlayer.combo], { key: "combo", cooldown: 1.5 })), totalKills++, waveKills++, score += enemy.type === "fast" ? 150 : enemy.type === "heavy" ? 250 : 100, audio.playExplosion(enemy.isBoss), shakeAmp = Math.max(shakeAmp, enemy.isBoss ? 0.9 : 0.3);
    }
    function fireLaser(origin, dir, ownerPlayer) {
      audio.playLaser();
      const step = 0.45;
      let dist = 0, hitDist = 28, hits = 0;
      origin.y = 0.75;
      const cursor = origin.clone();
      for (let i = 0; i < 70; i++) {
        cursor.add(dir.clone().multiplyScalar(step)), dist += step;
        const { col, row, type } = tileAtWorld(cursor);
        if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS || type === 2) {
          hitDist = dist, createSparks(cursor, 16743129, 6);
          break;
        }
        if (type === 1 && destroyBrick(col, row), type === 8 && explodeBarrel(col, row), type === 5) {
          damageBase(18), hitDist = dist;
          break;
        }
        for (let e = enemies.length - 1; e >= 0; e--) {
          const enemy = enemies[e];
          if (cursor.distanceTo(enemy.mesh.position) < enemy.radius + 0.35 && (enemy.hp -= 2, enemy.hitFlash = 0.12, enemy.isBoss && updateBossHP(enemy.hp), enemy.hp <= 0 ? (creditKill(enemy, ownerPlayer), enemies.splice(e, 1)) : audio.playHit(), hits++, hits >= 4)) {
            hitDist = dist, i = 999;
            break;
          }
        }
      }
      lasers.push(new LaserBeam(origin, dir, hitDist));
    }
    class LaserBeam {
      constructor(origin, dir, length) {
        const geo = new THREE.CylinderGeometry(0.14, 0.05, Math.max(0.4, length), 8);
        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C(16727212), transparent: !0, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: !1 })), this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), this.mesh.position.copy(origin).add(dir.clone().multiplyScalar(length / 2));
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.12, Math.max(0.4, length), 8), new THREE.MeshBasicMaterial({ color: C(6809849), transparent: !0, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: !1 }));
        this.mesh.add(glow), scene.add(this.mesh), this.life = 0.18;
      }
      update(delta) {
        return this.life -= delta, this.mesh.material.opacity = Math.max(0, this.life / 0.18), this.mesh.scale.x = this.mesh.scale.z = 0.6 + this.life * 3, this.life > 0;
      }
      destroy() {
        scene.remove(this.mesh), this.mesh.geometry.dispose(), this.mesh.children[0].geometry.dispose();
      }
    }
    function spawnPlayerTank(p) {
      p.tank && p.tank.dispose(), p.hp = 100, p.tank = new PlayerTankEntity(p);
    }
    function updateHUD() {
      document.getElementById("base-hp-text").innerText = "".concat(Math.round(baseHp), "%");
      const bar = document.getElementById("base-hp-bar");
      bar.style.width = "".concat(baseHp, "%"), bar.className = "h-full transition-all duration-200 bg-gradient-to-r ".concat(baseHp > 50 ? "from-blue-600 to-cyan-400" : baseHp > 25 ? "from-yellow-600 to-yellow-300" : "from-red-700 to-red-400"), document.getElementById("score-text").innerText = score.toString().padStart(4, "0"), document.getElementById("enemy-count").innerText = enemies.length, document.getElementById("wave-title").innerText = "WAVE ".concat(currentWave), comboDisplay = Math.max(0, ...[...activePlayers.values()].map((p) => p.combo)), document.getElementById("combo-count").innerText = comboDisplay;
      const mins = Math.floor(gameTime / 60).toString().padStart(2, "0"), secs = Math.floor(gameTime % 60).toString().padStart(2, "0");
      document.getElementById("timer").innerText = "".concat(mins, ":").concat(secs);
      const playerHudContainer = document.getElementById("players-hud-bar"), hudKey = [...activePlayers.values()].map((p) => [p.id, p.name, p.slotIndex, Math.ceil(p.hp), p.lives, p.connected, p.starTimer > 0, p.laserTimer > 0, p.shieldTimer > 0].join(",")).join("|");
      playerHudContainer._key !== hudKey && (playerHudContainer._key = hudKey, playerHudContainer.innerHTML = "", activePlayers.forEach((p) => {
        const palette = PLAYER_PALETTE[p.slotIndex % PLAYER_PALETTE.length];
        let pwrIcons = "";
        p.starTimer > 0 && (pwrIcons += "\u{1F31F}"), p.laserTimer > 0 && (pwrIcons += "\u{1F526}"), p.shieldTimer > 0 && (pwrIcons += "\u{1F6E1}\uFE0F");
        const badge = document.createElement("div");
        badge.className = "bg-gray-900/90 backdrop-blur border-2 rounded-lg px-2.5 py-2 flex items-center gap-2 min-w-[190px]", badge.style.borderColor = palette.css, !p.connected && !p.isHost && (badge.style.opacity = "0.55"), badge.innerHTML = '<img src="'.concat(tankThumb(p.slotIndex), '" class="w-10 h-8" alt=""><div class="flex-1"><div class="text-[11px] font-bold text-white flex justify-between items-center gap-2"><span>').concat(p.name, " ").concat(!p.connected && !p.isHost ? "\u{1F4E1}" : "").concat(pwrIcons, '</span><span class="text-yellow-400">').concat("\u2665".repeat(Math.max(0, p.lives)), '</span></div><div class="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden mt-1.5 border border-gray-600"><div class="').concat(p.hp > 35 ? palette.tailwind : "bg-red-500", ' h-full" style="width:').concat(Math.max(0, p.hp), '%"></div></div></div>'), playerHudContainer.appendChild(badge);
      }));
    }
    const thumbCache = /* @__PURE__ */ new Map();
    let thumbRig = null;
    function tankThumb(slot) {
      if (slot = slot % 7, thumbCache.has(slot)) return thumbCache.get(slot);
      try {
        if (!thumbRig) {
          const r = new THREE.WebGLRenderer({ antialias: !0, alpha: !0, preserveDrawingBuffer: !0 });
          r.setSize(144, 108), r.setPixelRatio(1), r.outputEncoding = THREE.sRGBEncoding;
          const sc = new THREE.Scene();
          sc.add(new THREE.HemisphereLight(C(16777215), C(4478310), 0.9));
          const dl = new THREE.DirectionalLight(16777215, 0.9);
          dl.position.set(-3, 6, 4), sc.add(dl);
          const cam = new THREE.PerspectiveCamera(30, 144 / 108, 0.1, 50);
          cam.position.set(3.2, 3, 4.2), cam.lookAt(0, 0.55, 0), thumbRig = { r, sc, cam };
        }
        const t = createTankMesh({ color: PLAYER_PALETTE[slot].hex, rough: 0.36, metal: 0.25 });
        t.rotation.y = 0.5, thumbRig.sc.add(t), thumbRig.r.render(thumbRig.sc, thumbRig.cam);
        const url = thumbRig.r.domElement.toDataURL("image/png");
        return thumbRig.sc.remove(t), thumbCache.set(slot, url), url;
      } catch {
        return "";
      }
    }
    const squad = { renderer: null, scene: null, cam: null, units: /* @__PURE__ */ new Map(), ready: !1 }, FORMATION = [[0, 1.2], [-2.7, -0.4], [2.7, -0.4], [-5.4, -2], [5.4, -2], [-8.1, -3.6], [8.1, -3.6]];
    function initSquad() {
      if (squad.ready) return;
      const cv = document.getElementById("squad-canvas");
      try {
        squad.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !0, alpha: !0 });
      } catch {
        return;
      }
      squad.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)), squad.renderer.outputEncoding = THREE.sRGBEncoding, squad.renderer.shadowMap.enabled = !0;
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(C(15003391), C(2764602), 0.75));
      const dl = new THREE.DirectionalLight(C(16773596), 0.9);
      dl.position.set(-6, 12, 8), dl.castShadow = !0, dl.shadow.mapSize.set(1024, 1024), Object.assign(dl.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10 }), dl.shadow.camera.updateProjectionMatrix(), sc.add(dl);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.4, 0.5, 48), new THREE.MeshStandardMaterial({ map: makeCanvasTexture(128, 128, drawFloorTile, [11, 11]), roughness: 0.95 }));
      pad.position.set(0, -0.25, -1.5), pad.receiveShadow = !0, sc.add(pad);
      const rimRing = new THREE.Mesh(new THREE.TorusGeometry(11.2, 0.12, 6, 64), glowMat(16436245, 0.7));
      rimRing.rotation.x = Math.PI / 2, rimRing.position.set(0, 0.02, -1.5), sc.add(rimRing), squad.cam = new THREE.PerspectiveCamera(34, 2.6, 0.1, 100), squad.cam.position.set(0, 8.2, 13.5), squad.cam.lookAt(0, 0.6, -1.2), squad.scene = sc, squad.ready = !0, syncSquad();
    }
    function syncSquad() {
      if (!squad.ready) return;
      const players = [...activePlayers.values()].sort((a, b) => a.slotIndex - b.slotIndex), keep = new Set(players.map((p) => p.id));
      squad.units.forEach((u, id) => {
        keep.has(id) || (squad.scene.remove(u.root), disposeNameplate(u.plate), squad.units.delete(id));
      }), players.forEach((p, i) => {
        let u = squad.units.get(p.id);
        const pal = PLAYER_PALETTE[p.slotIndex % 7];
        if (!u || u.slot !== p.slotIndex) {
          u && (squad.scene.remove(u.root), disposeNameplate(u.plate));
          const root = new THREE.Group(), body = createTankMesh({ color: pal.hex, rough: 0.36, metal: 0.25 });
          root.add(body), root.add(createTeamRing(pal.hex, 1.2));
          const plate = createNameplate(p.name, pal.css, "player");
          plate.position.y = 2.1, root.add(plate), root.position.set(FORMATION[i][0] - 14, 0, FORMATION[i][1]), squad.scene.add(root), u = { root, body, plate, slot: p.slotIndex, born: performance.now() }, squad.units.set(p.id, u);
        }
        u.target = FORMATION[i], u.player = p;
      }), document.getElementById("squad-empty").style.display = players.length ? "none" : "flex";
    }
    function renderSquad(delta, t) {
      if (!squad.ready || document.getElementById("host-lobby").classList.contains("hidden")) return;
      const cv = squad.renderer.domElement, w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      (cv.width !== Math.floor(w * squad.renderer.getPixelRatio()) || cv.height !== Math.floor(h * squad.renderer.getPixelRatio())) && (squad.renderer.setSize(w, h, !1), squad.cam.aspect = w / h, squad.cam.updateProjectionMatrix());
      const n = Math.max(1, squad.units.size), spread = n <= 1 ? 6 : n <= 3 ? 9 : n <= 5 ? 13 : 17;
      squad.cam.position.set(Math.sin(t * 0.3) * 0.8, 5 + spread * 0.32, 7 + spread * 0.62), squad.cam.lookAt(0, 0.6, -1.4), squad.units.forEach((u) => {
        const [tx, tz] = u.target, dx = tx - u.root.position.x, dz = tz - u.root.position.z, dist = Math.hypot(dx, dz);
        dist > 0.05 ? (u.root.position.x += dx * Math.min(1, delta * 2.2), u.root.position.z += dz * Math.min(1, delta * 2.2), u.body.rotation.y = Math.atan2(dx, dz) * Math.min(1, dist), u.body.traverse((c) => {
          c.userData.spin && (c.rotation.x += delta * 8);
        })) : u.body.rotation.y += (0 - u.body.rotation.y) * Math.min(1, delta * 4);
        const tur = u.body.userData.turret;
        tur && tur !== u.body && (tur.rotation.y = Math.sin(t * 0.9 + u.slot) * 0.5);
        const off = !u.player.connected && !u.player.isHost;
        updateNameplate(u.plate, 100, 100, off ? "\u{1F4E1} OFFLINE" : u.player.isHost ? "HOST" : u.player.ping != null ? "".concat(u.player.ping, "ms") : ""), u.plate.scale.set(1.25 * 640 / 224, 1.25, 1), u.root.visible = !off || Math.floor(t * 3) % 2 === 0;
      }), squad.renderer.render(squad.scene, squad.cam);
    }
    let lbRemote = !0;
    function lbLocal() {
      try {
        return JSON.parse(safeStore.get("bc3d_local_scores") || "[]");
      } catch {
        return [];
      }
    }
    function lbSaveLocal(entry) {
      const all = lbLocal();
      all.push(entry), all.sort((a, b) => b.score - a.score), safeStore.set("bc3d_local_scores", JSON.stringify(all.slice(0, 25)));
    }
    function lbPending() {
      try {
        return JSON.parse(safeStore.get("bc3d_pending_scores") || "[]");
      } catch {
        return [];
      }
    }
    function timeoutSignal(ms) {
      if (typeof AbortController == "undefined") return { signal: void 0, done() {
      } };
      const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
      return { signal: c.signal, done() {
        clearTimeout(t);
      } };
    }
    async function lbPost(entry) {
      const to = timeoutSignal(8e3);
      try {
        const r = await fetch("/api/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry), signal: to.signal });
        return r.status === 503 && (lbRemote = !1), r.ok;
      } catch {
        return !1;
      } finally {
        to.done();
      }
    }
    async function lbFlushPending() {
      const pend = lbPending();
      if (!pend.length || !lbRemote) return;
      const left = [];
      for (const e of pend) await lbPost(e) || left.push(e);
      safeStore.set("bc3d_pending_scores", JSON.stringify(left.slice(-20)));
    }
    async function lbFetch() {
      const to = timeoutSignal(8e3);
      try {
        const r = await fetch("/api/scores", { cache: "no-store", signal: to.signal });
        if (r.status === 503)
          return lbRemote = !1, { source: "local", rows: lbLocal().slice(0, 10) };
        if (!r.ok) throw new Error("http " + r.status);
        lbRemote = !0;
        const data = await r.json();
        return lbFlushPending(), { source: "global", rows: data.rows || [] };
      } catch {
        return { source: "local", rows: lbLocal().slice(0, 10), offline: !0 };
      } finally {
        to.done();
      }
    }
    async function lbSubmit(entry) {
      if (lbSaveLocal(entry), !lbRemote) return !1;
      const ok = await lbPost(entry);
      if (!ok && lbRemote) {
        const p = lbPending();
        p.push(entry), safeStore.set("bc3d_pending_scores", JSON.stringify(p.slice(-20)));
      }
      return ok;
    }
    function lbRender(listEl, titleEl, data, me) {
      titleEl.innerText = data.source === "global" ? "\u{1F30E} GLOBAL TOP 10" : data.offline ? "\u{1F4BE} LOCAL TOP 10 (OFFLINE)" : "\u{1F4BE} LOCAL TOP 10";
      const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
      listEl.innerHTML = data.rows.length ? data.rows.map((r, i) => {
        const isMe = me && r.score === me.score && r.squad === me.squad && r.wave === me.wave, medal = ["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] || "".concat(i + 1, ".");
        return '<li class="lb-row '.concat(isMe ? "me" : "", ' flex justify-between gap-2 px-1.5 py-1 rounded bg-gray-900/50"><span class="truncate"><span class="text-yellow-400">').concat(medal, "</span> ").concat(esc(r.squad), '</span><span class="shrink-0 text-gray-400">W').concat(r.wave, ' \xB7 <span class="text-green-400">').concat(r.score, "</span></span></li>");
      }).join("") : '<li class="text-gray-500">No scores yet \u2014 be the first squad!</li>';
    }
    async function refreshLobbyLeaderboard() {
      const data = await lbFetch();
      lbRender(document.getElementById("leaderboard-list"), document.getElementById("lb-title"), data);
    }
    document.getElementById("lb-refresh").addEventListener("click", refreshLobbyLeaderboard), refreshLobbyLeaderboard(), initSquad();
    const intro = { scene: null, cam: null, t: 0, dur: 7.2, tanks: [], foes: [], shells: [], parts: [], fx: [], fired: !1, steps: {}, light: null, eagle: null, arrow: null, plate: null };
    function buildIntroScene() {
      const s = new THREE.Scene();
      s.background = makeCanvasTexture(8, 256, (g, w, h) => {
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#0f1a33"), grd.addColorStop(0.45, "#3a4f86"), grd.addColorStop(0.8, "#e89a62"), grd.addColorStop(1, "#f6c48a"), g.fillStyle = grd, g.fillRect(0, 0, w, h);
      }), s.fog = new THREE.Fog(C(14260844), 45, 120), s.add(new THREE.HemisphereLight(C(16770764), C(3813448), 0.62)), s.add(new THREE.AmbientLight(16777215, 0.1));
      const sun = new THREE.DirectionalLight(C(16764826), 1.05);
      sun.position.set(-26, 22, 24), sun.castShadow = !0, sun.shadow.mapSize.set(2048, 2048), Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 25, bottom: -25, far: 120 }), sun.shadow.camera.updateProjectionMatrix(), sun.shadow.bias = -6e-4, s.add(sun), intro.light = new THREE.PointLight(16752704, 0, 18, 2), intro.light.position.set(0, -20, 0), s.add(intro.light);
      const ground2 = new THREE.Mesh(new THREE.PlaneGeometry(240, 70), new THREE.MeshStandardMaterial({ map: makeCanvasTexture(128, 128, drawFloorTile, [120, 35]), roughness: 0.92 }));
      ground2.rotation.x = -Math.PI / 2, ground2.receiveShadow = !0, s.add(ground2);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 4.6), std(3817548, { rough: 0.95 }));
      road.rotation.x = -Math.PI / 2, road.position.set(0, 0.015, 3.2), road.receiveShadow = !0, s.add(road);
      for (let x = -110; x < 110; x += 4) {
        const dash = new THREE.Mesh(G("dash", () => new THREE.PlaneGeometry(1.8, 0.22)), new THREE.MeshBasicMaterial({ color: C(16308090) }));
        dash.rotation.x = -Math.PI / 2, dash.position.set(x, 0.03, 3.2), s.add(dash);
      }
      const placeBlock = (name, x, y, z, sy = 1, sxz = 1) => {
        const b = makeBlock(name, sy, sxz);
        if (b)
          return b.position.set(x, y, z), s.add(b), b;
        const m = new THREE.Mesh(G("ib", () => new THREE.BoxGeometry(2, 2, 2)), name.includes("brick") ? materials.brick : name === "metal" ? materials.steel : std(4160044));
        return m.position.set(x, y, z), m.scale.set(sxz, sy, sxz), m.castShadow = !0, m.receiveShadow = !0, s.add(m), m;
      };
      for (let x = -64; x <= 64; x += 2) {
        if (Math.abs(x) < 6) continue;
        const metal = Math.abs(x) % 14 === 0, sy = metal ? 0.8 : 0.6 + x * 7 % 3 * 0.1;
        placeBlock(metal ? "metal" : "bricks_B", x, sy, -6, sy), Math.abs(x) % 6 === 2 && placeBlock("tree", x, 1 + 0.2, -8.6, 1.1, 1);
      }
      const grassM = blockMesh("grass");
      if (grassM) {
        const cells = [];
        for (let x = -76; x <= 76; x += 2) for (let z = -10; z >= -26; z -= 2) cells.push([x, z]);
        const im = new THREE.InstancedMesh(grassM.geometry, grassM.material, cells.length);
        im.receiveShadow = !0;
        const mtx = new THREE.Matrix4();
        cells.forEach(([x, z], i) => {
          const h = Math.floor(Math.max(0, Math.sin(x * 0.13) * 2 + Math.cos(x * 0.05 + z * 0.3) * 1.5 + (-z - 10) * 0.18));
          mtx.makeTranslation(x, -1 + h, z), im.setMatrixAt(i, mtx);
        }), s.add(im);
      }
      const eagle = createEagleMesh();
      eagle.scale.setScalar(1.95), eagle.position.set(0, 0, -1.4), s.add(eagle), intro.eagle = eagle, [[-4.2, -1.4], [4.2, -1.4], [-4.2, -3.4], [4.2, -3.4], [-2, -3.6], [0, -3.6], [2, -3.6]].forEach(([x, z]) => placeBlock("bricks_B", x, 0.6, z, 0.6));
      const aura = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.2, 48), glowMat(3718648, 0.85));
      aura.rotation.x = -Math.PI / 2, aura.position.set(0, 0.05, -1.4), aura.name = "aura", s.add(aura);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 14, 24, 1, !0), glowMat(16498468, 0.12));
      beam.material.side = THREE.DoubleSide, beam.position.set(0, 7, -1.4), s.add(beam), intro.plate = createNameplate("YOUR BASE", "#fbbf24", "base"), intro.plate.position.set(0, 5.9, -1.4), s.add(intro.plate), intro.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 4), std(16498468, { emissive: 16096779, ei: 0.8 })), intro.arrow.rotation.x = Math.PI, intro.arrow.position.set(0, 5, -1.4), s.add(intro.arrow);
      const players = [...activePlayers.values()].sort((a, b) => a.slotIndex - b.slotIndex), n = Math.max(3, Math.min(7, players.length));
      for (let i = 0; i < n; i++) {
        const p = players[i], pal = PLAYER_PALETTE[p ? p.slotIndex % 7 : i % 7], root = new THREE.Group(), body = createTankMesh({ color: pal.hex, rough: 0.36, metal: 0.25 });
        body.rotation.y = Math.PI / 2, root.add(body), root.add(createTeamRing(pal.hex, 1.18));
        let plate = null;
        p && (plate = createNameplate(p.name, pal.css, "player"), plate.position.y = 2.1, root.add(plate)), root.position.set(-15 - i * 4.6, 0, 3.2), s.add(root), intro.tanks.push({ root, body, plate, x0: -15 - i * 4.6 });
      }
      ["black", "brown", "camo"].forEach((paint, i) => {
        const root = new THREE.Group(), body = createTankMesh(PAINTS[paint], 1, !0);
        body.rotation.y = -Math.PI / 2, root.add(body), root.add(createTeamRing(16723245, 1.1)), root.position.set(13 + i * 3, 0, 0.6 - i % 2 * 1.4), s.add(root), intro.foes.push({ root, body, alive: !0, x0: 13 + i * 3 });
      }), intro.cam = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 300), intro.scene = s;
    }
    function disposeIntro() {
      intro.plate && disposeNameplate(intro.plate), intro.tanks.forEach((t) => t.plate && disposeNameplate(t.plate)), intro.parts.forEach((p) => p.destroy()), intro.fx.forEach((f) => f.destroy()), Object.assign(intro, { scene: null, tanks: [], foes: [], shells: [], parts: [], fx: [], fired: !1, steps: {}, plate: null, arrow: null, eagle: null });
    }
    function introStep(key, at, fn) {
      intro.t >= at && !intro.steps[key] && (intro.steps[key] = !0, fn());
    }
    function startIntro() {
      gameState = "INTRO", buildIntroScene(), intro.t = 0, document.getElementById("intro-overlay").classList.remove("hidden", "on"), document.getElementById("intro-title").classList.remove("show"), document.getElementById("intro-sub").classList.remove("show");
      const fade = document.getElementById("intro-fade");
      fade.style.transition = "none", fade.style.opacity = "1", broadcastToControllers({ type: "intro" });
    }
    function skipIntro() {
      gameState === "INTRO" && intro.t < intro.dur - 0.6 && (intro.t = intro.dur - 0.6);
    }
    document.getElementById("intro-overlay").addEventListener("click", skipIntro);
    function updateIntro(delta) {
      intro.t += delta;
      const t = intro.t, D = intro.dur, ov = document.getElementById("intro-overlay"), fade = document.getElementById("intro-fade");
      if (introStep("fadein", 0.05, () => {
        fade.style.transition = "opacity 0.7s", fade.style.opacity = "0", ov.classList.add("on"), audio.playRumble(3.2);
      }), introStep("title", 0.65, () => {
        document.getElementById("intro-title").classList.add("show"), audio.playImpact(), audio.say("Defend your base!", { priority: !0, rate: 0.95, pitch: 0.65 });
      }), introStep("sub", 1.5, () => {
        document.getElementById("intro-sub").classList.add("show"), audio.playWhoosh();
      }), introStep("fadeout", D - 0.6, () => {
        fade.style.transition = "opacity 0.55s", fade.style.opacity = "1";
      }), intro.tanks.forEach((tk, i) => {
        tk.root.position.x = tk.x0 + 5.2 * t, tk.body.position.y = Math.abs(Math.sin(t * 18 + i)) * 0.04, tk.body.traverse((c) => {
          c.userData.spin && (c.rotation.x += 5.2 * delta * 2.5);
        }), Math.random() < 0.45 && spawnDust(tk.root.position.clone().add(new THREE.Vector3(-1, 0, 0)), 14205850, 0.3, intro.scene, intro.parts), tk.plate && (updateNameplate(tk.plate, 100, 100, ""), tk.plate.scale.set(1.25 * 640 / 224, 1.25, 1));
      }), intro.foes.forEach((f) => {
        f.alive && (f.root.position.x = f.x0 - 1.4 * t, f.body.traverse((c) => {
          c.userData.spin && (c.rotation.x += 6 * delta);
        }));
      }), introStep("fire", 3.6, () => {
        const shooters = intro.tanks.filter((tk) => tk.root.position.x > -10 && tk.root.position.x < 10).slice(0, 3);
        (shooters.length ? shooters : intro.tanks.slice(0, 1)).forEach((tk, i) => {
          const target = intro.foes[i % intro.foes.length], from = tk.root.position.clone();
          from.x += 1.6, from.y = 0.85;
          const m = new THREE.Mesh(BGEO.core, materials.bulletPlayer);
          m.add(new THREE.Mesh(BGEO.halo, materials.haloPlayer)), m.position.copy(from), intro.scene.add(m), intro.shells.push({ m, target, delay: i * 0.18 }), setTimeout(() => audio.playShoot(), i * 180);
        });
      }), intro.shells = intro.shells.filter((sh) => {
        if (sh.delay > 0)
          return sh.delay -= delta, sh.m.visible = !1, !0;
        sh.m.visible = !0;
        const tp = sh.target.root.position.clone();
        tp.y = 0.8;
        const dv = tp.sub(sh.m.position), d = dv.length();
        if (d < 0.9 || !sh.target.alive) {
          if (intro.scene.remove(sh.m), sh.target.alive) {
            sh.target.alive = !1, intro.scene.remove(sh.target.root);
            const p = sh.target.root.position.clone();
            p.y = 0.7, createExplosionVFX(p, 16738877, 22, { scene: intro.scene, list: intro.parts, noLight: !0 }), createDebris(p, [1842464, 4938275, 4007445], 10, { scene: intro.scene, list: intro.parts }), intro.fx.push(new RingPulse(p, 16752704, { from: 0.4, to: 4, life: 0.5, scene: intro.scene })), intro.light.position.set(p.x, 2, p.z), intro.light.intensity = 6, audio.playExplosion(!1);
          }
          return !1;
        }
        return sh.m.position.addScaledVector(dv.normalize(), Math.min(d, 42 * delta)), !0;
      }), intro.light.intensity = Math.max(0, intro.light.intensity - delta * 14), intro.eagle) {
        const e = intro.eagle.getObjectByName("eagle"), wl = intro.eagle.getObjectByName("wingL"), wr = intro.eagle.getObjectByName("wingR");
        wl && (wl.rotation.z = -Math.sin(t * 3) * 0.12), wr && (wr.rotation.z = Math.sin(t * 3) * 0.12), e && (e.position.y = 0.62 + Math.sin(t * 2) * 0.03);
      }
      intro.arrow.position.y = 4.65 + Math.abs(Math.sin(t * 4)) * 0.45, intro.arrow.rotation.y += delta * 2, updateNameplate(intro.plate, 100, 100, "PROTECT IT!"), intro.plate.scale.set(1.5 * 640 / 224, 1.5, 1);
      const aura = intro.scene.getObjectByName("aura");
      aura && aura.scale.setScalar(1 + Math.sin(t * 5) * 0.08), Math.floor(t / 0.9) !== Math.floor((t - delta) / 0.9) && intro.fx.push(new RingPulse({ x: 0, z: -1.4 }, 3718648, { from: 1, to: 5, life: 0.9, scene: intro.scene, opacity: 0.7 }));
      for (let i = intro.parts.length - 1; i >= 0; i--) intro.parts[i].update(delta) || (intro.parts[i].destroy(), intro.parts.splice(i, 1));
      for (let i = intro.fx.length - 1; i >= 0; i--) intro.fx[i].update(delta) || (intro.fx[i].destroy(), intro.fx.splice(i, 1));
      const k = easeInOut(Math.min(1, t / D)), cx = -2.5 + k * 5;
      intro.cam.aspect = window.innerWidth / window.innerHeight, intro.cam.updateProjectionMatrix(), intro.cam.position.set(cx, 6.4 - k * 0.6, 23 - k * 1.5), intro.cam.lookAt(cx, 3.9, -1), t >= D && (document.getElementById("intro-overlay").classList.add("hidden"), document.getElementById("intro-overlay").classList.remove("on"), disposeIntro(), startCountdown());
    }
    const cd = { t: 0, steps: {} };
    function startCountdown() {
      gameState = "COUNTDOWN", cd.t = 0, cd.steps = {}, activePlayers.forEach((p) => {
        p.tank || spawnPlayerTank(p);
      }), document.getElementById("hud").classList.remove("hidden"), document.getElementById("players-hud-bar").classList.remove("hidden"), document.getElementById("countdown-overlay").classList.remove("hidden"), document.getElementById("countdown-sub").style.opacity = "1", updateHUD();
    }
    function showCount(text) {
      const el = document.getElementById("countdown-num");
      el.innerText = text, el.classList.toggle("go", text === "GO!"), el.classList.remove("pop"), el.offsetWidth, el.classList.add("pop"), audio.playCountdown(text === "GO!"), audio.say(text === "GO!" ? "Go!" : { 3: "Three", 2: "Two", 1: "One" }[text], { priority: !0, rate: 1.1, pitch: 0.7 }), broadcastToControllers({ type: "countdown", text });
      const ep = gridToWorld(EAGLE_C, EAGLE_R);
      fxBursts.push(new RingPulse(ep, text === "GO!" ? 4906624 : 3718648, { from: 0.8, to: text === "GO!" ? 14 : 6, life: 0.8 }));
    }
    function updateCountdown(delta) {
      cd.t += delta;
      const step = (key, at, fn) => {
        cd.t >= at && !cd.steps[key] && (cd.steps[key] = !0, fn());
      };
      step("3", 0.35, () => showCount("3")), step("2", 1.35, () => showCount("2")), step("1", 2.35, () => showCount("1")), step("go", 3.35, () => {
        showCount("GO!"), document.getElementById("countdown-sub").style.opacity = "0";
      }), cd.t >= 4.1 && (document.getElementById("countdown-overlay").classList.add("hidden"), gameState = "PLAYING", audio.startBGM(), updateHUD());
    }
    function clearWorld() {
      enemies.forEach((e) => {
        scene.remove(e.mesh), disposeNameplate(e.nameplate);
      }), bullets.forEach((b) => scene.remove(b.mesh)), powerups.forEach((p) => p.destroy()), particles.forEach((p) => p.destroy()), lasers.forEach((l) => l.destroy()), fxBursts.forEach((f) => f.destroy()), scorches.forEach((s) => {
        scene.remove(s), s.material.dispose();
      }), enemies.length = 0, bullets.length = 0, powerups.length = 0, particles.length = 0, lasers.length = 0, fxBursts.length = 0, scorches.length = 0;
    }
    function startGame() {
      gameTime = 0, currentWave = 1, waveKills = 0, killsToNextWave = 10, score = 0, totalKills = 0, baseHp = 100, freezeTimer = 0, fortifyTimer = 0, bossRef = null, mapGrid = JSON.parse(JSON.stringify(initialMapGrid)), fortifyPending = [], gateOpen = !0, gateTimer = 0, buildMap(), eagleMesh && (eagleMesh.visible = !0, eagleAura.visible = !0), clearWorld(), document.querySelectorAll(".hud-panel").forEach((x) => x.classList.remove("open")), activePlayers.forEach((p) => {
        p.lives = 3, p.starTimer = 0, p.laserTimer = 0, p.shieldTimer = 0, p.combo = 0, p.kills = 0, spawnPlayerTank(p);
      }), document.getElementById("host-lobby").classList.add("hidden"), document.getElementById("gameover-screen").classList.add("hidden"), document.getElementById("hud").classList.add("hidden"), document.getElementById("players-hud-bar").classList.add("hidden"), document.getElementById("boss-hp-container").classList.add("hidden"), document.getElementById("base-box").classList.remove("base-alarm", "base-critical"), audio.stopBGM(), startIntro();
    }
    function triggerGameOver(isVictory, reason) {
      if (gameState === "OVER") return;
      gameState = "OVER", audio.stopBGM(), audio.playGameOver(), setTimeout(() => audio.say("Game over", { priority: !0, rate: 0.85, pitch: 0.55 }), 500), document.getElementById("countdown-overlay").classList.add("hidden"), document.getElementById("boss-hp-container").classList.add("hidden"), document.getElementById("end-title").innerText = "GAME OVER", document.getElementById("end-subtitle").innerText = reason || "THE EAGLE BASE WAS DESTROYED";
      const elapsed = Math.floor(gameTime);
      document.getElementById("end-time").innerText = "".concat(Math.floor(elapsed / 60).toString().padStart(2, "0"), ":").concat(Math.floor(elapsed % 60).toString().padStart(2, "0")), document.getElementById("end-kills").innerText = totalKills, document.getElementById("end-score").innerText = score, document.getElementById("end-wave").innerText = currentWave, broadcastToControllers({ type: "sfx", s: "over" });
      const pilots = [...activePlayers.values()].sort((a, b) => b.kills - a.kills);
      document.getElementById("end-pilots").innerHTML = pilots.map((p) => '<div class="flex items-center justify-between gap-2"><span class="flex items-center gap-1"><img src="'.concat(tankThumb(p.slotIndex), '" class="w-7 h-5" alt="">').concat(p.name, '</span><span class="text-red-300">').concat(p.kills, " KILLS</span></div>")).join("");
      const entry = { squad: (pilots.map((p) => p.name).join(" \xB7 ") || "NO PILOTS").slice(0, 60), players: Math.max(1, Math.min(7, pilots.length)), score, wave: currentWave, kills: totalKills, time_s: Math.floor(gameTime) }, rankEl = document.getElementById("end-rank");
      rankEl.innerText = "SAVING SCORE\u2026";
      const listEnd = document.getElementById("leaderboard-end"), titleEnd = document.getElementById("lb-title-end");
      (async () => {
        score > 0 && await lbSubmit(entry);
        const data = await lbFetch();
        lbRender(listEnd, titleEnd, data, entry), lbRender(document.getElementById("leaderboard-list"), document.getElementById("lb-title"), data);
        const idx = data.rows.findIndex((r) => r.score === entry.score && r.squad === entry.squad && r.wave === entry.wave);
        rankEl.innerText = score <= 0 ? "" : idx === 0 ? "\u{1F3C6} NEW #1 HIGH SCORE!" : idx > 0 ? "\u{1F396} RANK #".concat(idx + 1, " ").concat(data.source === "global" ? "WORLDWIDE" : "ON THIS PC") : "NOT IN THE TOP 10 \xB7 TRY AGAIN!", idx === 0 && score > 0 && audio.say("New high score!", { priority: !0 });
      })(), setTimeout(() => {
        gameState === "OVER" && (document.getElementById("hud").classList.add("hidden"), document.getElementById("players-hud-bar").classList.add("hidden"), document.getElementById("gameover-screen").classList.remove("hidden"));
      }, 1400);
    }
    document.getElementById("start-btn").addEventListener("click", () => {
      if (audio.init(), !activePlayers.size) {
        toast("NO PILOTS YET \xB7 SCAN THE QR OR TURN ON HOST PLAYER", "#f87171"), audio.playHit();
        return;
      }
      startGame();
    }), document.getElementById("restart-btn").addEventListener("click", () => {
      document.getElementById("gameover-screen").classList.add("hidden"), document.getElementById("host-lobby").classList.remove("hidden"), gameState = "LOBBY", clearWorld(), refreshLobbyLeaderboard(), activePlayers.forEach((p) => {
        p.tank && (p.tank.dispose(), p.tank = null);
      }), mapGrid = JSON.parse(JSON.stringify(initialMapGrid)), buildMap(), eagleMesh && (eagleMesh.visible = !0, eagleAura.visible = !0), baseHp = 100, document.getElementById("base-box").classList.remove("base-alarm", "base-critical");
    });
    let spawnTimer = 0, lastTime = performance.now(), gateTimer = 0, gateOpen = !0, hudTimer = 0;
    const tmpV = new THREE.Vector3();
    function animateWorld(delta, t) {
      waterMeshes.forEach((w) => {
        w.position.y = w.userData.baseY + Math.sin(t * 1.8 + w.position.x * 0.4 + w.position.z * 0.3) * 0.035;
      });
      const tanks = [];
      if (activePlayers.forEach((p) => {
        p.tank && p.hp > 0 && tanks.push(p.tank.mesh.position);
      }), enemies.forEach((e) => tanks.push(e.mesh.position)), treeMeshes.forEach((tree) => {
        const target = tanks.some((p) => Math.abs(p.x - tree.position.x) < 1.5 && Math.abs(p.z - tree.position.z) < 1.5) ? 0.35 : 1;
        (tree.userData.fadeMats || []).forEach((m) => {
          m.opacity += (target - m.opacity) * Math.min(1, delta * 8), m.depthWrite = m.opacity > 0.95;
        }), tree.rotation.z = Math.sin(t * 1.3 + tree.userData.sway) * 0.012;
      }), conveyorMeshes.forEach((c) => c.children.forEach((ch) => {
        ch.userData.baseZ !== void 0 && (ch.position.z = (ch.userData.baseZ + 0.75 + t * 0.9) % 1.5 - 0.75);
      })), lavaMat && (lavaMat.emissiveIntensity = 0.55 + Math.sin(t * 3) * 0.25), ventMeshes.forEach((v) => {
        Math.random() < 0.05 && addParticle(particles, new THREE.Vector3(v.position.x + (Math.random() - 0.5) * 1.4, 0.2, v.position.z + (Math.random() - 0.5) * 1.4), Math.random() < 0.5 ? 16742938 : 16761165, 0.12, rv(0.6, 1.5, 0.6, 0.8), { gravity: -1, decay: 1.2 });
      }), eagleMesh && eagleMesh.visible) {
        const wl = eagleMesh.getObjectByName("wingL"), wr = eagleMesh.getObjectByName("wingR"), eg = eagleMesh.getObjectByName("eagle");
        wl && (wl.rotation.z = -Math.sin(t * 2.4) * 0.1), wr && (wr.rotation.z = Math.sin(t * 2.4) * 0.1), eg && (eg.position.y = 0.62 + Math.sin(t * 2) * 0.03), eagleFlash = Math.max(0, eagleFlash - delta);
        const fm = eagleMesh.userData.flashMats, be = eagleMesh.userData.baseEmissive;
        fm.forEach((m, i) => {
          eagleFlash > 0 ? (m.emissive.setRGB(1, 0.1, 0.05), m.emissiveIntensity = 0.4 + eagleFlash * 2) : (m.emissive.copy(be[i]), m.emissiveIntensity = 1);
        });
        const ring = eagleAura.getObjectByName("ring");
        ring.scale.setScalar(1 + Math.sin(t * 4) * 0.05), ring.material.color.copy(C(baseHp > 34 ? 3718648 : 16726843)), eagleBeacon.material.opacity = (gameState === "COUNTDOWN" ? 0.16 : 0.1) + Math.sin(t * 3) * 0.04, eaglePlate.userData.extraMul = gameState === "COUNTDOWN" ? 1.2 + Math.abs(Math.sin(t * 4)) * 0.1 : 1, eaglePlate.position.y = 3.6 + (gameState === "COUNTDOWN" ? Math.abs(Math.sin(t * 4)) * 0.5 : 0), updateNameplate(eaglePlate, baseHp, 100, gameState === "COUNTDOWN" ? "DEFEND!" : fortifyTimer > 0 ? "FORTIFIED" : "");
      }
      dust.forEach((p) => {
        p.position.addScaledVector(p.userData.v, delta), p.position.y > 5 && (p.position.y = 0.3);
      });
      for (let i = scorches.length - 1; i >= 0; i--) {
        const s = scorches[i];
        s.userData.life -= delta, s.material.opacity = Math.min(0.45, s.userData.life * 0.15), s.userData.life <= 0 && (scene.remove(s), s.material.dispose(), scorches.splice(i, 1));
      }
      if (gateTimer += delta, gateTimer > 4.5 && gateOpen && cellOccupied(GATE_C, GATE_R) && (gateTimer = 4.2), gateTimer > 4.5) {
        gateTimer = 0, gateOpen = !gateOpen;
        const r = GATE_R, c = GATE_C;
        mapGrid[r][c] = gateOpen ? 0 : 2;
        const key = "".concat(c, ",").concat(r), existing = tileMeshes.get(key);
        if (existing && (scene.remove(existing), tileMeshes.delete(key)), !gateOpen) {
          const pos = gridToWorld(c, r), mesh = createSteelTile(!1);
          mesh.position.x = pos.x, mesh.position.z = pos.z, scene.add(mesh), tileMeshes.set(key, mesh), gameState === "PLAYING" && (audio.playSteelPing(), createSparks(new THREE.Vector3(pos.x, 0.4, pos.z), 14870768, 6));
        }
      }
      updateLights(delta);
      for (let i = particles.length - 1; i >= 0; i--) particles[i].update(delta) || (particles[i].destroy(), particles.splice(i, 1));
      for (let i = lasers.length - 1; i >= 0; i--) lasers[i].update(delta) || (lasers[i].destroy(), lasers.splice(i, 1));
      for (let i = fxBursts.length - 1; i >= 0; i--) fxBursts[i].update(delta) || (fxBursts[i].destroy(), fxBursts.splice(i, 1));
    }
    function updateCamera(delta, t) {
      if (shakeAmp = Math.max(0, shakeAmp - delta * 1.8), gameState === "LOBBY") {
        const a = Math.sin(t * 0.12) * 0.22;
        tmpV.set(Math.sin(a) * CAM_DIR.z, CAM_DIR.y, Math.cos(a) * CAM_DIR.z).multiplyScalar(camDist * 1.05), camera.position.copy(camLook).add(tmpV), camera.lookAt(camLook);
        return;
      }
      if (gameState === "COUNTDOWN") {
        const ep = gridToWorld(EAGLE_C, EAGLE_R), k = easeInOut(Math.min(1, Math.max(0, (cd.t - 0.2) / 3.3))), look = new THREE.Vector3(ep.x, 0.8, ep.z - 2.6).lerp(camLook, k), dist = 27 + (camDist - 27) * k;
        plateZoom = dist / camDist, camera.position.copy(look).addScaledVector(CAM_DIR, dist), camera.lookAt(look);
        return;
      }
      plateZoom = 1, camera.position.set(camBase.x + (Math.random() - 0.5) * shakeAmp, camBase.y, camBase.z + (Math.random() - 0.5) * shakeAmp), camera.lookAt(camLook);
    }
    let perfEMA = 16, perfT = 0, qualityLevel = 2;
    function adaptQuality(dtMs) {
      gameState === "INTRO" || document.hidden || dtMs > 400 || (perfEMA += (dtMs - perfEMA) * 0.04, perfT += dtMs / 1e3, perfT > 5 && perfEMA > 30 && qualityLevel > 0 && (qualityLevel--, perfT = 0, perfEMA = 16, qualityLevel === 1 ? renderer.setPixelRatio(1) : (renderer.setPixelRatio(Math.min(1, window.devicePixelRatio) * 0.8), renderer.shadowMap.type = THREE.PCFShadowMap, dirLight.shadow.mapSize.set(1024, 1024), dirLight.shadow.map && (dirLight.shadow.map.dispose(), dirLight.shadow.map = null)), renderer.setSize(window.innerWidth, window.innerHeight), console.log("Battle City: quality lowered to level", qualityLevel)));
    }
    function animate(now) {
      requestAnimationFrame(animate), adaptQuality(now - lastTime);
      const delta = Math.min((now - lastTime) / 1e3, 0.1);
      lastTime = now;
      const t = now * 1e-3;
      if (gameState === "INTRO" && intro.scene && (updateIntro(delta), intro.scene)) {
        renderer.render(intro.scene, intro.cam);
        return;
      }
      if (animateWorld(delta, t), updateCamera(delta, t), gameState === "LOBBY" && renderSquad(delta, t), gameState === "COUNTDOWN" && (updateCountdown(delta), activePlayers.forEach((p) => {
        p.tank && (updateNameplate(p.tank.nameplate, p.hp, 100, ""), p.tank.ring.material.opacity = 0.55 + Math.sin(t * 5) * 0.2);
      })), gameState === "PLAYING") {
        gameTime += delta, waveKills >= killsToNextWave && (currentWave += 1, waveKills = 0, killsToNextWave = 10 + currentWave * 4, showPowerupBanner("\u26A1", "WAVE ".concat(currentWave, " STARTED!"), "#facc15"), audio.playWaveStart(), audio.say("Wave ".concat(currentWave, "!"), { priority: !0 }), broadcastToControllers({ type: "sfx", s: "wave", text: "\u26A1 WAVE ".concat(currentWave) })), currentWave % 3 === 0 && !bossRef && enemies.filter((e) => e.isBoss).length === 0 && (bossRef = new EnemyTankEntity(gridToWorld(18, 1), "boss"), enemies.push(bossRef), document.getElementById("boss-hp-container").classList.remove("hidden"), updateBossHP(bossRef.hp), audio.playBossSiren(), showPowerupBanner("\u26A0\uFE0F", "TITAN BOSS SPAWNED!", "#f87171"), audio.say("Warning! Titan tank approaching!", { priority: !0 }), screenFlash("red"), broadcastToControllers({ type: "sfx", s: "boss", text: "\u26A0 TITAN BOSS!" })), freezeTimer > 0 && (freezeTimer -= delta), fortifyTimer > 0 && (fortifyTimer -= delta, fortifyTimer <= 0 ? deactivateBaseFortify() : fortifyPending.length && Math.floor(gameTime * 2) !== Math.floor((gameTime - delta) * 2) && retryFortify()), hudTimer -= delta, hudTimer <= 0 && (hudTimer = 0.1, updateHUD()), spawnTimer += delta;
        const maxEnemies = Math.min(18, 4 + currentWave * 2 + activePlayers.size), spawnInterval = Math.max(0.8, 2.5 - currentWave * 0.15);
        if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
          spawnTimer = 0;
          const free = enemySpawnPoints.filter((sp) => !enemies.some((e) => e.mesh.position.distanceTo(sp) < 1.8));
          if (free.length) {
            const sp = free[Math.floor(Math.random() * free.length)], rand = Math.random();
            let type = "basic";
            currentWave >= 2 && rand < 0.45 && (type = "fast"), currentWave >= 2 && rand > 0.7 && (type = "heavy"), enemies.push(new EnemyTankEntity(sp, type));
          }
        }
        activePlayers.forEach((p) => {
          p.tank && p.tank.update(delta, now / 1e3);
        });
        for (let i = enemies.length - 1; i >= 0; i--)
          enemies[i].update(delta, now / 1e3), (enemies[i].pendingDestroy || enemies[i].hp <= 0) && (enemies[i].isBoss && (bossRef = null, document.getElementById("boss-hp-container").classList.add("hidden")), enemies[i].destroy(), enemies.splice(i, 1));
        for (let i = bullets.length - 1; i >= 0; i--)
          bullets[i].update(delta), bullets[i].active || bullets.splice(i, 1);
        for (let i = powerups.length - 1; i >= 0; i--) {
          const pwr = powerups[i];
          if (!pwr.update(delta)) {
            pwr.destroy(), powerups.splice(i, 1);
            continue;
          }
          for (const p of activePlayers.values())
            if (p.tank && p.hp > 0 && pwr.mesh.position.distanceTo(p.tank.mesh.position) < pwr.radius + p.tank.radius) {
              triggerPowerup(p, pwr.type), pwr.destroy(), powerups.splice(i, 1);
              break;
            }
        }
      }
      renderer.render(scene, camera);
    }
    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight), fitCamera();
    }), animate(performance.now());
  }
})();
