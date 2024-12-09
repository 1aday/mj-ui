'use client';

import { useState, ChangeEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type ImageStatus = 'pending' | 'completed' | 'failed';

interface GeneratedImage {
    id: string;
    status: ImageStatus;
    imageUrl?: string;
    prompt: string;
    error?: string;
    progress?: number;
    hash?: string;
    actions?: Array<{ type: string; choices?: number[] }>;
    parentId?: string;
    type?: 'original' | 'upscale' | 'variation';
    choice?: number;
}

interface ApiResponse {
    hash: string;
    status: 'sent' | 'waiting' | 'progress' | 'done' | 'error' | 'queued';
    progress?: number;
    result?: {
        url: string;
        filename?: string;
    };
    status_reason?: string;
    next_actions?: Array<{ type: string; choices?: number[] }>;
}

interface ProgressTracker {
    startTime: number;
    lastUpdateTime: number;
    attempts: number;
}

// Add this type for command tags
type CommandTag = {
    type: 'ar' | 's' | 'sref';
    value: string;
};

// Add this helper function to parse commands
const parsePromptAndCommands = (fullPrompt: string): { basePrompt: string; commands: CommandTag[] } => {
    const commands: CommandTag[] = [];
    const basePrompt = fullPrompt.replace(/\s+--(?:ar|s|sref)\s+[^\s]+/g, '').trim();

    const arMatch = fullPrompt.match(/--ar\s+(\d+:\d+)/);
    const sMatch = fullPrompt.match(/--s\s+(\d+)/);
    const srefMatch = fullPrompt.match(/--sref\s+(\w+)/);

    if (arMatch) commands.push({ type: 'ar', value: arMatch[1] });
    if (sMatch) commands.push({ type: 's', value: sMatch[1] });
    if (srefMatch) commands.push({ type: 'sref', value: srefMatch[1] });

    return { basePrompt, commands };
};

// Add back the MAX_POLL_TIME constant
const MAX_POLL_TIME = 60000; // 60 seconds

export default function ImageGenerator() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [apiBaseUrl, setApiBaseUrl] = useState('/api');
    const pollingTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const pollStartTimes = useRef<{ [key: string]: number }>({});
    const [actionLoadingStates, setActionLoadingStates] = useState<{ [key: string]: boolean }>({});
    const requestQueue = useRef<Array<() => Promise<void>>>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const progressTrackers = useRef<{ [key: string]: ProgressTracker }>({});
    const [showSettings, setShowSettings] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<string>('');
    const [stylization, setStylization] = useState<number>(0);
    const [styleReference, setStyleReference] = useState<string>('');
    const [isRandomStyle, setIsRandomStyle] = useState(false);
    // Add back error state
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            Object.values(pollingTimers.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const host = window.location.host;
            const protocol = window.location.protocol;
            setApiBaseUrl(`${protocol}//${host}/api`);
        }
    }, []);

    const handlePromptChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newPrompt = e.target.value;
        setPrompt(newPrompt);
    };

    const handleAspectRatioChange = (ratio: string) => {
        setAspectRatio(ratio);
        const basePrompt = prompt.replace(/\s+--(?:ar|s)\s+[^\s]+/g, '');
        const styleCommand = stylization > 0 ? ` --s ${stylization}` : '';
        setPrompt(basePrompt + (ratio ? ` --ar ${ratio}` : '') + styleCommand);
    };

    const handleStylizationChange = (value: number) => {
        setStylization(value);
        const basePrompt = prompt.replace(/\s+--(?:ar|s)\s+[^\s]+/g, '');
        const arCommand = aspectRatio ? ` --ar ${aspectRatio}` : '';
        setPrompt(basePrompt + arCommand + (value > 0 ? ` --s ${value}` : ''));
    };

    const handleStyleReferenceChange = (value: string) => {
        setStyleReference(value);
        const basePrompt = prompt.replace(/\s+--(?:ar|s|sref)\s+[^\s]+/g, '');
        const arCommand = aspectRatio ? ` --ar ${aspectRatio}` : '';
        const styleCommand = stylization > 0 ? ` --s ${stylization}` : '';
        setPrompt(basePrompt + arCommand + styleCommand + (value ? ` --sref ${value}` : ''));
    };

    const handleRandomStyleToggle = (checked: boolean) => {
        setIsRandomStyle(checked);
        if (checked) {
            handleStyleReferenceChange('random');
        } else {
            setStyleReference('');
            const basePrompt = prompt.replace(/\s+--(?:ar|s|sref)\s+[^\s]+/g, '');
            const arCommand = aspectRatio ? ` --ar ${aspectRatio}` : '';
            const styleCommand = stylization > 0 ? ` --s ${stylization}` : '';
            setPrompt(basePrompt + arCommand + styleCommand);
        }
    };

    const generateImage = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        const newImage: GeneratedImage = {
            id: Date.now().toString(),
            status: 'pending',
            prompt: prompt.trim(),
            progress: 0
        };
        setGeneratedImages(prev => [newImage, ...prev]);

        try {
            const response = await fetch(`${apiBaseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt.trim() })
            });

            const data = await response.json();
            console.log('Generate response:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.hash) {
                setGeneratedImages(prev =>
                    prev.map(img =>
                        img.id === newImage.id
                            ? { ...img, hash: data.hash }
                            : img
                    )
                );
                pollImageStatus(data.hash, newImage.id);
            } else {
                throw new Error('Missing hash from API');
            }
        } catch (error) {
            console.error('Generation error:', error);
            setGeneratedImages(prev =>
                prev.map(img =>
                    img.id === newImage.id
                        ? { ...img, status: 'failed', error: error instanceof Error ? error.message : 'Failed to generate image' }
                        : img
                )
            );
        } finally {
            setIsGenerating(false);
            setPrompt('');
        }
    };

    const clearPollingTimer = (imageId: string) => {
        if (pollingTimers.current[imageId]) {
            clearTimeout(pollingTimers.current[imageId]);
            delete pollingTimers.current[imageId];
        }
        delete pollStartTimes.current[imageId];
    };

    const scheduleNextPoll = (hash: string, imageId: string) => {
        clearPollingTimer(imageId); // Clear any existing timer
        pollingTimers.current[imageId] = setTimeout(
            () => pollImageStatus(hash, imageId),
            1000 // Poll every second instead of every 2 seconds
        );
    };

    const pollImageStatus = async (hash: string, imageId: string) => {
        try {
            if (!pollStartTimes.current[imageId]) {
                pollStartTimes.current[imageId] = Date.now();
            }

            if (Date.now() - pollStartTimes.current[imageId] > MAX_POLL_TIME) {
                handleError(imageId, 'Generation timeout');
                return;
            }

            const response = await fetch(`${apiBaseUrl}/status?hash=${hash}`);
            const data: ApiResponse = await response.json();

            console.log(`Status update for ${imageId}:`, {
                status: data.status,
                progress: data.progress,
                result: data.result
            });

            // Update progress for any non-error status
            if (data.status !== 'error' && typeof data.progress === 'number') {
                updateProgress(imageId, data.progress);
            }

            switch (data.status) {
                case 'done':
                    if (data.result?.url) {
                        setGeneratedImages(prev => prev.map(img =>
                            img.id === imageId ? {
                                ...img,
                                status: 'completed',
                                progress: 100,
                                imageUrl: data.result!.url,
                                hash: data.hash,
                                actions: data.next_actions
                            } : img
                        ));
                        clearPollingTimer(imageId);
                    }
                    break;

                case 'error':
                    handleError(imageId, data.status_reason || 'Unknown error');
                    break;

                case 'progress':
                case 'sent':
                case 'waiting':
                case 'queued':
                    // Continue polling for any non-final status
                    scheduleNextPoll(hash, imageId);
                    break;
            }
        } catch (error) {
            handleError(imageId, error instanceof Error ? error.message : 'Network error');
        }
    };

    // Add handlers for the action buttons
    const handleUpscale = async (imageId: string, choice: number) => {
        if (choice < 1 || choice > 4) return;
        const image = generatedImages.find(img => img.id === imageId);
        if (!image?.hash) return;

        setActionLoadingStates(prev => ({ ...prev, [`upscale-${imageId}-${choice}`]: true }));

        try {
            console.log('Sending upscale request:', {
                hash: image.hash,
                choice: choice
            });

            const response = await fetch(`${apiBaseUrl}/upscale`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hash: image.hash,
                    choice: choice
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Upscale response:', data);

            if (data.hash) {
                const newImageId = Date.now().toString();
                setGeneratedImages(prev => {
                    const parentIndex = prev.findIndex(img => img.id === imageId);
                    if (parentIndex === -1) return prev;

                    const newImage: GeneratedImage = {
                        id: newImageId,
                        status: 'pending',
                        prompt: `Upscaled version ${choice} of "${image.prompt}"`,
                        progress: 0,
                        hash: data.hash,
                        parentId: imageId,
                        type: 'upscale',
                        choice: choice
                    };

                    const newImages = [...prev];
                    newImages.splice(parentIndex + 1, 0, newImage);
                    return newImages;
                });

                // Start polling for the result
                pollImageStatus(data.hash, newImageId);
            }
        } catch (error) {
            console.error('Upscale error:', error);
            handleError(imageId, error instanceof Error ? error.message : 'Failed to upscale image');
        } finally {
            setActionLoadingStates(prev => ({ ...prev, [`upscale-${imageId}-${choice}`]: false }));
        }
    };

    const handleVariation = async (imageId: string, choice: number) => {
        if (choice < 1 || choice > 4) return;
        const image = generatedImages.find(img => img.id === imageId);
        if (!image?.hash) return;

        setActionLoadingStates(prev => ({ ...prev, [`variation-${imageId}-${choice}`]: true }));

        try {
            console.log('Sending variation request:', {
                hash: image.hash,
                choice: choice
            });

            const response = await fetch(`${apiBaseUrl}/variation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hash: image.hash,
                    choice: choice
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Variation response:', data);

            if (data.hash) {
                const newImageId = Date.now().toString();
                setGeneratedImages(prev => {
                    const parentIndex = prev.findIndex(img => img.id === imageId);
                    if (parentIndex === -1) return prev;

                    const newImage: GeneratedImage = {
                        id: newImageId,
                        status: 'pending',
                        prompt: `Variation ${choice} of "${image.prompt}"`,
                        progress: 0,
                        hash: data.hash,
                        parentId: imageId,
                        type: 'variation',
                        choice: choice
                    };

                    const newImages = [...prev];
                    newImages.splice(parentIndex + 1, 0, newImage);
                    return newImages;
                });

                // Start polling for the result
                pollImageStatus(data.hash, newImageId);
            }
        } catch (error) {
            console.error('Variation error:', error);
            handleError(imageId, error instanceof Error ? error.message : 'Failed to create variation');
        } finally {
            setActionLoadingStates(prev => ({ ...prev, [`variation-${imageId}-${choice}`]: false }));
        }
    };

    const updateProgress = (imageId: string, progress: number) => {
        const now = Date.now();
        const tracker = progressTrackers.current[imageId] || {
            startTime: now,
            lastUpdateTime: now,
            attempts: 0
        };

        progressTrackers.current[imageId] = {
            ...tracker,
            lastUpdateTime: now,
            attempts: tracker.attempts + 1
        };

        setGeneratedImages(prev => prev.map(img =>
            img.id === imageId ? {
                ...img,
                progress: Math.min(Math.round(progress), 100),
                status: progress >= 100 ? 'completed' : 'pending'
            } : img
        ));
    };

    const handleError = (imageId: string, errorMessage: string) => {
        clearPollingTimer(imageId);
        delete progressTrackers.current[imageId];

        setGeneratedImages(prev => prev.map(img =>
            img.id === imageId ? {
                ...img,
                status: 'failed',
                error: errorMessage
            } : img
        ));

        setError(errorMessage);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="relative group">
                <div className="flex flex-col gap-3">
                    <div className="flex gap-3 p-1 bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800/50 shadow-xl transition-all duration-300 group-hover:border-gray-700/50">
                        <div className="flex-1 flex items-center h-16 px-5 bg-gray-800/50 rounded-xl">
                            <input
                                value={prompt.replace(/\s+--(?:ar|s)\s+[^\s]+/g, '')}
                                onChange={handlePromptChange}
                                placeholder="Describe your imagination..."
                                className="min-w-0 flex-1 bg-transparent border-0 text-lg text-gray-100 placeholder:text-gray-500/70 focus:ring-0 focus:outline-none font-medium tracking-wide"
                                disabled={isGenerating}
                                spellCheck={false}
                            />
                            <div className="flex items-center gap-2 flex-nowrap ml-3">
                                {parsePromptAndCommands(prompt).commands.map((command, index) => (
                                    <div
                                        key={index}
                                        className={`
                                            flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap tracking-wide shrink-0
                                            ${command.type === 'ar'
                                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                : command.type === 's'
                                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                    : command.type === 'sref'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : ''
                                            }
                                        `}
                                    >
                                        {command.type === 'ar' && (
                                            <>
                                                <svg className="w-4 h-4 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                                {command.value}
                                            </>
                                        )}
                                        {command.type === 's' && (
                                            <>
                                                <svg className="w-4 h-4 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                </svg>
                                                {command.value}
                                            </>
                                        )}
                                        {command.type === 'sref' && (
                                            <>
                                                <svg className="w-4 h-4 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                                {command.value}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowSettings(!showSettings)}
                            variant="ghost"
                            className={`h-16 w-16 p-0 flex items-center justify-center rounded-xl bg-gray-800/50 border-0 hover:bg-gray-700/50 transition-colors ${showSettings ? 'text-indigo-400' : 'text-gray-400'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </Button>
                        <Button
                            onClick={generateImage}
                            disabled={isGenerating || !prompt.trim()}
                            className="h-16 px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            {isGenerating ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Creating...</span>
                                </div>
                            ) : (
                                <span>Generate</span>
                            )}
                        </Button>
                    </div>

                    {/* Settings Panel */}
                    <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${showSettings
                            ? 'max-h-[300px] opacity-100'
                            : 'max-h-0 opacity-0'
                            }`}
                    >
                        <div className="p-4 bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50 shadow-xl">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-300">
                                        Aspect Ratio
                                    </label>
                                    <div className="flex gap-2">
                                        {['1:1', '16:9', '9:16'].map((ratio) => (
                                            <Button
                                                key={ratio}
                                                onClick={() => handleAspectRatioChange(ratio)}
                                                variant="ghost"
                                                size="sm"
                                                className={`px-3 py-1 rounded-lg transition-all duration-200 ${aspectRatio === ratio
                                                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                                                    }`}
                                            >
                                                {ratio}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">
                                            Stylization
                                        </label>
                                        <span className="text-sm text-gray-400">
                                            {stylization}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1000"
                                            value={stylization}
                                            onChange={(e) => handleStylizationChange(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-500
                                                [&::-webkit-slider-thumb]:appearance-none
                                                [&::-webkit-slider-thumb]:w-4
                                                [&::-webkit-slider-thumb]:h-4
                                                [&::-webkit-slider-thumb]:rounded-full
                                                [&::-webkit-slider-thumb]:bg-indigo-500
                                                [&::-webkit-slider-thumb]:hover:bg-indigo-400
                                                [&::-webkit-slider-thumb]:transition-colors
                                                [&::-moz-range-thumb]:w-4
                                                [&::-moz-range-thumb]:h-4
                                                [&::-moz-range-thumb]:rounded-full
                                                [&::-moz-range-thumb]:bg-indigo-500
                                                [&::-moz-range-thumb]:hover:bg-indigo-400
                                                [&::-moz-range-thumb]:transition-colors
                                                [&::-moz-range-thumb]:border-0"
                                        />
                                        <div
                                            className="absolute left-0 top-1/2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-l-lg -translate-y-1/2 pointer-events-none"
                                            style={{ width: `${(stylization / 1000) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">
                                            Style Reference
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isRandomStyle}
                                                    onChange={(e) => handleRandomStyleToggle(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-700 bg-gray-800/50 text-indigo-500 focus:ring-indigo-500/20"
                                                />
                                                <span className="text-sm text-gray-400">Random</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                max="999999"
                                                value={!isRandomStyle ? styleReference : ''}
                                                onChange={(e) => handleStyleReferenceChange(e.target.value)}
                                                disabled={isRandomStyle}
                                                placeholder="Style ID"
                                                className="w-24 px-2 py-1 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 placeholder:text-gray-500 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {generatedImages.reduce((groups: GeneratedImage[][], image) => {
                    if (!image.parentId) {
                        const children = generatedImages.filter(img => img.parentId === image.id);
                        groups.push([image, ...children]);
                    }
                    return groups;
                }, []).map((group) => (
                    <div key={group[0].id} className="space-y-6">
                        {group.map((image) => (
                            <Card
                                key={image.id}
                                className="overflow-hidden bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl transition-all duration-300 hover:border-gray-700/50"
                            >
                                <div className="flex flex-col lg:flex-row">
                                    {/* Left side - Prompt and Info */}
                                    <div className="p-6 lg:w-1/3 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <p className="text-lg text-gray-200 font-medium">
                                                {parsePromptAndCommands(image.prompt).basePrompt}
                                            </p>
                                            {parsePromptAndCommands(image.prompt).commands.length > 0 && (
                                                <div className="flex gap-2 flex-wrap">
                                                    {parsePromptAndCommands(image.prompt).commands.map((command, index) => (
                                                        <div
                                                            key={index}
                                                            className={`
                                                                flex items-center px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap
                                                                ${command.type === 'ar'
                                                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                                }
                                                            `}
                                                        >
                                                            {command.type === 'ar' ? (
                                                                <>
                                                                    <svg className="w-3 h-3 mr-1 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                                    </svg>
                                                                    {command.value}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3 mr-1 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                                    </svg>
                                                                    {command.value}
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right side - Image Display */}
                                    <div className="lg:flex-1 lg:border-l border-gray-800/50 flex flex-col bg-gray-800/30">
                                        {/* Image or Loading State Container */}
                                        <div className="relative flex items-center justify-center min-h-[400px]">
                                            {image.status === 'pending' && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-800/30">
                                                    <div className="text-center space-y-6 max-w-[300px]">
                                                        <div className="relative">
                                                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                                                            <div className="absolute -bottom-2 -right-2">
                                                                <div className="animate-pulse w-3 h-3 bg-indigo-500 rounded-full" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <p className="text-base font-medium text-gray-300">
                                                                {(image.progress ?? 0) >= 100 ? 'Almost there...' : 'Creating your masterpiece...'}
                                                            </p>
                                                            <div className="w-full max-w-[200px] mx-auto">
                                                                <div className="relative h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
                                                                    {(image.progress ?? 0) === 0 && (
                                                                        <div
                                                                            className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                                                                            style={{
                                                                                backgroundSize: '200% 100%',
                                                                                animation: 'shimmer 2s linear infinite'
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {(image.progress ?? 0) > 0 && (
                                                                        <div
                                                                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                                                                            style={{
                                                                                width: `${image.progress}%`,
                                                                                boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-400 mt-3 font-medium">
                                                                    {Math.round(image.progress ?? 0)}% complete
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {image.status === 'completed' && image.imageUrl && (
                                                <div className="relative w-full">
                                                    <img
                                                        src={image.imageUrl}
                                                        alt={image.prompt}
                                                        className="w-full h-auto"
                                                    />
                                                    {image.type && (
                                                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur-md text-white rounded-full text-xs font-medium">
                                                            {image.type === 'upscale' ? `Upscale ${image.choice}` : `Variation ${image.choice}`}
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-3 right-3 flex gap-2">
                                                        <Button
                                                            onClick={() => window.open(image.imageUrl, '_blank')}
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border-white/10"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = image.imageUrl!;
                                                                link.download = `image-${image.id}.png`;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            variant="secondary"
                                                            size="sm"
                                                            className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border-white/10"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                            Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {image.status === 'failed' && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-center px-6">
                                                        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <p className="text-sm font-medium text-red-400 mb-2">
                                                            Generation Failed
                                                        </p>
                                                        {image.error && (
                                                            <p className="text-xs text-red-300/80">
                                                                {image.error}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons below image */}
                                        {!image.parentId && image.status === 'completed' && (
                                            <div className="p-4 border-t border-gray-800/50 bg-gray-900/30">
                                                <div className="space-y-2">
                                                    {/* Upscale Buttons Row */}
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3, 4].map((choice) => (
                                                            <Button
                                                                key={`upscale-${choice}`}
                                                                onClick={() => handleUpscale(image.id, choice)}
                                                                variant="secondary"
                                                                className="flex-1 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border-gray-700/50"
                                                                disabled={actionLoadingStates[`upscale-${image.id}-${choice}`]}
                                                            >
                                                                {actionLoadingStates[`upscale-${image.id}-${choice}`] ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    `U${choice}`
                                                                )}
                                                            </Button>
                                                        ))}
                                                    </div>

                                                    {/* Variation Buttons Row */}
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3, 4].map((choice) => (
                                                            <Button
                                                                key={`variation-${choice}`}
                                                                onClick={() => handleVariation(image.id, choice)}
                                                                variant="secondary"
                                                                className="flex-1 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border-gray-700/50"
                                                                disabled={actionLoadingStates[`variation-${image.id}-${choice}`]}
                                                            >
                                                                {actionLoadingStates[`variation-${image.id}-${choice}`] ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    `V${choice}`
                                                                )}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
} 