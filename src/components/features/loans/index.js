"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  DollarSign,
  FileText,
  Search,
  Loader2,
  Eye,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { createClient } from "@supabase/supabase-js";
import WalkInPaymentModal from "./WalkInPaymentModal";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Loans() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentContract, setPaymentContract] = useState(null);
  const [revertingScheduleId, setRevertingScheduleId] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, contracts]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contracts");
      const result = await response.json();

      if (result.success) {
        // Filter only active contracts with payment schedules
        const activeContracts = result.data.filter(
          (c) => c.contract_status === "active" && c.payment_schedules?.length > 0
        );
        setContracts(activeContracts);
        setFilteredContracts(activeContracts);
      } else {
        toast.error(result.message || "Failed to load loans");
      }
    } catch (error) {
      console.error("Error loading loans:", error);
      toast.error("Error loading loans");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...contracts];

    if (searchTerm) {
      filtered = filtered.filter((c) => {
        const trackingNumber = c.reservation?.tracking_number || c.tracking_number;
        return (
          c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
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
      month: "short",
      day: "numeric",
    });
  };

  const handleViewPlan = (contract) => {
    router.push(`/loans/${contract.contract_id}/plan`);
  };

  const handleWalkInPayment = (schedule, contract) => {
    setSelectedSchedule(schedule);
    setPaymentContract(contract);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    toast.success(
      `Payment processed successfully! Receipt: ${
        paymentData.transaction?.receipt_number || "Pending"
      }`
    );

    // Close payment modal
    setShowPaymentModal(false);

    // Reload contracts to get updated data
    await loadContracts();

    // Always reload the selected contract details to update remaining balance and payment progress
    if (selectedContract) {
      try {
        const response = await fetch("/api/contracts");
        const result = await response.json();

        if (result.success) {
          const updatedContract = result.data.find(
            (c) => c.contract_id === selectedContract.contract_id
          );
          if (updatedContract) {
            setSelectedContract(updatedContract);
          }
        }
      } catch (error) {
        console.error("Error refreshing contract details:", error);
      }
    }
  };


  const getPaymentProgressPercent = (contract) => {
    if (!contract.statistics) return 0;
    return contract.statistics.payment_progress_percent || 0;
  };

  const getPaymentProgressColor = (percent) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-blue-500";
    if (percent >= 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContracts = filteredContracts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          Billing
        </h1>
        <p className="text-gray-600">
          Track and manage property payment schedules and installments
        </p>
      </div>

      {/* Search and Stats */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by contract number, homeowner name, or tracking number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold">
                Total Active Loans
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {contracts.length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600 font-semibold">
                On Track
              </p>
              <p className="text-2xl font-bold text-green-900">
                {
                  contracts.filter(
                    (c) => c.statistics?.overdue_installments === 0
                  ).length
                }
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-xs text-amber-600 font-semibold">
                With Overdue
              </p>
              <p className="text-2xl font-bold text-amber-900">
                {
                  contracts.filter(
                    (c) => c.statistics?.overdue_installments > 0
                  ).length
                }
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-purple-600 font-semibold">
                Total Amount
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(
                  contracts.reduce((sum, c) => sum + (c.remaining_balance || 0), 0)
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading loans...</span>
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No active loans found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? "Try adjusting your search" : "Active loans will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Contract #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Tracking #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Homeowner Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Payment Progress
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Payment Plan
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentContracts.map((contract, index) => {
                      const progressPercent = getPaymentProgressPercent(contract);
                      const progressColor = getPaymentProgressColor(progressPercent);

                      return (
                        <motion.tr
                          key={contract.contract_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          {/* Contract Number */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-blue-900">
                                {contract.contract_number}
                              </span>
                            </div>
                          </td>

                          {/* Tracking Number */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-gray-600">
                              {contract.reservation?.tracking_number || contract.tracking_number || "N/A"}
                            </span>
                          </td>

                          {/* Homeowner Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {contract.client_name}
                              </span>
                            </div>
                          </td>

                          {/* Payment Progress */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">
                                  {contract.statistics?.paid_installments || 0} of{" "}
                                  {contract.statistics?.total_installments || 0} paid
                                </span>
                                <span className="font-bold text-blue-600">
                                  {progressPercent}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`${progressColor} h-2 rounded-full transition-all duration-500`}
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                              {contract.statistics?.overdue_installments > 0 && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {contract.statistics.overdue_installments} overdue
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Payment Plan */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-gray-900">
                                  {contract.payment_plan_months} months
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatCurrency(contract.monthly_installment)}/mo
                              </p>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 text-center">
                            <Button
                              size="sm"
                              onClick={() => handleViewPlan(contract)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Plan
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-200">
                {currentContracts.map((contract, index) => {
                  const progressPercent = getPaymentProgressPercent(contract);
                  const progressColor = getPaymentProgressColor(progressPercent);

                  return (
                    <motion.div
                      key={contract.contract_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="p-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Contract #</p>
                            <p className="font-semibold text-blue-900">
                              {contract.contract_number}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {contract.payment_plan_months} months
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1">Homeowner</p>
                          <p className="font-medium text-gray-900">
                            {contract.client_name}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-2">Payment Progress</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`${progressColor} h-2 rounded-full`}
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {contract.statistics?.paid_installments || 0} of{" "}
                            {contract.statistics?.total_installments || 0} paid ({progressPercent}%)
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleViewPlan(contract)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Payment Plan
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}


      {/* Walk-in Payment Modal */}
      <WalkInPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        schedule={selectedSchedule}
        contract={paymentContract}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
