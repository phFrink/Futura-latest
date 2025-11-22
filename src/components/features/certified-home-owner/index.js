"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Home,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  FileText,
  Search,
  Download,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  FileSignature,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Eye,
  Filter,
  ArrowRightLeft,
  RefreshCw,
  User,
  Undo2,
  MessageSquare,
  Wrench,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { createClient } from "@supabase/supabase-js";
import WalkInPaymentModal from "./WalkInPaymentModal";
import TransferContractModal from "./TransferContractModal";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CertifiedHomeOwner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentContract, setPaymentContract] = useState(null);
  const [transferContract, setTransferContract] = useState(null);
  const [revertContract, setRevertContract] = useState(null);
  const [revertLoading, setRevertLoading] = useState(false);

  // Related data states
  const [relatedInquiries, setRelatedInquiries] = useState([]);
  const [relatedServiceRequests, setRelatedServiceRequests] = useState([]);
  const [relatedComplaints, setRelatedComplaints] = useState([]);
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, contracts]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contracts");
      const result = await response.json();

      if (result.success) {
        setContracts(result.data);
        setFilteredContracts(result.data);
      } else {
        toast.error(result.message || "Failed to load contracts");
      }
    } catch (error) {
      console.error("Error loading contracts:", error);
      toast.error("Error loading contracts");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contracts];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.contract_status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((c) => {
        return (
          c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_phone?.includes(searchTerm)
        );
      });
    }

    setFilteredContracts(filtered);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₱0.00";
    return `₱${parseFloat(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800 border-green-200", label: "Approved", icon: CheckCircle },
      completed: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Completed", icon: CheckCircle },
      cancelled: { color: "bg-red-100 text-red-800 border-red-200", label: "Cancelled", icon: XCircle },
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending", icon: Clock },
      in_progress: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "In Progress", icon: Clock },
      resolved: { color: "bg-green-100 text-green-800 border-green-200", label: "Resolved", icon: CheckCircle },
      approved: { color: "bg-green-100 text-green-800 border-green-200", label: "Approved", icon: CheckCircle },
      declined: { color: "bg-red-100 text-red-800 border-red-200", label: "Declined", icon: XCircle },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      label: status,
      icon: AlertCircle,
    };

    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      low: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Low" },
      medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Medium" },
      high: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "High" },
      critical: { color: "bg-red-100 text-red-800 border-red-200", label: "Critical" },
    };

    const config = severityConfig[severity] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      label: severity,
    };

    return (
      <Badge className={`${config.color} border w-fit`}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Low" },
      medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Medium" },
      high: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "High" },
      urgent: { color: "bg-red-100 text-red-800 border-red-200", label: "Urgent" },
    };

    const config = priorityConfig[priority] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      label: priority,
    };

    return (
      <Badge className={`${config.color} border w-fit`}>
        {config.label}
      </Badge>
    );
  };

  const loadRelatedData = async (contract) => {
    setLoadingRelatedData(true);
    try {
      // Load inquiries for this homeowner
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from("inquiry_tbl")
        .select("*")
        .eq("email", contract.client_email)
        .order("created_date", { ascending: false });

      if (inquiriesError) {
        console.error("Error loading inquiries:", inquiriesError);
      }

      // Load service requests for this contract
      const { data: serviceRequestsData, error: serviceRequestsError } = await supabase
        .from("request_tbl")
        .select(`
          *,
          property_contracts:contract_id(contract_id, client_name),
          property_info_tbl:property_id(property_id, property_title)
        `)
        .eq("contract_id", contract.contract_id)
        .order("created_date", { ascending: false });

      if (serviceRequestsError) {
        console.error("Error loading service requests:", serviceRequestsError);
      }

      // Load complaints for this contract
      const { data: complaintsData, error: complaintsError } = await supabase
        .from("complaint_tbl")
        .select(`
          *,
          property_contracts!contract_id(contract_id, client_name),
          property_info_tbl!property_id(property_id, property_title)
        `)
        .eq("contract_id", contract.contract_id)
        .order("created_date", { ascending: false });

      if (complaintsError) {
        console.error("Error loading complaints:", complaintsError);
      }

      setRelatedInquiries(inquiriesData || []);
      setRelatedServiceRequests(serviceRequestsData || []);
      setRelatedComplaints(complaintsData || []);
    } catch (error) {
      console.error("Error loading related data:", error);
      toast.error("Failed to load related data");
    } finally {
      setLoadingRelatedData(false);
    }
  };

  const handleViewDetails = (contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
    loadRelatedData(contract);
  };

  const handleWalkInPayment = (schedule, contract) => {
    setSelectedSchedule(schedule);
    setPaymentContract(contract);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData) => {
    toast.success(
      `Payment processed successfully!`
    );
    loadContracts();
    setShowPaymentModal(false);
    setShowDetailModal(false);
  };

  const handleTransferContract = (contract) => {
    setTransferContract(contract);
    setShowTransferModal(true);
  };

  const handleTransferSuccess = (transferData) => {
    toast.success("Contract transferred successfully!");
    loadContracts();
    setShowTransferModal(false);
  };

  const handleRevertTransfer = (contract) => {
    setRevertContract(contract);
    setShowRevertModal(true);
  };

  const confirmRevertTransfer = async () => {
    if (!revertContract || !revertContract.transfer_history) {
      toast.error("No transfer history found for this contract");
      return;
    }

    setRevertLoading(true);

    try {
      const response = await fetch("/api/contracts/revert-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contract_id: revertContract.contract_id,
          transfer_id: revertContract.transfer_history.transfer_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Contract transfer reverted successfully!");
        setShowRevertModal(false);
        setShowDetailModal(false);
        loadContracts();
      } else {
        toast.error(result.message || "Failed to revert transfer");
      }
    } catch (error) {
      console.error("Error reverting transfer:", error);
      toast.error("Error reverting transfer. Please try again.");
    } finally {
      setRevertLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Certified Property Reservations
        </h1>
        <p className="text-gray-600">
          View and manage your property reservations
        </p>
      </div>

      {/* Search and Filters Card */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by property, contract number, or tracking number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="active">Approved</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{filteredContracts.length}</span> of{" "}
              <span className="font-semibold">{contracts.length}</span> reservations
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-red-600" />
              <span className="ml-3 text-gray-600 text-lg">Loading reservations...</span>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl font-semibold">No contracts found</p>
              <p className="text-gray-400 mt-2">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Contracts will appear here once created"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Table Header */}
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Contract #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContracts.map((contract, index) => (
                    <motion.tr
                      key={contract.contract_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Property Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Home className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">
                                {contract.property_title}
                              </p>
                              {contract.transfer_history && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs flex items-center gap-1 px-2 py-0.5">
                                  <RefreshCw className="w-3 h-3" />
                                  Transferred
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {contract.client_name}
                            </p>
                            {contract.transfer_history && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                From: {contract.transfer_history.original_client_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contract Number Column */}
                      <td className="px-6 py-4">
                        <p className="font-mono font-semibold text-gray-900">
                          {contract.contract_number}
                        </p>
                      </td>

                      {/* Date Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">
                            {formatDate(contract.contract_signed_date)}
                          </span>
                        </div>
                      </td>

                      {/* Amount Column */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-lg text-red-600">
                          {formatCurrency(Math.max(0, contract.remaining_balance || 0))}
                        </p>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        {getStatusBadge(contract.contract_status)}
                      </td>

                      {/* Action Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() => handleViewDetails(contract)}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleTransferContract(contract)}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            disabled={contract.contract_status === 'cancelled' || contract.contract_status === 'completed'}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Transfer
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedContract && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b bg-gradient-to-r from-red-500 to-red-600 sticky top-0 z-10 rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Contract Details
                    </h2>
                    <p className="text-3xl font-bold text-white opacity-90">
                      {selectedContract.contract_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailModal(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <XCircle className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              <div className="p-8">
                {/* Transfer History Information */}
                {selectedContract.transfer_history && (
                  <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50 shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <RefreshCw className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-blue-900">
                                Contract Transferred
                              </h3>
                              <Badge className="bg-blue-200 text-blue-800">
                                {formatDate(selectedContract.transfer_history.transferred_at)}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleRevertTransfer(selectedContract)}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Undo2 className="w-4 h-4 mr-2" />
                              Revert Transfer
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-blue-700 uppercase">
                                Previous Owner
                              </span>
                              <p className="font-semibold text-blue-900 mt-1">
                                {selectedContract.transfer_history.original_client_name}
                              </p>
                              <p className="text-sm text-blue-700">
                                {selectedContract.transfer_history.original_client_email}
                              </p>
                              <p className="text-sm text-blue-700">
                                {selectedContract.transfer_history.original_client_phone}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-blue-700 uppercase">
                                Relationship
                              </span>
                              <p className="font-semibold text-blue-900 mt-1 capitalize">
                                {selectedContract.transfer_history.relationship?.replace(/_/g, ' ') || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-blue-700 uppercase">
                                Transfer Reason
                              </span>
                              <p className="font-semibold text-blue-900 mt-1">
                                {selectedContract.transfer_history.transfer_reason}
                              </p>
                            </div>
                            {selectedContract.transfer_history.transfer_notes && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <span className="text-xs font-semibold text-blue-700 uppercase">
                                  Additional Notes
                                </span>
                                <p className="text-blue-900 mt-1 italic">
                                  {selectedContract.transfer_history.transfer_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Client & Property Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Client Information */}
                  <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        Client Information
                      </h3>
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Full Name
                          </span>
                          <p className="font-semibold text-gray-900 mt-1.5 text-base">
                            {selectedContract.client_name}
                          </p>
                        </div>
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Email Address
                          </span>
                          <p className="font-medium text-gray-700 mt-1.5">
                            {selectedContract.client_email}
                          </p>
                        </div>
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Phone Number
                          </span>
                          <p className="font-medium text-gray-700 mt-1.5">
                            {selectedContract.client_phone}
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Address
                          </span>
                          <p className="font-medium text-gray-700 mt-1.5 leading-relaxed">
                            {selectedContract.client_address || "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Property Information */}
                  <Card className="border-l-4 border-l-green-500 shadow-md">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Home className="w-5 h-5 text-green-600" />
                        </div>
                        Property Information
                      </h3>
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Property Name
                          </span>
                          <p className="font-semibold text-gray-900 mt-1.5 text-base">
                            {selectedContract.property_title}
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Total Price
                          </span>
                          <p className="font-bold text-green-600 text-3xl mt-2">
                            {formatCurrency(selectedContract.property_price)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Remaining Balance
                          </span>
                          <p className="font-bold text-red-600 text-2xl mt-2">
                            {formatCurrency(Math.max(0, selectedContract.remaining_balance || 0))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Structure */}
                <Card className="mb-8 shadow-md">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                      </div>
                      Payment Structure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                            Downpayment (10%)
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-blue-900 mb-4">
                          {formatCurrency(selectedContract.downpayment_total)}
                        </p>
                        <div className="space-y-3 pt-3 border-t border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Reservation Fee
                            </span>
                            <span className="text-sm text-green-600 font-bold">
                              {formatCurrency(
                                selectedContract.reservation_fee_paid
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Remaining
                            </span>
                            <span className="text-sm text-red-600 font-bold">
                              {formatCurrency(
                                selectedContract.remaining_downpayment
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                            Payment Plan
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-green-900 mb-4">
                          {selectedContract.payment_plan_months} months
                        </p>
                        <div className="pt-3 border-t border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Monthly Payment
                            </span>
                            <span className="text-base text-green-700 font-bold">
                              {formatCurrency(
                                selectedContract.monthly_installment
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                            Bank Financing (90%)
                          </p>
                        </div>
                        <p className="text-3xl font-bold text-purple-900 mb-4">
                          {formatCurrency(
                            selectedContract.bank_financing_amount
                          )}
                        </p>
                        <div className="pt-3 border-t border-purple-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Status
                            </span>
                            <Badge className="bg-purple-200 text-purple-900 font-medium px-3 py-1">
                              {selectedContract.bank_financing_status ||
                                "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Schedule */}
                {selectedContract.payment_schedules &&
                  selectedContract.payment_schedules.length > 0 && (
                    <Card className="mb-8 shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Receipt className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                Payment Schedule
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                Track all installment payments
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800">
                            {selectedContract.payment_schedules.length}{" "}
                            Installments
                          </Badge>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-gray-200 bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  #
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Due Date
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Paid
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Remaining
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {selectedContract.payment_schedules.map(
                                (schedule) => (
                                  <tr
                                    key={schedule.schedule_id}
                                    className="hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="px-4 py-4">
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                                        {schedule.installment_number}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 font-medium text-gray-900">
                                      {schedule.installment_description}
                                    </td>
                                    <td className="px-4 py-4 text-gray-700">
                                      {formatDate(schedule.due_date)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                                      {formatCurrency(
                                        schedule.scheduled_amount
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-right text-green-600 font-semibold">
                                      {formatCurrency(schedule.paid_amount)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-red-600 font-semibold">
                                      {formatCurrency(
                                        schedule.remaining_amount
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <Badge
                                        className={
                                          schedule.payment_status === "paid"
                                            ? "bg-green-100 text-green-800 font-medium px-3 py-1 border border-green-200"
                                            : schedule.is_overdue
                                            ? "bg-red-100 text-red-800 font-medium px-3 py-1 border border-red-200"
                                            : "bg-yellow-100 text-yellow-800 font-medium px-3 py-1 border border-yellow-200"
                                        }
                                      >
                                        {schedule.payment_status}
                                      </Badge>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Related Activity Section */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Inquiries Section */}
                  <Card className="border-l-4 border-l-purple-500 shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <HelpCircle className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              Inquiries
                            </h3>
                            <p className="text-xs text-gray-600">
                              All inquiries from this homeowner
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">
                          {relatedInquiries.length}
                        </Badge>
                      </div>

                      {loadingRelatedData ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        </div>
                      ) : relatedInquiries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No inquiries found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {relatedInquiries.map((inquiry) => (
                            <div
                              key={inquiry.id}
                              className="p-4 bg-purple-50 rounded-lg border border-purple-100"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    {inquiry.subject}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {inquiry.message}
                                  </p>
                                </div>
                                {getStatusBadge(inquiry.status)}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(inquiry.created_date)}
                                </span>
                                {inquiry.category && (
                                  <Badge className="bg-purple-200 text-purple-900 text-xs">
                                    {inquiry.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Service Requests Section */}
                  <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Wrench className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              Service Requests
                            </h3>
                            <p className="text-xs text-gray-600">
                              Maintenance and service requests
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {relatedServiceRequests.length}
                        </Badge>
                      </div>

                      {loadingRelatedData ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : relatedServiceRequests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No service requests found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {relatedServiceRequests.map((request) => (
                            <div
                              key={request.id}
                              className="p-4 bg-blue-50 rounded-lg border border-blue-100"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    {request.title}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {request.description}
                                  </p>
                                </div>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(request.created_date)}
                                </span>
                                {request.request_type && (
                                  <Badge className="bg-blue-200 text-blue-900 text-xs capitalize">
                                    {request.request_type.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {request.priority && getPriorityBadge(request.priority)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Complaints Section */}
                  <Card className="border-l-4 border-l-red-500 shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              Complaints
                            </h3>
                            <p className="text-xs text-gray-600">
                              Logged complaints and issues
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-red-100 text-red-800">
                          {relatedComplaints.length}
                        </Badge>
                      </div>

                      {loadingRelatedData ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                        </div>
                      ) : relatedComplaints.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No complaints found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {relatedComplaints.map((complaint) => (
                            <div
                              key={complaint.complaint_id}
                              className="p-4 bg-red-50 rounded-lg border border-red-100"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    {complaint.subject}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {complaint.description}
                                  </p>
                                </div>
                                {getStatusBadge(complaint.status)}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(complaint.created_date)}
                                </span>
                                {complaint.complaint_type && (
                                  <Badge className="bg-red-200 text-red-900 text-xs capitalize">
                                    {complaint.complaint_type.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {complaint.severity && getSeverityBadge(complaint.severity)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk-in Payment Modal */}
      <WalkInPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        schedule={selectedSchedule}
        contract={paymentContract}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Transfer Contract Modal */}
      <TransferContractModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        contract={transferContract}
        onTransferSuccess={handleTransferSuccess}
      />

      {/* Revert Transfer Confirmation Modal */}
      <AnimatePresence>
        {showRevertModal && revertContract && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !revertLoading && setShowRevertModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Undo2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Revert Contract Transfer
                    </h2>
                    <p className="text-amber-100 text-sm mt-1">
                      This will restore the contract to the original owner
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Warning Card */}
                <Card className="mb-6 border-l-4 border-l-amber-500 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900 mb-1">
                          Important: This action will undo the transfer
                        </h4>
                        <p className="text-sm text-amber-800">
                          The contract will be returned to the original owner and the transfer history record will be deleted. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        Current Owner (New)
                      </h4>
                      <p className="font-semibold text-gray-900">{revertContract.client_name}</p>
                      <p className="text-sm text-gray-600">{revertContract.client_email}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Undo2 className="w-4 h-4 text-green-600" />
                        Will Revert To (Original)
                      </h4>
                      <p className="font-semibold text-gray-900">
                        {revertContract.transfer_history?.original_client_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {revertContract.transfer_history?.original_client_email}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Transfer Details */}
                <Card className="mb-6 bg-gray-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Transfer Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Contract:</span>
                        <span className="ml-2 font-mono font-semibold">{revertContract.contract_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Property:</span>
                        <span className="ml-2 font-semibold">{revertContract.property_title}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Transferred:</span>
                        <span className="ml-2">{formatDate(revertContract.transfer_history?.transferred_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Reason:</span>
                        <span className="ml-2">{revertContract.transfer_history?.transfer_reason}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRevertModal(false)}
                    disabled={revertLoading}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmRevertTransfer}
                    disabled={revertLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6"
                  >
                    {revertLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reverting...
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-4 h-4 mr-2" />
                        Revert Transfer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
