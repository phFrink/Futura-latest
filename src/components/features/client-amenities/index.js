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
import {
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Armchair,
  Calendar,
  X,
  Eye,
  Loader2,
  Sparkles,
  FileText,
  Package,
  Info,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { isNewItem } from "@/lib/utils";
import { format } from "date-fns";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "react-toastify";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useRouter } from "next/navigation";
import ClientNotificationBell from "@/components/ui/ClientNotificationBell";

export default function ClientAmenities() {
  const router = useRouter();
  const { user, profile } = useClientAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);

  const supabase = createClientComponentClient();

  // Form state
  const [formData, setFormData] = useState({
    amenity_id: "",
    borrow_date: "",
    return_date: "",
    quantity: 1,
    purpose: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    filterRequests();
  }, [myRequests, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("🔄 CLIENT - Starting to load data...");
      console.log("👤 CLIENT - Current user ID:", user?.id);

      // Get user's contract
      const { data: contractData, error: contractError } = await supabase
        .from("property_contracts")
        .select("contract_id")
        .eq("user_id", user.id)
        .single();

      if (contractError || !contractData) {
        console.error("❌ CLIENT - No contract found for user");
        console.error("❌ CLIENT - Contract error:", contractError);
        setLoading(false);
        return;
      }

      console.log("✅ CLIENT - Found contract:", contractData);

      // Load user's borrow requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("amenity_borrow_requests")
        .select(
          `*,
          amenities:amenity_id(amenity_id, name, category, total_quantity, available_quantity)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("❌ CLIENT - Error loading borrow requests:", requestsError);
      } else {
        console.log("✅ CLIENT - Loaded borrow requests:", requestsData?.length || 0);
      }

      // Load available amenities (load ALL first to debug)
      console.log("🔍 CLIENT - Attempting to load amenities from database...");
      const { data: amenitiesData, error: amenitiesError } = await supabase
        .from("amenities")
        .select("*")
        .order("name");

      console.log("📡 CLIENT - Amenities query response:", {
        data: amenitiesData,
        error: amenitiesError,
        count: amenitiesData?.length || 0
      });

      if (amenitiesError) {
        console.error("❌ CLIENT - Error loading amenities:", amenitiesError);
        console.error("❌ CLIENT - Error code:", amenitiesError.code);
        console.error("❌ CLIENT - Error message:", amenitiesError.message);
        console.error("❌ CLIENT - Error details:", amenitiesError.details);
        console.error("❌ CLIENT - Error hint:", amenitiesError.hint);
        toast.error("Failed to load amenities: " + amenitiesError.message);
      } else {
        console.log("✅ CLIENT - Loaded amenities successfully!");
        console.log("📊 CLIENT - Amenities count:", amenitiesData?.length || 0);
        console.log("🔍 CLIENT - All amenities:", amenitiesData);
        console.log("🎯 CLIENT - First amenity:", amenitiesData?.[0]);

        if (amenitiesData && amenitiesData.length === 0) {
          console.warn("⚠️ CLIENT - Amenities table is EMPTY! Please add amenities first.");
          toast.warning("No amenities available. Please contact the administrator.");
        }
      }

      setMyRequests(requestsData || []);
      setAmenitiesList(amenitiesData || []);

      console.log("🎉 CLIENT - Data loading complete!");
      console.log("📋 CLIENT - Final amenitiesList state will be:", amenitiesData?.length || 0, "items");
    } catch (error) {
      console.error("❌ CLIENT - Catch error:", error);
      console.error("❌ CLIENT - Error stack:", error.stack);
      toast.error("Failed to load amenities data: " + error.message);
    } finally {
      setLoading(false);
      console.log("✅ CLIENT - Loading finished, loading state set to false");
    }
  };

  const filterRequests = () => {
    let filtered = myRequests;

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.amenities?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter);
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
      borrow_date: "",
      return_date: "",
      quantity: 1,
      purpose: "",
      notes: "",
    });
  };

  const handleViewRequest = (request) => {
    setViewingRequest(request);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.amenity_id || !formData.borrow_date) {
        toast.error("Please fill in all required fields");
        setSubmitting(false);
        return;
      }

      // Get user's contract
      const { data: contractData, error: contractError } = await supabase
        .from("property_contracts")
        .select("contract_id")
        .eq("user_id", user.id)
        .single();

      if (contractError || !contractData) {
        toast.error("No contract found for your account");
        setSubmitting(false);
        return;
      }

      // Check if amenity has enough available quantity
      const selectedAmenity = amenitiesList.find(
        (a) => a.amenity_id === formData.amenity_id
      );

      if (!selectedAmenity) {
        toast.error("Selected amenity not found");
        setSubmitting(false);
        return;
      }

      // Validate quantity
      const requestedQty = parseInt(formData.quantity);
      const availableQty = parseInt(selectedAmenity.available_quantity);

      // Check if quantity is valid number
      if (isNaN(requestedQty) || requestedQty <= 0) {
        toast.error("Please enter a valid quantity");
        setSubmitting(false);
        return;
      }

      // Check if requested quantity exceeds available (strict validation)
      if (requestedQty > availableQty) {
        toast.error(
          `Cannot borrow ${requestedQty} units. Only ${availableQty} unit${availableQty !== 1 ? 's' : ''} available`
        );
        setSubmitting(false);
        return;
      }

      const submitData = {
        amenity_id: formData.amenity_id,
        contract_id: contractData.contract_id,
        user_id: user.id,
        borrow_date: formData.borrow_date,
        return_date: formData.return_date || null,
        quantity: parseInt(formData.quantity),
        purpose: formData.purpose,
        notes: formData.notes || null,
      };

      // Use API endpoint for validated borrow request creation
      const response = await fetch("/api/amenities/borrow-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit borrow request");
      }

      setIsModalOpen(false);
      toast.success("Borrow request submitted successfully!");
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error submitting borrow request:", error);
      toast.error(
        "Error submitting request: " + (error.message || "Unknown error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    console.log("🎬 CLIENT - Opening modal...");
    console.log("📋 CLIENT - Current amenitiesList state:", amenitiesList);
    console.log("📊 CLIENT - amenitiesList length:", amenitiesList.length);
    if (amenitiesList.length > 0) {
      console.log("✅ CLIENT - Amenities available for dropdown:", amenitiesList.map(a => a.name));
    } else {
      console.error("❌ CLIENT - NO AMENITIES IN STATE! Dropdown will be empty!");
    }
    resetForm();
    setIsModalOpen(true);
  };

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
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <Armchair className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
                My Amenity Requests
              </h1>
              <p className="text-base md:text-lg text-slate-600">
                Borrow community amenities for your needs
              </p>
            </div>
            <Button
              onClick={openModal}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Request
            </Button>
          </div>
        </motion.div>

        {/* Available Amenities Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200/60 p-6"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Available Amenities
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {amenitiesList.map((amenity) => (
                  <div
                    key={amenity.amenity_id}
                    className="bg-white rounded-lg p-3 shadow-sm"
                  >
                    <p className="font-medium text-slate-900 text-sm">
                      {amenity.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {amenity.category}
                    </p>
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      {amenity.available_quantity} available
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
                placeholder="Search by amenity or purpose..."
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
            </div>
          </div>
        </motion.div>

        {/* Requests List */}
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
              <p className="text-slate-600 mb-4">
                You haven't borrowed any amenities yet.
              </p>
              <Button
                onClick={openModal}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request an Amenity
              </Button>
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Action
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
                          <span className="text-sm text-slate-600">
                            {format(
                              new Date(request.created_at),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-300 hover:bg-blue-50"
                            onClick={() => handleViewRequest(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
                    Request Details
                  </h2>
                  <p className="text-purple-100 mt-1">
                    View your borrow request information
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

                {viewingRequest.purpose && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Purpose
                    </h3>
                    <p className="text-slate-900 bg-white p-4 rounded-lg">
                      {viewingRequest.purpose}
                    </p>
                  </div>
                )}

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

      {/* Create Request Modal */}
      {isModalOpen && (
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
                    New Borrow Request
                  </h2>
                  <p className="text-purple-100 mt-1">
                    Request to borrow a community amenity
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsModalOpen(false);
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
                        No amenities available
                      </SelectItem>
                    ) : (
                      amenitiesList.map((amenity) => (
                        <SelectItem
                          key={amenity.amenity_id}
                          value={amenity.amenity_id}
                        >
                          {amenity.name} ({amenity.available_quantity} available)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
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

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
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
          </motion.div>
        </div>
      )}
    </div>
  );
}
