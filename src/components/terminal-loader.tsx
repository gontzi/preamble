'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface TerminalLoaderProps {
    logs: string[];
}

export function TerminalLoader({ logs }: TerminalLoaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div
            className="w-full max-w-2xl mx-auto mt-12 overflow-hidden border border-black bg-white shadow-none"
        >
            <div className="flex items-center gap-2 px-4 py-3 bg-black border-b border-black">
                <span className="text-[11px] text-white font-mono tracking-[0.2em] uppercase font-bold">Preamble Engine — System Log</span>
            </div>
            <div
                ref={scrollRef}
                className="p-5 h-72 overflow-y-auto font-mono text-[13px] leading-relaxed space-y-2 bg-white"
            >
                <AnimatePresence mode="popLayout">
                    {logs.map((log, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-3"
                        >
                            <span className="text-black/30 shrink-0 select-none">›</span>
                            <span className={log.startsWith('Error') ? 'text-[#FF3333] font-bold' : 'text-black/80'}>
                                {log}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {logs.length > 0 && (
                    <div
                        className="w-2 h-4 bg-black inline-block ml-1 align-middle animate-pulse"
                    />
                )}
            </div>
        </div>
    );
}
