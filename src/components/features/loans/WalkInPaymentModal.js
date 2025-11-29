"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  XCircle,
  CreditCard,
  DollarSign,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WalkInPaymentModal({
  isOpen,
  onClose,
  schedule,
  contract,
  onPaymentSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [calculatedPenalty, setCalculatedPenalty] = useState(0);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const [gracePeriodEnd, setGracePeriodEnd] = useState(null);
  const [paymentType, setPaymentType] = useState("full"); // 'full', 'monthly', 'weekly', 'daily', 'partial'
  const [customAmount, setCustomAmount] = useState(0);
  const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "" });
  const [paymentData, setPaymentData] = useState({
    amount_paid: 0,
    penalty_paid: 0,
    payment_method: "cash",
    reference_number: "",
    check_number: "",
    bank_name: "",
    processed_by_name: "",
    notes: "",
  });

  // Fetch payment details with calculated penalty
  React.useEffect(() => {
    if (isOpen && schedule?.schedule_id) {
      fetchPaymentDetails();
    } else {
      // Reset state when modal closes
      setCalculatedPenalty(0);
      setDaysOverdue(0);
      setGracePeriodEnd(null);
      setPaymentType("full");
      setCustomAmount(0);
      setErrorModal({ show: false, title: "", message: "" });
      setPaymentData({
        amount_paid: 0,
        penalty_paid: 0,
        payment_method: "cash",
        reference_number: "",
        check_number: "",
        bank_name: "",
        processed_by_name: "",
        notes: "",
      });
    }
  }, [isOpen, schedule?.schedule_id]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch(
        `/api/contracts/payment/walk-in?schedule_id=${schedule.schedule_id}`
      );
      const result = await response.json();

      console.log("🔍 Payment details response:", result);

      if (result.success && result.data.schedule) {
        const scheduleData = result.data.schedule;

        console.log("📋 Schedule data:", {
          due_date: scheduleData.due_date,
          grace_period_end: scheduleData.grace_period_end,
          calculated_penalty: scheduleData.calculated_penalty,
          days_overdue: scheduleData.days_overdue_after_grace,
          remaining_amount: scheduleData.remaining_amount,
        });

        const remainingAmount = parseFloat(scheduleData.remaining_amount || 0);
        const penaltyAmount = parseFloat(scheduleData.calculated_penalty || 0);

        console.log("✅ Auto-filling payment form:", {
          amount_paid: remainingAmount,
          penalty_paid: penaltyAmount,
          total: remainingAmount + penaltyAmount,
        });

        setCalculatedPenalty(penaltyAmount);
        setDaysOverdue(scheduleData.days_overdue_after_grace || 0);
        setGracePeriodEnd(scheduleData.grace_period_end);

        // Auto-fill payment amount (BASE ONLY) and penalty (SEPARATE)
        setPaymentData((prev) => ({
          ...prev,
          amount_paid: remainingAmount.toFixed(2),
          penalty_paid: penaltyAmount.toFixed(2),
        }));

        console.log("✅ Payment form auto-filled successfully");
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₱0.00";
    return `₱${parseFloat(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate payment amount based on selected type
  const calculatePaymentAmount = () => {
    const remaining = parseFloat(schedule?.remaining_amount || 0);
    const monthlyInstallment = parseFloat(contract?.monthly_installment || 0);

    switch(paymentType) {
      case 'full':
        return remaining; // Pay entire remaining amount

      case 'monthly':
        // Pay one month's installment (or remaining if less)
        return Math.min(monthlyInstallment, remaining);

      case 'weekly':
        // Calculate weekly amount (monthly ÷ 4.33)
        const weeklyAmount = monthlyInstallment / 4.33;
        return Math.min(weeklyAmount, remaining);

      case 'daily':
        // Calculate daily amount (monthly ÷ 30)
        const dailyAmount = monthlyInstallment / 30;
        return Math.min(dailyAmount, remaining);

      case 'partial':
        // Custom amount - must be >= 10% of monthly installment
        const amount = parseFloat(customAmount || 0);
        return Math.min(amount, remaining);

      default:
        return remaining;
    }
  };

  // Validate payment amount
  const validatePayment = () => {
    const amount = calculatePaymentAmount();
    const remaining = parseFloat(schedule?.remaining_amount || 0);
    const monthlyInstallment = parseFloat(contract?.monthly_installment || 0);
    const minAmount = monthlyInstallment * 0.1; // 10% minimum

    if (amount <= 0) {
      return { valid: false, error: "Payment amount must be greater than zero" };
    }

    if (amount > remaining) {
      return { valid: false, error: "Payment exceeds remaining balance" };
    }

    if (paymentType === 'partial' && amount < minAmount) {
      return {
        valid: false,
        error: `Minimum partial payment is ${formatCurrency(minAmount)}`
      };
    }

    return { valid: true };
  };

  const handleInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate payment
    const validation = validatePayment();
    if (!validation.valid) {
      setErrorModal({
        show: true,
        title: "Validation Error",
        message: validation.error
      });
      return;
    }

    setLoading(true);

    // Calculate payment amount based on selected type
    const amountPaid = calculatePaymentAmount();
    const penaltyPaid = parseFloat(calculatedPenalty || 0);
    const totalPayment = amountPaid + penaltyPaid;

    console.log("💳 Submitting payment:", {
      payment_type: paymentType,
      amount_paid: amountPaid,
      penalty_paid: penaltyPaid,
      total_payment: totalPayment,
      remaining_amount: parseFloat(schedule.remaining_amount || 0),
      calculated_penalty: calculatedPenalty,
    });

    try {
      const payloadData = {
        schedule_id: schedule.schedule_id,
        contract_id: contract.contract_id,
        payment_type: paymentType, // NEW: payment type
        amount_paid: amountPaid, // Calculated based on payment type
        penalty_paid: penaltyPaid,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || null,
        check_number: paymentData.check_number || null,
        bank_name: paymentData.bank_name || null,
        processed_by_name: paymentData.processed_by_name || "Admin",
        notes: `${paymentType.toUpperCase()} payment - ${paymentData.notes || ''}`.trim(),
      };

      console.log("📤 Sending payload to API:", payloadData);

      const response = await fetch("/api/contracts/payment/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadData),
      });

      const result = await response.json();

      console.log("📥 API response:", result);

      if (result.success) {
        console.log("✅ Payment processed successfully!");
        onPaymentSuccess(result.data);
        onClose();
      } else {
        console.error("❌ Payment failed:", result.error);
        setErrorModal({
          show: true,
          title: "Payment Failed",
          message: result.error || "Failed to process payment. Please try again."
        });
      }
    } catch (error) {
      console.error("❌ Payment error:", error);
      setErrorModal({
        show: true,
        title: "Network Error",
        message: `Failed to process payment. Please check your connection and try again.\n\nError: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !schedule || !contract) return null;

  // Calculate amounts based on payment type
  const baseAmount = calculatePaymentAmount();
  const penaltyAmount = parseFloat(calculatedPenalty || 0);
  const totalPayment = baseAmount + penaltyAmount;
  const remainingAfterPayment = parseFloat(schedule?.remaining_amount || 0) - baseAmount;

  // Check if amounts are valid for submission
  const validation = validatePayment();
  const isValidPayment = validation.valid && baseAmount > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white sticky top-0 z-10 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Walk-in Payment</h2>
                    <p className="text-green-100 text-sm mt-1">
                      Process client payment
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Contract & Schedule Info */}
              <Card className="mb-6 border-2 border-blue-100">
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Contract Number
                      </p>
                      <p className="font-bold text-blue-900">
                        {contract.contract_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Client Name
                      </p>
                      <p className="font-semibold text-gray-900">
                        {contract.client_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Installment
                      </p>
                      <Badge className="bg-amber-100 text-amber-800 font-medium">
                        #{schedule.installment_number}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Due Date
                      </p>
                      <p className="font-semibold text-gray-900">
                        {schedule.due_date ? new Date(schedule.due_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "N/A"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        Due Amount
                      </p>
                      <p className="font-bold text-red-600 text-lg">
                        {formatCurrency(schedule.remaining_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Payment Type <span className="text-red-500">*</span>
                </label>

                <div className="space-y-2">
                  {/* Full Payment */}
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentType === 'full'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentType('full')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentType === 'full'}
                          onChange={() => setPaymentType('full')}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Full Payment</p>
                          <p className="text-xs text-gray-600">Pay entire remaining balance</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-700">
                        {formatCurrency(schedule.remaining_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Payment */}
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentType === 'monthly'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentType('monthly')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentType === 'monthly'}
                          onChange={() => setPaymentType('monthly')}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Monthly Installment</p>
                          <p className="text-xs text-gray-600">Pay one month's amount</p>
                        </div>
                      </div>
                      <p className="font-bold text-blue-700">
                        {formatCurrency(Math.min(
                          contract.monthly_installment,
                          schedule.remaining_amount
                        ))}
                      </p>
                    </div>
                  </div>

                  {/* Weekly Payment */}
                  {/* <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentType === 'weekly'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentType('weekly')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentType === 'weekly'}
                          onChange={() => setPaymentType('weekly')}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Weekly Payment</p>
                          <p className="text-xs text-gray-600">Pay weekly amount (~monthly ÷ 4)</p>
                        </div>
                      </div>
                      <p className="font-bold text-purple-700">
                        {formatCurrency(Math.min(
                          contract.monthly_installment / 4.33,
                          schedule.remaining_amount
                        ))}
                      </p>
                    </div>
                  </div>

                   Daily Payment */}
                  {/* <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentType === 'daily'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentType('daily')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={paymentType === 'daily'}
                          onChange={() => setPaymentType('daily')}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Daily Payment</p>
                          <p className="text-xs text-gray-600">Pay daily amount (~monthly ÷ 30)</p>
                        </div>
                      </div>
                      <p className="font-bold text-amber-700">
                        {formatCurrency(Math.min(
                          contract.monthly_installment / 30,
                          schedule.remaining_amount
                        ))}
                      </p>
                    </div>
                  </div>  */}

                  {/* Partial/Custom Payment */}
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      paymentType === 'partial'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentType('partial')}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={paymentType === 'partial'}
                        onChange={() => setPaymentType('partial')}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Partial/Custom Amount</p>
                        <p className="text-xs text-gray-600 mb-2">
                          Enter custom amount (min: {formatCurrency(contract.monthly_installment * 0.1)})
                        </p>
                        {paymentType === 'partial' && (
                          <Input
                            type="number"
                            step="0.01"
                            min={contract.monthly_installment * 0.1}
                            max={schedule.remaining_amount}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="mt-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Preview Section */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-5">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Payment Preview
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-800">Amount to Pay:</span>
                    <span className="font-bold text-blue-900">
                      {formatCurrency(calculatePaymentAmount())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Penalty:</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(calculatedPenalty)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t-2 border-blue-300 pt-2">
                    <span className="text-blue-800 font-bold">Total Payment:</span>
                    <span className="font-bold text-green-700 text-lg">
                      {formatCurrency(calculatePaymentAmount() + calculatedPenalty)}
                    </span>
                  </div>
                  <div className="flex justify-between bg-white rounded p-2 mt-2">
                    <span className="text-gray-700">Remaining After Payment:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(remainingAfterPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">New Status:</span>
                    <Badge className={
                      remainingAfterPayment <= 0
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }>
                      {remainingAfterPayment <= 0 ? "Fully Paid" : "Partially Paid"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Payment Details Form */}
              <div className="space-y-5">
                {/* Payment Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Base Payment Amount (Auto-calculated) <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* INFO BANNER */}
                  <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          ℹ️ Payment Amount (Based on {paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Type)
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                          Amount is calculated based on your selected payment type.
                          Penalty (₱{calculatedPenalty.toFixed(2)}) is added separately.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                    <Input
                      type="number"
                      step="0.01"
                      value={calculatePaymentAmount().toFixed(2)}
                      className="pl-10 text-lg font-semibold bg-blue-50 border-blue-300 cursor-not-allowed"
                      readOnly
                      disabled
                      required
                    />
                  </div>
                  <p className="text-xs text-blue-600 font-semibold mt-2">
                    🔒 This field is automatically calculated based on payment type
                  </p>
                </div>

                {/* Penalty Amount - Always Show */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {calculatedPenalty > 0 ? "Penalty Amount (Auto-calculated)" : "Penalty Information"}
                  </label>

                  {/* Penalty Info Card */}
                  <div className={`${calculatedPenalty > 0 ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"} border rounded-lg p-3 mb-2`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-5 h-5 ${calculatedPenalty > 0 ? "text-orange-500" : "text-blue-500"} mt-0.5 flex-shrink-0`} />
                      <div className="text-xs space-y-1">
                        <p className={`font-semibold ${calculatedPenalty > 0 ? "text-orange-800" : "text-blue-800"}`}>
                          {calculatedPenalty > 0 ? "Overdue Payment Penalty" : "Penalty Policy"}
                        </p>
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Due Date: {schedule.due_date ? new Date(schedule.due_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "N/A"}
                        </p>
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Grace Period Ends: {gracePeriodEnd ? new Date(gracePeriodEnd).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "N/A"} (3 days after due date)
                        </p>
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Today: {new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        {calculatedPenalty > 0 && (
                          <p className="text-orange-700">
                            Days Overdue: <span className="font-semibold">{daysOverdue} days</span>
                          </p>
                        )}
                        <p className={calculatedPenalty > 0 ? "text-orange-700" : "text-blue-700"}>
                          Penalty Rate: 3% per month (0.1% per day)
                        </p>
                        {calculatedPenalty === 0 && (
                          <p className="text-blue-700 font-medium">
                            ✓ No penalty applied - Payment is within grace period
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {calculatedPenalty > 0 && (
                    <>
                      <div className="relative">
                        <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.penalty_paid}
                          className="pl-10 bg-orange-50 border-orange-300 font-semibold cursor-not-allowed"
                          readOnly
                          disabled
                        />
                      </div>
                      <p className="text-xs text-orange-600 font-semibold">
                        🔒 This field is automatically calculated and cannot be edited
                      </p>
                      <p className="text-xs text-orange-600">
                        Penalty = Base Amount × 3% per month × Days Overdue ÷ 30 days
                      </p>
                    </>
                  )}
                  {calculatedPenalty === 0 && (
                    <p className="text-xs text-blue-600">
                      No penalty amount to pay - payment is within grace period
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) =>
                      handleInputChange("payment_method", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="check">Check</option>
                    <option value="online_banking">Online Banking</option>
                  </select>
                </div>

                {/* Conditional Fields */}
                {paymentData.payment_method === "check" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check Number
                      </label>
                      <Input
                        type="text"
                        value={paymentData.check_number}
                        onChange={(e) =>
                          handleInputChange("check_number", e.target.value)
                        }
                        placeholder="Enter check number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <Input
                        type="text"
                        value={paymentData.bank_name}
                        onChange={(e) =>
                          handleInputChange("bank_name", e.target.value)
                        }
                        placeholder="Enter bank name"
                      />
                    </div>
                  </div>
                )}

                {["bank_transfer", "gcash", "paymaya", "online_banking"].includes(
                  paymentData.payment_method
                ) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <Input
                      type="text"
                      value={paymentData.reference_number}
                      onChange={(e) =>
                        handleInputChange("reference_number", e.target.value)
                      }
                      placeholder="Enter reference number"
                    />
                  </div>
                )}

                {/* Processed By */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Processed By
                  </label>
                  <Input
                    type="text"
                    value={paymentData.processed_by_name}
                    onChange={(e) =>
                      handleInputChange("processed_by_name", e.target.value)
                    }
                    placeholder="Your name"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) =>
                      handleInputChange("notes", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </div>

              {/* Payment Summary */}
              <Card className={`mt-6 bg-gradient-to-br ${!isValidPayment ? 'from-red-50 to-red-100/50 border-red-200' : 'from-green-50 to-green-100/50 border-green-200'} border-2`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Receipt className={`w-5 h-5 ${!isValidPayment ? 'text-red-600' : 'text-green-600'}`} />
                      <h3 className="font-bold text-gray-900">Payment Summary</h3>
                    </div>
                    {isValidPayment && (
                      <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Ready to Process</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Base Payment:</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Penalty:</span>
                      <span className="font-semibold text-orange-600">
                        {penaltyAmount > 0 ? formatCurrency(penaltyAmount) : "₱0.00"}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-lg">
                          TOTAL TO PAY:
                        </span>
                        <span className="font-bold text-3xl text-green-700">
                          {formatCurrency(totalPayment)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 text-right">
                        {formatCurrency(baseAmount)} + {formatCurrency(penaltyAmount)} = {formatCurrency(totalPayment)}
                      </p>
                    </div>
                    {!isValidPayment && (
                      <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 mt-3">
                        <p className="text-sm text-red-900 font-bold flex items-center gap-2">
                          <XCircle className="w-5 h-5" />
                          ❌ CANNOT PROCESS PAYMENT
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          No remaining amount to pay or invalid schedule data.
                        </p>
                      </div>
                    )}
                    {isValidPayment && calculatedPenalty > 0 && (
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mt-3">
                        <p className="text-xs text-blue-800">
                          ℹ️ <span className="font-semibold">Payment includes penalty:</span> This payment is overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} after the grace period.
                          A penalty of {formatCurrency(calculatedPenalty)} ({(calculatedPenalty / parseFloat(schedule.remaining_amount || 1) * 100).toFixed(2)}%) has been automatically calculated and will be included in this transaction.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !isValidPayment}
                  title={!isValidPayment ? "Please check payment amounts before processing" : "Process payment"}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : !isValidPayment ? (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      Check Payment Amounts
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Process Payment {totalPayment > 0 ? `(${formatCurrency(totalPayment)})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Error Modal */}
      {errorModal.show && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setErrorModal({ show: false, title: "", message: "" })}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Error Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{errorModal.title}</h2>
                  <p className="text-red-100 text-sm mt-1">Please review the error below</p>
                </div>
              </div>
            </div>

            {/* Error Body */}
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 whitespace-pre-wrap">
                      {errorModal.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setErrorModal({ show: false, title: "", message: "" })}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Got it, Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
