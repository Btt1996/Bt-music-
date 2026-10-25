import React, { useState } from 'react';
import { Send, FolderPlus, Sparkles, Loader2 } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { SAMPLE_AUDIO_PRESETS, createToneAudioBlob } from '../../utils/sampleTracks';
import { saveTrack, savePlaylist } from '../../services/db';
import { Track, Playlist } from '../../types/music';

interface OnboardingViewProps {
  onGoToSync: () => void;
  onTriggerFileInput: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onGoToSync, onTriggerFileInput }) => {
  const { refreshLibrary, showToast } = useMusic();
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  const handleLoadSampleBundle = async () => {
    setIsLoadingSamples(true);
    try {
      const generatedTrackIds: string[] = [];

      for (let i = 0; i < SAMPLE_AUDIO_PRESETS.length; i++) {
        const preset = SAMPLE_AUDIO_PRESETS[i];
        const audioBlob = createToneAudioBlob({
          frequency: preset.frequency,
          durationSeconds: preset.duration,
          type: preset.type,
        });

        const trackId = `sample_${Date.now()}_${i}`;
        generatedTrackIds.push(trackId);

        const track: Track = {
          id: trackId,
          title: preset.title,
          artist: preset.artist,
          album: preset.album,
          duration: preset.duration,
          fileSize: audioBlob.size,
          mimeType: 'audio/wav',
          fileName: `${preset.title}.wav`,
          downloadDate: Date.now() - (SAMPLE_AUDIO_PRESETS.length - i) * 60000,
          isFavorite: i === 0,
          playCount: 0,
          telegramSource: {
            chatTitle: 'Telegram Demo Vault',
            topicName: preset.topic,
            sourceType: 'sample',
          },
        };

        await saveTrack(track, audioBlob);
      }

      const samplePlaylist: Playlist = {
        id: `pl_sample_${Date.now()}`,
        name: 'Demo Playlist',
        description: 'Auto-generated playlist for testing offline playback',
        sourceType: 'telegram',
        telegramChatTitle: 'Telegram Demo Vault',
        telegramTopic: 'Demo Music',
        trackIds: generatedTrackIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await savePlaylist(samplePlaylist);

      await refreshLibrary();
      showToast('Loaded 3 offline sample tracks!');
    } catch (err) {
      console.error('Failed to load sample tracks:', err);
      showToast('Could not generate sample tracks');
    } finally {
      setIsLoadingSamples(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 pt-notch pb-8 text-center max-w-md mx-auto my-auto space-y-6">
      {/* Official App Logo Crest */}
      <div className="relative">
        <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-xl border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
          <img
            src="/app-logo.png"
            alt="Btt Music Official Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-extrabold shadow-md">
          iOS
        </span>
      </div>

      <div>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="text-xs font-black tracking-widest uppercase text-black dark:text-white">
            BTT MUSIC
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.2 rounded-md">v1.2.0</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
          Personal Music Player for iPhone
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Zero subscriptions, zero tracking. Real offline playback, background audio, Telegram sync, and Btt Smart Mix DJ crossfading.
        </p>
      </div>

      {/* 3 Call-To-Action Cards */}
      <div className="w-full space-y-3 text-left">
        {/* Telegram Sync */}
        <button
          onClick={onGoToSync}
          className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition flex items-center gap-4 group active:scale-[0.99]"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Send className="w-5 h-5 ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-black dark:text-white">
              Sync from Telegram
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
              Connect your Bot, channel, or topics to download audio directly to iPhone.
            </p>
          </div>
        </button>

        {/* Local Files */}
        <button
          onClick={onTriggerFileInput}
          className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition flex items-center gap-4 group active:scale-[0.99]"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-black dark:text-white">
              Import Audio from Files
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
              Choose MP3, M4A, AAC, or FLAC files from your iPhone Files or iCloud Drive.
            </p>
          </div>
        </button>

        {/* Instant Sample Bundle */}
        <button
          onClick={handleLoadSampleBundle}
          disabled={isLoadingSamples}
          className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition flex items-center gap-4 group active:scale-[0.99] disabled:opacity-50"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center shrink-0">
            {isLoadingSamples ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-black dark:text-white">
              {isLoadingSamples ? 'Generating Sample Tracks...' : 'Load Instant Offline Demo Tracks'}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
              Test background playback, lock-screen controls, and playlists right away!
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
