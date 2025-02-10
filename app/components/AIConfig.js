'use client';

import { useState } from 'react';

export default function AIConfig({ onSave, config }) {
  const [aiConfig, setAiConfig] = useState(config || {
    deepseek: { apiKey: '', enabled: false },
    kimi: { apiKey: '', enabled: false }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(aiConfig);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deepseek Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Deepseek API</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfig.deepseek.enabled}
                onChange={(e) => setAiConfig(prev => ({
                  ...prev,
                  deepseek: { ...prev.deepseek, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <input
            type="password"
            placeholder="Enter Deepseek API Key"
            value={aiConfig.deepseek.apiKey}
            onChange={(e) => setAiConfig(prev => ({
              ...prev,
              deepseek: { ...prev.deepseek, apiKey: e.target.value }
            }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Kimi Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Kimi API</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfig.kimi.enabled}
                onChange={(e) => setAiConfig(prev => ({
                  ...prev,
                  kimi: { ...prev.kimi, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <input
            type="password"
            placeholder="Enter Kimi API Key"
            value={aiConfig.kimi.apiKey}
            onChange={(e) => setAiConfig(prev => ({
              ...prev,
              kimi: { ...prev.kimi, apiKey: e.target.value }
            }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
} 