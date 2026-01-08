'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';

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
