'use client';

import { signOut, signIn } from 'next-auth/react';
import { Sparkles, Github, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
    session: any;
}

export function Header({ session }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-black bg-white">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="p-1 border border-black transition-colors duration-200 group-hover:bg-[#FF3333] group-hover:text-white">
                        <img src="/isotipo-favicon.png" alt="Logo PREAMBLE" className="w-6 h-6 transition-all duration-200 group-hover:brightness-0 group-hover:invert" />
                    </div>
                    <span className="font-bold tracking-[0.2em] text-xl text-black uppercase">PREAMBLE</span>
                </div>

                <nav className="hidden md:flex items-center gap-8">
                    <a href="https://github.com/gontzi/preamble" target="_blank" rel="noopener noreferrer" className="text-sm font-mono uppercase text-black hover:text-[#FF3333] transition-colors">
                        Source
                    </a>
                    <a href="/#history-section" className="text-sm font-mono uppercase text-black hover:text-[#FF3333] transition-colors">
                        History
                    </a>
                    <a
                        href="https://buymeacoffee.com/gontzi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#FF3333] text-white rounded-none px-4 py-2 font-bold tracking-widest text-xs hover:bg-black transition-colors"
                    >
                        SPONSOR
                    </a>
                </nav>

                <div className="flex items-center gap-4">
                    {session ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 border border-black bg-gray-50">
                                {session.user?.image ? (
                                    <img src={session.user.image} alt={session.user.name || ''} className="w-4 h-4 grayscale" />
                                ) : (
                                    <User size={12} className="text-black" strokeWidth={1.5} />
                                )}
                                <span className="text-[10px] font-mono text-black uppercase tracking-wider">{session.user?.username || session.user?.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => signOut()}
                                className="hover:text-[#FF3333]"
                                title="Sign out"
                            >
                                <LogOut size={16} strokeWidth={1.5} />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="default"
                            onClick={() => signIn('github')}
                            className="h-10 px-6 rounded-none text-xs tracking-widest uppercase font-bold"
                        >
                            <Github className="mr-2" size={14} />
                            Sign In
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
