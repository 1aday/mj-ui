'use client';

import { useState } from 'react';
import { Settings, ImageSettings } from './Settings';

interface PromptInputProps {
    onSubmit: (prompt: string, settings: ImageSettings) => void;
    disabled?: boolean;
}

export function PromptInput({ onSubmit, disabled }: PromptInputProps) {
    const [prompt, setPrompt] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<ImageSettings>({
        size: {
            mode: 'Landscape',
            aspectRatio: '2:1',
        },
        aesthetics: {
            stylization: 100,
            weirdness: 30,
            variety: 100,
        },
        model: {
            mode: 'Standard',
            version: '6.1',
            personalize: false,
        },
        speed: 'Fast',
    });

    const handleSubmit = () => {
        if (prompt.trim()) {
            onSubmit(prompt, settings);
            setPrompt('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="w-full">
            <div className="relative bg-gray-900 rounded-xl p-1">
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-gray-800/50 rounded-lg">
                        <div className="pl-3 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="What will you imagine?"
                            className="w-full px-3 py-3 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            onClick={() => setShowSettings(!showSettings)}
                            className={`px-3 py-2 mr-1 rounded-lg transition-colors ${showSettings ? 'bg-gray-700 text-red-500' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {showSettings && (
                    <div className="absolute left-0 right-0 mt-2 bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl">
                        <Settings onSettingsChange={setSettings} />
                    </div>
                )}
            </div>
        </div>
    );
} 