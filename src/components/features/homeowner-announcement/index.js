"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Pin,
  Megaphone,
  AlertTriangle,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formattedDate, isNewItem } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CATEGORIES = [
  { value: "general", label: "General", color: "bg-blue-100 text-blue-800" },
  { value: "maintenance", label: "Maintenance", color: "bg-yellow-100 text-yellow-800" },
  { value: "events", label: "Events", color: "bg-purple-100 text-purple-800" },
  { value: "emergency", label: "Emergency", color: "bg-red-100 text-red-800" },
  { value: "community", label: "Community", color: "bg-green-100 text-green-800" },
  { value: "updates", label: "Updates", color: "bg-indigo-100 text-indigo-800" },
];

const PRIORITIES = [
  { value: "normal", label: "Normal", color: "bg-gray-100 text-gray-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
];

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const TARGET_AUDIENCES = [
  { value: "all_homeowners", label: "All Homeowners" },
];

const HomeOwnerAnnouncement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // Store file locally

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_url: "",
    category: "general",
    priority: "normal",
    target_audience: "all_homeowners",
    property_id: null,
    author: "Admin",
    author_role: "admin",
    status: "draft",
    is_pinned: false,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [announcements, searchQuery, filterCategory, filterStatus]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("homeowner_announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_date", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...announcements];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (announcement) =>
          announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          announcement.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(
        (announcement) => announcement.category === filterCategory
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (announcement) => announcement.status === filterStatus
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Store file locally and create preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file) => {
    try {
      // Create form data
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      // Upload to announcement-specific API
      const response = await fetch("/api/homeowner-announcements/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openModal = (announcement = null) => {
    if (announcement) {
      setSelectedAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        image_url: announcement.image_url,
        category: announcement.category,
        priority: announcement.priority,
        target_audience: announcement.target_audience,
        property_id: announcement.property_id,
        author: announcement.author,
        author_role: announcement.author_role,
        status: announcement.status,
        is_pinned: announcement.is_pinned,
      });
      setImagePreview(announcement.image_url);
      setSelectedFile(null); // No new file when editing
    } else {
      setSelectedAnnouncement(null);
      setFormData({
        title: "",
        content: "",
        image_url: "",
        category: "general",
        priority: "normal",
        target_audience: "all_homeowners",
        property_id: null,
        author: "Admin",
        author_role: "admin",
        status: "draft",
        is_pinned: false,
      });
      setImagePreview(null);
      setSelectedFile(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAnnouncement(null);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if image is required
    if (!selectedFile && !formData.image_url) {
      toast.error("Please select an image");
      return;
    }

    try {
      setUploading(true);

      let imageUrl = formData.image_url;

      // Upload new image if file is selected
      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile);
      }

      const announcementData = {
        ...formData,
        image_url: imageUrl,
      };

      if (selectedAnnouncement) {
        // Update existing announcement
        const response = await fetch("/api/homeowner-announcements", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedAnnouncement.id,
            ...announcementData,
          }),
        });

        if (!response.ok) throw new Error("Failed to update");

        toast.success("Announcement updated successfully");
      } else {
        // Create new announcement
        const response = await fetch("/api/homeowner-announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(announcementData),
        });

        if (!response.ok) throw new Error("Failed to create");

        toast.success("Announcement created successfully");
      }

      closeModal();
      fetchAnnouncements();
    } catch (error) {
      console.error("Error submitting announcement:", error);
      toast.error("Failed to save announcement");
    } finally {
      setUploading(false);
    }
  };

  const openDeleteModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;

    try {
      const response = await fetch(
        `/api/homeowner-announcements?id=${selectedAnnouncement.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Announcement deleted successfully");
      closeDeleteModal();
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const togglePin = async (announcement) => {
    try {
      const response = await fetch("/api/homeowner-announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: announcement.id,
          ...announcement,
          is_pinned: !announcement.is_pinned,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle pin");

      toast.success(
        announcement.is_pinned ? "Announcement unpinned" : "Announcement pinned"
      );
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update pin status");
    }
  };

  const getCategoryColor = (category) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.color : "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority) => {
    const pri = PRIORITIES.find((p) => p.value === priority);
    return pri ? pri.color : "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-white to-red-50/30 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-red-100"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-red-400 to-red-500 rounded-xl shadow-lg">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  Homeowner Announcements
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Create and manage announcements for certified homeowners
                </p>
              </div>
            </div>
            <Button
              onClick={() => openModal()}
              className="w-full sm:w-auto bg-gradient-to-r from-red-400 to-red-500 md:hover:from-red-500 md:hover:to-red-600 text-white shadow-lg md:hover:shadow-xl transition-all text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Announcement
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-red-100"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-red-200 focus:border-red-400"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="border-red-200 focus:border-red-400">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="border-red-200 focus:border-red-400">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Announcements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence>
            {filteredAnnouncements.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full text-center py-12"
              >
                <Megaphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No announcements found</p>
              </motion.div>
            ) : (
              filteredAnnouncements.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group md:hover:shadow-xl transition-all duration-300 border-red-100 overflow-hidden bg-white/80 backdrop-blur-sm">
                    {/* Image */}
                    <div className="relative h-48 bg-gradient-to-br from-red-100 to-red-50 overflow-hidden">
                      {announcement.image_url ? (
                        <img
                          src={announcement.image_url}
                          alt={announcement.title}
                          className="w-full h-full object-cover md:group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="w-16 h-16 text-red-200" />
                        </div>
                      )}
                      {announcement.is_pinned && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg">
                          <Pin className="w-4 h-4" />
                        </div>
                      )}
                      {isNewItem(announcement.created_date) && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <Sparkles className="w-3 h-3" />
                          New
                        </div>
                      )}
                    </div>

                    <CardHeader>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base sm:text-lg line-clamp-2 md:group-hover:text-red-600 transition-colors">
                            {announcement.title}
                          </CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getCategoryColor(announcement.category)}>
                            {announcement.category}
                          </Badge>
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          <Badge
                            variant={
                              announcement.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {announcement.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {announcement.content}
                      </p>
                      <div className="text-xs text-gray-500 mb-4">
                        <p>By {announcement.author}</p>
                        <p>{formattedDate(announcement.created_date)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePin(announcement)}
                          className="flex-1 border-red-200 md:hover:bg-red-50 text-xs sm:text-sm"
                        >
                          <Pin
                            className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              announcement.is_pinned ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(announcement)}
                          className="flex-1 border-red-200 md:hover:bg-red-50 text-xs sm:text-sm"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(announcement)}
                          className="flex-1 border-red-200 md:hover:bg-red-50 md:hover:text-red-600 text-xs sm:text-sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-red-400 to-red-500 text-white p-6 rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {selectedAnnouncement
                      ? "Edit Announcement"
                      : "Create New Announcement"}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Announcement Image <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center hover:border-red-400 transition-colors">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setSelectedFile(null);
                            if (selectedAnnouncement) {
                              // If editing, clear the existing image URL
                              setFormData((prev) => ({ ...prev, image_url: "" }));
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 mx-auto text-red-400" />
                        <div>
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer text-red-500 hover:text-red-600 font-semibold"
                          >
                            Choose an image
                          </label>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter announcement title"
                    className="border-red-200 focus:border-red-400"
                    required
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Enter announcement content"
                    rows={6}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-colors resize-none"
                    required
                  />
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Category
                    </label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        handleSelectChange("category", value)
                      }
                    >
                      <SelectTrigger className="border-red-200 focus:border-red-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Priority
                    </label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        handleSelectChange("priority", value)
                      }
                    >
                      <SelectTrigger className="border-red-200 focus:border-red-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((pri) => (
                          <SelectItem key={pri.value} value={pri.value}>
                            {pri.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Audience and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Target Audience
                    </label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value) =>
                        handleSelectChange("target_audience", value)
                      }
                    >
                      <SelectTrigger className="border-red-200 focus:border-red-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_AUDIENCES.map((audience) => (
                          <SelectItem key={audience.value} value={audience.value}>
                            {audience.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleSelectChange("status", value)
                      }
                    >
                      <SelectTrigger className="border-red-200 focus:border-red-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pin to Top */}
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    name="is_pinned"
                    checked={formData.is_pinned}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red-500 border-red-300 rounded focus:ring-red-400"
                  />
                  <label
                    htmlFor="is_pinned"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Pin this announcement to the top
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1 border-red-200 md:hover:bg-red-50 text-xs sm:text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-red-400 to-red-500 md:hover:from-red-500 md:hover:to-red-600 text-white shadow-lg text-xs sm:text-sm"
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {selectedFile ? "Uploading..." : "Saving..."}
                        </span>
                      </div>
                    ) : (
                      <span>
                        {selectedAnnouncement ? "Update" : "Create"} Announcement
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) =>
              e.target === e.currentTarget && closeDeleteModal()
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6"
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Delete Announcement
                  </h3>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  "{selectedAnnouncement?.title}"
                </span>
                ?
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closeDeleteModal}
                  className="flex-1 border-gray-300 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 md:hover:bg-red-600 text-white text-xs sm:text-sm"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeOwnerAnnouncement;
