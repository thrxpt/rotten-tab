
interface ExtensionSettings {
  enabled: boolean;
  idleThreshold: number; // in seconds, default 30
  growthSpeed: number; // multiplier: 1, 5, 10
  soundEnabled: boolean;
}

interface SurfaceColony {
  nx: number;
  ny: number;
  triggerProgress: number;
  maxRadius: number;
  seed: number;
}

interface SporeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
}

class ScrubAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private url: string;
  private stopTimeout: number | null = null;

  constructor() {
    this.url = browser.runtime.getURL('/scrub.mp3');
  }

  play() {
    try {
      if (!this.audio) {
        this.audio = new Audio(this.url);
        this.audio.volume = 0.65;
        this.audio.loop = true;
      }

      if (this.audio.paused) {
        this.audio.play().catch(() => {});
      }

      if (this.stopTimeout !== null) {
        window.clearTimeout(this.stopTimeout);
      }

      // Automatically pause 280ms after cursor stops frantic scrubbing
      this.stopTimeout = window.setTimeout(() => {
        if (this.audio && !this.audio.paused) {
          this.audio.pause();
        }
        this.stopTimeout = null;
      }, 280);
    } catch {
      // Audio playback fails gracefully
    }
  }

  stop() {
    if (this.stopTimeout !== null) {
      window.clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // Prevent duplicate injection
    if (document.getElementById('tab-rotting-root')) {
      return;
    }

    let settings: ExtensionSettings = {
      enabled: true,
      idleThreshold: 30,
      growthSpeed: 1,
      soundEnabled: true,
    };

    let rotProgress = 0; // 0% to 100%
    let lastRenderedProgress = 0;

    // Check if this tab is initially inactive or has stored activity timestamp
    let lastActiveTime = Date.now();
    try {
      const stored = sessionStorage.getItem('tab_rot_last_active');
      if (stored) {
        lastActiveTime = Number(stored);
      } else if (document.hidden || !document.hasFocus()) {
        // Tab opened or loaded in background: immediately start as hoarded/inactive!
        lastActiveTime = Date.now() - (settings.idleThreshold * 1000);
      }
    } catch {
      if (document.hidden || !document.hasFocus()) {
        lastActiveTime = Date.now() - (settings.idleThreshold * 1000);
      }
    }
    // Mouse velocity tracking for frantic scrubbing
    let prevMouseX = 0;
    let prevMouseY = 0;
    let prevMouseTime = 0;

    const scrubAudio = new ScrubAudioPlayer();

    // 1. Create Isolated Shadow DOM Container
    const hostEl = document.createElement('div');
    hostEl.id = 'tab-rotting-root';
    (document.fullscreenElement || document.documentElement || document.body).appendChild(hostEl);
    const shadow = hostEl.attachShadow({ mode: 'open' });

    // 2. Inject Styles into Shadow Root
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      :host {
        all: initial;
      }
      #mold-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483646;
        filter: url(#mold-distortion);
        display: block;
      }
      #mold-particles {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483646;
        display: block;
      }
      #mold-hud {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%) translateY(-12px);
        z-index: 2147483647;
        pointer-events: none;
        background: rgba(16, 24, 16, 0.90);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(85, 135, 75, 0.45);
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(45, 80, 40, 0.35);
        border-radius: 9999px;
        padding: 8px 20px;
        color: #d7e1cd;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }
      #mold-hud.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .hud-icon {
        font-size: 15px;
        display: inline-block;
      }
      .hud-text {
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #e5f0dc;
      }
      .hud-hint {
        font-size: 11px;
        opacity: 0;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        transition: opacity 0.35s ease, max-width 0.35s ease;
        color: #a4be9a;
      }
      .hud-hint.show {
        opacity: 0.9;
        max-width: 220px;
      }
    `;
    shadow.appendChild(styleEl);

    // 3. Inject Hidden SVG Distortion Filter into Light DOM and Shadow Root
    if (!document.getElementById('mold-distortion-defs')) {
      const svgDefsWrap = document.createElement('div');
      svgDefsWrap.id = 'mold-distortion-defs';
      svgDefsWrap.style.cssText = 'position: fixed; width: 0; height: 0; pointer-events: none; overflow: hidden;';
      svgDefsWrap.setAttribute('aria-hidden', 'true');
      svgDefsWrap.innerHTML = `
        <svg style="position: absolute; width: 0; height: 0; pointer-events: none;" aria-hidden="true">
          <defs>
            <filter id="mold-distortion" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      `;
      (document.documentElement || document.body).appendChild(svgDefsWrap);
    }

    const svgWrap = document.createElement('div');
    svgWrap.innerHTML = `
      <svg style="position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;" aria-hidden="true">
        <defs>
          <filter id="mold-distortion" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    `;
    shadow.appendChild(svgWrap);

    // 4. Inject Overlay Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'mold-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    shadow.appendChild(canvas);

    const particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'mold-particles';
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
    shadow.appendChild(particleCanvas);

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const particleCtx = particleCanvas.getContext('2d');
    const particles: SporeParticle[] = [];
    if (!ctx) return;

    // 5. Inject Center-Top HUD Notification
    const hud = document.createElement('div');
    hud.id = 'mold-hud';
    hud.innerHTML = `
      <span class="hud-icon">🍄</span>
      <span class="hud-text">Tab Rotting (0%)</span>
      <span class="hud-hint">• Shake mouse fast to scrub</span>
    `;
    shadow.appendChild(hud);

    const hudText = hud.querySelector('.hud-text');
    const hudHint = hud.querySelector('.hud-hint');

    // 6. Generate Randomized Spore Colonies across the Viewport Surface
    const colonies: SurfaceColony[] = [];
    const cols = 8;
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const nx = (c + 0.15 + Math.random() * 0.7) / cols;
        const ny = (r + 0.15 + Math.random() * 0.7) / rows;
        colonies.push({
          nx,
          ny,
          triggerProgress: 4 + Math.random() * 70,
          maxRadius: 52 + Math.random() * 68,
          seed: Math.random() * 100,
        });
      }
    }
    // Canvas Resize Preservation Buffer
    window.addEventListener('resize', () => {
      if (!ctx) return;
      const oldW = canvas.width;
      const oldH = canvas.height;
      if (oldW === 0 || oldH === 0) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = oldW;
      tempCanvas.height = oldH;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;

      if (tempCtx) {
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      }
    });

    // Helper: Update HUD UI
    function updateHud() {
      if (rotProgress <= 0) {
        hud.classList.remove('visible');
        if (hudHint instanceof HTMLElement) {
          hudHint.classList.remove('show');
        }
        return;
      }
      hud.classList.add('visible');
      const rounded = Math.round(rotProgress);
      if (hudText instanceof HTMLElement) {
        hudText.textContent = `Tab Rotting (${rounded}%)`;
      }

      if (hudHint instanceof HTMLElement) {
        if (rotProgress > 30) {
          hudHint.classList.add('show');
        } else {
          hudHint.classList.remove('show');
        }
      }
    }

    // Helper: Draw soft, velvety, organic mold spore cluster with mycelium fuzz
    function drawMoldPatch(cx: number, cy: number, radius: number, density: number = 1) {
      if (!ctx || radius <= 2) return;

      // 1. Soft mycelium fuzz halo
      const gradFuzz = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius * 1.25);
      gradFuzz.addColorStop(0, 'rgba(180, 198, 175, 0.45)');
      gradFuzz.addColorStop(0.65, 'rgba(215, 230, 212, 0.55)');
      gradFuzz.addColorStop(1, 'rgba(230, 242, 228, 0)');
      ctx.fillStyle = gradFuzz;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 2. Velvety olive-black necrotic core
      const gradCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.9);
      gradCore.addColorStop(0, 'rgba(10, 16, 8, 0.95)');
      gradCore.addColorStop(0.55, 'rgba(24, 38, 20, 0.9)');
      gradCore.addColorStop(0.85, 'rgba(45, 68, 35, 0.65)');
      gradCore.addColorStop(1, 'rgba(50, 72, 38, 0)');
      ctx.fillStyle = gradCore;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // 3. Stippled granular micro-spores (powdery velvet texture)
      const dotCount = Math.floor(radius * 14 * density);
      for (let i = 0; i < dotCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.6) * radius * 1.3;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const r = 0.5 + Math.random() * 1.5;

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        const frac = dist / (radius * 1.3);
        if (frac < 0.45) {
          ctx.fillStyle = Math.random() < 0.65 ? 'rgba(8, 12, 6, 0.9)' : 'rgba(22, 34, 18, 0.85)';
        } else if (frac < 0.82) {
          ctx.fillStyle = Math.random() < 0.5 ? 'rgba(38, 60, 30, 0.8)' : 'rgba(68, 92, 56, 0.75)';
        } else {
          ctx.fillStyle = 'rgba(225, 238, 222, 0.9)';
        }
        ctx.fill();
      }

      // 4. Radiating feathery mycelium whiskers along the outer edge
      const whiskers = Math.floor(radius * 0.85);
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = 'rgba(220, 235, 218, 0.7)';
      for (let wIndex = 0; wIndex < whiskers; wIndex++) {
        const wAngle = Math.random() * Math.PI * 2;
        const inD = radius * (0.8 + Math.random() * 0.2);
        const outD = inD + (5 + Math.random() * 14);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(wAngle) * inD, cy + Math.sin(wAngle) * inD);
        ctx.lineTo(cx + Math.cos(wAngle) * outD, cy + Math.sin(wAngle) * outD);
        ctx.stroke();
      }

      // 5. Guttation amber bead (3% chance on mature spots)
      if (radius > 22 && Math.random() < 0.04) {
        ctx.beginPath();
        ctx.arc(cx + 2, cy - 2, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(165, 120, 30, 0.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 1.3, cy - 2.7, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // Procedural Biological Mold Painter (Randomized Surface Germination)
    function renderMoldGrowth(fromProgress: number, toProgress: number) {
      if (!ctx || toProgress <= fromProgress) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Expand Active Randomized Colonies radially from their spawn coordinates
      for (const col of colonies) {
        if (toProgress >= col.triggerProgress) {
          const denom = Math.max(1, 100 - col.triggerProgress + 15);
          const frac = Math.min(1, (toProgress - col.triggerProgress) / denom);
          const prevFrac = fromProgress >= col.triggerProgress
            ? Math.min(1, (fromProgress - col.triggerProgress) / denom)
            : 0;

          if (frac > prevFrac) {
            const cx = col.nx * w;
            const cy = col.ny * h;
            const currentR = Math.max(3, frac * col.maxRadius);
            drawMoldPatch(cx, cy, currentR, 0.95);
          }
        }
      }

      // 2. Airborne Stray Mildew Dust (subtle spore flecks drifting onto text)
      const dustCount = Math.floor((toProgress - fromProgress) * 5);
      for (let s = 0; s < dustCount; s++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.beginPath();
        const sr = 0.6 + Math.random() * 1.8;
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        const p = Math.random();
        if (p < 0.45) ctx.fillStyle = 'rgba(16, 24, 12, 0.85)';
        else if (p < 0.8) ctx.fillStyle = 'rgba(42, 64, 32, 0.8)';
        else ctx.fillStyle = 'rgba(220, 235, 218, 0.9)';
        ctx.fill();
      }
    }

    // Sanitization: Full Reset
    function sanitizeTab() {
      rotProgress = 0;
      lastRenderedProgress = 0;
      lastActiveTime = Date.now();
      try {
        sessionStorage.setItem('tab_rot_last_active', String(lastActiveTime));
      } catch {}
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      particles.length = 0;
      if (particleCtx) {
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      }
      scrubAudio.stop();
      updateHud();
    }
    // Frantic Scrubbing Execution
    function performScrub(x: number, y: number, prevX: number, prevY: number, speed: number) {
      if (!ctx || rotProgress <= 0) return;

      const dist = Math.hypot(x - prevX, y - prevY);
      const steps = Math.max(1, Math.floor(dist / 10));

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = prevX + (x - prevX) * t;
        const cy = prevY + (y - prevY) * t;
        const radius = 42 + Math.min(25, speed * 8);

        // Gradual multi-pass abrasion: dynamic friction based on velocity
        const speedFactor = Math.min(1, Math.max(0, (speed - 1.6) / 2.4));
        const coreAlpha = 0.22 + speedFactor * 0.14; // 0.22 to 0.36
        const edgeAlpha = 0.04 + speedFactor * 0.06; // 0.04 to 0.10

        const grad = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
        grad.addColorStop(0, `rgba(0, 0, 0, ${coreAlpha})`);
        grad.addColorStop(0.65, `rgba(0, 0, 0, ${coreAlpha * 0.65})`);
        grad.addColorStop(1, `rgba(0, 0, 0, ${edgeAlpha})`);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Spawn flying spore debris particles (capped at 120 max)
        if (particles.length < 120 && Math.random() < 0.75) {
          const pAngle = Math.random() * Math.PI * 2;
          const pSpeed = 1.2 + Math.random() * 3.4;
          particles.push({
            x: cx + (Math.random() - 0.5) * 14,
            y: cy + (Math.random() - 0.5) * 14,
            vx: Math.cos(pAngle) * pSpeed + (x - prevX) * 0.12,
            vy: Math.sin(pAngle) * pSpeed + (y - prevY) * 0.12,
            radius: 0.8 + Math.random() * 1.8,
            color: Math.random() < 0.55 ? 'rgba(215, 230, 212,' : 'rgba(45, 68, 38,',
            life: 1.0,
          });
        }
      }
      ctx.restore();

      // Kinetic Decrement calibrated for smooth localized scrubbing
      const decrementAmount = Math.max(0.04, Math.min(0.25, dist * 0.002));
      rotProgress = Math.max(0, rotProgress - decrementAmount);
      lastRenderedProgress = Math.min(lastRenderedProgress, rotProgress);

      if (settings.soundEnabled) {
        scrubAudio.play();
      }

      if (rotProgress <= 0) {
        rotProgress = 0;
        scrubAudio.stop();
      }
      updateHud();
    }

    // User Interaction Listeners
    function registerInteraction(e?: MouseEvent) {
      const now = Date.now();
      const dt = Math.max(1, now - prevMouseTime);

      if (e && e.type === 'mousemove') {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        const distance = Math.hypot(dx, dy);
        const speed = distance / dt; // pixels per ms

        // Frantic scrubbing threshold: rapid shaking (> 1.6 px/ms)
        if (speed > 1.6 && rotProgress > 0) {
          performScrub(e.clientX, e.clientY, prevMouseX, prevMouseY, speed);
        }

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        prevMouseTime = now;
      }

      lastActiveTime = now;
      try {
        sessionStorage.setItem('tab_rot_last_active', String(now));
      } catch {}
    }

    ['mousemove', 'keydown', 'scroll', 'click'].forEach((event) => {
      window.addEventListener(
        event,
        (e) => {
          registerInteraction(e instanceof MouseEvent ? e : undefined);
        },
        { passive: true }
      );
    });

    // Calculation: determine accrued rot for any inactive duration
    function calculateAccruedRot(inactiveMs: number): number {
      const inactiveSeconds = inactiveMs / 1000;
      if (inactiveSeconds < settings.idleThreshold) return 0;
      const activeRotSeconds = inactiveSeconds - settings.idleThreshold;
      const baseDuration = 60 / settings.growthSpeed;
      const normalizedTime = Math.min(1, activeRotSeconds / baseDuration);
      return Math.min(100, Math.pow(normalizedTime, 1.4) * 100);
    }

    // Apply accrued rot immediately onto the canvas
    function applyAccruedRot() {
      if (!settings.enabled) return;
      const now = Date.now();
      const target = calculateAccruedRot(now - lastActiveTime);
      if (target > rotProgress) {
        const fromP = lastRenderedProgress;
        rotProgress = target;
        renderMoldGrowth(fromP, rotProgress);
        lastRenderedProgress = rotProgress;
        updateHud();
      }
    }

    // Immediately check and apply rot on script start (e.g. background tab or restored session)
    applyAccruedRot();

    // 1-second background interval: continues accumulating & rendering rot in background tabs!
    window.setInterval(() => {
      if (!settings.enabled) return;
      const isInactive = document.hidden || !document.hasFocus();
      if (isInactive) {
        applyAccruedRot();
      }
    }, 1000);

    // Multi-tab lifecycle listeners
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        scrubAudio.stop();
      } else {
        applyAccruedRot();
      }
    });

    window.addEventListener('focus', () => {
      applyAccruedRot();
    });

    window.addEventListener('blur', () => {
      scrubAudio.stop();
      try {
        sessionStorage.setItem('tab_rot_last_active', String(lastActiveTime));
      } catch {}
    });

    // Main Simulation Loop via requestAnimationFrame (runs smoothly when tab is visible)
    function simulationLoop(_frameTimestamp: number) {
      if (settings.enabled) {
        applyAccruedRot();
      }

      // Animate flying spore debris particles
      if (particleCtx && particles.length > 0) {
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          if (!p) continue;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.07;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.life -= 0.045;

          if (p.life <= 0) {
            particles.splice(i, 1);
          } else {
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            particleCtx.fillStyle = `${p.color} ${p.life * 0.85})`;
            particleCtx.fill();
          }
        }
        if (particles.length === 0) {
          particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        }
      }

      requestAnimationFrame(simulationLoop);
    }

    requestAnimationFrame(simulationLoop);

    // Load Settings from storage
    browser.storage.local
      .get('tabRotSettings')
      .then((res) => {
        if (res && typeof res === 'object' && 'tabRotSettings' in res) {
          const stored = res.tabRotSettings;
          if (stored && typeof stored === 'object') {
            settings = { ...settings, ...stored };
          }
        }
      })
      .catch(() => {});

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'tabRotSettings' in changes) {
        const change = changes.tabRotSettings;
        if (change && typeof change === 'object' && 'newValue' in change) {
          const updated = change.newValue;
          if (updated && typeof updated === 'object') {
            settings = { ...settings, ...updated };
            if (!settings.enabled) {
              sanitizeTab();
            }
          }
        }
      }
    });

    // Handle Direct Runtime Messages from Popup
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!message || typeof message !== 'object') return;
      if ('type' in message) {
        if (message.type === 'ROT_NOW') {
          // Live Demo Action: immediately trigger 95% rot progress
          lastActiveTime = Date.now() - (settings.idleThreshold * 1000 + 90000);
          try {
            sessionStorage.setItem('tab_rot_last_active', String(lastActiveTime));
          } catch {}
          applyAccruedRot();
          return Promise.resolve({ status: 'blooming', rotProgress });
        }

        if (message.type === 'CLEAN_MOLD') {
          sanitizeTab();
          return Promise.resolve({ status: 'clean', rotProgress: 0 });
        }

        if (message.type === 'GET_STATUS') {
          return Promise.resolve({ rotProgress, isActivelyRotting: rotProgress > 0, settings });
        }
      }
    });
  },
});
