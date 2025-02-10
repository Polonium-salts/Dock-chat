'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from './LanguageProvider';

export default function MusicConfig() {
  const translate = useTranslation();
  const [sourceType, setSourceType] = useState('api');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [currentConfig, setCurrentConfig] = useState(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('musicConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setSourceType(config.type || 'api');
      setApiEndpoint(config.apiEndpoint || '');
      setSourceUrl(config.sourceUrl || '');
      setCurrentConfig(config);
    }
  }, []);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const config = {
      type: sourceType,
      apiEndpoint: apiEndpoint.trim(),
      sourceUrl: sourceUrl.trim()
    };

    localStorage.setItem('musicConfig', JSON.stringify(config));
    setCurrentConfig(config);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveConfig} className="space-y-4">
        {/* Source Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {translate('music.sourceType')}
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="api"
                checked={sourceType === 'api'}
                onChange={(e) => setSourceType(e.target.value)}
                className="form-radio h-4 w-4 text-purple-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                {translate('music.sourceTypeApi')}
              </span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="source"
                checked={sourceType === 'source'}
                onChange={(e) => setSourceType(e.target.value)}
                className="form-radio h-4 w-4 text-purple-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                {translate('music.sourceTypeSource')}
              </span>
            </label>
          </div>
        </div>

        {/* API Endpoint Input */}
        {sourceType === 'api' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translate('music.apiEndpoint')}
            </label>
            <input
              type="url"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder={translate('music.enterApiEndpoint')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Source URL Input */}
        {sourceType === 'source' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translate('music.sourceUrl')}
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={translate('music.enterSourceUrl')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {translate('music.save')}
        </button>
      </form>

      {currentConfig && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            {translate('music.currentConfig')}
          </h3>
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{translate('music.sourceType')}:</span>{' '}
              {translate(currentConfig.type === 'api' ? 'music.sourceTypeApi' : 'music.sourceTypeSource')}
            </div>
            {currentConfig.type === 'api' && (
              <div className="text-sm text-gray-600 break-all">
                <span className="font-medium">{translate('music.apiEndpoint')}:</span>{' '}
                {currentConfig.apiEndpoint}
              </div>
            )}
            {currentConfig.type === 'source' && (
              <div className="text-sm text-gray-600 break-all">
                <span className="font-medium">{translate('music.sourceUrl')}:</span>{' '}
                {currentConfig.sourceUrl}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 