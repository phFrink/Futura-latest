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
  Armchair,
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
  Package,
} from "lucide-react";
import { motion } from "framer-motion";
import { isNewItem, getRelativeTime } from "@/lib/utils";
import { format } from "date-fns";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "react-toastify";

export default function Amenities() {
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [amenityFilter, setAmenityFilter] = useState("all");
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
  const [returningId, setReturningId] = useState(null);

  const supabase = createClientComponentClient();

  // Form state
  const [formData, setFormData] = useState({
    amenity_id: "",
    homeowner_id: "",
    borrow_date: "",
    return_date: "",
    quantity: 1,
    purpose: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [borrowRequests, searchTerm, statusFilter, amenityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load amenity borrow requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("amenity_borrow_requests")
        .select(
          `*,
          amenities:amenity_id(amenity_id, name, category, total_quantity, available_quantity),
          property_contracts:contract_id(contract_id, client_name, client_email)
        `
        )
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Load amenities for dropdown (load ALL first to debug)
      const { data: amenitiesData, error: amenitiesError } = await supabase
        .from("amenities")
        .select("*")
        .order("name");

      if (amenitiesError) {
        console.error("❌ Error loading amenities:", amenitiesError);
        toast.error("Failed to load amenities: " + amenitiesError.message);
      } else {
        console.log("✅ Admin - Loaded amenities:", amenitiesData);
        console.log("📊 Admin - Amenities count:", amenitiesData?.length || 0);
        console.log("🔍 Admin - First amenity:", amenitiesData?.[0]);
      }

      // Load contracts for homeowner dropdown
      const { data: contractsData, error: contractsError } = await supabase
        .from("property_contracts")
        .select(
          `
          contract_id,
          client_name,
          client_email,
          property_id,
          property_title,
          contract_status,
          user_id
        `
        )
        .in("contract_status", ["active", "pending", "completed"])
        .order("client_name");

      if (contractsError) throw contractsError;

      setBorrowRequests(requestsData || []);
      setAmenitiesList(amenitiesData || []);
      setHomeowners(contractsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load amenities data");
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = borrowRequests;

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.amenities?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.property_contracts?.client_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (amenityFilter !== "all") {
      filtered = filtered.filter(
        (request) => request.amenity_id === amenityFilter
      );
    }

    setFilteredRequests(filtered);
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
      case "borrowed":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Package,
        };
      case "returned":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: Clock,
        };
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      amenity_id: "",
      homeowner_id: "",
      borrow_date: "",
      return_date: "",
      quantity: 1,
      purpose: "",
      status: "pending",
      notes: "",
    });
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setFormData({
      amenity_id: request.amenity_id?.toString() || "",
      homeowner_id: request.contract_id?.toString() || "",
      borrow_date: request.borrow_date ? request.borrow_date.split("T")[0] : "",
      return_date: request.return_date ? request.return_date.split("T")[0] : "",
      quantity: request.quantity || 1,
      purpose: request.purpose || "",
      status: request.status || "pending",
      notes: request.notes || "",
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
      const { error } = await supabase
        .from("amenity_borrow_requests")
        .delete()
        .eq("id", deletingRequest.id);

      if (error) throw error;

      toast.success("Borrow request deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeletingRequest(null);
      await loadData();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete: " + (error.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRequest = (request) => {
    setViewingRequest(request);
    setIsViewModalOpen(true);
  };

  const handleApprove = async (requestId) => {
    setApprovingId(requestId);
    try {
      const response = await fetch("/api/amenities/borrow", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: requestId,
          status: "approved",
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to approve request");
      }

      toast.success("Borrow request approved!");
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
      const response = await fetch("/api/amenities/borrow", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: requestId,
          status: "declined",
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to decline request");
      }

      toast.success("Borrow request declined!");
      await loadData();
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    } finally {
      setDecliningId(null);
    }
  };

  const handleReturn = async (requestId) => {
    setReturningId(requestId);
    try {
      const response = await fetch("/api/amenities/borrow", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: requestId,
          status: "returned",
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to mark as returned");
      }

      toast.success("Amenity marked as returned!");
      await loadData();
    } catch (error) {
      console.error("Error marking as returned:", error);
      toast.error("Failed to mark as returned");
    } finally {
      setReturningId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      if (
        !formData.amenity_id ||
        !formData.homeowner_id ||
        !formData.borrow_date
      ) {
        toast.error("Please fill in all required fields");
        setSubmitting(false);
        return;
      }

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

      const submitData = {
        amenity_id: formData.amenity_id,
        contract_id: formData.homeowner_id,
        user_id: contractData.user_id,
        borrow_date: formData.borrow_date,
        return_date: formData.return_date || null,
        quantity: parseInt(formData.quantity),
        purpose: formData.purpose,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (editingRequest) {
        const { error } = await supabase
          .from("amenity_borrow_requests")
          .update(submitData)
          .eq("id", editingRequest.id);

        if (error) throw error;

        toast.success("Borrow request updated successfully!");
        setIsEditModalOpen(false);
        setEditingRequest(null);
      } else {
        submitData.created_at = new Date().toISOString();

        const { error } = await supabase
          .from("amenity_borrow_requests")
          .insert([submitData]);

        if (error) throw error;

        setIsModalOpen(false);
        toast.success("Borrow request created successfully!");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving borrow request:", error);
      toast.error(
        "Error saving request: " + (error.message || "Unknown error")
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
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30">
                <Armchair className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                  Amenity Borrowing
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Manage amenity borrow requests
                </p>
              </div>
            </div>
            <Button
              onClick={openModal}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:from-purple-600 hover:to-purple-700 transition-all duration-300 rounded-xl px-6"
            >
              <Plus className="w-5 h-5 mr-2" /> New Borrow Request
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
                placeholder="Search by amenity, homeowner, purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
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
                  <SelectItem value="borrowed">Borrowed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={amenityFilter} onValueChange={setAmenityFilter}>
                <SelectTrigger className="w-full md:w-44 h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="All Amenities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amenities</SelectItem>
                  {amenitiesList.map((amenity) => (
                    <SelectItem
                      key={amenity.amenity_id}
                      value={amenity.amenity_id}
                    >
                      {amenity.name}
                    </SelectItem>
                  ))}
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
                <Armchair className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Borrow Requests
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
                      Amenity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Homeowner
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Borrow Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Return Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
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
                              <div className="font-semibold text-slate-900">
                                {request.amenities?.name || "N/A"}
                              </div>
                              <div className="text-sm text-slate-500 capitalize">
                                {request.amenities?.category || "N/A"}
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
                          <span className="text-sm text-slate-700">
                            {request.property_contracts?.client_name || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900">
                            {request.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {request.borrow_date
                              ? format(
                                  new Date(request.borrow_date),
                                  "MMM d, yyyy"
                                )
                              : "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {request.return_date
                              ? format(
                                  new Date(request.return_date),
                                  "MMM d, yyyy"
                                )
                              : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${color} border font-semibold`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {request.status}
                          </Badge>
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
                            {request.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-700 border-blue-300 hover:bg-blue-50 hover:border-blue-400"
                                onClick={() => handleReturn(request.id)}
                                disabled={returningId === request.id}
                              >
                                {returningId === request.id ? (
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
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Borrow Request Details
                  </h2>
                  <p className="text-purple-100 mt-1">
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
              {/* Status */}
              <div className="flex items-center gap-3 mb-4">
                <Badge
                  className={`${
                    getStatusProps(viewingRequest.status).color
                  } border font-semibold text-sm px-3 py-1`}
                >
                  {viewingRequest.status}
                </Badge>
                {isNewItem(viewingRequest.created_at) && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                    <Sparkles className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Armchair className="w-4 h-4 text-purple-600" />
                    Amenity
                  </h3>
                  <p className="text-slate-900">
                    {viewingRequest.amenities?.name || "N/A"}
                  </p>
                  <p className="text-sm text-slate-500 capitalize">
                    {viewingRequest.amenities?.category || ""}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Homeowner
                  </h3>
                  <p className="text-slate-900">
                    {viewingRequest.property_contracts?.client_name || "N/A"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    Quantity
                  </h3>
                  <p className="text-slate-900">{viewingRequest.quantity}</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    Borrow Date
                  </h3>
                  <p className="text-slate-900">
                    {viewingRequest.borrow_date
                      ? format(
                          new Date(viewingRequest.borrow_date),
                          "MMM d, yyyy"
                        )
                      : "N/A"}
                  </p>
                </div>

                {viewingRequest.return_date && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-600" />
                      Expected Return Date
                    </h3>
                    <p className="text-slate-900">
                      {format(
                        new Date(viewingRequest.return_date),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                )}

                <div className="md:col-span-2">
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Purpose
                  </h3>
                  <p className="text-slate-900 bg-white p-4 rounded-lg">
                    {viewingRequest.purpose || "No purpose specified"}
                  </p>
                </div>

                {viewingRequest.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">
                      Notes
                    </h3>
                    <p className="text-slate-900 bg-white p-4 rounded-lg">
                      {viewingRequest.notes}
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
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white h-11 rounded-xl hover:from-purple-600 hover:to-purple-700"
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
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingRequest
                      ? "Edit Borrow Request"
                      : "New Borrow Request"}
                  </h2>
                  <p className="text-purple-100 mt-1">
                    {editingRequest
                      ? "Update request details"
                      : "Create a new amenity borrow request"}
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
              {/* Amenity */}
              <div className="space-y-2">
                <Label
                  htmlFor="amenity_id"
                  className="text-sm font-bold text-slate-700"
                >
                  Amenity <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.amenity_id}
                  onValueChange={(value) =>
                    handleInputChange("amenity_id", value)
                  }
                >
                  <SelectTrigger className="border-slate-200 rounded-xl h-11">
                    <SelectValue placeholder="Select amenity" />
                  </SelectTrigger>
                  <SelectContent>
                    {amenitiesList.length === 0 ? (
                      <SelectItem value="no-amenities" disabled>
                        No amenities available - Please add amenities first
                      </SelectItem>
                    ) : (
                      amenitiesList.map((amenity) => (
                        <SelectItem
                          key={amenity.amenity_id}
                          value={amenity.amenity_id}
                        >
                          {amenity.name} ({amenity.available_quantity}{" "}
                          available)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
                    handleInputChange(
                      "homeowner_id",
                      selected ? selected.value : ""
                    );
                  }}
                  isClearable
                  placeholder="Select homeowner"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label
                  htmlFor="quantity"
                  className="text-sm font-bold text-slate-700"
                >
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", e.target.value)
                  }
                  required
                  className="border-slate-200 rounded-xl h-11"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="borrow_date"
                    className="text-sm font-bold text-slate-700"
                  >
                    Borrow Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="borrow_date"
                    type="date"
                    value={formData.borrow_date}
                    onChange={(e) =>
                      handleInputChange("borrow_date", e.target.value)
                    }
                    required
                    className="border-slate-200 rounded-xl h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="return_date"
                    className="text-sm font-bold text-slate-700"
                  >
                    Expected Return Date
                  </Label>
                  <Input
                    id="return_date"
                    type="date"
                    value={formData.return_date}
                    onChange={(e) =>
                      handleInputChange("return_date", e.target.value)
                    }
                    className="border-slate-200 rounded-xl h-11"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label
                  htmlFor="purpose"
                  className="text-sm font-bold text-slate-700"
                >
                  Purpose
                </Label>
                <Textarea
                  id="purpose"
                  placeholder="What will the amenity be used for?"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange("purpose", e.target.value)}
                  rows={3}
                  className="border-slate-200 rounded-xl resize-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label
                  htmlFor="notes"
                  className="text-sm font-bold text-slate-700"
                >
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={2}
                  className="border-slate-200 rounded-xl resize-none"
                />
              </div>

              {/* Status (only for edit) */}
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
                      <SelectItem value="borrowed">Borrowed</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                  className="px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl"
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
                      Delete Borrow Request
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
                    {deletingRequest.amenities?.name || "Unknown Amenity"}
                  </h5>
                  <p className="text-sm text-slate-600 mb-2">
                    Borrower:{" "}
                    {deletingRequest.property_contracts?.client_name || "N/A"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Quantity: {deletingRequest.quantity}</span>
                    <span className="capitalize">{deletingRequest.status}</span>
                  </div>
                </div>
                <p className="text-slate-600">
                  This will permanently delete the borrow request. This action
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
