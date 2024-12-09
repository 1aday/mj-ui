import { motion } from "framer-motion";

interface SailboatLoaderProps {
    size?: "sm" | "md" | "lg";
}

export function SailboatLoader({ size = "md" }: SailboatLoaderProps) {
    const sizes = {
        sm: "w-8 h-8",
        md: "w-16 h-16",
        lg: "w-24 h-24",
    };

    return (
        <div className={`relative ${sizes[size]}`}>
            <motion.div
                className="absolute inset-0"
                animate={{
                    y: [0, -10, 0],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-full h-full text-indigo-400"
                >
                    <motion.path
                        d="M3 13.5L7 9.5L12 12L17 9.5L21 13.5"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        animate={{
                            d: [
                                "M3 13.5L7 9.5L12 12L17 9.5L21 13.5",
                                "M3 13.5L7 11.5L12 14L17 11.5L21 13.5",
                                "M3 13.5L7 9.5L12 12L17 9.5L21 13.5",
                            ],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    <motion.path
                        d="M12 12L12 3M12 3L9 6M12 3L15 6"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M3 15L21 15"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        className="text-indigo-300/50"
                    />
                    <motion.path
                        d="M4 15C4 15 5 19 12 19C19 19 20 15 20 15"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        className="text-indigo-300/30"
                    />
                </svg>
            </motion.div>

            {/* Animated particles/stars */}
            <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
            >
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-indigo-400/50 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </motion.div>
        </div>
    );
} 