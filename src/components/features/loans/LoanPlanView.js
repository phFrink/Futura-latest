"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  CreditCard,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-toastify";
import WalkInPaymentModal from "./WalkInPaymentModal";

export default function LoanPlanView({ contractId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentContract, setPaymentContract] = useState(null);
  const [revertingScheduleId, setRevertingScheduleId] = useState(null);
  const [isTableExpanded, setIsTableExpanded] = useState(true);

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      const result = await response.json();

      if (result.success) {
        // Adapt the API response to match the expected structure
        const contractData = {
          ...result.data.contract,
          payment_schedules: result.data.payment_schedules,
          statistics: result.data.statistics,
        };
        setContract(contractData);
      } else {
        toast.error(result.message || "Failed to load contract");
        router.push('/loans');
      }
    } catch (error) {
      console.error("Error loading contract:", error);
      toast.error("Error loading contract");
      router.push('/loans');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleWalkInPayment = (schedule, contractData) => {
    setSelectedSchedule(schedule);
    setPaymentContract(contractData);
    setShowPaymentModal(true);
  };

  const handleRevertToPending = async (schedule) => {
    if (!confirm("Are you sure you want to revert this payment to pending? This will remove the payment record.")) {
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
        toast.success("Payment reverted successfully!");
        loadContract();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">Contract not found</p>
          <Button onClick={() => router.push('/loans')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Loans
          </Button>
        </div>
      </div>
    );
  }

  const totalAmountProperty = parseFloat(contract.property_price) || 0;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-6 mb-4">
            <Button
              onClick={() => router.push('/loans')}
              variant="outline"
              size="sm"
              className="px-6 py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Loans
            </Button>
            <h1 className="text-4xl font-bold text-gray-900">Payment Plan Details</h1>
          </div>
          <p className="text-xl text-blue-600 font-semibold mb-2">
            {contract.contract_number}
          </p>
          {(contract.reservation?.tracking_number || contract.tracking_number) && (
            <p className="text-base text-gray-500 font-mono mb-2">
              Tracking #: {contract.reservation?.tracking_number || contract.tracking_number}
            </p>
          )}
          <p className="text-lg text-gray-600">
            {contract.client_name}
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-blue-600 font-semibold mb-3">
              10% Total Amount of Property
            </p>
            <p className="text-3xl font-bold text-blue-900">
              {formatCurrency(totalAmountProperty - Number(contract?.reservation_fee_paid))}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-amber-600 font-semibold mb-3">
              Downpayment
            </p>
            <p className="text-3xl font-bold text-amber-900">
              {formatCurrency(contract.reservation?.reservation_fee || contract.reservation_fee_paid || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-green-600 font-semibold mb-3">
              Monthly Payment
            </p>
            <p className="text-3xl font-bold text-green-900">
              {formatCurrency(contract.monthly_installment)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-purple-600 font-semibold mb-3">
              Remaining Balance
            </p>
            <p className="text-3xl font-bold text-purple-900">
              {formatCurrency(
                Math.max(0, parseFloat(contract.remaining_balance) || parseFloat(contract.remaining_downpayment) || 0)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule Table */}
      {contract.payment_schedules && contract.payment_schedules.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Receipt className="w-6 h-6 text-amber-600" />
                Installment Schedule
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                className="flex items-center gap-2"
              >
                {isTableExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Expand
                  </>
                )}
              </Button>
            </div>
            {isTableExpanded && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      #
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Description
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Due Date
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Scheduled
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-green-600 uppercase tracking-wide">
                      Paid
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-blue-600 uppercase tracking-wide">
                      Remaining
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-orange-600 uppercase tracking-wide">
                      Penalty
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-red-600 uppercase tracking-wide">
                      Running Balance
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Processed By
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contract.payment_schedules.map((schedule, index) => {
                    const downpaymentTotal = parseFloat(contract.downpayment_total) || (parseFloat(contract.property_price) * 0.10) || 0;
                    const totalPaidUpToHere = contract.payment_schedules
                      .slice(0, index + 1)
                      .reduce((sum, s) => sum + (parseFloat(s.paid_amount) || 0), 0);
                    const runningBalance = Math.max(0, downpaymentTotal - totalPaidUpToHere);

                    return (
                      <tr key={schedule.schedule_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-semibold text-base">
                            {schedule.installment_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 text-base">
                          {schedule.installment_description}
                        </td>
                        <td className="px-6 py-4 text-gray-700 text-base">
                          {formatDate(schedule.due_date)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 text-base">
                          {formatCurrency(schedule.scheduled_amount)}
                        </td>
                        <td className="px-6 py-4 text-right text-green-600 font-semibold text-base">
                          {formatCurrency(schedule.paid_amount || 0)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-base">
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
                        <td className="px-6 py-4 text-right text-orange-600 font-semibold text-base">
                          {schedule.penalty_amount > 0 ? formatCurrency(schedule.penalty_amount) : "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-red-600 font-semibold text-base">
                          {formatCurrency(runningBalance)}
                        </td>
                        <td className="px-6 py-4 text-center">
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
                        <td className="px-6 py-4">
                          <span className="text-base text-gray-700">
                            {schedule.processed_by_name || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {(() => {
                            const remainingAmount = parseFloat(schedule.remaining_amount || 0);
                            const paidAmount = parseFloat(schedule.paid_amount || 0);
                            
                            if (remainingAmount > 0) {
                              return (
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleWalkInPayment(schedule, contract)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CreditCard className="w-4 h-4 mr-1" />
                                    {paidAmount > 0 ? "Pay More" : "Pay"}
                                  </Button>
                                  {paidAmount > 0 && (
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
                                  )}
                                </div>
                              );
                            } else if (paidAmount > 0) {
                              return (
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
                              );
                            } else {
                              return <span className="text-xs text-gray-400">—</span>;
                            }
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
            
            {!isTableExpanded && (
              <div className="p-6 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500 mb-1">Total Installments</p>
                    <p className="font-semibold text-lg">{contract.payment_schedules.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 mb-1">Paid Installments</p>
                    <p className="font-semibold text-lg text-green-600">
                      {contract.payment_schedules.filter(s => s.payment_status === 'paid').length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 mb-1">Pending Installments</p>
                    <p className="font-semibold text-lg text-orange-600">
                      {contract.payment_schedules.filter(s => s.payment_status === 'pending' || s.payment_status === 'partial').length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Walk-in Payment Modal */}
      {showPaymentModal && selectedSchedule && paymentContract && (
        <WalkInPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedSchedule(null);
            setPaymentContract(null);
          }}
          schedule={selectedSchedule}
          contract={paymentContract}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            setSelectedSchedule(null);
            setPaymentContract(null);
            loadContract();
          }}
        />
      )}
    </div>
  );
}