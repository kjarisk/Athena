import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-ethereal flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-warm flex items-center justify-center shadow-glow mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Leadership Hub
          </h1>
          <p className="text-text-secondary mt-2">
            Your journey to exceptional leadership
          </p>
        </div>

        {/* Login Form */}
        <div className="card p-8">
          <h2 className="font-display text-xl font-semibold text-text-primary mb-6">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              leftIcon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              leftIcon={<Lock className="w-5 h-5" />}
              required
            />

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-surface rounded-xl">
            <p className="text-sm text-text-secondary text-center">
              <strong>Demo:</strong> demo@example.com / demo123
            </p>
          </div>

          {/* Dev Login Button - Only visible in development */}
          {import.meta.env.DEV && (
            <div className="mt-4">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm opacity-60 hover:opacity-100"
                onClick={async () => {
                  try {
                    await login('demo@example.com', 'demo123');
                    toast.success('Welcome back!');
                    navigate('/');
                  } catch (err) {
                    toast.error('Dev login failed');
                  }
                }}
                isLoading={isLoading}
              >
                Dev Login (Auto)
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

