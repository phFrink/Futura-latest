"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Loader2,
  Eye,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { toast } from "react-toastify";
import ClientNotificationBell from "@/components/ui/ClientNotificationBell";

export default function ClientComplaintsPage() {
  const router = useRouter();
  const {
    user,
    profile,
    isAuthenticated,
    loading: authLoading,
  } = useClientAuth();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    complaint_type: "maintenance",
    severity: "medium",
  });

  useEffect(() => {
    // Wait for auth to initialize - don't redirect while still loading
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }

    // Only redirect if auth is done loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      toast.error("Please login to view your complaints");
      router.push("/client-login");
      return;
    }

    // Only load complaints if authenticated and user data is available
    if (isAuthenticated && user) {
      console.log('Authenticated, loading complaints for user:', user.email);
      loadComplaints();

      // Set up polling to check for status updates every 15 seconds
      const pollInterval = setInterval(() => {
        loadComplaints(true); // Silent refresh - no loading spinner
      }, 15000); // Poll every 15 seconds

      return () => clearInterval(pollInterval);
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter]);

  const loadComplaints = async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setLoading(true);
    }

    try {
      console.log(user, "get user");
      const response = await fetch(`/api/complaints?user_id=${user.id}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load complaints");
      }

      const newComplaints = result.data || [];

      // Check for status changes if this is a silent refresh
      if (silent && complaints.length > 0) {
        newComplaints.forEach(newComplaint => {
          const oldComplaint = complaints.find(c => c.id === newComplaint.id);
          if (oldComplaint && oldComplaint.status !== newComplaint.status) {
            // Status changed, show notification
            const statusText = newComplaint.status.replace("_", " ");
            toast.info(`Complaint "${newComplaint.subject}" status changed to ${statusText}`);
          }
        });
      }

      setComplaints(newComplaints);
      setFilteredComplaints(newComplaints);
    } catch (error) {
      console.error("Error loading complaints:", error);
      if (!silent) {
        toast.error("Error loading complaints");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const filterComplaints = () => {
    let filtered = [...complaints];

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.complaint_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredComplaints(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to submit a complaint");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to submit complaint");
      }

      toast.success("Complaint submitted successfully!");
      setShowCreateModal(false);
      setFormData({
        subject: "",
        description: "",
        complaint_type: "maintenance",
        severity: "medium",
      });
      loadComplaints();
    } catch (error) {
      console.error("Error submitting complaint:", error);
      toast.error(error.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: <Clock className="w-3 h-3" />,
        text: "Pending",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
      },
      investigating: {
        icon: <AlertCircle className="w-3 h-3" />,
        text: "Investigating",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
      },
      in_progress: {
        icon: <AlertCircle className="w-3 h-3" />,
        text: "In Progress",
        bgColor: "bg-indigo-50",
        textColor: "text-indigo-700",
        borderColor: "border-indigo-200",
      },
      resolved: {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "Resolved",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
      },
      closed: {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "Closed",
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
      },
      escalated: {
        icon: <AlertTriangle className="w-3 h-3" />,
        text: "Escalated",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${config.bgColor} ${config.textColor} ${config.borderColor}`}
      >
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      low: { text: "Low", color: "bg-gray-100 text-gray-700 border-gray-200" },
      medium: {
        text: "Medium",
        color: "bg-blue-100 text-blue-700 border-blue-200",
      },
      high: {
        text: "High",
        color: "bg-orange-100 text-orange-700 border-orange-200",
      },
      critical: {
        text: "Critical",
        color: "bg-red-100 text-red-700 border-red-200",
      },
    };

    const config = severityConfig[severity] || severityConfig.medium;

    return (
      <span
        className={`inline-block px-2 py-1 rounded-full border text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Show loading only during initial authentication check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-red-600" />
              <span className="text-2xl font-bold text-slate-800">
                Futura Homes
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* <ClientNotificationBell /> */}
              <Button
                onClick={() => router.push("/client-home")}
                variant="outline"
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                My Complaints
              </h1>
              <p className="text-base md:text-lg text-slate-600">
                File and track your property-related complaints
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              File Complaint
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        {complaints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search complaints..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="md:w-48">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="investigating">Investigating</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <span className="font-semibold">
                      {filteredComplaints.length}
                    </span>
                    <span className="ml-1">of {complaints.length} complaints</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Complaints List */}
        {complaints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <MessageSquare className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No complaints yet
            </h3>
            <p className="text-slate-500 mb-6">
              File your first complaint if you have any concerns
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              File Complaint
            </Button>
          </motion.div>
        ) : filteredComplaints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Search className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No complaints found
            </h3>
            <p className="text-slate-500 mb-6">
              Try adjusting your filters or search term
            </p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              variant="outline"
              className="border-slate-300 text-slate-700"
            >
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComplaints.map((complaint, index) => (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      {getStatusBadge(complaint.status)}
                      {getSeverityBadge(complaint.severity)}
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      {complaint.subject}
                    </CardTitle>
                    <p className="text-sm text-slate-500 capitalize">
                      {complaint.complaint_type}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {complaint.description}
                    </p>
                    <div className="space-y-2 text-xs text-slate-500 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Filed: {formatDate(complaint.created_date)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setShowDetailsModal(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Complaint Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    File New Complaint
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      placeholder="Brief description of the complaint"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="complaint_type">Complaint Type *</Label>
                    <select
                      id="complaint_type"
                      value={formData.complaint_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          complaint_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="maintenance">🔧 Maintenance</option>
                      <option value="noise">🔊 Noise</option>
                      <option value="parking">🚗 Parking</option>
                      <option value="security">🔒 Security</option>
                      <option value="billing">💰 Billing</option>
                      <option value="other">📋 Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="severity">Severity *</Label>
                    <select
                      id="severity"
                      value={formData.severity}
                      onChange={(e) =>
                        setFormData({ ...formData, severity: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Provide detailed information about your complaint..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Submit Complaint
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedComplaint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      {selectedComplaint.subject}
                    </h2>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedComplaint.status)}
                      {getSeverityBadge(selectedComplaint.severity)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Complaint Type
                    </h3>
                    <p className="text-slate-600 capitalize">
                      {selectedComplaint.complaint_type}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Description
                    </h3>
                    <p className="text-slate-600">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Filed Date
                    </h3>
                    <p className="text-slate-600">
                      {formatDate(selectedComplaint.created_date)}
                    </p>
                  </div>

                  {selectedComplaint.resolved_date && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">
                        Resolved Date
                      </h3>
                      <p className="text-slate-600">
                        {formatDate(selectedComplaint.resolved_date)}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.resolution_notes && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">
                        Resolution Notes
                      </h3>
                      <p className="text-slate-600">
                        {selectedComplaint.resolution_notes}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.property_info_tbl && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">
                        Property
                      </h3>
                      <p className="text-slate-600">
                        {selectedComplaint.property_info_tbl.property_title}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <Button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 z-40 md:hidden"
        aria-label="File new complaint"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
