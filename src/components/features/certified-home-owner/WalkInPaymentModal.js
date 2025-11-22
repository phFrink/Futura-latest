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
  const [paymentData, setPaymentData] = useState({
    amount_paid: schedule?.remaining_amount || 0,
    penalty_paid: schedule?.penalty_amount || 0,
    payment_method: "cash",
    reference_number: "",
    check_number: "",
    bank_name: "",
    processed_by_name: "",
    notes: "",
  });

  const formatCurrency = (amount) => {
    if (!amount) return "₱0.00";
    return `₱${parseFloat(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/contracts/payment/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule_id: schedule.schedule_id,
          contract_id: contract.contract_id,
          amount_paid: parseFloat(paymentData.amount_paid),
          penalty_paid: parseFloat(paymentData.penalty_paid),
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          check_number: paymentData.check_number || null,
          bank_name: paymentData.bank_name || null,
          processed_by_name: paymentData.processed_by_name || "Admin",
          notes: paymentData.notes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onPaymentSuccess(result.data);
        onClose();
      } else {
        alert(result.error || "Failed to process payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !schedule || !contract) return null;

  const totalPayment =
    parseFloat(paymentData.amount_paid) + parseFloat(paymentData.penalty_paid);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                        Due Amount
                      </p>
                      <p className="font-bold text-red-600 text-lg">
                        {formatCurrency(schedule.remaining_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details Form */}
              <div className="space-y-5">
                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={schedule.remaining_amount}
                      value={paymentData.amount_paid}
                      onChange={(e) =>
                        handleInputChange("amount_paid", e.target.value)
                      }
                      className="pl-10 text-lg font-semibold"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatCurrency(schedule.remaining_amount)}
                  </p>
                </div>

                {/* Penalty Amount */}
                {schedule.penalty_amount > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Penalty Amount
                    </label>
                    <div className="relative">
                      <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentData.penalty_paid}
                        onChange={(e) =>
                          handleInputChange("penalty_paid", e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

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
              <Card className="mt-6 bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-gray-900">Payment Summary</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Payment Amount:</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(paymentData.amount_paid)}
                      </span>
                    </div>
                    {paymentData.penalty_paid > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Penalty:</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(paymentData.penalty_paid)}
                        </span>
                      </div>
                    )}
                    <div className="border-t-2 border-green-200 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-lg">
                          Total Payment:
                        </span>
                        <span className="font-bold text-green-700 text-2xl">
                          {formatCurrency(totalPayment)}
                        </span>
                      </div>
                    </div>
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
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base shadow-lg"
                  disabled={loading || totalPayment <= 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Process Payment
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
