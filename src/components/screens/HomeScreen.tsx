import React, { useState } from 'react';
import { Play, Heart, RefreshCw, Send, ListMusic, Music, Wifi, WifiOff, Sparkles, Sliders, Activity } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { formatDuration, formatFileSize } from '../../utils/id3Parser';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { OnboardingView } from './OnboardingView';
import { Track } from '../../types/music';
import { SmartMixDrawer } from '../player/SmartMixDrawer';

interface HomeScreenProps {
  onGoToTab: (tab: 'home' | 'library' | 'playlists' | 'sync' | 'settings') => void;
  onOpenPlaylist: (playlistId: string) => void;
  onTriggerFileInput: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onGoToTab,
  onOpenPlaylist,
  onTriggerFileInput,
}) => {
  const { tracks, playlists, playTrack, toggleFavorite, storageStats, playerState, trackAnalyses } = useMusic();
  const isOnline = useOnlineStatus();
  const [isSmartMixDrawerOpen, setIsSmartMixDrawerOpen] = useState(false);

  // Greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (tracks.length === 0) {
    return (
      <OnboardingView
        onGoToSync={() => onGoToTab('sync')}
        onTriggerFileInput={onTriggerFileInput}
      />
    );
  }

  // Filter recently played
  const recentlyPlayed = [...tracks]
    .filter((t) => (t.playCount && t.playCount > 0) || t.lastPlayedAt)
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 6);

  // Favorite tracks
  const favoriteTracks = tracks.filter((t) => t.isFavorite).slice(0, 8);

  // Recently added
  const recentlyAdded = [...tracks].sort((a, b) => b.downloadDate - a.downloadDate).slice(0, 8);

  const smartMixConfig = playerState.smartMixConfig;

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-notch pb-8 space-y-6 max-w-lg mx-auto w-full">
      {/* Header: Brand, Greeting & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 shrink-0">
            <img
              src="/app-logo.png"
              alt="Btt Music Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-widest uppercase text-black dark:text-white">
                BTT MUSIC
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                Offline
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight mt-0.5 truncate">
              {getGreeting()}
            </h1>
          </div>
        </div>

        {/* Online / Offline status badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isOnline
              ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-black dark:text-white'
              : 'bg-zinc-200 dark:bg-zinc-850 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-black dark:bg-white" />
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Ready</span>
            </>
          )}
        </div>
      </div>

      {/* Btt Smart Mix Quick Action & Status Banner */}
      <div
        onClick={() => setIsSmartMixDrawerOpen(true)}
        className="p-4 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-750 transition-all group active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-black dark:text-white tracking-wide">
                  BTT SMART MIX
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    smartMixConfig.enabled
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {smartMixConfig.enabled
                    ? `${smartMixConfig.preset.toUpperCase()} (${smartMixConfig.duration}s)`
                    : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                {smartMixConfig.enabled
                  ? 'Continuous DJ equal-power crossfades & harmonic mixes'
                  : 'Tap to configure seamless transitions and silence trimming'}
              </p>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700 transition">
            <Sliders className="w-4 h-4" />
          </div>
        </div>

        {/* Acoustic stats strip */}
        <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-black dark:text-white">
              <Activity className="w-3 h-3" />
              {Object.keys(trackAnalyses).length}/{tracks.length} Analyzed
            </span>
            {smartMixConfig.useHarmonicMixing && (
              <span>Harmonic Match</span>
            )}
            {smartMixConfig.trimSilence && (
              <span>Trim Silence</span>
            )}
          </div>
          <span className="font-semibold text-black dark:text-white group-hover:underline">
            Configure &rarr;
          </span>
        </div>
      </div>

      {/* Prominent Quick Sync & Storage Metric Card */}
      <div className="p-4 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-black dark:text-white">Telegram Sync & Storage</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white text-[10px] font-bold">
              {tracks.length} Songs Stored
            </span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            {formatFileSize(storageStats.trackBytes)} cached offline on this iPhone
          </p>
        </div>

        <button
          onClick={() => onGoToTab('sync')}
          className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync
        </button>
      </div>

      {/* Playlists Quick Shortcuts */}
      {playlists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-1.5">
              <ListMusic className="w-4 h-4" /> Playlists
            </h3>
            <button
              onClick={() => onGoToTab('playlists')}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white font-semibold"
            >
              See all ({playlists.length})
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {playlists.slice(0, 4).map((pl) => (
              <button
                key={pl.id}
                onClick={() => onOpenPlaylist(pl.id)}
                className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition flex items-center gap-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white shrink-0">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-black dark:text-white truncate">
                    {pl.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {pl.trackIds.length} track{pl.trackIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-black dark:text-white">Recently Played</h3>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              {recentlyPlayed.length} songs
            </span>
          </div>

          <div className="space-y-2">
            {recentlyPlayed.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                analysis={trackAnalyses[track.id]}
                onPlay={() => playTrack(track, recentlyPlayed)}
                onToggleFavorite={() => toggleFavorite(track.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Favorites Carousel */}
      {favoriteTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-current" /> Favorites
            </h3>
            <button
              onClick={() => onGoToTab('library')}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white font-semibold"
            >
              View in library
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {favoriteTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, favoriteTracks)}
                className="w-28 shrink-0 cursor-pointer group space-y-1.5"
              >
                <div className="w-28 h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-sm group-hover:scale-[1.02] transition-transform">
                  {track.artworkUrl ? (
                    <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                      <Music className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-7 h-7 text-white fill-current" />
                  </div>
                </div>
                <h4 className="text-xs font-semibold text-black dark:text-white truncate">{track.title}</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-black dark:text-white">Recently Downloaded</h3>
          <button
            onClick={() => onGoToTab('library')}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white font-semibold"
          >
            All songs ({tracks.length})
          </button>
        </div>

        <div className="space-y-2">
          {recentlyAdded.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              analysis={trackAnalyses[track.id]}
              onPlay={() => playTrack(track, recentlyAdded)}
              onToggleFavorite={() => toggleFavorite(track.id)}
            />
          ))}
        </div>
      </section>

      {/* Smart Mix Drawer */}
      <SmartMixDrawer
        isOpen={isSmartMixDrawerOpen}
        onClose={() => setIsSmartMixDrawerOpen(false)}
      />
    </div>
  );
};

export const TrackRow: React.FC<{
  track: Track;
  analysis?: any;
  onPlay: () => void;
  onToggleFavorite: () => void;
}> = ({ track, analysis, onPlay, onToggleFavorite }) => {
  return (
    <div
      onClick={onPlay}
      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 transition cursor-pointer group active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0 overflow-hidden relative flex items-center justify-center border border-zinc-300/40 dark:border-zinc-700/40">
          {track.artworkUrl ? (
            <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-4 h-4 text-zinc-400" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play className="w-4 h-4 text-white fill-current ml-0.5" />
          </div>
        </div>

        <div className="min-w-0 flex-1 pr-2">
          <h4 className="text-xs font-semibold text-black dark:text-white truncate">
            {track.title}
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            <span className="truncate">{track.artist}</span>
            {track.telegramSource && (
              <>
                <span>•</span>
                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-0.5 shrink-0">
                  <Send className="w-2.5 h-2.5" />
                  {track.telegramSource.topicName || track.telegramSource.chatTitle || 'TG'}
                </span>
              </>
            )}
            {analysis && (
              <>
                <span>•</span>
                <span className="font-mono font-medium shrink-0 text-zinc-600 dark:text-zinc-400">
                  {analysis.bpm} BPM • {analysis.camelot}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
          {formatDuration(track.duration)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition"
          aria-label="Toggle favorite"
        >
          <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-current text-black dark:text-white' : ''}`} />
        </button>
      </div>
    </div>
  );
};
