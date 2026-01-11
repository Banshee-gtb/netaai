import { useState, useEffect } from 'react';
import { chatApi } from '@/lib/api';
import { useChat } from '@/stores/chatStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageSquare, Pin, Trash2, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Chat } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatSidebarProps {
  onClose?: () => void;
}

export function ChatSidebar({ onClose }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { chats, currentChat, setChats, setCurrentChat } = useChat();
  const { toast } = useToast();

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatApi.getChats();
      setChats(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newChat = await chatApi.createChat('New Chat');
      setChats([newChat, ...chats]);
      setCurrentChat(newChat);
      onClose?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setCurrentChat(chat);
    onClose?.();
  };

  const handleTogglePin = async (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await chatApi.updateChat(chat.id, { pinned: !chat.pinned });
      setChats(chats.map((c) => (c.id === chat.id ? updated : c)));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleStartEdit = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = async (chat: Chat) => {
    if (!editTitle.trim()) return;
    try {
      const updated = await chatApi.updateChat(chat.id, { title: editTitle.trim() });
      setChats(chats.map((c) => (c.id === chat.id ? updated : c)));
      setEditingId(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await chatApi.deleteChat(deleteId);
      setChats(chats.filter((c) => c.id !== deleteId));
      if (currentChat?.id === deleteId) {
        setCurrentChat(null);
      }
      setDeleteId(null);
      toast({ title: 'Success', description: 'Chat deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadChats();
      return;
    }
    try {
      const results = await chatApi.searchChats(searchQuery);
      setChats(results);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const unpinnedChats = filteredChats.filter((c) => !c.pinned);

  const groupByDate = (chats: Chat[]) => {
    const now = new Date();
    const today: Chat[] = [];
    const yesterday: Chat[] = [];
    const last7Days: Chat[] = [];
    const older: Chat[] = [];

    chats.forEach((chat) => {
      const chatDate = new Date(chat.updated_at);
      const diffDays = Math.floor((now.getTime() - chatDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) today.push(chat);
      else if (diffDays === 1) yesterday.push(chat);
      else if (diffDays <= 7) last7Days.push(chat);
      else older.push(chat);
    });

    return { today, yesterday, last7Days, older };
  };

  const grouped = groupByDate(unpinnedChats);

  return (
    <>
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <Button
            onClick={handleNewChat}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 justify-start h-10 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New chat
          </Button>
        </div>
        
        <div className="px-3 pt-2 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 h-9 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {pinnedChats.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-1">Pinned</h3>
                {pinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChat?.id === chat.id}
                    isEditing={editingId === chat.id}
                    editTitle={editTitle}
                    onSelect={handleSelectChat}
                    onTogglePin={handleTogglePin}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteId(chat.id);
                    }}
                    onEditChange={setEditTitle}
                  />
                ))}
              </div>
            )}

            {grouped.today.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-1">Today</h3>
                {grouped.today.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChat?.id === chat.id}
                    isEditing={editingId === chat.id}
                    editTitle={editTitle}
                    onSelect={handleSelectChat}
                    onTogglePin={handleTogglePin}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteId(chat.id);
                    }}
                    onEditChange={setEditTitle}
                  />
                ))}
              </div>
            )}

            {grouped.yesterday.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-1">Yesterday</h3>
                {grouped.yesterday.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChat?.id === chat.id}
                    isEditing={editingId === chat.id}
                    editTitle={editTitle}
                    onSelect={handleSelectChat}
                    onTogglePin={handleTogglePin}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteId(chat.id);
                    }}
                    onEditChange={setEditTitle}
                  />
                ))}
              </div>
            )}

            {grouped.last7Days.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-1">Previous 7 Days</h3>
                {grouped.last7Days.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChat?.id === chat.id}
                    isEditing={editingId === chat.id}
                    editTitle={editTitle}
                    onSelect={handleSelectChat}
                    onTogglePin={handleTogglePin}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteId(chat.id);
                    }}
                    onEditChange={setEditTitle}
                  />
                ))}
              </div>
            )}

            {grouped.older.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-1">Older</h3>
                {grouped.older.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChat?.id === chat.id}
                    isEditing={editingId === chat.id}
                    editTitle={editTitle}
                    onSelect={handleSelectChat}
                    onTogglePin={handleTogglePin}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteId(chat.id);
                    }}
                    onEditChange={setEditTitle}
                  />
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading...</div>
              </div>
            )}

            {!loading && filteredChats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No chats yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Delete chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will permanently delete this chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  onSelect: (chat: Chat) => void;
  onTogglePin: (chat: Chat, e: React.MouseEvent) => void;
  onStartEdit: (chat: Chat, e: React.MouseEvent) => void;
  onSaveEdit: (chat: Chat) => void;
  onDelete: (e: React.MouseEvent) => void;
  onEditChange: (value: string) => void;
}

function ChatItem({
  chat,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onTogglePin,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onEditChange,
}: ChatItemProps) {
  return (
    <div
      onClick={() => !isEditing && onSelect(chat)}
      className={`group relative flex items-center gap-2 px-2 py-2 mx-2 rounded-xl cursor-pointer transition-colors ${
        isActive 
          ? 'bg-gray-200 dark:bg-gray-800' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
      }`}
    >
      <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
      
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit(chat);
            if (e.key === 'Escape') onEditChange('');
          }}
          onBlur={() => onSaveEdit(chat)}
          className="flex-1 h-7 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg"
          autoFocus
        />
      ) : (
        <span className="flex-1 text-sm text-gray-900 dark:text-gray-200 truncate">{chat.title}</span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {chat.pinned && <Pin className="w-3.5 h-3.5 text-neon-blue mr-1" />}
        <button
          onClick={(e) => onTogglePin(chat, e)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          title={chat.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className={`w-3.5 h-3.5 ${chat.pinned ? 'text-neon-blue' : 'text-gray-500 dark:text-gray-400'}`} />
        </button>
        <button
          onClick={(e) => onStartEdit(chat, e)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          title="Rename"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}
