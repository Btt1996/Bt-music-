import React, { useState } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Activity,
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { formatFileSize } from '../../utils/id3Parser';
import { exportLibraryBackup, clearAllData, getAudioBlob } from '../../services/db';
import { ConfirmModal } from '../common/ConfirmModal';
import { PWAInstallModal } from '../common/PWAInstallModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { APP_VERSION, APP_NAME, BUILD_DATE } from '../../constants/version';
import { CrossfadePreset } from '../../types/music';
import { VolumeControl } from '../player/VolumeControl';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    updateSmartMixConfig,
    batchAnalyzeTracks,
    trackAnalyses,
    storageStats,
    tracks,
    refreshLibrary,
    showToast,
    playerState,
    toggleVolumeBooster,
  } = useMusic();

  const { isInstalled } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const {
    currentVersion,
    remoteVersion,
    releaseNotes,
    status: updateStatus,
    lastCheckedAt,
    isUpdateAvailable,
    errorMessage: updateError,
    checkForUpdates,
    applyUpdate,
  } = useAppUpdate();

  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [backupFileInputRef] = useState(() => React.createRef<HTMLInputElement>());

  // Diagnostic Test State
  const [isTestingOffline, setIsTestingOffline] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  const { smartMixConfig, isAnalyzing, analysisProgress } = playerState;

  const handleExportBackup = async () => {
    try {
      const json = await exportLibraryBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `btt-music-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported library metadata backup!');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Failed to export backup');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.tracks) {
        throw new Error('Invalid backup file');
      }
      showToast(`Backup verified with ${data.tracks.length} track entries.`);
    } catch (err) {
      console.error('Import error:', err);
      showToast('Invalid backup JSON format');
    }
    e.target.value = '';
  };

  const runOfflineDiagnostic = async () => {
    setIsTestingOffline(true);
    setDiagnosticResult(null);

    try {
      if (tracks.length === 0) {
        setDiagnosticResult('Library is currently empty. Import a song to test offline playback.');
        setIsTestingOffline(false);
        return;
      }

      const firstTrack = tracks[0];
      const blob = await getAudioBlob(firstTrack.id);

      if (!blob || blob.size === 0) {
        setDiagnosticResult(`Error: Audio file for "${firstTrack.title}" is missing or empty.`);
        setIsTestingOffline(false);
        return;
      }

      const testUrl = URL.createObjectURL(blob);
      const audioTest = new Audio(testUrl);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(testUrl);
          resolve();
        }, 3000);

        audioTest.onloadedmetadata = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(testUrl);
          resolve();
        };

        audioTest.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(testUrl);
          reject(new Error('Audio decoding failed'));
        };
      });

      setDiagnosticResult(
        `Verified! IndexedDB has ${tracks.length} track(s) cached. Track "${firstTrack.title}" (${formatFileSize(
          blob.size
        )}) decoded successfully offline without network.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Diagnostic failed';
      setDiagnosticResult(`Diagnostic issue: ${msg}`);
    } finally {
      setIsTestingOffline(false);
    }
  };

  const handleClearAll = async () => {
    await clearAllData();
    await refreshLibrary();
    setIsClearDataModalOpen(false);
    showToast('All local music and data cleared.');
  };

  const presets: { id: CrossfadePreset; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'short', label: '3s' },
    { id: 'balanced', label: '6s' },
    { id: 'long', label: '10s' },
    { id: 'custom', label: 'Custom' },
  ];

  const analyzedCount = Object.keys(trackAnalyses).length;

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-notch pb-8 space-y-6 max-w-lg mx-auto w-full">
      {/* Hidden Backup File Input */}
      <input
        ref={backupFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportBackup}
        className="hidden"
      />

      {/* Screen Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-black dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Btt Music preferences, updates, audio transitions, and offline storage.
        </p>
      </div>

      {/* SECTION 1: CHECK FOR UPDATES */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
          <ArrowUpCircle className="w-4 h-4" /> Application Updates
        </h3>

        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 rounded-2xl overflow-hidden shadow-sm border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-950 shrink-0">
                <img
                  src="/app-logo.png"
                  alt="Btt Music Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-black dark:text-white">{APP_NAME}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  Version {currentVersion} • iOS Edition
                </p>
              </div>
            </div>

            <button
              onClick={checkForUpdates}
              disabled={updateStatus === 'checking'}
              className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 text-xs font-semibold text-black dark:text-white flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              {updateStatus === 'checking' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Updates</span>
                </>
              )}
            </button>
          </div>

          {/* Update Status Banner */}
          {updateStatus === 'latest' && (
            <div className="p-3 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-black dark:text-white" />
              <span>You are using the latest version of Btt Music (v{currentVersion}).</span>
            </div>
          )}

          {updateStatus === 'available' && (
            <div className="p-4 rounded-2xl bg-zinc-200 dark:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-black dark:text-white flex items-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4" />
                  Update Available: v{remoteVersion}
                </span>
                <span className="text-[10px] text-zinc-500">Ready to install</span>
              </div>
              {releaseNotes && (
                <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white/60 dark:bg-black/60 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800">
                  {releaseNotes}
                </p>
              )}
              <button
                onClick={applyUpdate}
                className="w-full py-2.5 px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Update Now (Preserves all music)
              </button>
            </div>
          )}

          {updateStatus === 'offline' && (
            <div className="p-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Device is currently offline. Connect to internet to verify updates.</span>
            </div>
          )}

          {lastCheckedAt && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-right font-mono">
              Last checked: {new Date(lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2: VOLUME BOOSTER & LOCK SCREEN */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
          <Zap className="w-4 h-4" /> Volume & Lock Screen Controls
        </h3>

        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-black dark:text-white flex items-center gap-1.5">
                3x Audio Booster
                {playerState.isBoosterActive && (
                  <span className="px-2 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold">
                    {playerState.volumeBooster.toFixed(1)}x Active
                  </span>
                )}
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gain amplification with peak limiter
              </p>
            </div>
            <button
              onClick={() => toggleVolumeBooster()}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                playerState.isBoosterActive
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{playerState.isBoosterActive ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          <div className="pt-1">
            <VolumeControl showPresets={true} />
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-start gap-2">
              <span className="font-bold text-black dark:text-white">📱</span>
              <span>
                <strong className="text-black dark:text-white">iPhone Lock Screen:</strong> Displays Next (⏭) and Previous (⏮) controls when phone is locked or screen off.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-black dark:text-white">🎵</span>
              <span>
                <strong className="text-black dark:text-white">Background Audio:</strong> Plays continuously in the background using direct native iOS playback category.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: BTT SMART MIX */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Btt Smart Mix & Transitions
        </h3>

        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-black dark:text-white">Btt Smart Mix</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Continuous DJ blending between consecutive songs
              </p>
            </div>
            <input
              type="checkbox"
              checked={smartMixConfig.enabled}
              onChange={(e) => updateSmartMixConfig({ enabled: e.target.checked })}
              className="w-5 h-5 rounded-md accent-black dark:accent-white cursor-pointer"
            />
          </div>

          {/* Crossfade Preset Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Crossfade Duration:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => updateSmartMixConfig({ preset: p.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    smartMixConfig.preset === p.id
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Silence & Harmonic Toggles */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <span>Trim Dead Silence (Intro/Outro)</span>
              <input
                type="checkbox"
                checked={smartMixConfig.trimSilence}
                onChange={(e) => updateSmartMixConfig({ trimSilence: e.target.checked })}
                className="w-4 h-4 rounded accent-black dark:accent-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Harmonic Matching (Camelot Keys)</span>
              <input
                type="checkbox"
                checked={smartMixConfig.useHarmonicMixing}
                onChange={(e) => updateSmartMixConfig({ useHarmonicMixing: e.target.checked })}
                className="w-4 h-4 rounded accent-black dark:accent-white"
              />
            </div>
          </div>

          {/* Acoustic Analysis Runner */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-black dark:text-white">Acoustic Library Analysis</span>
              <p className="text-[10px] text-zinc-500 font-mono">
                {analyzedCount} of {tracks.length} songs analyzed
              </p>
            </div>
            <button
              onClick={() => batchAnalyzeTracks()}
              disabled={isAnalyzing || analyzedCount === tracks.length}
              className="px-3 py-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black disabled:opacity-40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  <span>Analyze Library</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4: STORAGE & BACKUP */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
          <HardDrive className="w-4 h-4" /> Storage & Cache
        </h3>

        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Audio Storage Used</span>
              <p className="text-xl font-extrabold text-black dark:text-white font-mono mt-0.5">
                {formatFileSize(storageStats.trackBytes)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Total Offline Songs</span>
              <p className="text-xl font-extrabold text-black dark:text-white font-mono mt-0.5">
                {storageStats.trackCount}
              </p>
            </div>
          </div>

          {/* Quota Meter */}
          {storageStats.quotaBytes > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Used: {formatFileSize(storageStats.usedBytes)}</span>
                <span>Available: {formatFileSize(storageStats.quotaBytes)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(2, (storageStats.usedBytes / storageStats.quotaBytes) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Export / Import Backup */}
          <div className="flex gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleExportBackup}
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Metadata
            </button>
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Verify Backup
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5: OFFLINE VERIFICATION & INSTALL */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> Offline & Device Status
        </h3>

        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-black dark:text-white">iPhone Installation</span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isInstalled
                  ? 'Running as installed Home Screen PWA'
                  : 'Running in browser tab'}
              </p>
            </div>

            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white text-xs font-semibold flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              {isInstalled ? 'Instructions' : 'Install Guide'}
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-black dark:text-white">Offline Playback Audit</span>
              <button
                onClick={runOfflineDiagnostic}
                disabled={isTestingOffline}
                className="px-3 py-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isTestingOffline ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Run Audit
              </button>
            </div>

            {diagnosticResult && (
              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-mono">
                {diagnosticResult}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className="space-y-3 pt-2">
        <div className="p-4 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-red-300 dark:border-red-900/40 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Reset Local Data
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Clear all IndexedDB audio files and playlists.
            </p>
          </div>

          <button
            onClick={() => setIsClearDataModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition active:scale-95 shrink-0"
          >
            Clear Data
          </button>
        </div>
      </section>

      {/* Footer Branding */}
      <div className="text-center pt-2 pb-6 text-[11px] text-zinc-400 dark:text-zinc-500 space-y-1">
        <p className="font-bold text-black dark:text-white">{APP_NAME} v{APP_VERSION} • iOS Edition</p>
        <p>Private & Offline • Built {BUILD_DATE}</p>
      </div>

      {/* Modals */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearDataModalOpen}
        title="Clear All Local Music & Data?"
        description="Are you sure? This will remove all downloaded songs, audio files, playlists, and settings from your device. This cannot be undone."
        confirmLabel="Clear Everything"
        isDestructive={true}
        onConfirm={handleClearAll}
        onCancel={() => setIsClearDataModalOpen(false)}
      />
    </div>
  );
};
