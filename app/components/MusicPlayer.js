'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from './LanguageProvider';
import { MusicService } from '../services/musicService';

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function MusicPlayer({ onLyricsChange }) {
  const translate = useTranslation();
  const [musicSource, setMusicSource] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentLyrics, setCurrentLyrics] = useState({ lrc: '', tlyric: '' });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const audioRef = useRef(null);
  const musicServiceRef = useRef(null);

  // 添加搜索缓存
  const searchCacheRef = useRef(new Map());
  
  // 防抖后的搜索函数
  const debouncedSearch = useCallback(
    debounce(async (keyword) => {
      if (!keyword.trim() || !musicServiceRef.current) {
        if (!musicServiceRef.current) {
          console.error('Music service is not properly configured');
        }
        return;
      }

      setIsSearching(true);
      try {
        const cacheKey = keyword.trim().toLowerCase();
        
        // 检查缓存
        if (searchCacheRef.current.has(cacheKey)) {
          setPlaylist(searchCacheRef.current.get(cacheKey));
          setIsSearching(false);
          return;
        }

        const songs = await musicServiceRef.current.searchSongs(keyword.trim());
        
        // 更新缓存
        searchCacheRef.current.set(cacheKey, songs);
        
        // 限制缓存大小
        if (searchCacheRef.current.size > 50) {
          const firstKey = searchCacheRef.current.keys().next().value;
          searchCacheRef.current.delete(firstKey);
        }
        
        setPlaylist(songs);
      } catch (error) {
        console.error('Search error:', error);
        setPlaylist([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // 更新搜索处理函数
  const handleSearch = () => {
    if (!searchKeyword.trim()) return;
    debouncedSearch(searchKeyword);
  };

  // 更新输入处理函数
  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchKeyword(value);
    if (value.trim()) {
      debouncedSearch(value);
    } else {
      setPlaylist([]);
    }
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem('musicConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setMusicSource(config.type === 'api' ? config.apiEndpoint : config.sourceUrl);
      try {
        musicServiceRef.current = new MusicService(config);
      } catch (error) {
        console.error('Failed to initialize music service:', error);
        setMusicSource('');  // Clear music source on error
      }
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      const updateProgress = () => {
        const current = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        setCurrentTime(current);
        setProgress((current / duration) * 100);
      };

      audioRef.current.addEventListener('timeupdate', updateProgress);
      audioRef.current.addEventListener('ended', handleTrackEnd);

      // Pass lyrics to parent component
      onLyricsChange?.(currentLyrics);

      return () => {
        audioRef.current.removeEventListener('timeupdate', updateProgress);
        audioRef.current.removeEventListener('ended', handleTrackEnd);
      };
    }
  }, [currentTrack, currentLyrics]);

  const handleTrackSelect = async (track) => {
    try {
      const url = await musicServiceRef.current.getPlayUrl(track.id);
      if (!url) {
        throw new Error('No playback URL available');
      }

      // 如果URL是相对路径，添加API域名
      const fullUrl = url.startsWith('http') ? url : `https://music.163.com${url}`;

      setCurrentTrack({ ...track, url: fullUrl });
      setIsPlaying(true);
      
      // Load lyrics
      const lyrics = await musicServiceRef.current.getLyric(track.id);
      setCurrentLyrics(lyrics);

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = fullUrl;
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          // 如果播放失败，尝试使用备用URL
          if (error.name === 'NotSupportedError' || error.name === 'NotAllowedError') {
            handleFallbackUrl(track.id);
          }
        });
      }
    } catch (error) {
      console.error('Error playing track:', error);
      // 如果获取URL失败，尝试使用备用URL
      handleFallbackUrl(track.id);
    }
  };

  const handleFallbackUrl = async (id) => {
    try {
      // 尝试使用备用API获取URL
      const fallbackUrl = await musicServiceRef.current.getFallbackUrl(id);
      if (fallbackUrl) {
        if (audioRef.current) {
          audioRef.current.src = fallbackUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error getting fallback URL:', error);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrackEnd = () => {
    const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
    if (currentIndex < playlist.length - 1) {
      handleTrackSelect(playlist[currentIndex + 1]);
    }
  };

  const handlePrevTrack = () => {
    const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
    if (currentIndex > 0) {
      handleTrackSelect(playlist[currentIndex - 1]);
    }
  };

  const handleNextTrack = () => {
    const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
    if (currentIndex < playlist.length - 1) {
      handleTrackSelect(playlist[currentIndex + 1]);
    }
  };

  const handleProgressChange = (e) => {
    const newProgress = parseInt(e.target.value);
    if (audioRef.current) {
      const time = (audioRef.current.duration * newProgress) / 100;
      audioRef.current.currentTime = time;
      setProgress(newProgress);
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-white">
      <audio ref={audioRef} className="hidden" onLoadedMetadata={(e) => setDuration(e.target.duration)} />
      
      {/* Mobile Search Mode Toggle Button */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setIsSearchMode(!isSearchMode)}
          className="w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 active:bg-purple-800 transform active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSearchMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Left Panel - Fixed Player */}
      <div className={`w-full md:w-80 flex-none flex flex-col border-b md:border-b-0 md:border-r border-gray-100 ${isSearchMode ? 'hidden md:flex' : 'flex'}`}>
        {/* Now Playing */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col">
            {currentTrack ? (
              <div className="space-y-4 flex-none">
                <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-lg group">
                  {currentTrack.cover ? (
                    <img
                      src={currentTrack.cover}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 text-center">
                  <h3 className="font-medium text-gray-900 line-clamp-1 text-base">
                    {currentTrack.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {currentTrack.artist}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 px-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleProgressChange}
                    className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-purple-600 touch-pan-x"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between px-2 md:px-4">
                  <button
                    onClick={handlePrevTrack}
                    className="p-2 md:p-3 text-gray-400 hover:text-gray-600 rounded-full active:bg-gray-100"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={handlePlayPause}
                    className="p-3 md:p-4 bg-purple-600 text-white rounded-full hover:bg-purple-700 active:bg-purple-800 transform active:scale-95 transition-all"
                  >
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isPlaying ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      )}
                    </svg>
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="p-2 md:p-3 text-gray-400 hover:text-gray-600 rounded-full active:bg-gray-100"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center space-x-2 px-1">
                  <button
                    onClick={() => setVolume(volume === 0 ? 80 : 0)}
                    className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 rounded-full active:bg-gray-100"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {volume === 0 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      ) : volume < 50 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M12 8v8m0-8l-2.536-2.536M12 16l-2.536 2.536M8 10v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 8v8m0-8l-2.536-2.536M12 16l-2.536 2.536M8 10v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1z" />
                      )}
                    </svg>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1.5 md:h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-purple-600 touch-pan-x"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm">
                    {musicSource ? translate('music.noTrackPlaying') : translate('music.noSource')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lyrics Panel - Only show on desktop */}
        {currentLyrics.lrc && (
          <div className="hidden md:block flex-none h-24 md:h-32 p-2 border-t border-gray-100">
            <div className="h-full overflow-y-auto lyrics-container hover:scrollbar-thin hover:scrollbar-thumb-gray-300 hover:scrollbar-track-gray-100">
              <pre className="text-xs text-gray-500 whitespace-pre-wrap text-center">
                {currentLyrics.lrc}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Search and Playlist */}
      <div className={`flex-1 flex flex-col min-w-0 h-[calc(100vh-24rem)] md:h-full ${isSearchMode ? 'flex' : 'hidden md:flex'}`}>
        {/* Search Bar */}
        <div className="flex-none p-2 md:p-3 border-b border-gray-100">
          {!musicSource ? (
            <div className="text-center text-red-500 py-1.5 px-3 bg-red-50 rounded-lg text-sm">
              {translate('music.configurationRequired')}
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={handleSearchInput}
                placeholder={translate('music.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2.5 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Playlist */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto">
            {playlist.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {playlist.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleTrackSelect(track)}
                    className={`w-full px-3 md:px-4 py-2.5 md:py-3 flex items-center space-x-3 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                      currentTrack?.id === track.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex-none relative">
                      {track.cover ? (
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      )}
                      {currentTrack?.id === track.id && isPlaying && (
                        <div className="absolute -top-1 -right-1 w-3 h-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-gray-900 truncate text-sm md:text-base">
                        {track.title}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 truncate">
                        {track.artist}
                      </div>
                    </div>
                    <div className="flex-none text-xs text-gray-400">
                      {formatTime(track.duration)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm">
                    {isSearching ? translate('music.searching') : translate('music.noTracks')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 