'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ClientForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    // Check for existing cooldown on mount
    const lastAttempt = localStorage.getItem('forgot_password_last_attempt');
    if (lastAttempt) {
      const timeElapsed = Date.now() - parseInt(lastAttempt);
      const cooldownTime = 60000; // 60 seconds
      if (timeElapsed < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - timeElapsed) / 1000);
        setCooldown(remainingTime);
      }
    }
  }, []);

  useEffect(() => {
    // Countdown timer
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check client-side rate limiting
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/client-reset-password`
          : '/client-reset-password';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        // Provide helpful error messages based on the error
        if (resetError.message.includes('rate limit') || resetError.message.includes('too many requests')) {
          setError(
            'Too many password reset attempts. Please wait a few minutes and try again, or contact support if you need immediate assistance.'
          );
          // Set 5 minute cooldown for rate limit errors
          localStorage.setItem('forgot_password_last_attempt', Date.now().toString());
          setCooldown(300); // 5 minutes
        } else if (resetError.message.includes('recovery email') || resetError.message.includes('unexpected_failure')) {
          setError(
            'Email service is not configured. Please contact the administrator or check SUPABASE_EMAIL_SETUP.md for configuration instructions.'
          );
        } else if (resetError.message.includes('not found') || resetError.message.includes('User not found')) {
          setError('No account found with this email address.');
        } else {
          setError(resetError.message);
        }
      } else {
        setSuccess(true);
        // Set cooldown to prevent spam
        localStorage.setItem('forgot_password_last_attempt', Date.now().toString());
        setCooldown(60); // 60 seconds
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/client-login" className="inline-flex items-center text-slate-600 hover:text-red-600 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Forgot Password?</h1>
          <p className="text-slate-600">
            {success
              ? "Check your email for the reset link"
              : "Enter your email address and we'll send you a link to reset your password"}
          </p>
        </div>

        {/* Form */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-green-800 mb-1">
                        Email sent successfully!
                      </h3>
                      <p className="text-sm text-green-700 mb-2">
                        We've sent a password reset link to <strong>{email}</strong>.
                        Please check your inbox and follow the instructions.
                      </p>
                      <p className="text-xs text-green-600">
                        Didn't receive the email? Check your spam folder or try again.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="w-full bg-slate-600 hover:bg-slate-700"
                >
                  Send Another Email
                </Button>

                <div className="text-center">
                  <Link href="/client-login" className="text-red-600 hover:text-red-700 font-semibold text-sm">
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg disabled:opacity-50"
                >
                  {loading ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Reset Link'}
                </Button>

                {cooldown > 0 && !error && (
                  <p className="text-xs text-slate-600 text-center">
                    Please wait {cooldown} seconds before requesting another reset link.
                  </p>
                )}

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-slate-600 text-sm">
                    Remember your password?{' '}
                    <Link href="/client-login" className="text-red-600 hover:text-red-700 font-semibold">
                      Log In
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
