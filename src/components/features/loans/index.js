"use client";

import React, { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
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
    setSelectedContract(contract);
    setShowPlanModal(true);
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

  const handleRevertToPending = async (schedule) => {
    if (!window.confirm(
      `Are you sure you want to revert installment #${schedule.installment_number} to pending status? This will undo the payment.`
    )) {
      return;
    }

    setRevertingScheduleId(schedule.schedule_id);
    try {
      const response = await fetch("/api/contracts/payment/revert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule_id: schedule.schedule_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Payment reverted to pending successfully!");

        // Reload contracts and update selected contract
        await loadContracts();

        // If modal is open, refresh the selected contract with updated data
        if (selectedContract) {
          // Re-fetch contracts to get the latest data
          const response = await fetch("/api/contracts");
          const contractsResult = await response.json();

          if (contractsResult.success) {
            const updatedContract = contractsResult.data.find(
              (c) => c.contract_id === selectedContract.contract_id
            );
            if (updatedContract) {
              setSelectedContract(updatedContract);
            }
          }
        }
      } else {
        toast.error(result.message || "Failed to revert payment");
      }
    } catch (error) {
      console.error("Error reverting payment:", error);
      toast.error("Error reverting payment");
    } finally {
      setRevertingScheduleId(null);
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

      {/* Payment Plan Modal */}
      <AnimatePresence>
        {showPlanModal && selectedContract && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlanModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Payment Plan Details
                    </h2>
                    <p className="text-lg text-blue-600 font-semibold">
                      {selectedContract.contract_number}
                    </p>
                    {(selectedContract.reservation?.tracking_number || selectedContract.tracking_number) && (
                      <p className="text-sm text-gray-500 font-mono mt-1">
                        Tracking #: {selectedContract.reservation?.tracking_number || selectedContract.tracking_number}
                      </p>
                    )}
                    <p className="text-gray-600 mt-1">
                      {selectedContract.client_name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlanModal(false)}
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {/* Payment Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-1">
                      10% Downpayment Total
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(selectedContract.downpayment_total || (selectedContract.property_price * 0.10))}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">
                      Monthly Payment
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(selectedContract.monthly_installment)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 font-semibold mb-1">
                      Remaining Balance
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(
                        Math.max(0, parseFloat(selectedContract.remaining_balance) || parseFloat(selectedContract.remaining_downpayment) || 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment Schedule Table */}
                {selectedContract.payment_schedules &&
                  selectedContract.payment_schedules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-amber-600" />
                        Installment Schedule
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                #
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                Description
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                Due Date
                              </th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                Scheduled
                              </th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase">
                                Paid
                              </th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-blue-600 uppercase">
                                Remaining
                              </th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-orange-600 uppercase">
                                Penalty
                              </th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-red-600 uppercase">
                                Running Balance
                              </th>
                              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                Status
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                Processed By
                              </th>
                              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedContract.payment_schedules.map((schedule, index) => {
                              // Calculate the balance BEFORE this row's payment
                              // This is: downpayment_total - all payments made INCLUDING this row
                              const downpaymentTotal = parseFloat(selectedContract.downpayment_total) || (parseFloat(selectedContract.property_price) * 0.10) || 0;

                              // Total paid up to and including this row
                              const totalPaidUpToHere = selectedContract.payment_schedules
                                .slice(0, index + 1)
                                .reduce((sum, s) => sum + (parseFloat(s.paid_amount) || 0), 0);

                              // Running balance = original - all payments made up to here
                              const runningBalance = Math.max(0, downpaymentTotal - totalPaidUpToHere);

                              return (
                                <tr
                                  key={schedule.schedule_id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                                      {schedule.installment_number}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {schedule.installment_description}
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">
                                    {formatDate(schedule.due_date)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                    {formatCurrency(schedule.scheduled_amount)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                                    {formatCurrency(schedule.paid_amount || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold">
                                    <span className={
                                      parseFloat(schedule.remaining_amount || 0) <= 0
                                        ? "text-gray-400"
                                        : parseFloat(schedule.remaining_amount || 0) >= parseFloat(schedule.scheduled_amount || 0)
                                        ? "text-blue-600"
                                        : "text-orange-600"
                                    }>
                                      {parseFloat(schedule.remaining_amount || 0) <= 0
                                        ? "—"
                                        : formatCurrency(schedule.remaining_amount)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                                    {schedule.penalty_amount > 0 ? formatCurrency(schedule.penalty_amount) : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right text-red-600 font-semibold">
                                    {formatCurrency(runningBalance)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge
                                      className={
                                        schedule.payment_status === "paid"
                                          ? "bg-green-100 text-green-800"
                                          : schedule.payment_status === "partial"
                                          ? "bg-blue-100 text-blue-800"
                                          : schedule.is_overdue
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }
                                    >
                                      {schedule.payment_status === "paid" ? (
                                        <>
                                          <CheckCircle className="w-3 h-3 mr-1 inline" />
                                          Paid
                                        </>
                                      ) : schedule.payment_status === "partial" ? (
                                        <>
                                          <DollarSign className="w-3 h-3 mr-1 inline" />
                                          Partial
                                        </>
                                      ) : schedule.is_overdue ? (
                                        <>
                                          <Clock className="w-3 h-3 mr-1 inline" />
                                          Overdue
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="w-3 h-3 mr-1 inline" />
                                          Pending
                                        </>
                                      )}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-gray-700">
                                      {schedule.processed_by_name || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {schedule.paid_amount && parseFloat(schedule.paid_amount) > 0 ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRevertToPending(schedule)}
                                        disabled={revertingScheduleId === schedule.schedule_id}
                                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                                      >
                                        {revertingScheduleId === schedule.schedule_id ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            Reverting...
                                          </>
                                        ) : (
                                          <>
                                            <RotateCcw className="w-4 h-4 mr-1" />
                                            Revert
                                          </>
                                        )}
                                      </Button>
                                    ) : schedule.remaining_amount > 0 ? (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleWalkInPayment(schedule, selectedContract)
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <CreditCard className="w-4 h-4 mr-1" />
                                        Pay
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
    </div>
  );
}
