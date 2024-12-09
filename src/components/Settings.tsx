import { useState } from 'react';

interface SettingsProps {
    onSettingsChange: (settings: ImageSettings) => void;
}

export interface ImageSettings {
    size: {
        mode: 'Portrait' | 'Square' | 'Landscape';
        aspectRatio: string;
    };
    aesthetics: {
        stylization: number;
        weirdness: number;
        variety: number;
    };
    model: {
        mode: 'Standard' | 'Raw';
        version: string;
        personalize: boolean;
    };
    speed: 'Relax' | 'Fast' | 'Turbo';
}

// Add this type definition near the top of the file, after the interfaces
type SettingValue = string | number | boolean;

export function Settings({ onSettingsChange }: SettingsProps) {
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

    const handleSettingChange = (category: string, setting: string, value: SettingValue) => {
        if (category === 'speed') {
            const newSettings = {
                ...settings,
                speed: value as ImageSettings['speed']
            };
            setSettings(newSettings);
            onSettingsChange(newSettings);
            return;
        }

        // Handle nested settings
        const categorySettings = settings[category as keyof ImageSettings] as Record<string, SettingValue>;
        const newSettings = {
            ...settings,
            [category]: {
                ...categorySettings,
                [setting]: value,
            },
        };
        setSettings(newSettings);
        onSettingsChange(newSettings);
    };

    return (
        <div className="space-y-6">
            {/* Image Size Section */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white text-lg">Image Size</h3>
                    <button className="text-gray-400 text-sm hover:text-gray-300">Reset</button>
                </div>
                <div className="flex gap-2">
                    {['Portrait', 'Square', 'Landscape'].map((mode) => (
                        <button
                            key={mode}
                            className={`px-4 py-1.5 rounded-lg transition-colors ${settings.size.mode === mode
                                ? 'bg-red-900/50 text-red-500'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            onClick={() => handleSettingChange('size', 'mode', mode)}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Aesthetics Section */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white text-lg">Aesthetics</h3>
                    <button className="text-gray-400 text-sm hover:text-gray-300">Reset</button>
                </div>
                <div className="space-y-4">
                    {['Stylization', 'Weirdness', 'Variety'].map((setting) => (
                        <div key={setting}>
                            <label className="text-gray-300 text-sm mb-1.5 block">{setting}</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.aesthetics[setting.toLowerCase() as keyof typeof settings.aesthetics]}
                                onChange={(e) =>
                                    handleSettingChange('aesthetics', setting.toLowerCase(), parseInt(e.target.value))
                                }
                                className="w-full accent-red-500 bg-gray-800"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Model Section */}
            <div>
                <h3 className="text-white text-lg mb-3">Model</h3>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {['Standard', 'Raw'].map((mode) => (
                            <button
                                key={mode}
                                className={`px-4 py-1.5 rounded-lg transition-colors ${settings.model.mode === mode
                                    ? 'bg-red-900/50 text-red-500'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                onClick={() => handleSettingChange('model', 'mode', mode)}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Speed Section */}
            <div>
                <h3 className="text-white text-lg mb-3">Speed</h3>
                <div className="flex gap-2">
                    {['Relax', 'Fast', 'Turbo'].map((speed) => (
                        <button
                            key={speed}
                            className={`px-4 py-1.5 rounded-lg transition-colors ${settings.speed === speed
                                ? 'bg-red-900/50 text-red-500'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            onClick={() => handleSettingChange('speed', '', speed)}
                        >
                            {speed}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
} 