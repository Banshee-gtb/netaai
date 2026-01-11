import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!email) {
      toast({ title: 'Error', description: 'Please enter your email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await authService.sendOtp(email);
      setOtpSent(true);
      toast({ title: 'Success', description: 'Verification code sent to your email' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!otp || !password) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(email, otp, password);
      login(authService.mapUser(user!));
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const user = await authService.signInWithPassword(email, password);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-neon-blue neon-glow" />
            <h1 className="text-4xl font-bold gradient-neon bg-clip-text text-transparent">
              Neta.ai
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Your AI-powered e-commerce business advisor
          </p>
        </div>

        <Card className="border-neon-blue/20 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignup ? 'Sign up to start learning' : 'Sign in to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || otpSent}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {!isSignup && !otpSent && (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}

            {isSignup && otpSent && (
              <>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Verification Code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    className="bg-gray-800 border-gray-700 text-white"
                    maxLength={4}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Create Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </>
            )}

            {!isSignup && (
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-neon-blue hover:bg-neon-cyan text-black font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </Button>
            )}

            {isSignup && !otpSent && (
              <Button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full bg-neon-blue hover:bg-neon-cyan text-black font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
              </Button>
            )}

            {isSignup && otpSent && (
              <Button
                onClick={handleSignup}
                disabled={loading}
                className="w-full bg-neon-blue hover:bg-neon-cyan text-black font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </Button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="text-center text-sm">
              <button
                onClick={() => {
                  setIsSignup(!isSignup);
                  setOtpSent(false);
                  setOtp('');
                }}
                className="text-neon-blue hover:text-neon-cyan transition-colors"
              >
                {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
