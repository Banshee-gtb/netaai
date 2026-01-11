import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({ title: 'Error', description: 'Voice recognition failed', variant: 'destructive' });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Error', description: 'Voice recognition not supported', variant: 'destructive' });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = () => {
    if (!message.trim() && !imagePreview) return;
    onSend(message.trim(), imagePreview || undefined);
    setMessage('');
    setImagePreview(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded-xl" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 bg-gray-700 dark:bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-600 dark:hover:bg-gray-700"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message Neta.ai..."
              disabled={disabled}
              className="min-h-[52px] max-h-[200px] resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pr-20 rounded-3xl shadow-sm focus:ring-2 focus:ring-neon-blue focus:border-transparent"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={disabled}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={disabled}
                className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleToggleListening}
                disabled={disabled}
                className={`h-9 w-9 rounded-xl ${
                  isListening 
                    ? 'text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !imagePreview)}
            size="icon"
            className="h-[52px] w-[52px] bg-neon-blue hover:bg-neon-cyan disabled:bg-gray-300 dark:disabled:bg-gray-700 text-black disabled:text-gray-500 rounded-full flex-shrink-0 shadow-md transition-all"
          >
            {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center">
          Neta.ai can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
