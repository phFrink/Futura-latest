"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Home, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    // Check for existing cooldown on mount
    const lastAttempt = localStorage.getItem('admin_forgot_password_last_attempt');
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
    setError("");
    setSuccess(false);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        // Provide helpful error messages based on the error
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          setError(
            'Too many password reset attempts. Please wait a few minutes and try again, or contact support if you need immediate assistance.'
          );
          // Set 5 minute cooldown for rate limit errors
          localStorage.setItem('admin_forgot_password_last_attempt', Date.now().toString());
          setCooldown(300); // 5 minutes
        } else if (error.message.includes('recovery email') || error.message.includes('unexpected_failure')) {
          setError(
            'Email service is not configured. Please check SUPABASE_EMAIL_SETUP.md for configuration instructions.'
          );
        } else if (error.message.includes('not found') || error.message.includes('User not found')) {
          setError('No account found with this email address.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
        // Set cooldown to prevent spam
        localStorage.setItem('admin_forgot_password_last_attempt', Date.now().toString());
        setCooldown(60); // 60 seconds
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-br from-red-400 to-red-500 p-4 relative">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="bg-gradient-to-br from-red-400 to-red-500 px-1 py-1 rounded-md">
              <Home className="w-7 h-7 text-white" />
            </div>
          </div>
          <span className="text-white font-semibold text-lg">Futura Homes</span>
        </div>
      </div>

      {/* Left Side - Background */}
      <div className="relative hidden lg:flex lg:flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dzqr64ynb/image/upload/v1757853197/367682534_728117842057400_2673269750727514222_n_rdhagt.jpg')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.)]" />

        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full"></div>
          <div className="absolute top-32 right-20 w-12 h-12 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 left-20 w-16 h-16 border border-white/20 rounded-full"></div>
          <div className="absolute top-20 right-40 w-8 h-8 bg-white/10 rounded-full"></div>
        </div>

        <div className="absolute top-8 left-8 flex items-center space-x-2 z-10">
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="bg-gradient-to-br from-red-400 to-red-500 px-1 py-1 rounded-md">
              <Home className="w-7 h-7 text-white" />
            </div>
          </div>
          <span className="text-white font-semibold text-lg">Futura Homes</span>
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-80px)] lg:min-h-screen">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-6 sm:mb-8">
            <Link
              href="/login"
              className="inline-flex items-center text-slate-600 hover:text-red-500 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
              Forgot Password?
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {success
                ? "Check your email for the reset link"
                : "Enter your email address and we'll send you a link to reset your password"}
            </p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Email sent successfully!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      We've sent a password reset link to <strong>{email}</strong>.
                      Please check your inbox and follow the instructions.
                    </p>
                    <p className="mt-2 text-xs">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail("");
                      }}
                      className="text-sm font-medium text-green-600 hover:text-green-500"
                    >
                      Send another email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm sm:text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full bg-gradient-to-br from-red-400 to-red-500 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send Reset Link"}
              </button>

              {cooldown > 0 && !error && (
                <p className="text-xs text-gray-600 text-center">
                  Please wait {cooldown} seconds before requesting another reset link.
                </p>
              )}

              <div className="text-center pt-2">
                <span className="text-xs sm:text-sm text-gray-600">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-red-500 hover:text-red-600 font-medium"
                  >
                    Log in
                  </Link>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
