"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  DollarSign,
  X,
  Loader2,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  FileText,
} from "lucide-react";

export default function WalkInPaymentModal({
  schedule,
  contract,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount_paid: schedule?.remaining_amount || 0,
    penalty_paid: schedule?.penalty_amount || 0,
    payment_method: "cash",
    reference_number: "",
    processed_by_name: "",
    notes: "",
  });

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { value: "gcash", label: "GCash", icon: Smartphone },
    { value: "paymaya", label: "PayMaya", icon: Smartphone },
    { value: "credit_card", label: "Credit Card", icon: CreditCard },
    { value: "debit_card", label: "Debit Card", icon: CreditCard },
    { value: "check", label: "Check", icon: FileText },
    { value: "online_banking", label: "Online Banking", icon: Building2 },
  ];

  const handleInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!paymentData.amount_paid || paymentData.amount_paid <= 0) {
      toast.error("Please enter a valid payment amount");
      return false;
    }

    if (paymentData.amount_paid > schedule.remaining_amount + (schedule.penalty_amount || 0)) {
      toast.error("Payment amount exceeds the remaining balance");
      return false;
    }

    if (!paymentData.payment_method) {
      toast.error("Please select a payment method");
      return false;
    }

    if (!paymentData.processed_by_name || paymentData.processed_by_name.trim() === "") {
      toast.error("Please enter the processor's name");
      return false;
    }

    // Require reference number for non-cash payments
    if (
      paymentData.payment_method !== "cash" &&
      (!paymentData.reference_number || paymentData.reference_number.trim() === "")
    ) {
      toast.error("Reference number is required for non-cash payments");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contracts/payment/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule_id: schedule.schedule_id,
          amount_paid: parseFloat(paymentData.amount_paid),
          penalty_paid: parseFloat(paymentData.penalty_paid) || 0,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          processed_by_name: paymentData.processed_by_name,
          notes: paymentData.notes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Payment processed successfully! Transaction #: ${result.data.transaction.transaction_number}`,
          { autoClose: 5000 }
        );
        onSuccess();
      } else {
        toast.error(result.message || "Failed to process payment");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Error processing payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  const totalPayment =
    parseFloat(paymentData.amount_paid || 0) +
    parseFloat(paymentData.penalty_paid || 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  Walk-in Payment
                </h2>
                <p className="text-slate-600 mt-1">
                  Process payment for installment #{schedule.installment_number}
                </p>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Payment Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-3">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Contract Number:</span>
                  <span className="font-semibold">{contract.contract_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Installment #:</span>
                  <span className="font-semibold">{schedule.installment_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Due Date:</span>
                  <span className="font-semibold">
                    {new Date(schedule.due_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600">Installment Amount:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(schedule.installment_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Already Paid:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(schedule.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Remaining Balance:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(schedule.remaining_amount)}
                  </span>
                </div>
                {schedule.penalty_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Penalty:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(schedule.penalty_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  ₱
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={schedule.remaining_amount + (schedule.penalty_amount || 0)}
                  value={paymentData.amount_paid}
                  onChange={(e) =>
                    handleInputChange("amount_paid", e.target.value)
                  }
                  className="pl-8"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Maximum: {formatCurrency(schedule.remaining_amount + (schedule.penalty_amount || 0))}
              </p>
            </div>

            {/* Penalty Amount (if applicable) */}
            {schedule.penalty_amount > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Penalty Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    ₱
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentData.penalty_paid}
                    onChange={(e) =>
                      handleInputChange("penalty_paid", e.target.value)
                    }
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() =>
                        handleInputChange("payment_method", method.value)
                      }
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        paymentData.payment_method === method.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reference Number
                {paymentData.payment_method !== "cash" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <Input
                type="text"
                value={paymentData.reference_number}
                onChange={(e) =>
                  handleInputChange("reference_number", e.target.value)
                }
                placeholder="e.g., TRX123456789, Check #12345"
                required={paymentData.payment_method !== "cash"}
              />
              <p className="text-xs text-slate-500 mt-1">
                {paymentData.payment_method === "cash"
                  ? "Optional for cash payments"
                  : "Required for non-cash payments"}
              </p>
            </div>

            {/* Processed By */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Processed By <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={paymentData.processed_by_name}
                onChange={(e) =>
                  handleInputChange("processed_by_name", e.target.value)
                }
                placeholder="Your name"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Add any additional notes or remarks..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
              />
            </div>

            {/* Total Payment Display */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-green-900">
                  Total Payment:
                </span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPayment)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Process Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
