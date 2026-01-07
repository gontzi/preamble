'use client';

export function Footer() {
    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs font-mono text-neutral-600 uppercase tracking-wide">
                    © 2025 PREAMBLE. SYSTEM READY.
                </div>

                <div className="text-sm font-medium">
                    <span className="mr-2">Designed by AzalDev</span>
                    <span className="space-x-4">
                        <a
                            href="https://azaldev.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:text-[#FF3333] transition-colors underline decoration-1 underline-offset-4"
                        >
                            PORTFOLIO
                        </a>
                        <a
                            href="https://github.com/gontzi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:text-[#FF3333] transition-colors underline decoration-1 underline-offset-4"
                        >
                            GITHUB
                        </a>
                    </span>
                </div>
            </div>
        </footer>
    );
}
