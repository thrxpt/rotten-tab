
interface ExtensionSettings {
  enabled: boolean;
  idleThreshold: number; // in seconds, default 30
  growthSpeed: number; // multiplier: 1, 5, 10
  soundEnabled: boolean;
}

interface MoldCluster {
  edge: 'top' | 'bottom' | 'left' | 'right';
  u: number;
  reachFactor: number;
  baseRadius: number;
  seed: number;
}

interface SatelliteMold {
  nx: number;
  ny: number;
  triggerProgress: number;
  maxRadius: number;
  seed: number;
}

class ScrubAudioPlayer {
  private pool: HTMLAudioElement[] = [];
  private poolIndex = 0;
  private lastPlayTime = 0;
  private url: string;

  constructor() {
    this.url = browser.runtime.getURL('/scrub.mp3');
  }

  play() {
    const now = Date.now();
    // Debounce rapid strokes to avoid cacophony
    if (now - this.lastPlayTime < 75) return;
    this.lastPlayTime = now;

    try {
      if (this.pool.length === 0) {
        for (let i = 0; i < 4; i++) {
          const audio = new Audio(this.url);
          audio.volume = 0.6;
          this.pool.push(audio);
        }
      }
      const audio = this.pool[this.poolIndex];
      this.poolIndex = (this.poolIndex + 1) % this.pool.length;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {
      // Audio playback fails gracefully
    }
  }

  stop() {
    for (const audio of this.pool) {
      audio.pause();
      audio.currentTime = 0;
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
    let lastInteractionTime = Date.now();
    let isActivelyRotting = false;
    let rotStartTime: number | null = null;
    let backgroundedAt: number | null = null;

    // Fast-Forward Bloom Animation state
    let bloomTarget: number | null = null;
    let bloomStartProgress = 0;
    let bloomStartTime = 0;
    const BLOOM_DURATION_MS = 1400;

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

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
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

    // 6. Generate Procedural Mold Clusters & Satellite Spores
    const clusters: MoldCluster[] = [];
    const CLUSTERS_PER_EDGE = 24;
    const edges: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];

    for (const edge of edges) {
      for (let i = 0; i < CLUSTERS_PER_EDGE; i++) {
        clusters.push({
          edge,
          u: (i + 0.15 + Math.random() * 0.7) / CLUSTERS_PER_EDGE,
          reachFactor: 0.35 + Math.random() * 0.65,
          baseRadius: 24 + Math.random() * 36,
          seed: Math.random() * 100,
        });
      }
    }

    const satellites: SatelliteMold[] = [];
    const SATELLITE_COUNT = 32;
    for (let i = 0; i < SATELLITE_COUNT; i++) {
      satellites.push({
        nx: 0.08 + Math.random() * 0.84,
        ny: 0.08 + Math.random() * 0.84,
        triggerProgress: 10 + Math.random() * 70,
        maxRadius: 26 + Math.random() * 46,
        seed: Math.random() * 100,
      });
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

    // Procedural Biological Mold Painter
    function renderMoldGrowth(fromProgress: number, toProgress: number) {
      if (!ctx || toProgress <= fromProgress) return;

      const w = canvas.width;
      const h = canvas.height;
      const minDim = Math.min(w, h);
      const maxReach = (toProgress / 100) * (minDim * 0.38);

      // 1. Water Stain Seepage Gradient along Viewport Edges
      const edges: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
      const reach = maxReach * 1.35;
      if (reach > 6) {
        for (const edge of edges) {
          const grad = ctx.createLinearGradient(
            edge === 'right' ? w - reach : 0,
            edge === 'bottom' ? h - reach : 0,
            edge === 'left' ? reach : (edge === 'right' ? w : 0),
            edge === 'top' ? reach : (edge === 'bottom' ? h : 0)
          );
          grad.addColorStop(0, edge === 'left' || edge === 'top' ? 'rgba(50, 42, 22, 0.28)' : 'rgba(50, 42, 22, 0)');
          grad.addColorStop(1, edge === 'left' || edge === 'top' ? 'rgba(50, 42, 22, 0)' : 'rgba(50, 42, 22, 0.28)');
          ctx.fillStyle = grad;

          if (edge === 'top') ctx.fillRect(0, 0, w, reach);
          else if (edge === 'bottom') ctx.fillRect(0, h - reach, w, reach);
          else if (edge === 'left') ctx.fillRect(0, 0, reach, h);
          else if (edge === 'right') ctx.fillRect(w - reach, 0, reach, h);
        }
      }

      // 2. Continuous Necrotic Base Bed along Borders
      const coreReach = maxReach * 0.75;
      if (coreReach > 6) {
        for (const edge of edges) {
          const grad = ctx.createLinearGradient(
            edge === 'right' ? w - coreReach : 0,
            edge === 'bottom' ? h - coreReach : 0,
            edge === 'left' ? coreReach : (edge === 'right' ? w : 0),
            edge === 'top' ? coreReach : (edge === 'bottom' ? h : 0)
          );
          grad.addColorStop(0, edge === 'left' || edge === 'top' ? 'rgba(12, 18, 10, 0.85)' : 'rgba(12, 18, 10, 0)');
          grad.addColorStop(0.7, edge === 'left' || edge === 'top' ? 'rgba(22, 34, 18, 0.65)' : 'rgba(22, 34, 18, 0.35)');
          grad.addColorStop(1, edge === 'left' || edge === 'top' ? 'rgba(22, 34, 18, 0)' : 'rgba(12, 18, 10, 0.85)');
          ctx.fillStyle = grad;

          if (edge === 'top') ctx.fillRect(0, 0, w, coreReach);
          else if (edge === 'bottom') ctx.fillRect(0, h - coreReach, w, coreReach);
          else if (edge === 'left') ctx.fillRect(0, 0, coreReach, h);
          else if (edge === 'right') ctx.fillRect(w - coreReach, 0, coreReach, h);
        }
      }

      // 3. Dense Overlapping Mold Clusters along Frontiers
      for (const cluster of clusters) {
        const clusterReach = maxReach * cluster.reachFactor;
        const currentReach = (toProgress / 100) * clusterReach;
        const prevReach = (fromProgress / 100) * clusterReach;
        if (currentReach <= prevReach) continue;

        let px = 0;
        let py = 0;
        switch (cluster.edge) {
          case 'top':
            px = cluster.u * w;
            py = currentReach * 0.7;
            break;
          case 'bottom':
            px = cluster.u * w;
            py = h - currentReach * 0.7;
            break;
          case 'left':
            px = currentReach * 0.7;
            py = cluster.u * h;
            break;
          case 'right':
            px = w - currentReach * 0.7;
            py = cluster.u * h;
            break;
        }

        const patchRadius = cluster.baseRadius * (0.6 + 0.4 * (toProgress / 100));
        drawMoldPatch(px, py, patchRadius, 0.95);
      }

      // 4. Expanding Concentric Satellite Mold Colonies
      for (const sat of satellites) {
        if (toProgress >= sat.triggerProgress) {
          const denom = Math.max(1, 100 - sat.triggerProgress + 10);
          const frac = Math.min(1, (toProgress - sat.triggerProgress) / denom);
          const prevFrac = fromProgress >= sat.triggerProgress
            ? Math.min(1, (fromProgress - sat.triggerProgress) / denom)
            : 0;

          if (frac > prevFrac) {
            const cx = sat.nx * w;
            const cy = sat.ny * h;
            const currentR = frac * sat.maxRadius;
            drawMoldPatch(cx, cy, currentR, 1.25);
          }
        }
      }

      // 5. Airborne Stray Spore Dust (subtle speckles drifting onto text)
      const dustCount = Math.floor((toProgress - fromProgress) * 4);
      for (let s = 0; s < dustCount; s++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        const distFromEdge = Math.min(sx, w - sx, sy, h - sy);
        if (distFromEdge < maxReach * 1.8 || Math.random() < 0.15) {
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
    }

    // Sanitization: Full Reset
    function sanitizeTab() {
      rotProgress = 0;
      lastRenderedProgress = 0;
      bloomTarget = null;
      isActivelyRotting = false;
      rotStartTime = null;
      lastInteractionTime = Date.now();
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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

        const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      // Kinetic Decrement
      const decrementAmount = Math.max(0.8, Math.min(3.5, dist * 0.035));
      rotProgress = Math.max(0, rotProgress - decrementAmount);

      if (settings.soundEnabled) {
        scrubAudio.play();
      }

      if (rotProgress <= 0) {
        sanitizeTab();
      } else {
        updateHud();
      }
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

      lastInteractionTime = now;

      // Halt active exponential growth on normal user interaction
      if (isActivelyRotting && !bloomTarget) {
        isActivelyRotting = false;
        rotStartTime = null;
      }
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

    // Background Stagnation Tracking via VisibilityChange
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        backgroundedAt = Date.now();
      } else {
        if (backgroundedAt && settings.enabled) {
          const stagnantSeconds = (Date.now() - backgroundedAt) / 1000;
          backgroundedAt = null;

          if (stagnantSeconds >= settings.idleThreshold) {
            // Tab was hoarded in background! Calculate accrued rot progress
            const effectiveStagnant = stagnantSeconds - settings.idleThreshold;
            const accrued = Math.min(95, Math.pow(effectiveStagnant / (60 / settings.growthSpeed), 1.5) * 60);

            bloomStartProgress = rotProgress;
            bloomTarget = Math.min(100, rotProgress + Math.max(15, accrued));
            bloomStartTime = performance.now();

          }
        }
        lastInteractionTime = Date.now();
      }
    });

    // Main Simulation Loop via requestAnimationFrame
    function simulationLoop(frameTimestamp: number) {
      if (settings.enabled) {
        const now = Date.now();

        // 1. Handle Fast-Forward Bloom Animation if active
        if (bloomTarget !== null) {
          const elapsed = frameTimestamp - bloomStartTime;
          const progressRatio = Math.min(1, elapsed / BLOOM_DURATION_MS);
          const easeRatio = 1 - Math.pow(1 - progressRatio, 3); // Cubic ease-out

          rotProgress = bloomStartProgress + (bloomTarget - bloomStartProgress) * easeRatio;

          if (rotProgress > lastRenderedProgress) {
            renderMoldGrowth(lastRenderedProgress, rotProgress);
            lastRenderedProgress = rotProgress;
          }
          updateHud();

          if (progressRatio >= 1) {
            bloomTarget = null;
          }
        } else {
          // 2. Normal Inactivity Engine
          const idleSeconds = (now - lastInteractionTime) / 1000;

          if (idleSeconds >= settings.idleThreshold && rotProgress < 100) {
            if (!isActivelyRotting) {
              isActivelyRotting = true;
              rotStartTime = now;
            }

            if (rotStartTime) {
              const activeRotSeconds = (now - rotStartTime) / 1000;
              // Exponential Spore Bloom Curve (reaches 100% in 60s at 1x speed)
              const baseDuration = 60 / settings.growthSpeed;
              const normalizedTime = Math.min(1, activeRotSeconds / baseDuration);
              const targetProgress = Math.min(100, Math.pow(normalizedTime, 1.8) * 100);

              if (targetProgress > rotProgress) {
                rotProgress = targetProgress;
                renderMoldGrowth(lastRenderedProgress, rotProgress);
                lastRenderedProgress = rotProgress;
                updateHud();
              }
            }
          }
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
          // Live Demo Action: immediately trigger fast-forward bloom to 90-100%
          bloomStartProgress = rotProgress;
          bloomTarget = 95;
          bloomStartTime = performance.now();
          return Promise.resolve({ status: 'blooming', rotProgress });
        }

        if (message.type === 'CLEAN_MOLD') {
          sanitizeTab();
          return Promise.resolve({ status: 'clean', rotProgress: 0 });
        }

        if (message.type === 'GET_STATUS') {
          return Promise.resolve({ rotProgress, isActivelyRotting, settings });
        }
      }
    });
  },
});
