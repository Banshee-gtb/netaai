import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, RotateCcw } from 'lucide-react';
import type { Message } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/stores/authStore';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  streamingContent?: string;
  onRegenerateResponse?: () => void;
}

export function MessageList({ messages, isLoading, streamingContent, onRegenerateResponse }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollRef}>
      <div className="max-w-3xl mx-auto py-8">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="text-center mb-8">
              <Sparkles className="w-12 h-12 text-neon-blue neon-glow mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-semibold gradient-neon bg-clip-text text-transparent mb-3">
                Neta.ai
              </h1>
              <p className="text-base md:text-lg text-gray-400 dark:text-gray-500">
                Your AI-powered e-commerce business advisor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Business Strategy</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get expert advice on e-commerce growth</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Market Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Analyze trends and competitor insights</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Brand Building</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Build a strong e-commerce brand</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Revenue Models</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Explore business models for growth</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`group px-4 py-6 ${message.role === 'assistant' ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
          >
            <div className="max-w-3xl mx-auto flex gap-4 md:gap-6">
              {message.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Generated"
                      className="rounded-xl max-w-full h-auto mb-4"
                    />
                  )}
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => handleCopy(message.content)}
                      variant="ghost"
                      size="sm"
                      className="h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <Copy className="w-4 h-4 mr-1.5" />
                      Copy
                    </Button>
                    {index === messages.length - 1 && onRegenerateResponse && (
                      <Button
                        onClick={onRegenerateResponse}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Regenerate
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="px-4 py-6 bg-gray-50 dark:bg-gray-800/30">
            <div className="max-w-3xl mx-auto flex gap-4 md:gap-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="px-4 py-6 bg-gray-50 dark:bg-gray-800/30">
            <div className="max-w-3xl mx-auto flex gap-4 md:gap-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
