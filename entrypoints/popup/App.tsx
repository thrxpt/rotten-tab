import { useState, useEffect, useCallback } from 'react';
import './App.css';

interface ExtensionSettings {
  enabled: boolean;
  idleThreshold: number; // 10 to 300 seconds
  growthSpeed: number; // 1, 5, 10
  soundEnabled: boolean;
  autoCloseEnabled: boolean;
  gracePeriodSeconds: number;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  idleThreshold: 30,
  growthSpeed: 1,
  soundEnabled: true,
  autoCloseEnabled: true,
  gracePeriodSeconds: 10,
};

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (rem === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${rem}s`;
}

export default function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [rotProgress, setRotProgress] = useState<number | null>(null);
  const [isRotting, setIsRotting] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  const [tabSupported, setTabSupported] = useState<boolean>(true);

  // Load settings from storage
  useEffect(() => {
    browser.storage.local
      .get('tabRotSettings')
      .then((res) => {
        if (res && typeof res === 'object' && 'tabRotSettings' in res) {
          const stored = res.tabRotSettings;
          if (stored && typeof stored === 'object') {
            setSettings((prev) => ({ ...prev, ...stored }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Update storage whenever settings change
  const updateSettings = useCallback((newSettings: Partial<ExtensionSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      browser.storage.local.set({ tabRotSettings: merged }).catch(() => {});
      return merged;
    });
  }, []);

  // Check active tab status
  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (!activeTab || activeTab.id == null) return;

        const response: unknown = await browser.tabs.sendMessage(activeTab.id, { type: 'GET_STATUS' });
        if (!mounted) return;

        if (response && typeof response === 'object') {
          if ('rotProgress' in response && typeof response.rotProgress === 'number') {
            setRotProgress(Math.round(response.rotProgress));
          }
          if ('isActivelyRotting' in response && typeof response.isActivelyRotting === 'boolean') {
            setIsRotting(response.isActivelyRotting);
          }
          setTabSupported(true);
        }
      } catch {
        if (mounted) {
          setTabSupported(false);
        }
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 1500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Show transient toast
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast('');
    }, 2400);
  };

  // Live Demo Action: Rot Now
  const handleRotNow = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab || activeTab.id == null) {
        showToast('No active tab detected');
        return;
      }
      await browser.tabs.sendMessage(activeTab.id, { type: 'ROT_NOW' });
      showToast('🍄 Fast spore bloom triggered!');
      setRotProgress(95);
      setIsRotting(true);
    } catch {
      showToast('Cannot rot restricted page (e.g. chrome://)');
    }
  };

  // Clean Mold Action
  const handleCleanMold = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab || activeTab.id == null) {
        showToast('No active tab detected');
        return;
      }
      await browser.tabs.sendMessage(activeTab.id, { type: 'CLEAN_MOLD' });
      showToast('🧼 Tab sanitized to 0%!');
      setRotProgress(0);
      setIsRotting(false);
    } catch {
      showToast('Cannot clean restricted page');
    }
  };

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <div className="title-group">
          <h1 className="main-title">Tab Rotting Simulator</h1>
          <span className="badge">Mold Edition 🍄</span>
        </div>
      </div>

      {/* Live Status Banner */}
      <div className="status-banner">
        <span
          className={`status-dot ${
            !settings.enabled
              ? ''
              : isRotting || (rotProgress !== null && rotProgress > 0)
              ? 'rot'
              : 'active'
          }`}
        />
        <div className="status-text">
          {!tabSupported ? (
            <span>Restricted Chrome internal page</span>
          ) : !settings.enabled ? (
            <span>Simulation <strong>Disabled</strong></span>
          ) : rotProgress !== null && rotProgress > 0 ? (
            <span>
              Infestation: <strong>{rotProgress}%</strong> {isRotting ? '(Blooming)' : '(Halted)'}
            </span>
          ) : (
            <span>Watching for tab neglect</span>
          )}
        </div>
      </div>

      {/* Main Settings Box */}
      <div className="section-box">
        {/* Master Switch */}
        <div className="toggle-row">
          <div>
            <div className="label-title">Enable Mold Simulation</div>
            <div className="label-desc">Procedurally rot idle hoarded tabs</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        {/* Inactivity Threshold Slider */}
        <div className="control-group">
          <div className="control-header">
            <span className="label-title">Inactivity Threshold</span>
            <span className="control-value">{formatDuration(settings.idleThreshold)}</span>
          </div>
          <input
            type="range"
            min="10"
            max="300"
            step="5"
            className="range-slider"
            value={settings.idleThreshold}
            onChange={(e) => updateSettings({ idleThreshold: Number(e.target.value) })}
          />
        </div>

        {/* Growth Speed Multiplier */}
        <div className="control-group">
          <div className="control-header">
            <span className="label-title">Growth Speed Multiplier</span>
            <span className="control-value">{settings.growthSpeed}x</span>
          </div>
          <div className="button-group">
            {[1, 5, 10].map((speed) => (
              <button
                key={speed}
                type="button"
                className={`group-btn ${settings.growthSpeed === speed ? 'active' : ''}`}
                onClick={() => updateSettings({ growthSpeed: speed })}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="toggle-row">
          <div>
            <div className="label-title">Scrubbing Audio</div>
            <div className="label-desc">Play .mp3 audio while scrubbing</div>
          </div>
          <button
            type="button"
            className={`sound-toggle-btn ${settings.soundEnabled ? 'active' : ''}`}
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          >
            {settings.soundEnabled ? '🔊 Sound On' : '🔇 Muted'}
          </button>
        </div>

        {/* Auto-Close Dead Tabs Toggle */}
        <div className="toggle-row">
          <div>
            <div className="label-title">☠️ Auto-Close Dead Tabs</div>
            <div className="label-desc">Terminate tab 10s after reaching 100% rot</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.autoCloseEnabled}
              onChange={(e) => updateSettings({ autoCloseEnabled: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* Action Controls */}
      <div className="actions-container">
        <button type="button" className="action-btn rot" onClick={handleRotNow}>
          🍄 Rot Now (Live Demo)
        </button>
        <button type="button" className="action-btn clean" onClick={handleCleanMold}>
          🧼 Clean Mold
        </button>
      </div>

      {/* Toast Feedback */}
      <div className="toast-msg">{toast}</div>
    </div>
  );
}
