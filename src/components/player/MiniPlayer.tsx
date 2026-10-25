import React from 'react';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const MiniPlayer: React.FC = () => {
  const { playerState, togglePlayPause, nextTrack, setIsFullScreenPlayerOpen } = useMusic();
  const { currentTrack, isPlaying, currentTime, duration, isLoading, isSmartMixBlending } = playerState;

  const [isBttSplitting, setIsBttSplitting] = React.useState(false);
  const animTimerRef = React.useRef<number | null>(null);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBttSplitting(true);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = window.setTimeout(() => {
      setIsBttSplitting(false);
    }, 650);
    togglePlayPause();
  };

  if (!currentTrack) return null;

  const activeDuration = duration > 0 ? duration : currentTrack.duration || 180;
  const progressPercent = activeDuration > 0 ? Math.min(100, Math.max(0, (currentTime / activeDuration) * 100)) : 0;

  return (
    <div
      className="fixed bottom-[calc(3.5rem+max(env(safe-area-inset-bottom,0px),0.5rem)+0.4rem)] left-3 right-3 z-30 max-w-lg mx-auto"
      onClick={() => setIsFullScreenPlayerOpen(true)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl dark:shadow-2xl p-2.5 flex items-center gap-3.5 cursor-pointer select-none active:scale-[0.99] transition-all">
        {/* Bottom Micro Scrubber Progress Line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Small Album Artwork */}
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0 overflow-hidden relative shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center">
          {currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <img
              src="/app-logo.png"
              alt="Btt Music"
              className="w-full h-full object-cover"
            />
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-snug">
              {currentTrack.title}
            </h4>
            {isSmartMixBlending && (
              <span className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white text-[9px] font-bold shrink-0">
                Mix
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
            {currentTrack.artist || 'Unknown Artist'}
          </p>
        </div>

        {/* Mini Controls */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 flex items-center justify-center text-black dark:text-white transition rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 relative overflow-hidden"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBttSplitting ? (
              <div className="flex items-center justify-center font-black text-[11px] tracking-wider uppercase pointer-events-none">
                <span className="inline-block animate-btt-split-left font-black">B</span>
                <span className="inline-block animate-btt-split-mid font-black">t</span>
                <span className="inline-block animate-btt-split-right font-black">t</span>
              </div>
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={nextTrack}
            className="p-2.5 text-zinc-400 hover:text-black dark:text-zinc-400 dark:hover:text-white transition rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
