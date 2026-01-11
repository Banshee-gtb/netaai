import { supabase } from './supabase';
import type { Chat, Message } from '@/types';

export const chatApi = {
  // Chats
  async getChats(): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createChat(title: string = 'New Chat'): Promise<Chat> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat> {
    const { data, error } = await supabase
      .from('chats')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteChat(id: string): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Messages
  async getMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async createMessage(chatId: string, role: 'user' | 'assistant', content: string, imageUrl?: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, role, content, image_url: imageUrl })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Search
  async searchChats(query: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .ilike('title', `%${query}%`)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};
