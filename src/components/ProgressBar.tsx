interface ProgressBarProps {
    progress: number;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
    return (
        <div className="w-full bg-gray-200 rounded-full h-4">
            <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
            >
                <span className="absolute w-full text-center text-xs text-white">
                    {progress}%
                </span>
            </div>
        </div>
    );
} 