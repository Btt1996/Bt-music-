import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListPlus,
  ListMusic,
  Send,
  Sparkles,
  Gauge,
  Activity,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { formatDuration } from '../../utils/id3Parser';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { QueueModal } from './QueueModal';
import { SmartMixDrawer } from './SmartMixDrawer';
import { VolumeControl } from './VolumeControl';

export const FullScreenPlayer: React.FC = () => {
  const {
    playerState,
    isFullScreenPlayerOpen,
    setIsFullScreenPlayerOpen,
    togglePlayPause,
    seekTo,
    nextTrack,
    prevTrack,
    toggleShuffle,
    cycleRepeatMode,
    toggleFavorite,
    setPlaybackRate,
  } = useMusic();

  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSmartMixOpen, setIsSmartMixOpen] = useState(false);

  // Seeking Interaction State
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragSeekTime, setDragSeekTime] = useState(0);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Btt Signature Play/Resume Split Letter Micro-Interaction State
  const [isBttSplitting, setIsBttSplitting] = useState(false);
  const bttAnimTimeoutRef = useRef<number | null>(null);

  const handlePlayPauseClick = () => {
    setIsBttSplitting(true);
    if (bttAnimTimeoutRef.current) clearTimeout(bttAnimTimeoutRef.current);
    bttAnimTimeoutRef.current = window.setTimeout(() => {
      setIsBttSplitting(false);
    }, 650);

    togglePlayPause();
  };

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    isLoading,
    playbackRate,
    smartMixConfig,
    isSmartMixBlending,
    activeAnalysis,
  } = playerState;

  // Sync dragSeekTime when not actively dragging
  useEffect(() => {
    if (!isDraggingSeek) {
      setDragSeekTime(currentTime);
    }
  }, [currentTime, isDraggingSeek]);

  if (!isFullScreenPlayerOpen || !currentTrack) return null;

  const activeDuration = duration > 0 ? duration : currentTrack.duration || 180;
  const displayTime = isDraggingSeek ? dragSeekTime : currentTime;
  const progressPercent = activeDuration > 0 ? Math.min(100, Math.max(0, (displayTime / activeDuration) * 100)) : 0;

  // Timeline Calculations
  const calculateSeekFromEvent = (clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    return fraction * activeDuration;
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSeek(true);
    const targetTime = calculateSeekFromEvent(e.clientX);
    setDragSeekTime(targetTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const movedTime = calculateSeekFromEvent(moveEvent.clientX);
      setDragSeekTime(movedTime);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const finalTime = calculateSeekFromEvent(upEvent.clientX);
      setIsDraggingSeek(false);
      seekTo(finalTime);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    setIsDraggingSeek(true);
    const targetTime = calculateSeekFromEvent(e.touches[0].clientX);
    setDragSeekTime(targetTime);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      const movedTime = calculateSeekFromEvent(moveEvent.touches[0].clientX);
      setDragSeekTime(movedTime);
    };

    const handleTouchEnd = (endEvent: TouchEvent) => {
      const touch = endEvent.changedTouches[0];
      const finalTime = touch ? calculateSeekFromEvent(touch.clientX) : dragSeekTime;
      setIsDraggingSeek(false);
      seekTo(finalTime);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Speed options cycle
  const cycleSpeed = () => {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-white dark:bg-black text-black dark:text-white flex flex-col justify-between px-6 pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+0.75rem),1.25rem)] overflow-hidden animate-in slide-in-from-bottom duration-300 select-none transition-colors duration-200">
        {/* Subtle Ambient Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent to-black/5 dark:to-white/5 pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between h-14">
          <button
            onClick={() => setIsFullScreenPlayerOpen(false)}
            className="p-3 -ml-2 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 transition"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-7 h-7" />
          </button>

          <div className="text-center">
            <span className="text-[11px] uppercase font-black tracking-widest text-black dark:text-white flex items-center justify-center gap-1.5">
              BTT MUSIC
              {isSmartMixBlending && (
                <span className="px-2 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold">
                  Mixing
                </span>
              )}
            </span>
            {currentTrack.telegramSource && (
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                <Send className="w-3 h-3" />
                <span className="truncate max-w-[180px]">
                  {currentTrack.telegramSource.chatTitle || 'Telegram Audio'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Smart Mix Trigger */}
            <button
              onClick={() => setIsSmartMixOpen(true)}
              className={`p-2.5 rounded-full transition active:scale-95 relative ${
                smartMixConfig.enabled
                  ? 'text-black dark:text-white bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Btt Smart Mix"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            {/* Queue Toggle */}
            <button
              onClick={() => setIsQueueOpen(true)}
              className="p-2.5 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 active:scale-95 transition relative"
              aria-label="Open queue"
            >
              <ListMusic className="w-5 h-5" />
              {playerState.queue.length > 1 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-black dark:bg-white" />
              )}
            </button>
          </div>
        </div>

        {/* Large Album Artwork Card */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-4 my-auto">
          <div className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative group">
            {currentTrack.artworkUrl ? (
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <img
                src="/app-logo.png"
                alt="Btt Music"
                className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-105"
              />
            )}

            {/* Smart Mix Harmonic Badge */}
            {activeAnalysis && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono font-semibold text-black dark:text-white flex items-center gap-1.5 shadow-sm">
                <Activity className="w-3 h-3 text-black dark:text-white" />
                <span>{activeAnalysis.bpm} BPM</span>
                <span>•</span>
                <span>{activeAnalysis.camelot}</span>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Track Title, Artist & Actions */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white truncate tracking-tight">
                {currentTrack.title}
              </h2>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 font-medium truncate mt-0.5">
                {currentTrack.artist || 'Unknown Artist'}
              </p>
              {currentTrack.album && currentTrack.album !== 'Unknown Album' && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-medium">
                  {currentTrack.album}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => toggleFavorite(currentTrack.id)}
                className={`p-3 rounded-full transition active:scale-90 ${
                  currentTrack.isFavorite
                    ? 'text-black dark:text-white bg-zinc-200 dark:bg-zinc-800'
                    : 'text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
                aria-label={currentTrack.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-6 h-6 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={() => setIsAddToPlaylistOpen(true)}
                className="p-3 text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 active:scale-90 transition"
                aria-label="Add to playlist"
              >
                <ListPlus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Scrubber Timeline */}
          <div className="space-y-1.5">
            <div
              ref={progressBarRef}
              onMouseDown={handleTimelineMouseDown}
              onTouchStart={handleTimelineTouchStart}
              className="relative w-full h-7 flex items-center cursor-pointer group"
            >
              {/* Timeline Track Background */}
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative group-hover:h-2 transition-all">
                {/* Played Progress Bar */}
                <div
                  className="h-full bg-black dark:bg-white rounded-full transition-all duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Thumb */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-black dark:bg-white shadow-md transition-transform ${
                  isDraggingSeek ? 'scale-125 ring-4 ring-black/20 dark:ring-white/20' : 'group-hover:scale-110'
                }`}
                style={{ left: `${progressPercent}%` }}
              />

              {/* Drag Position Live Tooltip */}
              {isDraggingSeek && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold shadow-lg pointer-events-none"
                  style={{ left: `${progressPercent}%` }}
                >
                  {formatDuration(displayTime)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
              <span className={isDraggingSeek ? 'text-black dark:text-white font-bold' : ''}>
                {formatDuration(displayTime)}
              </span>
              <span>{formatDuration(activeDuration)}</span>
            </div>
          </div>

          {/* Primary Controls Row */}
          <div className="flex items-center justify-between px-2 pt-1">
            {/* Shuffle Toggle */}
            <button
              onClick={toggleShuffle}
              className={`p-3 rounded-full transition active:scale-90 ${
                isShuffle
                  ? 'text-black dark:text-white bg-zinc-200 dark:bg-zinc-800'
                  : 'text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white'
              }`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Previous Track */}
            <button
              onClick={prevTrack}
              className="p-3 text-black dark:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 active:scale-90 transition"
              aria-label="Previous track"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            {/* Prominent High-Contrast Play/Pause with Btt Splitting Letters Micro-Interaction */}
            <button
              onClick={handlePlayPauseClick}
              className="w-18 h-18 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-all duration-300 shadow-2xl shadow-black/20 dark:shadow-white/20 relative overflow-hidden select-none group"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBttSplitting ? (
                <div className="flex items-center justify-center font-black text-sm tracking-widest uppercase pointer-events-none">
                  <span className="inline-block animate-btt-split-left font-black">B</span>
                  <span className="inline-block animate-btt-split-mid font-black mx-0.5">t</span>
                  <span className="inline-block animate-btt-split-right font-black">t</span>
                </div>
              ) : isPlaying ? (
                <Pause className="w-8 h-8 fill-current transition-transform duration-200" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1 transition-transform duration-200" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={nextTrack}
              className="p-3 text-black dark:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 active:scale-90 transition"
              aria-label="Next track"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            {/* Repeat Toggle */}
            <button
              onClick={cycleRepeatMode}
              className={`p-3 rounded-full transition active:scale-90 ${
                repeatMode !== 'off'
                  ? 'text-black dark:text-white bg-zinc-200 dark:bg-zinc-800'
                  : 'text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white'
              }`}
              aria-label="Repeat mode"
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Secondary Controls: Speed & Smart Mix status */}
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              onClick={cycleSpeed}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition active:scale-95 flex items-center gap-1.5"
              title="Playback Speed"
            >
              <Gauge className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>{playbackRate}x Speed</span>
            </button>

            <button
              onClick={() => setIsSmartMixOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 border active:scale-95 ${
                smartMixConfig.enabled
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Mix: {smartMixConfig.enabled ? `${smartMixConfig.duration}s` : 'Off'}</span>
            </button>
          </div>

          {/* Monochrome Volume Control */}
          <div className="pt-0.5 px-1 pb-1">
            <VolumeControl showPresets={true} />
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <AddToPlaylistModal
        track={currentTrack}
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
      />

      <QueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
      />

      <SmartMixDrawer
        isOpen={isSmartMixOpen}
        onClose={() => setIsSmartMixOpen(false)}
      />
    </>
  );
};
