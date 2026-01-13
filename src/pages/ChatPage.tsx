import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatSidebar } from '@/components/ChatSidebar';
import { MessageList } from '@/components/MessageList';
import { ChatInput } from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { useChat } from '@/stores/chatStore';
import { useAuth } from '@/stores/authStore';
import { useSettings } from '@/stores/settingsStore';
import { chatApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { Menu, Settings, LogOut, Sparkles, SquarePen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const { currentChat, messages, setMessages, addMessage, setCurrentChat } = useChat();
  const { user, logout } = useAuth();
  const { theme } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load chats on mount (with delay to ensure user profile is ready)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadChats();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentChat) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentChat]);

  const loadChats = async () => {
    try {
      const data = await chatApi.getChats();
      useChat.getState().setChats(data);
      // Set first chat as current if exists
      if (data.length > 0 && !currentChat) {
        setCurrentChat(data[0]);
      }
    } catch (error: any) {
      console.error('Failed to load chats:', error);
      // Don't show error toast for new users with no chats
    }
  };

  const loadMessages = async () => {
    if (!currentChat) return;
    try {
      const data = await chatApi.getMessages(currentChat.id);
      setMessages(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSendMessage = async (content: string, imageUrl?: string) => {
    let chatId = currentChat?.id;
    
    if (!chatId) {
      // Create new chat if none exists
      try {
        const newChat = await chatApi.createChat('New Chat');
        setCurrentChat(newChat);
        useChat.getState().setChats([newChat, ...useChat.getState().chats]);
        chatId = newChat.id;
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    setStreamingContent('');

    try {
      // Check if message contains image generation request
      const imageGenerationKeywords = [
        'create image', 'generate image', 'make image', 'draw', 'create a picture',
        'generate a photo', 'make a photo', 'create photo', 'show me'
      ];
      const isImageRequest = imageGenerationKeywords.some(keyword => 
        content.toLowerCase().includes(keyword)
      );

      // Save user message
      const userMessage = await chatApi.createMessage(chatId, 'user', content, imageUrl);
      addMessage(userMessage);

      // Auto-generate title from first message
      if (messages.length === 0) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await chatApi.updateChat(chatId, { title });
      }

      if (isImageRequest) {
        // Handle image generation
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt: content, chatId },
        });

        if (error) {
          let errorMessage = error.message;
          if (error instanceof FunctionsHttpError) {
            try {
              const statusCode = error.context?.status ?? 500;
              const textContent = await error.context?.text();
              errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
            } catch {
              errorMessage = `${error.message || 'Failed to generate image'}`;
            }
          }
          throw new Error(errorMessage);
        }

        const assistantMessage = await chatApi.createMessage(
          chatId,
          'assistant',
          'Here is your generated image:',
          data.imageUrl
        );
        addMessage(assistantMessage);
      } else {
        // Handle normal chat
        const currentMessages = useChat.getState().messages;
        const conversationMessages = [
          ...currentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content }
        ];

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: conversationMessages,
              chatId,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to get response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullContent += content;
                    setStreamingContent(fullContent);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        }

        // Save assistant message
        if (fullContent) {
          const assistantMessage = await chatApi.createMessage(chatId, 'assistant', fullContent);
          addMessage(assistantMessage);
        }
      }
    } catch (error: any) {
      console.error('Message error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setStreamingContent('');
    }
  };

  const handleRegenerateResponse = async () => {
    if (messages.length < 2) return;
    
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Remove the last assistant message
    const lastAssistantMessage = messages[messages.length - 1];
    if (lastAssistantMessage.role === 'assistant') {
      try {
        await chatApi.deleteMessage(lastAssistantMessage.id);
        setMessages(messages.slice(0, -1));
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    }

    // Regenerate response
    await handleSendMessage(lastUserMessage.content, lastUserMessage.image_url || undefined);
  };

  const handleNewChat = async () => {
    try {
      const newChat = await chatApi.createChat('New Chat');
      setCurrentChat(newChat);
      useChat.getState().setChats([newChat, ...useChat.getState().chats]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      logout();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
        <ChatSidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <ChatSidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 md:px-4 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden h-9 w-9 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="h-9 w-9 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="New chat"
            >
              <SquarePen className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-blue" />
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              Neta.ai
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-medium">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 w-56">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                <p className="font-medium text-gray-900 dark:text-white">{user?.username}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem 
                onClick={() => navigate('/settings')} 
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={loading}
          streamingContent={streamingContent}
          onRegenerateResponse={handleRegenerateResponse}
        />

        {/* Input */}
        <ChatInput onSend={handleSendMessage} disabled={loading} />
      </div>
    </div>
  );
}
