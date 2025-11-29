"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Camera,
  Save,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

export default function Account() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

  const [userData, setUserData] = useState({
    id: "",
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    address: "",
    role: "",
    profile_photo: "",
  });

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    address: "",
    profile_photo: "",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const user = session.user;
        console.log("👤 [Account] Loading user data for:", user.id);
        console.log("📋 [Account] Current user_metadata:", user.user_metadata);

        const data = {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || "",
          middle_name: user.user_metadata?.middle_name || "",
          last_name: user.user_metadata?.last_name || "",
          phone: user.user_metadata?.phone || "",
          address: user.user_metadata?.address || "",
          role: user.user_metadata?.role || "",
          profile_photo: user.user_metadata?.profile_photo || "",
        };

        console.log("✅ [Account] Loaded user data:", data);
        setUserData(data);
        setFormData({
          first_name: data.first_name,
          middle_name: data.middle_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address,
          profile_photo: data.profile_photo,
        });
        setPhotoPreview(data.profile_photo);
      }
    } catch (error) {
      console.error("❌ [Account] Error loading user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (userData.first_name || userData.last_name) {
      return `${userData.first_name?.[0] || ""}${
        userData.last_name?.[0] || ""
      }`.toUpperCase();
    }
    return userData.email?.substring(0, 2).toUpperCase() || "U";
  };

  const getRoleName = (role) => {
    if (!role) return "User";
    const roleMap = {
      admin: "Administrator",
      "customer service": "Customer Service",
      "sales representative": "Sales Representative",
      "home owner": "Home Owner",
    };
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Store the file and create preview
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

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profile_photo: "" }));
    setPhotoPreview(null);
    setSelectedPhotoFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let photoUrl = formData.profile_photo;

      // Upload photo if a new file was selected
      if (selectedPhotoFile) {
        setUploadingPhoto(true);
        try {
          photoUrl = await uploadPhoto(selectedPhotoFile);
          console.log("✅ Photo uploaded:", photoUrl);
        } catch (uploadError) {
          toast.error("Failed to upload photo: " + uploadError.message);
          setIsSubmitting(false);
          setUploadingPhoto(false);
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Update user metadata via API
      const updatePayload = {
        userId: userData.id,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        phone: formData.phone,
        address: formData.address,
        profile_photo: photoUrl,
        role: userData.role, // Keep existing role
      };

      console.log("📤 [Account] Sending update to API:", updatePayload);
      console.log("📍 [Account] Updating user ID:", userData.id);

      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();
      console.log("📥 [Account] API Response:", result);

      if (result.success) {
        console.log("✅ [Account] Profile updated successfully!");
        console.log("🔄 [Account] Updated user data:", result.data);

        // Refresh the session to get updated user_metadata
        console.log("🔄 [Account] Refreshing session to get latest user_metadata...");
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("❌ [Account] Session refresh error:", refreshError);
        } else {
          console.log("✅ [Account] Session refreshed successfully!");
          console.log("📋 [Account] New user_metadata:", session?.user?.user_metadata);
        }

        toast.success("Profile updated successfully!");
        setIsEditing(false);
        setSelectedPhotoFile(null);

        // Reload user data to reflect changes immediately
        await loadUserData();

        // Reload the page to update the header and other components
        window.location.reload();
      } else {
        console.error("❌ [Account] Update failed:", result.message);
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
      first_name: userData.first_name,
      middle_name: userData.middle_name,
      last_name: userData.last_name,
      phone: userData.phone,
      address: userData.address,
      profile_photo: userData.profile_photo,
    });
    setPhotoPreview(userData.profile_photo);
    setSelectedPhotoFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <User className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
              Account Settings
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-slate-600">
              Manage your profile and account information
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-red-400 to-red-500 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg w-full md:w-auto"
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
          <Card className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg overflow-hidden">
            <CardContent className="p-6 md:p-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-8 border-b border-slate-200">
                <div className="relative">
                  <Avatar className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-white shadow-lg">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={`${userData.first_name} ${userData.last_name}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="text-blue-700 font-bold text-4xl">
                        {getInitials()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
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
                    {userData.first_name && userData.last_name
                      ? `${userData.first_name} ${userData.middle_name ? userData.middle_name + ' ' : ''}${userData.last_name}`
                      : userData.email?.split("@")[0]}
                  </h2>
                  <p className="text-slate-600 mb-3 flex items-center gap-2 justify-center md:justify-start">
                    <Mail className="w-4 h-4" />
                    {userData.email}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {getRoleName(userData.role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
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
                            {userData.first_name || "Not provided"}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Middle Name <span className="text-slate-400 text-xs">(Optional)</span>
                        </label>
                        {isEditing ? (
                          <Input
                            type="text"
                            name="middle_name"
                            value={formData.middle_name}
                            onChange={handleInputChange}
                            placeholder="Enter middle name"
                            className="w-full"
                          />
                        ) : (
                          <p className="text-slate-900 py-2 px-3 bg-slate-50 rounded-lg">
                            {userData.middle_name || "Not provided"}
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
                            {userData.last_name || "Not provided"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center gap-2 text-slate-900 py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{userData.email}</span>
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
                            <span>{userData.phone || "Not provided"}</span>
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        ) : (
                          <div className="flex items-start gap-2 text-slate-900 py-2 px-3 bg-slate-50 rounded-lg min-h-[80px]">
                            <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                            <span>{userData.address || "Not provided"}</span>
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
                        className="bg-gradient-to-r from-red-400 to-red-500 hover:from-blue-700 hover:to-blue-800 text-white w-full sm:w-auto"
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
