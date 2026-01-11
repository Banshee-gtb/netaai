import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { useSettings } from '@/stores/settingsStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Sun, Moon, Monitor, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SettingsPage() {
  const { user, login } = useAuth();
  const { theme, fontSize, setTheme, setFontSize } = useSettings();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 2MB', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('neta-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('neta-media')
        .getPublicUrl(fileName);

      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (error) throw error;

      if (data.user) {
        setAvatarPreview(publicUrl);
        login({
          ...user!,
          avatar: publicUrl
        });
        toast({ title: 'Success', description: 'Profile picture updated' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!username.trim() || username === user?.username) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      });

      if (error) throw error;

      if (data.user) {
        login({
          ...user!,
          username: username.trim()
        });
        toast({ title: 'Success', description: 'Username updated' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to chat
          </Button>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>

        <div className="space-y-8">
          {/* Profile Section */}
          <div className="border-b border-gray-200 dark:border-gray-800 pb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
            
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-neon-blue hover:bg-neon-cyan text-black rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{user?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Click the camera icon to update your profile picture
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-900 dark:text-white">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter username"
                />
                <Button
                  onClick={handleUpdateUsername}
                  disabled={loading || !username.trim() || username === user?.username}
                  className="bg-neon-blue hover:bg-neon-cyan text-black"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="border-b border-gray-200 dark:border-gray-800 pb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'light'
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Sun className="w-6 h-6 mx-auto mb-2 text-gray-900 dark:text-white" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Light</p>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Moon className="w-6 h-6 mx-auto mb-2 text-gray-900 dark:text-white" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Dark</p>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'system'
                        ? 'border-neon-blue bg-neon-blue/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-900 dark:text-white" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">System</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">Font Size</Label>
                <Select value={fontSize} onValueChange={(value: any) => setFontSize(value)}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                    <SelectItem value="small" className="text-gray-900 dark:text-white">Small</SelectItem>
                    <SelectItem value="medium" className="text-gray-900 dark:text-white">Medium</SelectItem>
                    <SelectItem value="large" className="text-gray-900 dark:text-white">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="pb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Language</h2>
            <Select defaultValue="en">
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                <SelectItem value="en" className="text-gray-900 dark:text-white">English (US)</SelectItem>
                <SelectItem value="es" className="text-gray-900 dark:text-white">Español</SelectItem>
                <SelectItem value="fr" className="text-gray-900 dark:text-white">Français</SelectItem>
                <SelectItem value="de" className="text-gray-900 dark:text-white">Deutsch</SelectItem>
                <SelectItem value="zh" className="text-gray-900 dark:text-white">中文</SelectItem>
                <SelectItem value="ja" className="text-gray-900 dark:text-white">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
