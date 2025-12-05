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
  Wrench,
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  ArrowLeft,
  Calendar,
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { toast } from "react-toastify";
import ClientNotificationBell from "@/components/ui/ClientNotificationBell";

export default function ClientServiceRequestsPage() {
  const router = useRouter();
  const {
    user,
    profile,
    isAuthenticated,
    loading: authLoading,
  } = useClientAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    request_type: "general_maintenance",
    priority: "medium",
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
      toast.error("Please login to view your service requests");
      router.push("/client-login");
      return;
    }

    // Only load requests if authenticated and user data is available
    if (isAuthenticated && user) {
      console.log('Authenticated, loading requests for user:', user.email);
      loadRequests();

      // Set up polling to check for status updates every 15 seconds
      const pollInterval = setInterval(() => {
        loadRequests(true); // Silent refresh - no loading spinner
      }, 15000); // Poll every 15 seconds

      return () => clearInterval(pollInterval);
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const loadRequests = async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setLoading(true);
    }

    try {
      console.log(user, "get user");
      const response = await fetch(`/api/service-requests?user_id=${user.id}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load service requests");
      }

      const newRequests = result.data || [];

      // Check for status changes if this is a silent refresh
      if (silent && requests.length > 0) {
        newRequests.forEach(newReq => {
          const oldReq = requests.find(r => r.id === newReq.id);
          if (oldReq && oldReq.status !== newReq.status) {
            // Status changed, show notification
            const statusText = newReq.status.replace("_", " ");
            toast.info(`Request "${newReq.title}" status changed to ${statusText}`);
          }
        });
      }

      setRequests(newRequests);
      setFilteredRequests(newRequests);
    } catch (error) {
      console.error("Error loading requests:", error);
      if (!silent) {
        toast.error("Error loading service requests");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.request_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to submit a request");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/service-requests", {
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
        throw new Error(result.error || "Failed to submit service request");
      }

      toast.success("Service request submitted successfully!");
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        request_type: "maintenance",
        priority: "medium",
      });
      loadRequests();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(error.message || "Failed to submit service request");
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
      approved: {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "Approved",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
      },
      declined: {
        icon: <XCircle className="w-3 h-3" />,
        text: "Declined",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
      },
      "in-progress": {
        icon: <AlertCircle className="w-3 h-3" />,
        text: "In Progress",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
      },
      completed: {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "Completed",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
      },
      cancelled: {
        icon: <XCircle className="w-3 h-3" />,
        text: "Cancelled",
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
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

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { text: "Low", color: "bg-gray-100 text-gray-700 border-gray-200" },
      medium: {
        text: "Medium",
        color: "bg-blue-100 text-blue-700 border-blue-200",
      },
      high: {
        text: "High",
        color: "bg-orange-100 text-orange-700 border-orange-200",
      },
      urgent: {
        text: "Urgent",
        color: "bg-red-100 text-red-700 border-red-200",
      },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

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
                <Wrench className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                My Service Requests
              </h1>
              <p className="text-base md:text-lg text-slate-600">
                Submit and track your property maintenance requests
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Request
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        {requests.length > 0 && (
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
                        placeholder="Search requests..."
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
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <span className="font-semibold">
                      {filteredRequests.length}
                    </span>
                    <span className="ml-1">of {requests.length} requests</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Wrench className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No service requests yet
            </h3>
            <p className="text-slate-500 mb-6">
              Submit your first maintenance or service request
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Request
            </Button>
          </motion.div>
        ) : filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Search className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No requests found
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
            {filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      {request.title}
                    </CardTitle>
                    <p className="text-sm text-slate-500 capitalize">
                      {request.request_type}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {request.description}
                    </p>
                    <div className="space-y-2 text-xs text-slate-500 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Submitted: {formatDate(request.created_date)}
                        </span>
                      </div>
                      {request.scheduled_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>
                            Scheduled: {formatDate(request.scheduled_date)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
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

      {/* Create Request Modal */}
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
                    New Service Request
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
                    <Label htmlFor="title">Request Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="request_type">Request Type *</Label>
                    <select
                      id="request_type"
                      value={formData.request_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          request_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="plumbing">🔧 Plumbing</option>
                      <option value="general_maintenance">
                        🔨 General Maintenance
                      </option>
                      <option value="cleaning"> Cleaning</option>
                      <option value="appliance"> Appliance</option>
                      <option value="electrical"> Electrical</option>
                      <option value="security">Security</option>
                      <option value="landscaping"> Landscaping</option>
                      <option value="hvac"> HVAC</option>
                      <option value="other"> Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority *</Label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
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
                      placeholder="Provide detailed information about your request..."
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
                          Submit Request
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
        {showDetailsModal && selectedRequest && (
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
                      {selectedRequest.title}
                    </h2>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedRequest.status)}
                      {getPriorityBadge(selectedRequest.priority)}
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
                      Request Type
                    </h3>
                    <p className="text-slate-600 capitalize">
                      {selectedRequest.request_type}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Description
                    </h3>
                    <p className="text-slate-600">
                      {selectedRequest.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                      Submitted Date
                    </h3>
                    <p className="text-slate-600">
                      {formatDate(selectedRequest.created_date)}
                    </p>
                  </div>

                  {selectedRequest.scheduled_date && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">
                        Scheduled Date
                      </h3>
                      <p className="text-slate-600">
                        {formatDate(selectedRequest.scheduled_date)}
                      </p>
                    </div>
                  )}

                  {selectedRequest.property && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">
                        Property
                      </h3>
                      <p className="text-slate-600">
                        {selectedRequest.property.name}
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
        aria-label="Create new request"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
