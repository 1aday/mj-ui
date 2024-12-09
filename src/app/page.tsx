'use client';

import ImageGenerator from '@/components/ImageGenerator';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] bg-gradient-to-b from-gray-900 via-[#0A0A0F] to-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              AI Image Generator
            </span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto font-medium tracking-wide">
            Transform your ideas into stunning visuals with our advanced AI
          </p>
        </div>
        <ImageGenerator />
      </div>
    </main>
  );
}
