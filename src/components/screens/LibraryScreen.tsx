import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  MoreVertical,
  Play,
  Heart,
  Trash2,
  ListPlus,
  Info,
  CheckSquare,
  Square,
  HardDrive,
  Music,
  Send,
  X,
  Sparkles,
  Activity,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Track } from '../../types/music';
import { formatDuration, formatFileSize } from '../../utils/id3Parser';
import { TrackDetailModal } from './TrackDetailModal';
import { AddToPlaylistModal } from '../player/AddToPlaylistModal';
import { ConfirmModal } from '../common/ConfirmModal';

type SortOption = 'recent' | 'title' | 'artist' | 'album' | 'duration' | 'plays' | 'bpm';
type FilterOption = 'all' | 'favorites' | 'telegram' | 'analyzed';

export const LibraryScreen: React.FC = () => {
  const {
    tracks,
    playTrack,
    toggleFavorite,
    deleteTrack,
    deleteTracks,
    storageStats,
    addToQueue,
    playNextInQueue,
    trackAnalyses,
    batchAnalyzeTracks,
  } = useMusic();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('recent');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  // Modals state
  const [detailTrack, setDetailTrack] = useState<Track | null>(null);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id?: string; isBatch?: boolean } | null>(null);
  const [activeActionMenuTrackId, setActiveActionMenuTrackId] = useState<string | null>(null);

  // Filtered and Sorted Tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          t.fileName.toLowerCase().includes(q) ||
          (t.telegramSource?.chatTitle && t.telegramSource.chatTitle.toLowerCase().includes(q)) ||
          (t.telegramSource?.topicName && t.telegramSource.topicName.toLowerCase().includes(q)) ||
          (trackAnalyses[t.id] &&
            (trackAnalyses[t.id].camelot.toLowerCase().includes(q) ||
              trackAnalyses[t.id].key.toLowerCase().includes(q) ||
              `${trackAnalyses[t.id].bpm}`.includes(q)))
      );
    }

    // Filter type
    if (activeFilter === 'favorites') {
      result = result.filter((t) => t.isFavorite);
    } else if (activeFilter === 'telegram') {
      result = result.filter((t) => !!t.telegramSource);
    } else if (activeFilter === 'analyzed') {
      result = result.filter((t) => !!trackAnalyses[t.id]);
    }

    // Sorting
    result.sort((a, b) => {
      switch (activeSort) {
        case 'recent':
          return b.downloadDate - a.downloadDate;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'album':
          return a.album.localeCompare(b.album);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'plays':
          return (b.playCount || 0) - (a.playCount || 0);
        case 'bpm':
          return (trackAnalyses[b.id]?.bpm || 0) - (trackAnalyses[a.id]?.bpm || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [tracks, searchQuery, activeFilter, activeSort, trackAnalyses]);

  // Multi-select toggle
  const toggleSelectTrack = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedTrackIds(new Set());
    setIsMultiSelectMode(false);
  };

  const analyzedCount = Object.keys(trackAnalyses).length;

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-notch pb-8 space-y-4 max-w-lg mx-auto w-full">
      {/* Header with Title and Storage */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-black dark:text-white tracking-tight">Music Library</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
            <span>{tracks.length} songs</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-black dark:text-white" />
              {formatFileSize(storageStats.trackBytes)} stored
            </span>
            {analyzedCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {analyzedCount} analyzed
                </span>
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            if (isMultiSelectMode) clearSelection();
            else setIsMultiSelectMode(true);
          }}
          className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
            isMultiSelectMode
              ? 'bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white'
              : 'text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
          }`}
        >
          {isMultiSelectMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search title, artist, key, BPM..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-black dark:focus:border-white transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Sort Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          {(['all', 'favorites', 'telegram', 'analyzed'] as FilterOption[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full capitalize font-semibold transition flex items-center gap-1 ${
                activeFilter === f
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {f === 'analyzed' && <Sparkles className="w-3 h-3" />}
              {f === 'all' ? 'All Songs' : f === 'favorites' ? 'Favorites' : f === 'telegram' ? 'Telegram' : 'Smart Mix'}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="relative shrink-0">
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as SortOption)}
            className="appearance-none pl-7 pr-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-black dark:focus:border-white cursor-pointer"
          >
            <option value="recent">Recently Added</option>
            <option value="title">Title (A-Z)</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="duration">Longest</option>
            <option value="plays">Most Played</option>
            <option value="bpm">Tempo (BPM)</option>
          </select>
          <ArrowUpDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Multi-Select Action Bar */}
      {isMultiSelectMode && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs">
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-black dark:text-white hover:underline font-bold">
              Select All ({filteredTracks.length})
            </button>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 dark:text-zinc-300">{selectedTrackIds.size} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => batchAnalyzeTracks(Array.from(selectedTrackIds))}
              disabled={selectedTrackIds.size === 0}
              className="px-2.5 py-1.5 rounded-xl bg-black text-white dark:bg-white dark:text-black disabled:opacity-40 font-semibold flex items-center gap-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze
            </button>
            <button
              onClick={() => setDeleteConfirmTarget({ isBatch: true })}
              disabled={selectedTrackIds.size === 0}
              className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Tracks List */}
      {filteredTracks.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Music className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No matching tracks found</h4>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            {searchQuery
              ? `No results for "${searchQuery}". Try another search term.`
              : 'Your library is empty. Import songs or sync from Telegram.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTracks.map((track) => {
            const isSelected = selectedTrackIds.has(track.id);
            const isMenuOpen = activeActionMenuTrackId === track.id;
            const analysis = trackAnalyses[track.id];

            return (
              <div
                key={track.id}
                className={`relative flex items-center justify-between p-2.5 rounded-2xl border transition group ${
                  isSelected
                    ? 'bg-zinc-200 dark:bg-zinc-800 border-black dark:border-white'
                    : 'bg-zinc-100/70 dark:bg-zinc-900/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-850/80 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {/* Checkbox in multi-select mode */}
                {isMultiSelectMode && (
                  <button
                    onClick={() => toggleSelectTrack(track.id)}
                    className="p-1 mr-1 text-zinc-500 hover:text-black dark:hover:text-white"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-black dark:text-white fill-current" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                    )}
                  </button>
                )}

                {/* Track Row clickable content */}
                <div
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleSelectTrack(track.id);
                    } else {
                      playTrack(track, filteredTracks);
                    }
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0 overflow-hidden relative flex items-center justify-center border border-zinc-300/40 dark:border-zinc-700/40">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="text-xs font-semibold text-black dark:text-white truncate">
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {track.artist || 'Unknown Artist'}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex-wrap font-mono">
                      <span>{formatDuration(track.duration)}</span>
                      <span>•</span>
                      <span>{formatFileSize(track.fileSize)}</span>
                      {analysis && (
                        <>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold">
                            {analysis.bpm} BPM • {analysis.camelot}
                          </span>
                        </>
                      )}
                      {track.telegramSource && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-600 dark:text-zinc-300 flex items-center gap-0.5 font-sans">
                            <Send className="w-2.5 h-2.5" />
                            {track.telegramSource.topicName || track.telegramSource.chatTitle || 'Telegram'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Right */}
                {!isMultiSelectMode && (
                  <div className="flex items-center gap-1 shrink-0 relative">
                    <button
                      onClick={() => toggleFavorite(track.id)}
                      className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition"
                      aria-label="Favorite"
                    >
                      <Heart className={`w-4 h-4 ${track.isFavorite ? 'text-black dark:text-white fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() =>
                        setActiveActionMenuTrackId((curr) => (curr === track.id ? null : track.id))
                      }
                      className="p-2 text-zinc-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                      aria-label="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Action Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-10 z-30 w-44 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 shadow-2xl p-1.5 space-y-0.5 animate-in fade-in duration-150">
                        <button
                          onClick={() => {
                            addToQueue(track);
                            setActiveActionMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2 transition"
                        >
                          <Music className="w-3.5 h-3.5 text-black dark:text-white" />
                          Add to Queue
                        </button>
                        <button
                          onClick={() => {
                            playNextInQueue(track);
                            setActiveActionMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2 transition"
                        >
                          <Play className="w-3.5 h-3.5 text-black dark:text-white" />
                          Play Next
                        </button>
                        <button
                          onClick={() => {
                            setPlaylistTrack(track);
                            setActiveActionMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2 transition"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-black dark:text-white" />
                          Add to Playlist
                        </button>
                        <button
                          onClick={() => {
                            setDetailTrack(track);
                            setActiveActionMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2 transition"
                        >
                          <Info className="w-3.5 h-3.5 text-black dark:text-white" />
                          Song Info
                        </button>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                        <button
                          onClick={() => {
                            setDeleteConfirmTarget({ id: track.id });
                            setActiveActionMenuTrackId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete from iPhone
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <TrackDetailModal
        track={detailTrack}
        analysis={detailTrack ? trackAnalyses[detailTrack.id] : undefined}
        isOpen={!!detailTrack}
        onClose={() => setDetailTrack(null)}
        onDelete={(id) => setDeleteConfirmTarget({ id })}
        onToggleFavorite={toggleFavorite}
        onAddToPlaylist={(t) => setPlaylistTrack(t)}
      />

      <AddToPlaylistModal
        track={playlistTrack}
        isOpen={!!playlistTrack}
        onClose={() => setPlaylistTrack(null)}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        title={deleteConfirmTarget?.isBatch ? `Delete ${selectedTrackIds.size} songs?` : 'Delete song?'}
        description={
          deleteConfirmTarget?.isBatch
            ? 'This will permanently remove the selected audio files from your iPhone local storage.'
            : 'This will permanently remove this song and free up space on your device.'
        }
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (deleteConfirmTarget?.isBatch) {
            await deleteTracks(Array.from(selectedTrackIds));
            clearSelection();
          } else if (deleteConfirmTarget?.id) {
            await deleteTrack(deleteConfirmTarget.id);
          }
          setDeleteConfirmTarget(null);
        }}
        onCancel={() => setDeleteConfirmTarget(null)}
      />
    </div>
  );
};
