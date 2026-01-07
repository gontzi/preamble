'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getHistory, type HistoryItem } from '@/app/actions/history';
import { FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HistoryListProps {
    onSelect?: (content: string) => void;
}

export function HistoryList({ onSelect }: HistoryListProps) {
    const { data: session } = useSession();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            setLoading(true);
            try {
                if (session?.user) {
                    // Fetch from Supabase
                    const serverData = await getHistory();
                    setItems(serverData);
                } else {
                    // Fetch from LocalStorage
                    const localDataRaw = localStorage.getItem('preamble_guest_history');
                    if (localDataRaw) {
                        const localData = JSON.parse(localDataRaw);
                        // Sort by date descending
                        localData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        setItems(localData);
                    }
                }
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [session]);

    if (loading) {
        return <div className="p-4 text-xs font-mono text-neutral-500">oading history...</div>;
    }

    if (items.length === 0) {
        return <div className="p-4 text-xs font-mono text-neutral-500">No history found.</div>;
    }

    return (
        <div className="w-full border-t border-neutral-200">
            <h3 className="px-4 py-3 text-xs font-bold font-mono uppercase tracking-wider border-b border-neutral-200 bg-neutral-50">
                {session ? 'Cloud History' : 'Local History'}
            </h3>
            <ul className="divide-y divide-neutral-200">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="group flex flex-col gap-1 p-4 hover:bg-neutral-50 cursor-pointer transition-colors"
                        onClick={() => onSelect?.(item.content)}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-sm font-semibold text-neutral-900 truncate max-w-[200px]">
                                {item.repo_name}
                            </span>
                            <span className="text-[10px] uppercase font-mono text-neutral-400">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-500 text-xs text-ellipsis overflow-hidden font-sans">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">README.md generated</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
