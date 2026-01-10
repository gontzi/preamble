import { getSupabaseAdmin } from './supabase';
import { auth } from '@/auth';
import type { User, GeneratedDoc, HistoryItem } from '@/types/database';

export class SupabaseService {
    private static supabase = getSupabaseAdmin();

    static async saveDocument(repoName: string, content: string, techMetadata: Record<string, any> = {}) {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.email) {
            console.error('No authenticated user found for saving document');
            return { error: 'Unauthorized' };
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const fullName = session.user.name;
        const avatarUrl = session.user.image;

        try {
            // Paso A: Check/Create User (Upsert)
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .upsert({
                    id: userId,
                    email: userEmail,
                    full_name: fullName,
                    avatar_url: avatarUrl
                }, { onConflict: 'id' })
                .select('generation_count')
                .single();

            if (userError) throw userError;

            // Paso B: Increment Usage
            const currentCount = userData?.generation_count || 0;
            const { error: updateError } = await this.supabase
                .from('users')
                .update({ generation_count: currentCount + 1 })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Paso C: Insert Doc
            const { data: docData, error: docError } = await this.supabase
                .from('generated_docs')
                .insert({
                    user_id: userId,
                    repo_name: repoName,
                    content: content,
                    metadata: techMetadata,
                })
                .select()
                .single();

            if (docError) throw docError;

            return { data: docData, error: null };
        } catch (error: any) {
            console.error('Error in saveDocument:', error);
            return { data: null, error: error.message };
        }
    }

    static async getHistory(): Promise<HistoryItem[]> {
        const session = await auth();
        if (!session?.user?.id) return [];

        const { data, error } = await this.supabase
            .from('generated_docs')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching history:', error);
            return [];
        }

        return (data || []) as HistoryItem[];
    }

    static async deleteDocument(id: string) {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const { error } = await this.supabase
            .from('generated_docs')
            .delete()
            .match({ id, user_id: session.user.id });

        if (error) throw error;
    }

    static async updateDocument(id: string, content: string) {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        const { error } = await this.supabase
            .from('generated_docs')
            .update({
                content,
                created_at: new Date().toISOString()
            })
            .match({ id, user_id: session.user.id });

        if (error) throw error;
    }
}
