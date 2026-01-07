'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Globe, Calendar, Laptop, ChevronRight, Loader2, Search, ArrowRight } from 'lucide-react';
import { getUserRepos, GitHubRepo } from '@/app/actions/github';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';

interface RepoPickerProps {
    onSelect: (url: string) => void;
    isGenerating: boolean;
    selectedUrl?: string;
}

export function RepoPicker({ onSelect, isGenerating, selectedUrl }: RepoPickerProps) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function loadRepos() {
            try {
                setLoading(true);
                const data = await getUserRepos(1, 8);
                setRepos(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadRepos();
    }, []);

    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.language && repo.language.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="w-full">
            <div className="mb-8">
                <div className="relative border-b-2 border-black pb-2">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-black/20" size={16} strokeWidth={1.5} />
                    <input
                        type="text"
                        placeholder="FILTER_PROJECTS_INDEX..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 bg-transparent border-none focus:ring-0 font-mono text-xs uppercase tracking-widest placeholder:text-black/10"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-0 border-t border-black">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-full p-6 border-b border-gray-100 flex justify-between items-center animate-pulse">
                            <div className="h-6 w-48 bg-gray-100" />
                            <div className="h-4 w-24 bg-gray-100" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 border border-red-500 bg-red-50">
                    <p className="text-red-600 font-mono text-xs uppercase font-bold tracking-widest">ERROR: {error}</p>
                </div>
            ) : (
                <div className="flex flex-col border-t border-black">
                    <AnimatePresence mode="popLayout">
                        {filteredRepos.map((repo) => {
                            const isSelected = selectedUrl === repo.html_url;
                            const isProcessing = isSelected && isGenerating;

                            return (
                                <div
                                    key={repo.id}
                                    onClick={() => !isGenerating && onSelect(repo.html_url)}
                                    className={`group w-full p-4 flex justify-between items-center border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer rounded-none relative overflow-hidden ${isGenerating && !isSelected ? 'opacity-30' : ''}`}
                                >
                                    {/* Linear Progress Indicator */}
                                    {isProcessing && (
                                        <motion.div
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '100%' }}
                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                            className="absolute top-0 left-0 h-[2px] w-full bg-[#FF3333]"
                                        />
                                    )}

                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-serif text-xl text-black group-hover:text-[#FF3333] transition-colors duration-200">
                                                    {repo.name}
                                                </h4>
                                                {repo.private && (
                                                    <span className="border border-black px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-tighter">
                                                        Private
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                                                <span>{repo.full_name.split('/')[0]}</span>
                                                {repo.language && (
                                                    <>
                                                        <span className="text-gray-200">/</span>
                                                        <span>{repo.language}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                                                Last Update
                                            </span>
                                            <span className="font-mono text-[10px] text-black uppercase tracking-tighter">
                                                {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                                            </span>
                                        </div>

                                        <div className="w-12 flex justify-end">
                                            {isProcessing ? (
                                                <span className="font-mono text-[10px] font-bold text-[#FF3333] animate-pulse">
                                                    READING...
                                                </span>
                                            ) : (
                                                <ChevronRight
                                                    size={18}
                                                    strokeWidth={1.5}
                                                    className="text-black opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {!loading && filteredRepos.length === 0 && (
                <div className="py-20 border-b border-black text-center">
                    <Laptop className="mx-auto text-black/10 mb-4" size={40} strokeWidth={1} />
                    <p className="text-black/30 font-mono text-[10px] uppercase tracking-[0.3em]">No repositories found in index / "{search}"</p>
                </div>
            )}
        </div>
    );
}
