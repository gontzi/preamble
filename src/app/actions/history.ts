'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export type HistoryItem = {
    id: string;
    repo_name: string;
    content: string;
    created_at: string;
};

export async function getHistory(): Promise<HistoryItem[]> {
    const supabase = getSupabaseAdmin();
    const session = await auth();
    if (!session?.user?.email) {
        return [];
    }

    const { data, error } = await supabase
        .from('generated_docs')
        .select('*')
        .eq('user_email', session.user.email)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }

    return data as HistoryItem[];
}

export async function deleteHistoryItem(id: string) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("Unauthorized");
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('generated_docs')
        .delete()
        .match({ id, user_email: session.user.email });

    if (error) {
        console.error('Error deleting history item:', error);
        throw new Error('Failed to delete history item');
    }

    revalidatePath('/');
}

export async function updateHistoryItem(id: string, content: string) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("Unauthorized");
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('generated_docs')
        .update({ content, created_at: new Date().toISOString() }) // Actualizamos fecha para que suba arriba
        .match({ id, user_email: session.user.email });

    if (error) {
        console.error('Error updating history item:', error);
        throw new Error('Failed to update history item');
    }

    revalidatePath('/');
}
