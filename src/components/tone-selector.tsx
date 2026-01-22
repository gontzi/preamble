'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export type Tone = 'standard' | 'friendly' | 'formal';

interface ToneSelectorProps {
    value: Tone;
    onChange: (tone: Tone) => void;
    disabled?: boolean;
}

export function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
    const [hoveredTone, setHoveredTone] = useState<Tone | null>(null);

    const tones: { id: Tone; label: string; description: string }[] = [
        {
            id: 'standard',
            label: 'STANDARD',
            description: "Concise, professional, and objective. The default industry standard."
        },
        {
            id: 'friendly',
            label: 'FRIENDLY',
            description: "Casual tone, use of emojis, and enthusiastic language. Great for open source & community projects."
        },
        {
            id: 'formal',
            label: 'FORMAL',
            description: "Academic, detailed, and strictly technical. Ideal for enterprise or research software."
        },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-4 md:items-center mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400 min-w-[60px]">TONE:</span>
            <div className="flex flex-wrap gap-3">
                {tones.map((t) => (
                    <div key={t.id} className="relative">
                        <button
                            onClick={() => onChange(t.id)}
                            disabled={disabled}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2 border border-black font-mono text-xs uppercase tracking-widest transition-all duration-200",
                                value === t.id
                                    ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                    : "bg-white text-black hover:bg-neutral-50 hover:translate-y-[-1px]",
                                disabled && "opacity-50 cursor-not-allowed hover:translate-y-0"
                            )}
                        >
                            {t.label}
                            <span
                                className={cn(
                                    "ml-1 opacity-50 hover:opacity-100 transition-opacity cursor-help",
                                    value === t.id ? "text-neutral-300" : "text-neutral-500 hover:text-black"
                                )}
                                onMouseEnter={() => setHoveredTone(t.id)}
                                onMouseLeave={() => setHoveredTone(null)}
                            >
                                [?]
                            </span>
                        </button>

                        <AnimatePresence>
                            {hoveredTone === t.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-white border border-black text-black z-50 shadow-[4px_4px_0px_0px_#000]"
                                    style={{ borderRadius: 0 }}
                                >
                                    <p className="font-sans text-[11px] leading-relaxed font-medium">
                                        {t.description}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}
