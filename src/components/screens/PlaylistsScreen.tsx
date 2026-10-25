import React, { useState } from 'react';
import { Plus, ListMusic, Send } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { PlaylistDetailView } from './PlaylistDetailView';

interface PlaylistsScreenProps {
  selectedPlaylistId?: string | null;
  onClearSelectedPlaylist?: () => void;
}

export const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({
  selectedPlaylistId,
  onClearSelectedPlaylist,
}) => {
  const { playlists, tracks, createPlaylist } = useMusic();
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(selectedPlaylistId || null);
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // If a playlist is selected, display its details
  const activePlaylist = playlists.find((pl) => pl.id === (activePlaylistId || selectedPlaylistId));

  if (activePlaylist) {
    return (
      <PlaylistDetailView
        playlist={activePlaylist}
        onBack={() => {
          setActivePlaylistId(null);
          if (onClearSelectedPlaylist) onClearSelectedPlaylist();
        }}
      />
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const created = await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreatingModalOpen(false);
    setActivePlaylistId(created.id);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-notch pb-8 space-y-4 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-black dark:text-white tracking-tight">Playlists</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => setIsCreatingModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold flex items-center gap-1.5 shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <ListMusic className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">No Playlists Yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Create custom playlists or synchronize music from Telegram to automatically generate playlists.
          </p>
          <button
            onClick={() => setIsCreatingModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white text-xs font-semibold inline-flex items-center gap-2 mt-2 border border-zinc-200 dark:border-zinc-700"
          >
            <Plus className="w-4 h-4" />
            Create First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {playlists.map((playlist) => {
            const firstTrackWithArt = playlist.trackIds
              .map((id) => tracks.find((t) => t.id === id))
              .find((t) => t && t.artworkUrl);

            return (
              <div
                key={playlist.id}
                onClick={() => setActivePlaylistId(playlist.id)}
                className="p-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-850/90 border border-zinc-200 dark:border-zinc-800 transition cursor-pointer flex flex-col justify-between space-y-2.5 group active:scale-[0.98]"
              >
                <div className="w-full aspect-square rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative shadow-sm flex items-center justify-center border border-zinc-300/40 dark:border-zinc-700/40">
                  {firstTrackWithArt?.artworkUrl ? (
                    <img
                      src={firstTrackWithArt.artworkUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                      <ListMusic className="w-10 h-10 stroke-[1.2]" />
                    </div>
                  )}

                  {playlist.sourceType === 'telegram' && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 dark:bg-white/60 text-white dark:text-black backdrop-blur-md">
                      <Send className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-black dark:text-white truncate">
                    {playlist.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Playlist Modal */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-black dark:text-white">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="Playlist name (e.g. Favorites, Gym)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white placeholder-zinc-400"
              />
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreatingModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black disabled:opacity-50 text-xs font-semibold transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
