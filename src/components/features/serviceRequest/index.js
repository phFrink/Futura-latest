"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ReactSelect from "react-select";
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Wrench,
  Building2,
  User,
  Calendar,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  FileText,
  Check,
  Ban,
  Eye,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import { isNewItem, getRelativeTime } from "@/lib/utils";
import { format } from "date-fns";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { formattedDate } from "@/lib/utils";
import { toast } from "react-toastify";

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [revertingId, setRevertingId] = useState(null);

  const supabase = createClientComponentClient();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    request_type: "",
    priority: "medium",
    status: "pending",
    homeowner_id: "",
    property_id: "",
    scheduled_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load service requests with related data
      const { data: requestsData, error: requestsError } = await supabase
        .from("request_tbl")
        .select(
          `*,
          property_contracts:contract_id(contract_id,client_name),
          property_info_tbl:property_id(property_id, property_title)
        `
        )
        .order("created_date", { ascending: false });

      if (requestsError) throw requestsError;

      // Load properties for form dropdown
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("property_tbl")
        .select("id, name")
        .order("name");

      if (propertiesError) throw propertiesError;

      // Load contracts (which link homeowners to properties) for the dropdown
      const { data: contractsData, error: contractsError } = await supabase
        .from("property_contracts")
        .select(
          `
          contract_id,
          client_name,
          client_email,
          property_id,
          property_title,
          contract_status
        `
        )
        .in("contract_status", ["active", "pending", "completed"])
        .order("client_name");

      if (contractsError) throw contractsError;

      console.log("Loaded contracts:", contractsData?.length || 0);

      setRequests(requestsData || []);
      setProperties(propertiesData || []);
      setHomeowners(contractsData || []); // Using contracts as "homeowners" for the dropdown
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (request.homeowner?.full_name &&
            request.homeowner.full_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (request.property?.property_title &&
            request.property.property_id
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (request) => request.priority === priorityFilter
      );
    }

    setFilteredRequests(filtered);
  };

  const getPropertyName = (propertyId) => {
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.name : "N/A";
  };

  const getHomeownerName = (homeownerId) => {
    const homeowner = homeowners.find((h) => h.id === homeownerId);
    return homeowner ? homeowner.full_name : "N/A";
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
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
        };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHomeownerChange = (selectedOption) => {
    if (!selectedOption) {
      setFormData((prev) => ({ ...prev, homeowner_id: "", property_id: "" }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      homeowner_id: selectedOption.value,
      property_id: "",
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      request_type: "",
      priority: "medium",
      status: "pending",
      homeowner_id: "",
      property_id: "",
      scheduled_date: "",
    });
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      request_type: request.request_type,
      priority: request.priority,
      status: request.status,
      homeowner_id: request.contract_id?.toString() || "", // Map contract_id to homeowner_id
      property_id: request.property_id?.toString() || "",
      scheduled_date: request.scheduled_date
        ? request.scheduled_date.split("T")[0]
        : "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteRequest = (request) => {
    setDeletingRequest(request);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRequest) return;

    setSubmitting(true);
    try {
      await deleteRequest(deletingRequest.id, deletingRequest.title);
      toast.success("Service request deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeletingRequest(null);
      // Reload data to ensure fresh state
      await loadData();
    } catch (error) {
      console.error("Error deleting service request:", error);
      toast.error("Failed to delete: " + (error.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRequest = (request) => {
    setViewingRequest(request);
    setIsViewModalOpen(true);
  };

  const sendNotificationToUser = async (request, newStatus) => {
    try {
      // Get user_id from the service request through contract
      if (!request.contract_id) {
        console.warn("No contract_id found for request:", request.id);
        return;
      }

      // Fetch the contract to get user_id
      const { data: contractData, error: contractError } = await supabase
        .from("property_contracts")
        .select("user_id")
        .eq("contract_id", request.contract_id)
        .single();

      if (contractError || !contractData?.user_id) {
        console.warn("Could not find user_id for request:", request.id);
        return;
      }

      const userId = contractData.user_id;

      // Create notification
      // For clients, we store user_id in data field (not recipient_id) because recipient_id expects integer
      const statusMessages = {
        approved: {
          title: "Service Request Approved",
          message: `Your service request "${request.title}" has been approved.`,
          icon: "✅",
        },
        declined: {
          title: "Service Request Declined",
          message: `Your service request "${request.title}" has been declined.`,
          icon: "❌",
        },
        reverted: {
          title: "Service Request Reverted",
          message: `Your service request "${request.title}" has been reverted to pending status.`,
          icon: "🔄",
        },
      };

      const statusInfo = statusMessages[newStatus] || statusMessages.approved;

      const notificationData = {
        title: statusInfo.title,
        message: statusInfo.message,
        icon: statusInfo.icon,
        priority: "high",
        recipient_role: "client", // Mark as client notification
        notification_type: "service_request_update",
        source_table: "request_tbl",
        source_table_display_name: "Service Requests",
        source_record_id: request.id,
        action_url: "/client-requests",
        data: {
          user_id: userId, // Store client user_id here for filtering
          request_id: request.id,
          request_title: request.title,
          request_type: request.request_type,
          status: newStatus,
        },
      };

      console.log("Sending notification to user:", userId);
      console.log(
        "🔍 NOTIFICATION PAYLOAD:",
        JSON.stringify(notificationData, null, 2)
      );
      console.log(
        "🔍 Does payload have recipient_id?",
        "recipient_id" in notificationData
      );

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Failed to create notification:", result.error);
      } else {
        console.log("Notification sent successfully:", result);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const handleApprove = async (requestId) => {
    setApprovingId(requestId);
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/service-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: 'approved',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve request');
      }

      toast.success("Service request approved!");
      // Reload data to ensure fresh state
      await loadData();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDecline = async (requestId) => {
    setDecliningId(requestId);
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/service-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: 'declined',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to decline request');
      }

      toast.success("Service request declined!");
      // Reload data to ensure fresh state
      await loadData();
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    } finally {
      setDecliningId(null);
    }
  };

  const handleRevert = async (requestId) => {
    setRevertingId(requestId);
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/service-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: 'pending',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to revert request');
      }

      toast.success("Service request reverted to pending!");
      // Reload data to ensure fresh state
      await loadData();
    } catch (error) {
      console.error("Error reverting request:", error);
      toast.error("Failed to revert request");
    } finally {
      setRevertingId(null);
    }
  };

  const updateRequest = async (requestId, updateData) => {
    try {
      console.log("Updating request:", requestId, "with data:", updateData);

      const { data, error } = await supabase
        .from("request_tbl")
        .update({
          ...updateData,
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message || "Failed to update request");
      }

      if (!data) {
        throw new Error("No data returned from update");
      }

      console.log("Update successful:", data);

      // Update local state optimistically
      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, ...data } : request
        )
      );

      return data;
    } catch (error) {
      console.error("Error updating service request:", error);
      throw error;
    }
  };

  const deleteRequest = async (requestId, requestTitle) => {
    try {
      console.log("Deleting request:", requestId, requestTitle);

      const { error } = await supabase
        .from("request_tbl")
        .delete()
        .eq("id", requestId);

      if (error) {
        console.error("Supabase delete error:", error);
        throw new Error(error.message || "Failed to delete request");
      }

      console.log("Delete successful, removing from state");

      // Remove from local state
      setRequests((prev) => prev.filter((request) => request.id !== requestId));

      return true;
    } catch (error) {
      console.error("Error deleting service request:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.request_type) {
        toast.error("Please fill in all required fields");
        setSubmitting(false);
        return;
      }

      if (!formData.homeowner_id) {
        toast.error("Please select a homeowner");
        setSubmitting(false);
        return;
      }

      // Map formData fields to database fields
      const submitData = {
        title: formData.title,
        description: formData.description,
        request_type: formData.request_type,
        priority: formData.priority,
        status: formData.status,
        contract_id: formData.homeowner_id, // Map homeowner_id to contract_id
        property_id: formData.property_id,
        scheduled_date: formData.scheduled_date || null,
      };

      if (editingRequest) {
        const data = await updateRequest(editingRequest.id, submitData);
        toast.success("Service request updated successfully!");
        setIsEditModalOpen(false);
        setEditingRequest(null);
      } else {
        // Fetch user_id from the selected contract
        const { data: contractData, error: contractError } = await supabase
          .from("property_contracts")
          .select("user_id")
          .eq("contract_id", formData.homeowner_id)
          .single();

        if (contractError) {
          console.error("Error fetching contract:", contractError);
          toast.error("Failed to fetch homeowner information");
          setSubmitting(false);
          return;
        }

        if (!contractData?.user_id) {
          toast.error("Selected homeowner has no associated user account");
          setSubmitting(false);
          return;
        }

        submitData.created_date = new Date().toISOString();
        submitData.user_id = contractData.user_id;

        const { data, error } = await supabase
          .from("request_tbl")
          .insert([submitData]).select(`
            *,
          property_contracts:contract_id(contract_id,client_name),
          property_info_tbl:property_id(property_id, property_title)
          `);

        if (error) throw error;

        setRequests((prev) => [data[0], ...prev]);
        setIsModalOpen(false);

        toast.success("Service request created successfully!");
      }

      resetForm();
      await loadData(); // Reload data to ensure fresh state
    } catch (error) {
      console.error("Error creating service request:", error);
      toast.error(
        "Error saving service request: " + (error.message || "Unknown error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 md:p-8">
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
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                  Service Requests
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Track and manage homeowner requests
                </p>
              </div>
            </div>
            <Button
              onClick={openModal}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:from-red-600 hover:to-red-700 transition-all duration-300 rounded-xl px-6"
            >
              <Plus className="w-5 h-5 mr-2" /> New Request
            </Button>
          </div>
        </motion.div>

        {/* Search and Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by title, description, homeowner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44 h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-44 h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Table View */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="p-8 space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-200 animate-pulse rounded-lg"
                  />
                ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wrench className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Service Requests
              </h3>
              <p className="text-slate-600">
                All caught up! No requests match your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Homeowner
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRequests.map((request) => {
                    const { color, icon: StatusIcon } = getStatusProps(
                      request.status
                    );
                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-slate-900 max-w-xs truncate">
                                {request.title}
                              </div>
                              <div className="text-sm text-slate-500 max-w-xs truncate">
                                {request.description}
                              </div>
                            </div>
                            {isNewItem(request.created_at) && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                                <Sparkles className="w-3 h-3 mr-1" />
                                New
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700 capitalize">
                            {request.request_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {request?.property_contracts?.client_name ?? "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {request?.property_info_tbl?.property_title ??
                              "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={`${getPriorityColor(
                              request.priority
                            )} border capitalize font-semibold`}
                          >
                            {request.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${color} border font-semibold`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {request.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {format(
                              new Date(request.created_date),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {request.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={approvingId === request.id}
                                >
                                  {approvingId === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400"
                                  onClick={() => handleDecline(request.id)}
                                  disabled={decliningId === request.id}
                                >
                                  {decliningId === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Ban className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            {(request.status === "approved" ||
                              request.status === "declined") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-700 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
                                onClick={() => handleRevert(request.id)}
                                disabled={revertingId === request.id}
                              >
                                {revertingId === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-700 border-blue-300 hover:bg-blue-50"
                              onClick={() => handleViewRequest(request)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-700 border-purple-300 hover:bg-purple-50"
                              onClick={() => handleEditRequest(request)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => handleDeleteRequest(request)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* View Request Modal */}
      {isViewModalOpen && viewingRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Service Request Details
                  </h2>
                  <p className="text-red-100 mt-1">
                    View complete request information
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingRequest(null);
                  }}
                  className="rounded-full hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Status and Priority */}
              <div className="flex items-center gap-3 mb-4">
                <Badge
                  className={`${
                    getStatusProps(viewingRequest.status).color
                  } border font-semibold text-sm px-3 py-1`}
                >
                  {viewingRequest.status.replace("_", " ")}
                </Badge>
                <Badge
                  className={`${getPriorityColor(
                    viewingRequest.priority
                  )} border font-semibold text-sm px-3 py-1`}
                >
                  {viewingRequest.priority} priority
                </Badge>
                {isNewItem(viewingRequest.created_at) && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                    <Sparkles className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">Title</h3>
                <p className="text-lg font-semibold text-slate-900">
                  {viewingRequest.title}
                </p>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">
                  Description
                </h3>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                  {viewingRequest.description}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    Request Type
                  </h3>
                  <p className="text-slate-900 capitalize">
                    {viewingRequest.request_type.replace("_", " ")}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    Homeowner
                  </h3>
                  <p className="text-slate-900">
                    {viewingRequest?.property_contracts?.client_name ?? "N/A"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Property
                  </h3>
                  <p className="text-slate-900">
                    {viewingRequest?.property_info_tbl?.property_title ?? "N/A"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    Created Date
                  </h3>
                  <p className="text-slate-900">
                    {format(
                      new Date(viewingRequest.created_date),
                      "MMM d, yyyy"
                    )}
                  </p>
                </div>

                {viewingRequest.scheduled_date && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      Scheduled Date
                    </h3>
                    <p className="text-slate-900">
                      {format(
                        new Date(viewingRequest.scheduled_date),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 rounded-b-2xl">
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingRequest(null);
                }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white h-11 rounded-xl hover:from-red-600 hover:to-red-700"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create/Edit Request Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingRequest
                      ? "Edit Service Request"
                      : "New Service Request"}
                  </h2>
                  <p className="text-red-100 mt-1">
                    {editingRequest
                      ? "Update request details"
                      : "Submit a new request"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingRequest(null);
                    resetForm();
                  }}
                  className="rounded-full hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-sm font-bold text-slate-700"
                >
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Enter request title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                  className="border-slate-200 rounded-xl h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-bold text-slate-700"
                >
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the request in detail"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  required
                  rows={4}
                  className="border-slate-200 rounded-xl resize-none"
                />
              </div>

              {/* Request Type */}
              <div className="space-y-2">
                <Label htmlFor="request_type" className="text-sm font-bold text-slate-700">
                  Request Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="request_type"
                  value={formData.request_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      request_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl h-11 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select request type...</option>
                  <option value="plumbing">🔧 Plumbing</option>
                  <option value="general_maintenance">
                    🔨 General Maintenance
                  </option>
                  <option value="cleaning"> Cleaning</option>
                  <option value="appliance"> Appliance</option>
                  <option value="electrical"> Electrical</option>
                  <option value="security">Security</option>
                  <option value="landscaping"> Landscaping</option>
                  <option value="hvac">HVAC</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Homeowner */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">
                  Homeowner <span className="text-red-500">*</span>
                </Label>
                <ReactSelect
                  options={homeowners.map((h) => ({
                    value: h.contract_id,
                    label: `${h.client_name} - ${
                      h.property_title || "No property"
                    }`,
                  }))}
                  value={
                    formData.homeowner_id
                      ? {
                          value: formData.homeowner_id,
                          label: homeowners.find(
                            (h) =>
                              h.contract_id?.toString() ===
                              formData.homeowner_id.toString()
                          )
                            ? `${
                                homeowners.find(
                                  (h) =>
                                    h.contract_id?.toString() ===
                                    formData.homeowner_id.toString()
                                ).client_name
                              } - ${
                                homeowners.find(
                                  (h) =>
                                    h.contract_id?.toString() ===
                                    formData.homeowner_id.toString()
                                ).property_title || "No property"
                              }`
                            : "Unknown Homeowner",
                        }
                      : null
                  }
                  onChange={(selected) => {
                    if (selected) {
                      const selectedHomeowner = homeowners.find(
                        (h) => h.contract_id === selected.value
                      );
                      handleInputChange("homeowner_id", selected.value);
                      if (selectedHomeowner?.property_id) {
                        handleInputChange(
                          "property_id",
                          selectedHomeowner.property_id
                        );
                      }
                    } else {
                      handleInputChange("homeowner_id", "");
                      handleInputChange("property_id", "");
                    }
                  }}
                  isClearable
                  placeholder="Select homeowner"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>

              {/* Priority and Status in a grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="priority"
                    className="text-sm font-bold text-slate-700"
                  >
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      handleInputChange("priority", value)
                    }
                  >
                    <SelectTrigger className="border-slate-200 rounded-xl h-11">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingRequest && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="status"
                      className="text-sm font-bold text-slate-700"
                    >
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <SelectTrigger className="border-slate-200 rounded-xl h-11">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="scheduled_date"
                  className="text-sm font-bold text-slate-700"
                >
                  Scheduled Date (Optional)
                </Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    handleInputChange("scheduled_date", e.target.value)
                  }
                  className="border-slate-200 rounded-xl h-11"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingRequest(null);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-6 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingRequest ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingRequest ? (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Update Request
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Request
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Delete Service Request
                    </h3>
                    <p className="text-red-100 text-sm mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingRequest(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this request?
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                  <h5 className="font-medium text-slate-900 mb-1">
                    {deletingRequest.title}
                  </h5>
                  <p className="text-sm text-slate-600 mb-2">
                    {deletingRequest.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize">
                      {deletingRequest.request_type.replace("_", " ")}
                    </span>
                    <span className="capitalize">
                      {deletingRequest.priority} priority
                    </span>
                  </div>
                </div>
                <p className="text-slate-600">
                  This will permanently delete the service request. This action
                  cannot be reversed.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingRequest(null);
                  }}
                  className="px-6"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
