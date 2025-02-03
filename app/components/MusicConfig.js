'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from './LanguageProvider';

export default function MusicConfig() {
  const translate = useTranslation();
  const [musicSource, setMusicSource] = useState('');
  const [currentSource, setCurrentSource] = useState('');

  useEffect(() => {
    const savedSource = localStorage.getItem('musicSource');
    if (savedSource) {
      setCurrentSource(savedSource);
    }
  }, []);

  const handleSaveSource = (e) => {
    e.preventDefault();
    if (musicSource.trim()) {
      localStorage.setItem('musicSource', musicSource.trim());
      setCurrentSource(musicSource.trim());
      setMusicSource('');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveSource} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {translate('music.sourceUrl')}
          </label>
          <input
            type="url"
            value={musicSource}
            onChange={(e) => setMusicSource(e.target.value)}
            placeholder={translate('music.enterSourceUrl')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {translate('music.save')}
        </button>
      </form>

      {currentSource ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">{translate('music.currentSource')}</h3>
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 break-all">
            {currentSource}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center">
          {translate('music.noSource')}
        </div>
      )}
    </div>
  );
} 