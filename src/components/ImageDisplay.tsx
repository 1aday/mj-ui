'use client';

import { useState } from 'react';
import { logger } from '@/utils/logger';

interface ImageDisplayProps {
    imageUrl: string;
    hash: string;
}

export default function ImageDisplay({ imageUrl, hash }: ImageDisplayProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleUpscale = async (choice: number) => {
        logger.info('Upscaling Image', { hash, choice });
        try {
            logger.api('POST', '/api/upscale', { original_hash: hash, choice });
            const response = await fetch('/api/upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_hash: hash, choice }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            logger.success('Upscale Started', { newHash: data.hash });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upscale image';
            logger.error('Upscale Failed', { error: errorMessage });
            setError(errorMessage);
        }
    };

    const handleVariation = async (choice: number) => {
        logger.info('Creating Variation', { hash, choice });
        try {
            logger.api('POST', '/api/variation', { original_hash: hash, choice });
            const response = await fetch('/api/variation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_hash: hash, choice }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            logger.success('Variation Started', { newHash: data.hash });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create variation';
            logger.error('Variation Failed', { error: errorMessage });
            setError(errorMessage);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        Loading...
                    </div>
                )}
                <img
                    src={imageUrl}
                    alt="Generated image"
                    className="w-full rounded-lg shadow-lg"
                    onLoad={() => setLoading(false)}
                    onError={() => setError('Failed to load image')}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <h3 className="font-semibold">Upscale</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((choice) => (
                            <button
                                key={`upscale-${choice}`}
                                onClick={() => handleUpscale(choice)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                U{choice}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="font-semibold">Variation</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((choice) => (
                            <button
                                key={`variation-${choice}`}
                                onClick={() => handleVariation(choice)}
                                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                                V{choice}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 