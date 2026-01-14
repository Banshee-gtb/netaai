import { supabase } from './supabase';
import type { Chat, Message } from '@/types';

export const chatApi = {
  // Chats
  async getChats(): Promise<Chat[]> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('getChats error:', error);
        throw new Error(`Failed to load chats: ${error.message}`);
      }
      return data || [];
    } catch (error: any) {
      console.error('getChats exception:', error);
      throw error;
    }
  },

  async createChat(title: string = 'New Chat'): Promise<Chat> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('createChat auth error:', userError);
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('chats')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      
      if (error) {
        console.error('createChat insert error:', error);
        throw new Error(`Failed to create chat: ${error.message}`);
      }
      return data;
    } catch (error: any) {
      console.error('createChat exception:', error);
      throw error;
    }
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
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('getMessages error:', error);
        throw new Error(`Failed to load messages: ${error.message}`);
      }
      return data || [];
    } catch (error: any) {
      console.error('getMessages exception:', error);
      throw error;
    }
  },

  async createMessage(chatId: string, role: 'user' | 'assistant', content: string, imageUrl?: string): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ chat_id: chatId, role, content, image_url: imageUrl })
        .select()
        .single();
      
      if (error) {
        console.error('createMessage error:', error);
        throw new Error(`Failed to create message: ${error.message}`);
      }
      return data;
    } catch (error: any) {
      console.error('createMessage exception:', error);
      throw error;
    }
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
