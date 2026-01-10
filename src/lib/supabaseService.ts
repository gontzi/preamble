import { getSupabaseAdmin } from './supabase';
import { auth } from '@/auth';
import type { User, GeneratedDoc, HistoryItem } from '@/types/database';

export class SupabaseService {
    private static supabase = getSupabaseAdmin();

    static async saveDocument(repoName: string, content: string, techMetadata: Record<string, any> = {}) {
        // 1. Fuente de la Verdad: Obtener sesión activa de Supabase/Auth
        // Nota: Se usa 'auth()' de NextAuth que es el manejador actual, 
        // pero asegurando que extraemos el ID real para la vinculación.
        const session = await auth();
        const realUserId = session?.user?.id;

        if (!realUserId) {
            console.error('❌ Error: Intento de guardado sin sesión activa.');
            return { error: 'Unauthorized' };
        }

        try {
            // 2. Manejo de la Tabla public.users (UPSERT)
            // Obtenemos el registro actual para conocer el generation_count existente
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .upsert({
                    id: realUserId,
                    email: session.user.email,
                    full_name: session.user.name,
                    avatar_url: session.user.image,
                }, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                })
                .select('generation_count')
                .single();

            if (userError) {
                console.error('❌ Error crítico en UPSERT de usuario:', userError.message);
                return { error: `No se pudo vincular el usuario: ${userError.message}` };
            }

            // 3. Insertar el documento en generated_docs usando el ID real
            const { data: docData, error: docError } = await this.supabase
                .from('generated_docs')
                .insert({
                    user_id: realUserId,
                    repo_name: repoName,
                    content: content,
                    metadata: techMetadata,
                })
                .select()
                .single();

            if (docError) throw docError;

            // 4. Actualizar el contador de generaciones (Incremento)
            const newCount = (userData?.generation_count || 0) + 1;
            const { error: countError } = await this.supabase
                .from('users')
                .update({ generation_count: newCount })
                .eq('id', realUserId);

            if (countError) {
                console.warn('⚠️ No se pudo actualizar el generation_count:', countError.message);
            }

            return { data: docData, error: null };
        } catch (error: any) {
            console.error('❌ Error crítico en saveDocument:', error);
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
