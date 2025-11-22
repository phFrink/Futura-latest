'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User, Mail, Phone, MapPin, Camera, Save, X, Building2, ArrowLeft, LogOut
} from "lucide-react";
import { motion } from "framer-motion";
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { toast } from 'react-toastify';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'futura-client-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

export default function ClientAccountPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, logout, updateProfile, loading: authLoading } = useClientAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    profile_photo: '',
  });

  useEffect(() => {
    // Wait for auth to initialize - don't redirect while still loading
    if (authLoading) return;

    // Only redirect if auth is done loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      toast.error('Please login to access account settings');
      router.push('/client-login');
      return;
    }

    // Only load user data if authenticated and not currently editing
    // (to prevent form reset while user is editing)
    if (isAuthenticated && !isEditing) {
      loadUserData();
    }
  }, [isAuthenticated, user, profile, authLoading, isEditing]);

  const loadUserData = () => {
    if (!user || !profile) {
      setLoading(true);
      return;
    }

    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      profile_photo: profile?.profile_photo || '',
    });
    setPhotoPreview(profile?.profile_photo || null);
    setLoading(false);
  };

  const getInitials = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setSelectedPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const uploadPhoto = async (file) => {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("profile", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok) {
        return result.url;
      } else {
        throw new Error(result.error || "Failed to upload photo");
      }
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let photoUrl = formData.profile_photo;

      if (selectedPhotoFile) {
        setUploadingPhoto(true);
        try {
          photoUrl = await uploadPhoto(selectedPhotoFile);
        } catch (uploadError) {
          toast.error("Failed to upload photo: " + uploadError.message);
          setIsSubmitting(false);
          setUploadingPhoto(false);
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Update user via API
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
          profile_photo: photoUrl,
          role: profile?.role || 'client', // Keep existing role
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Profile updated successfully!");

        // Refresh the Supabase session to get updated user data
        const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();

        if (sessionError) {
          console.error("Error refreshing session:", sessionError);
          // If refresh fails, reload the page as fallback
          setTimeout(() => window.location.reload(), 500);
        } else if (sessionData?.session?.user) {
          // Update form data with refreshed user metadata
          const updatedUser = sessionData.session.user;
          const updatedMetadata = updatedUser.user_metadata;

          setFormData({
            first_name: updatedMetadata?.first_name || '',
            last_name: updatedMetadata?.last_name || '',
            phone: updatedMetadata?.phone || '',
            address: updatedMetadata?.address || '',
            profile_photo: updatedMetadata?.profile_photo || '',
          });
          setPhotoPreview(updatedMetadata?.profile_photo || null);
          setIsEditing(false);
          setSelectedPhotoFile(null);
        }
      } else {
        toast.error(result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      profile_photo: profile?.profile_photo || '',
    });
    setPhotoPreview(profile?.profile_photo || null);
    setSelectedPhotoFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-red-600" />
              <span className="text-2xl font-bold text-slate-800">Futura Homes</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/client-home')}
                variant="outline"
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <User className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
              My Account
            </h1>
            <p className="text-base md:text-lg text-slate-600">
              Manage your profile and account information
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg w-full md:w-auto"
            >
              <User className="w-5 h-5 mr-2" />
              Edit Profile
            </Button>
          )}
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white border border-slate-200 shadow-xl overflow-hidden">
            <CardContent className="p-6 md:p-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-8 border-b border-slate-200">
                <div className="relative">
                  <Avatar className="w-32 h-32 bg-gradient-to-br from-red-100 to-red-200 border-4 border-white shadow-lg">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={`${profile?.first_name} ${profile?.last_name}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="text-red-700 font-bold text-4xl">
                        {getInitials()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full cursor-pointer hover:bg-red-700 shadow-lg">
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                    {profile?.first_name && profile?.last_name
                      ? `${profile.first_name} ${profile.last_name}`
                      : user?.email?.split("@")[0]}
                  </h2>
                  <p className="text-slate-600 mb-3 flex items-center gap-2 justify-center md:justify-start">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
                    <User className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-900">Homeowner</span>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-red-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          First Name
                        </label>
                        {isEditing ? (
                          <Input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            placeholder="Enter first name"
                            required
                            className="w-full"
                          />
                        ) : (
                          <p className="text-slate-900 py-2 px-3 bg-slate-50 rounded-lg">
                            {profile?.first_name || "Not provided"}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Last Name
                        </label>
                        {isEditing ? (
                          <Input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            placeholder="Enter last name"
                            required
                            className="w-full"
                          />
                        ) : (
                          <p className="text-slate-900 py-2 px-3 bg-slate-50 rounded-lg">
                            {profile?.last_name || "Not provided"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-red-600" />
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center gap-2 text-slate-900 py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{user?.email}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <Input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="+63 912 345 6789"
                            className="w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-slate-900 py-2 px-3 bg-slate-50 rounded-lg">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{profile?.phone || "Not provided"}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Address
                        </label>
                        {isEditing ? (
                          <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Enter address"
                            rows="3"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                          />
                        ) : (
                          <div className="flex items-start gap-2 text-slate-900 py-2 px-3 bg-slate-50 rounded-lg min-h-[80px]">
                            <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                            <span>{profile?.address || "Not provided"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white w-full sm:w-auto"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                            {uploadingPhoto ? "Uploading..." : "Saving..."}
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
