"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-toastify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Send,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  User,
  FileText,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { isNewItem, getRelativeTime } from '@/lib/utils';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
// Mock Supabase functions for demonstration
const mockSupabase = {
  from: (table) => ({
    select: (columns) => ({
      order: (column, options) =>
        Promise.resolve({
          data: [
            {
              id: 1,
              name: "John Doe",
              email: "john@example.com",
              phone: "+1234567890",
              subject: "Property Information Request",
              message:
                "I would like to know more about the available properties in your portfolio.",
              category: "property_info",
              status: "pending",
              created_date: "2024-01-15T10:30:00Z",
              assigned_to: null,
            },
            {
              id: 2,
              name: "Jane Smith",
              email: "jane@example.com",
              phone: null,
              subject: "Billing Question",
              message:
                "I have a question about my monthly bill and would like clarification on some charges.",
              category: "billing",
              status: "in_progress",
              created_date: "2024-01-14T14:20:00Z",
              assigned_to: "Support Team",
            },
          ],
          error: null,
        }),
    }),
    insert: (data) => ({
      select: () =>
        Promise.resolve({
          data: [
            { ...data, id: Date.now(), created_date: new Date().toISOString() },
          ],
          error: null,
        }),
    }),
  }),
};

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [filteredInquiries, setFilteredInquiries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [deletingInquiry, setDeletingInquiry] = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [followUpMessage, setFollowUpMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    category: "general",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterInquiries();
  }, [inquiries, searchTerm, statusFilter, categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch from API endpoint
      const response = await fetch(
        `/api/client-inquiries?roleId=49d60eb8-184b-48b3-9f4f-d002d3008ea7`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load inquiries');
      }

      setInquiries(result.data || []);
    } catch (error) {
      console.error("Error loading inquiries:", error);
      toast.error('Failed to load inquiries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterInquiries = () => {
    let filtered = inquiries;

    if (searchTerm) {
      filtered = filtered.filter(
        (i) =>
          i.client_firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.client_lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    setFilteredInquiries(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle opening edit modal
  const handleEditInquiry = (inquiry) => {
    setEditingInquiry(inquiry);
    setFormData({
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone || "",
      subject: inquiry.subject,
      message: inquiry.message,
      category: inquiry.category,
      status: inquiry.status,
      assigned_to: inquiry.assigned_to || "",
    });
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteInquiry = (inquiry) => {
    setDeletingInquiry(inquiry);
    setIsDeleteModalOpen(true);
  };

  // Handle status update
  const updateInquiryStatus = async (inquiryId, newStatus) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/client-inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: inquiryId,
          status: newStatus
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to update status');
      }

      // Update local state
      setInquiries(prev =>
        prev.map(inquiry =>
          inquiry.inquiry_id === inquiryId
            ? { ...inquiry, status: newStatus }
            : inquiry
        )
      );

      toast.success(`Inquiry ${newStatus === 'approved' ? 'approved' : 'declined'} successfully!`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle follow up
  const handleFollowUp = (inquiry) => {
    setSelectedInquiry(inquiry);
    setFollowUpMessage('');
    setShowFollowUpModal(true);
  };

  // Send follow up email
  const sendFollowUpEmail = async () => {
    if (!followUpMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/send-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: selectedInquiry.inquiry_id,
          clientEmail: selectedInquiry.client_email,
          clientName: `${selectedInquiry.client_firstname} ${selectedInquiry.client_lastname}`,
          propertyTitle: selectedInquiry.property_title,
          message: followUpMessage
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to send follow-up');
      }

      toast.success('Follow-up email sent successfully!');
      setShowFollowUpModal(false);
      setFollowUpMessage('');
      setSelectedInquiry(null);
    } catch (error) {
      console.error('Error sending follow-up:', error);
      toast.error('Error sending follow-up: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingInquiry) return;

    setSubmitting(true);
    try {
      await deleteInquiry(deletingInquiry.inquiry_id, deletingInquiry.property_title);
      toast.success("Inquiry deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeletingInquiry(null);
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      toast.error("Error deleting inquiry: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Update inquiry function
  const updateInquiry = async (inquiryId, updateData) => {
    try {
      const { data, error } = await supabase
        .from("inquiry_tbl")
        .update({
          ...updateData,
        })
        .eq("id", inquiryId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setInquiries((prev) =>
        prev.map((inquiry) =>
          inquiry.id === inquiryId ? { ...inquiry, ...data } : inquiry
        )
      );

      return data;
    } catch (error) {
      console.error("Error updating inquiry:", error);
      throw error;
    }
  };

  // Delete inquiry function
  const deleteInquiry = async (inquiryId, inquiryTitle) => {
    try {
      const response = await fetch(
        `/api/client-inquiries?inquiryId=${inquiryId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete inquiry');
      }

      // Remove from local state
      setInquiries((prev) =>
        prev.filter((inquiry) => inquiry.inquiry_id !== inquiryId)
      );

      return true;
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      throw error;
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      category: "general",
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      if (editingInquiry) {
        // Update existing inquiry
        const updateData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          subject: formData.subject,
          message: formData.message,
          category: formData.category,
          status: formData.status,
          assigned_to: formData.assigned_to || null,
        };

        const data = await updateInquiry(editingInquiry.id, updateData);
        toast.success("Inquiry updated successfully!");
        setIsEditModalOpen(false);
        setEditingInquiry(null);
      } else {
        // Create new inquiry
        const { data, error } = await supabase
          .from("inquiry_tbl")
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            subject: formData.subject,
            message: formData.message,
            category: formData.category,
            status: "pending",
            created_date: new Date().toISOString(),
            assigned_to: null,
          })
          .select();

        if (error) throw error;

        // Add new inquiry to the list immediately
        setInquiries((prev) => [data[0], ...prev]);

        // Close modal
        const modal = document.getElementById("inquiry_modal");
        if (modal) modal.close();

        toast.success("Inquiry submitted successfully!");
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast.error("Error submitting inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    const modal = document.getElementById("inquiry_modal");
    if (modal) modal.showModal();
  };

  const closeModal = () => {
    const modal = document.getElementById("inquiry_modal");
    if (modal) modal.close();
  };

  const getStatusProps = (status) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: Clock,
        };
      case "approved":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
        };
      case "declined":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: XCircle,
        };
      case "in_progress":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: MessageSquare,
        };
      case "responded":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200",
          icon: Send,
        };
      case "closed":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: XCircle,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/30">
                  <HelpCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                    Inquiries
                  </h1>
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    View client inquiries from website
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1">
                  Role ID: 49d60...3008ea7
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1">
                  {filteredInquiries.length} Total
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, property title, message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-white">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Inquiries List */}
          <div>
            {loading ? (
              <div className="text-center py-12 text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4">Loading inquiries...</p>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No Inquiries Found
                </h3>
                <p className="text-slate-600">The inquiry box is empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInquiries.map((inquiry) => {
                  const { color, icon: StatusIcon } = getStatusProps(
                    inquiry.status
                  );
                  const fullName = `${inquiry.client_firstname || ''} ${inquiry.client_lastname || ''}`.trim();
                  return (
                    <Card
                      key={inquiry.inquiry_id}
                      className="group overflow-hidden bg-white/80 backdrop-blur-sm border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-1"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <Badge className={`${color} border font-medium`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {inquiry.status.replace("_", " ")}
                                </Badge>
                                {isNewItem(inquiry.created_at) && (
                                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md animate-pulse">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    New
                                  </Badge>
                                )}
                              </div>
                              {inquiry.is_authenticated ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <User className="w-3 h-3 mr-1" />
                                  Verified User
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Guest
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg mb-1">
                              {inquiry.property_title || 'General Inquiry'}
                            </h3>
                            <p className="text-slate-600 text-sm line-clamp-3 mb-2">
                              {inquiry.message}
                            </p>
                          </div>
                          <div className="md:text-right md:w-64 flex-shrink-0">
                            <p className="font-semibold text-slate-800 mb-1">
                              {fullName || 'No Name'}
                            </p>
                            <div className="flex items-center md:justify-end gap-2 text-sm text-slate-500 mb-1">
                              <Mail className="w-3 h-3" />
                              {inquiry.client_email}
                            </div>
                            {inquiry.client_phone && (
                              <div className="flex items-center md:justify-end gap-2 text-sm text-slate-500">
                                <Phone className="w-3 h-3" />
                                {inquiry.client_phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 pt-4 mt-4 border-t border-slate-200">
                          Received on {formatDate(inquiry.created_at)}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-3 mt-3 border-t border-slate-200">
                          <div className="flex gap-2">
                            {inquiry.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-outline btn-sm text-green-600 border-green-200 hover:bg-green-50 flex-1"
                                  onClick={() => updateInquiryStatus(inquiry.inquiry_id, 'approved')}
                                  disabled={submitting}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </button>
                                <button
                                  className="btn btn-outline btn-sm text-orange-600 border-orange-200 hover:bg-orange-50 flex-1"
                                  onClick={() => updateInquiryStatus(inquiry.inquiry_id, 'declined')}
                                  disabled={submitting}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Decline
                                </button>
                              </>
                            )}
                            {inquiry.status === 'approved' && (
                              <button
                                className="btn btn-outline btn-sm text-blue-600 border-blue-200 hover:bg-blue-50 flex-1"
                                onClick={() => handleFollowUp(inquiry)}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Follow Up
                              </button>
                            )}
                            <button
                              className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50 flex-1"
                              onClick={() => handleDeleteInquiry(inquiry)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Inquiry Modal */}
      <dialog id="inquiry_modal" className="modal modal-bottom sm:modal-middle">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden mx-auto">
          {/* Header with gradient */}
          <div className="sticky top-0 bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-3xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Submit New Inquiry
                  </h3>
                  <p className="text-red-100 mt-1 text-sm">
                    We&apos;ll get back to you as soon as possible
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="rounded-full hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            <form className="p-8 space-y-8 bg-slate-50">
              {/* Personal Information Section */}
              <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="mt-2 h-11 border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className="mt-2 h-11 border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Category Section */}
              <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Phone className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Contact & Category</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-bold text-slate-700 mb-2">
                      Phone Number (Optional)
                    </Label>
                    <Input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      className="mt-2 h-11 border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      name="category"
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="mt-2 h-11 border-slate-300 rounded-xl">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">📋 General</SelectItem>
                        <SelectItem value="billing">💰 Billing</SelectItem>
                        <SelectItem value="services">🛠️ Services</SelectItem>
                        <SelectItem value="property_info">🏠 Property Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Inquiry Details Section */}
              <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Inquiry Details</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <Label htmlFor="subject" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Subject <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Brief description of your inquiry"
                      className="mt-2 h-11 border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Message <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Please provide detailed information about your inquiry..."
                      rows={6}
                      className="mt-2 resize-none border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl text-base leading-relaxed"
                      maxLength={500}
                      required
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {formData.message.length}/500 characters
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer with Actions */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 rounded-b-3xl shadow-lg">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                <span className="text-red-500">*</span> Required fields
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-8 h-11 rounded-xl border-slate-300 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    submitting ||
                    !formData.name ||
                    !formData.email ||
                    !formData.subject ||
                    !formData.message
                  }
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 h-11 rounded-xl hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Submit Inquiry
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop" onClick={closeModal}>
          <button type="button">close</button>
        </div>
      </dialog>

      {/* Edit Inquiry Modal */}
      {isEditModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-2xl text-slate-900 mb-1">
                  Edit Inquiry
                </h3>
                <p className="text-slate-600">
                  Update inquiry information and status
                </p>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingInquiry(null);
                  resetForm();
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-slate-700">
                      Full Name *
                    </span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    className="input input-bordered w-full focus:input-primary transition-colors bg-white/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-slate-700">
                      Email Address *
                    </span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    className="input input-bordered w-full focus:input-primary transition-colors bg-white/80"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-slate-700">
                      Phone Number
                    </span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className="input input-bordered w-full focus:input-primary transition-colors bg-white/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-slate-700">
                      Category *
                    </span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="select select-bordered w-full focus:select-primary transition-colors bg-white/80"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="services">Services</option>
                    <option value="property_info">Property Info</option>
                  </select>
                </div>
              </div>

              {/* Status and Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-slate-700">
                      Status *
                    </span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="select select-bordered w-full focus:select-primary transition-colors bg-white/80"
                  >
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-slate-700">
                      Assigned To
                    </span>
                  </label>
                  <input
                    type="text"
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    placeholder="Assigned staff/team"
                    className="input input-bordered w-full focus:input-primary transition-colors bg-white/80"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-slate-700">
                    Subject *
                  </span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief description of inquiry"
                  className="input input-bordered w-full focus:input-primary transition-colors bg-white/80"
                />
              </div>

              {/* Message */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-slate-700">
                    Message *
                  </span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Inquiry details..."
                  className="textarea textarea-bordered h-32 w-full focus:textarea-primary transition-colors bg-white/80 resize-none"
                ></textarea>
                <label className="label">
                  <span className="label-text-alt text-slate-500">
                    {formData.message.length}/500 characters
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="modal-action pt-4">
                <button
                  type="button"
                  className="btn btn-outline gap-2 hover:bg-slate-100 transition-colors hover:text-slate-900"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingInquiry(null);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all bg-red-600 hover:bg-red-700 border-none text-white"
                  disabled={
                    submitting ||
                    !formData.name ||
                    !formData.email ||
                    !formData.subject ||
                    !formData.message
                  }
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5" />
                      Update Inquiry
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Delete Inquiry</h3>
                    <p className="text-red-100 text-sm mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingInquiry(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this inquiry?
                </h4>
                {deletingInquiry && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                    <h5 className="font-medium text-slate-900 mb-1">
                      {deletingInquiry.property_title || 'General Inquiry'}
                    </h5>
                    <p className="text-sm text-slate-600 mb-2">
                      From: {deletingInquiry.client_firstname} {deletingInquiry.client_lastname}
                    </p>
                    <p className="text-sm text-slate-600 mb-2">
                      Email: {deletingInquiry.client_email}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">
                        {deletingInquiry.status.replace("_", " ")}
                      </span>
                      <span className="capitalize">
                        {deletingInquiry.is_authenticated ? 'Verified User' : 'Guest'}
                      </span>
                    </div>
                  </div>
                )}
                <p className="text-slate-600">
                  This will permanently delete the inquiry and all associated
                  data. This action cannot be reversed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingInquiry(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    submitting ? "opacity-80 cursor-not-allowed" : ""
                  }`}
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Inquiry
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {showFollowUpModal && selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Send Follow-Up Email</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Contact client about their inquiry
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setShowFollowUpModal(false);
                    setFollowUpMessage('');
                    setSelectedInquiry(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Client Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name:</span>
                    <span className="font-medium text-slate-900">
                      {selectedInquiry.client_firstname} {selectedInquiry.client_lastname}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Email:</span>
                    <span className="font-medium text-slate-900">{selectedInquiry.client_email}</span>
                  </div>
                  {selectedInquiry.property_title && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Property:</span>
                      <span className="font-medium text-slate-900">{selectedInquiry.property_title}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Original Message */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Original Inquiry:
                </label>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border border-slate-200">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Follow Up Message */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Your Follow-Up Message *
                </label>
                <textarea
                  rows={6}
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Write your follow-up message to the client..."
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {followUpMessage.length} characters
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setShowFollowUpModal(false);
                    setFollowUpMessage('');
                    setSelectedInquiry(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    submitting || !followUpMessage.trim() ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={sendFollowUpEmail}
                  disabled={submitting || !followUpMessage.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Follow-Up
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
