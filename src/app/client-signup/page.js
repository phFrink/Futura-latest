'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useClientAuth, ClientAuthProvider } from '@/contexts/ClientAuthContext';
import Link from 'next/link';

function ClientSignupPageContent() {
  const router = useRouter();
  const { signup, loading: authLoading } = useClientAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const { data, error } = await signup(
      formData.firstName,
      formData.middleName,
      formData.lastName,
      formData.email,
      formData.password,
      formData.phone,
      formData.address
    );

    setLoading(false);

    if (!error && data) {
      router.push('/client-home');
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
          <Link href="/client-home" className="inline-flex items-center text-slate-600 hover:text-red-600 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Link>
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Account</h1>
          <p className="text-slate-600">Join Futura Homes to book property tours</p>
        </div>

        {/* Signup Form */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name, Middle Name, and Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="pl-10"
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Middle Name <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="pl-10"
                      placeholder="Dela"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="pl-10"
                      placeholder="Cruz"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your full address"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link href="/client-login" className="text-red-600 hover:text-red-700 font-semibold">
                  Log In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ClientSignupPage() {
  return (
    <ClientAuthProvider>
      <ClientSignupPageContent />
    </ClientAuthProvider>
  );
}
