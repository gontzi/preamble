'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getHistory, deleteHistoryItem, type HistoryItem } from '@/app/actions/history';
import { FileText, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface HistoryListProps {
    onSelect?: (content: string) => void;
    onEdit?: (item: HistoryItem) => void;
}

export function HistoryList({ onSelect, onEdit }: HistoryListProps) {
    const { data: session } = useSession();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    async function fetchHistory() {
        setLoading(true);
        try {
            if (session?.user) {
                const serverData = await getHistory();
                setItems(serverData);
            } else {
                const localDataRaw = localStorage.getItem('preamble_guest_history');
                if (localDataRaw) {
                    const localData = JSON.parse(localDataRaw);
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

    useEffect(() => {
        fetchHistory();
    }, [session]);

    // Handle "Sure?" timeout
    useEffect(() => {
        if (deleteConfirmId) {
            const timer = setTimeout(() => {
                setDeleteConfirmId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteConfirmId]);

    const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (deleteConfirmId === id) {
            // CONFIRMED DELETE
            if (session?.user) {
                await deleteHistoryItem(id);
                setItems(prev => prev.filter(i => i.id !== id));
            } else {
                const updated = items.filter(i => i.id !== id);
                setItems(updated);
                localStorage.setItem('preamble_guest_history', JSON.stringify(updated));
            }
            setDeleteConfirmId(null);
        } else {
            // FIRST CLICK
            setDeleteConfirmId(id);
        }
    };

    const handleEditClick = (e: React.MouseEvent, item: HistoryItem) => {
        e.stopPropagation();
        if (onEdit) onEdit(item);
    };

    if (loading) {
        return <div className="p-4 text-xs font-mono text-neutral-500">Loading history...</div>;
    }

    if (items.length === 0) {
        return <div className="p-4 text-xs font-mono text-neutral-500">No history found.</div>;
    }

    return (
        <div className="w-full border-t border-neutral-200">
            <h3 className="px-4 py-3 text-xs font-bold font-mono uppercase tracking-wider border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                <span>{session ? 'Cloud History' : 'Local History'}</span>
                {items.length > 0 && <span className="text-neutral-400">{items.length} items</span>}
            </h3>
            <ul className="divide-y divide-neutral-200">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="group flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
                    >
                        {/* Content Area */}
                        <div
                            className="flex-1 cursor-pointer pr-4 py-2"
                            onClick={() => onEdit?.(item)}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono text-sm font-semibold text-neutral-900 truncate max-w-[200px] block">
                                    {item.repo_name}
                                </span>
                                <span className="text-[10px] uppercase font-mono text-neutral-400">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-sans">
                                <FileText className="w-3 h-3" />
                                <span className="truncate">README.md</span>
                            </div>
                        </div>

                        {/* Actions Area */}
                        <div className="flex items-center gap-2 pl-4 border-l border-neutral-100">
                            <button
                                onClick={(e) => handleEditClick(e, item)}
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[10px] font-mono uppercase font-bold text-neutral-400 hover:text-black hover:bg-neutral-200 transition-all"
                                aria-label="Edit history item"
                            >
                                [EDIT]
                            </button>

                            <button
                                onClick={(e) => handleDeleteClick(e, item.id)}
                                className={cn(
                                    "min-w-[50px] min-h-[40px] flex items-center justify-center text-[10px] font-mono uppercase font-bold transition-all text-center",
                                    deleteConfirmId === item.id
                                        ? "bg-[#FF3333] text-white"
                                        : "text-neutral-400 hover:text-[#FF3333] hover:bg-red-50"
                                )}
                                aria-label="Delete history item"
                            >
                                {deleteConfirmId === item.id ? "SURE?" : "[DEL]"}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            {!session && items.length > 0 && (
                <div className="p-4 text-center border-t border-neutral-100">
                    <p className="text-[9px] text-gray-400 font-mono uppercase tracking-widest">
                        * DATA STORED LOCALLY (NON-PERSISTENT)
                    </p>
                </div>
            )}
        </div>
    );
}
