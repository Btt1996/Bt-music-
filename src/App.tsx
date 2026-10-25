import React, { useState, useRef } from 'react';
import { MusicProvider, useMusic } from './context/MusicContext';
import { BottomNav, TabType } from './components/navigation/BottomNav';
import { MiniPlayer } from './components/player/MiniPlayer';
import { FullScreenPlayer } from './components/player/FullScreenPlayer';
import { HomeScreen } from './components/screens/HomeScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { PlaylistsScreen } from './components/screens/PlaylistsScreen';
import { SyncScreen } from './components/screens/SyncScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { Toast } from './components/common/Toast';
import { parseAudioMetadata } from './utils/id3Parser';
import { saveTrack, savePlaylist } from './services/db';
import { Track, Playlist } from './types/music';

function MainLayout() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const { toastMessage, playerState, refreshLibrary, showToast, playlists, settings } = useMusic();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGlobalFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    const importedIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const meta = await parseAudioMetadata(file, file.name);
        const trackId = `local_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

        const track: Track = {
          id: trackId,
          title: meta.title || file.name.replace(/\.[^/.]+$/, ''),
          artist: meta.artist || 'Unknown Artist',
          album: meta.album || 'My Files',
          duration: meta.duration || 0,
          fileSize: file.size,
          mimeType: file.type || 'audio/mpeg',
          fileName: file.name,
          downloadDate: Date.now(),
          isFavorite: false,
          playCount: 0,
          artworkUrl: meta.artworkUrl,
          telegramSource: {
            chatTitle: 'Imported Audio',
            sourceType: 'manual',
          },
        };

        await saveTrack(track, file);
        importedIds.push(trackId);
        successCount++;
      } catch (err) {
        console.warn('Error importing file:', file.name, err);
      }
    }

    if (importedIds.length > 0 && settings.autoCreatePlaylists) {
      const plName = 'Imported Music';
      const existingPl = playlists.find((p) => p.name === plName);
      if (existingPl) {
        const merged = Array.from(new Set([...existingPl.trackIds, ...importedIds]));
        await savePlaylist({ ...existingPl, trackIds: merged, updatedAt: Date.now() });
      } else {
        const newPl: Playlist = {
          id: `pl_${Date.now()}`,
          name: plName,
          sourceType: 'manual',
          trackIds: importedIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await savePlaylist(newPl);
      }
    }

    await refreshLibrary();
    showToast(`Imported ${successCount} track${successCount !== 1 ? 's' : ''}!`);
    e.target.value = '';
  };

  const handleOpenPlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setCurrentTab('playlists');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white dark:bg-black text-black dark:text-white flex flex-col justify-between selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200">
      {/* Hidden Global Audio File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg"
        onChange={handleGlobalFiles}
        className="hidden"
      />

      {/* Main View Area */}
      <main
        className={`flex-1 flex flex-col ${
          playerState.currentTrack
            ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]'
            : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))]'
        }`}
      >
        {currentTab === 'home' && (
          <HomeScreen
            onGoToTab={(tab) => {
              setSelectedPlaylistId(null);
              setCurrentTab(tab);
            }}
            onOpenPlaylist={handleOpenPlaylist}
            onTriggerFileInput={() => fileInputRef.current?.click()}
          />
        )}

        {currentTab === 'library' && <LibraryScreen />}

        {currentTab === 'playlists' && (
          <PlaylistsScreen
            selectedPlaylistId={selectedPlaylistId}
            onClearSelectedPlaylist={() => setSelectedPlaylistId(null)}
          />
        )}

        {currentTab === 'sync' && <SyncScreen fileInputRef={fileInputRef} />}

        {currentTab === 'settings' && <SettingsScreen />}
      </main>

      {/* Persistent Mini Player */}
      <MiniPlayer />

      {/* Fullscreen Player Modal */}
      <FullScreenPlayer />

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedPlaylistId(null);
          setCurrentTab(tab);
        }}
      />

      {/* Global Toast */}
      <Toast message={toastMessage} />
    </div>
  );
}

export default function App() {
  return (
    <MusicProvider>
      <MainLayout />
    </MusicProvider>
  );
}
