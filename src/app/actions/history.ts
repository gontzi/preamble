'use server';

import { SupabaseService } from '@/lib/supabaseService';
import { revalidatePath } from 'next/cache';
import type { HistoryItem } from '@/types/database';

export async function getHistory(): Promise<HistoryItem[]> {
    return await SupabaseService.getHistory();
}

export async function deleteHistoryItem(id: string) {
    try {
        await SupabaseService.deleteDocument(id);
        revalidatePath('/');
    } catch (error) {
        console.error('Error deleting history item:', error);
        throw new Error('Failed to delete history item');
    }
}

export async function updateHistoryItem(id: string, content: string) {
    try {
        await SupabaseService.updateDocument(id, content);
        revalidatePath('/');
    } catch (error) {
        console.error('Error updating history item:', error);
        throw new Error('Failed to update history item');
    }
}
