export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}
