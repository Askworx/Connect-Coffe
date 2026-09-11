import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

import { login } from '../api';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { EASE } from '../lib/motion';
import WhatsAppMark from '../components/WhatsAppMark';

/**
 * Sign in. A cafe photo on one side, the form on cream on the other; on a
 * phone the photo gives way and the form stands alone.
 *
 * The form authenticates for real: it posts an email address and a password to
 * /api/login and stores the session token that comes back, which every
 * subsequent API call sends as a Bearer header.
 *
 * Sign-in used to be a single shared password with no account behind it. There
 * are real accounts now — the server holds a bcrypt hash per address and hands
 * back a signed token that expires — so the field pair here is what the API
 * expects, not decoration.
 *
 * There is no way past this screen.
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // Distinguish "wrong password" from "server unreachable" — they need
      // two completely different things from the person reading this.
      // Three different things need three different sentences: wrong details,
      // a malformed request, and a server that never answered.
      const status = err?.response?.status;
      const fromServer = err?.response?.data?.error;
      setError(
        status === 401 || status === 400
          ? fromServer || 'That email address and password do not match.'
          : 'Could not reach the server. Check your connection, then try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      {/* The cafe itself. A placeholder photo until the cafe's own is in. */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&q=80"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="font-heading text-4xl font-semibold leading-tight text-white">
            Freshly roasted.
            <br />
            Hand-brewed. In RR Nagar.
          </p>
          <p className="mt-3 text-[14px] text-white/80">
            Send offers, answer customers and take bookings — all on WhatsApp.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="w-full max-w-[400px]"
        >
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="Connect Speciality Coffee Roasters" className="size-28 object-contain" />
            <h1 className="mt-4 font-heading text-4xl font-semibold leading-none text-ink">Connect</h1>
            <p className="mt-2 text-[14px] text-body-text">Speciality Coffee Roasters</p>
            <p className="mt-4 flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-[12px] font-medium text-primary">
              <WhatsAppMark className="size-3.5" />
              WhatsApp marketing panel
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-white p-7 shadow-card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoFocus
                  placeholder="admin@connect.local"
                  required
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'signin-error' : undefined}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'signin-error' : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error && (
                <p id="signin-error" role="alert" className="flex items-start gap-2 text-[13px] leading-relaxed text-danger">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" disabled={submitting || !email || !password} className="group w-full">
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Signing in
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-[12px] text-muted-text">
            BEML 5th Stage, RR Nagar · Bengaluru · Open 8 AM – 9 PM
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
