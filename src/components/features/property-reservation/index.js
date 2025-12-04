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
  Printer,
  RotateCcw,
  FileSignature,
  CalendarCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReservationDetails() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [paymentMonths, setPaymentMonths] = useState(12);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [createdContract, setCreatedContract] = useState(null);
  const [creatingContract, setCreatingContract] = useState(false);
  const [isEditingPaymentPlan, setIsEditingPaymentPlan] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showContractViewModal, setShowContractViewModal] = useState(false);
  const [contractPreviewHtml, setContractPreviewHtml] = useState(null);

  useEffect(() => {
    getUserRole();
    loadReservations();
  }, []);

  // Get current user role
  const getUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.role?.toLowerCase();
        setUserRole(role);
        console.log("User role:", role);
      }
    } catch (error) {
      console.error("Error getting user role:", error);
    }
  };

  // Check for existing contract when modal opens
  useEffect(() => {
    if (showContractModal && contractData) {
      checkExistingContract(contractData.reservation_id);
    } else {
      setCreatedContract(null);
    }
  }, [showContractModal, contractData]);

  // Update payment months from created contract
  useEffect(() => {
    if (createdContract && createdContract.contract) {
      setPaymentMonths(createdContract.contract.payment_plan_months);
    }
  }, [createdContract]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, startDate, endDate, reservations]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/property-reservation");
      const result = await response.json();

      console.log(result, "get result");

      if (result.success) {
        setReservations(result.data);
        setFilteredReservations(result.data);
      } else {
        toast.error(result.message || "Failed to load reservations");
      }
    } catch (error) {
      console.error("Error loading reservations:", error);
      toast.error("Error loading reservations");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reservations];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Search filter (including tracking number)
    if (searchTerm) {
      filtered = filtered.filter((r) => {
        const trackingNumber =
          r.tracking_number ||
          `TRK-${r.reservation_id?.slice(0, 8).toUpperCase()}`;
        return (
          r.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.client_phone?.includes(searchTerm) ||
          trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((r) => {
        const reservationDate = new Date(r.created_at);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of day
        return reservationDate >= start;
      });
    }

    if (endDate) {
      filtered = filtered.filter((r) => {
        const reservationDate = new Date(r.created_at);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        return reservationDate <= end;
      });
    }

    setFilteredReservations(filtered);
  };

  const handleApprove = async (reservationId) => {
    if (!confirm("Are you sure you want to approve this reservation?")) {
      return;
    }

    setProcessingId(reservationId);
    try {
      const response = await fetch("/api/property-reservation/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation_id: reservationId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Reservation approved successfully!");
        loadReservations();
        if (selectedReservation?.reservation_id === reservationId) {
          setShowDetailModal(false);
          setSelectedReservation(null);
        }
      } else {
        toast.error(result.message || "Failed to approve reservation");
      }
    } catch (error) {
      console.error("Error approving reservation:", error);
      toast.error("Error approving reservation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reservationId) => {
    const reason = prompt("Please enter the reason for rejection (optional):");
    if (reason === null) return; // User cancelled

    setProcessingId(reservationId);
    try {
      const response = await fetch("/api/property-reservation/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          reason: reason || "No reason provided",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Reservation rejected successfully!");
        loadReservations();
        if (selectedReservation?.reservation_id === reservationId) {
          setShowDetailModal(false);
          setSelectedReservation(null);
        }
      } else {
        toast.error(result.message || "Failed to reject reservation");
      }
    } catch (error) {
      console.error("Error rejecting reservation:", error);
      toast.error("Error rejecting reservation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevert = async (reservationId) => {
    if (
      !confirm(
        "Are you sure you want to revert this reservation back to pending?"
      )
    ) {
      return;
    }

    setProcessingId(reservationId);
    try {
      const response = await fetch("/api/property-reservation/revert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation_id: reservationId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Reservation reverted to pending successfully!");
        loadReservations();
        if (selectedReservation?.reservation_id === reservationId) {
          setShowDetailModal(false);
          setSelectedReservation(null);
        }
      } else {
        toast.error(result.message || "Failed to revert reservation");
      }
    } catch (error) {
      console.error("Error reverting reservation:", error);
      toast.error("Error reverting reservation");
    } finally {
      setProcessingId(null);
    }
  };

  // Check if contract exists for this reservation
  const checkExistingContract = async (reservationId) => {
    try {
      const response = await fetch(
        `/api/contracts/by-reservation?reservation_id=${reservationId}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setCreatedContract(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error checking contract:", error);
      return null;
    }
  };

  // Create contract and payment schedules
  const handleCreateContract = async () => {
    if (!contractData || !paymentMonths) {
      toast.error("Please select payment plan");
      return;
    }

    if (paymentMonths < 1 || paymentMonths > 60) {
      toast.error("Payment plan must be between 1 and 60 months");
      return;
    }

    setCreatingContract(true);
    try {
      const response = await fetch("/api/contracts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation_id: contractData.reservation_id,
          payment_plan_months: paymentMonths,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Contract created successfully!");
        setCreatedContract(result.data);
      } else {
        toast.error(result.message || "Failed to create contract");
      }
    } catch (error) {
      console.error("Error creating contract:", error);
      toast.error("Error creating contract");
    } finally {
      setCreatingContract(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: <Clock className="w-4 h-4" />,
        text: "Pending Review",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
      },
      approved: {
        icon: <CheckCircle className="w-4 h-4" />,
        text: "Approved",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
      },
      rejected: {
        icon: <XCircle className="w-4 h-4" />,
        text: "Rejected",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
      },
      cancelled: {
        icon: <XCircle className="w-4 h-4" />,
        text: "Cancelled",
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
      >
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Format currency with K, M, B suffix
  const formatCurrencyShort = (amount) => {
    if (!amount) return "₱0";

    const absAmount = Math.abs(amount);

    if (absAmount >= 1000000000) {
      return `₱${(amount / 1000000000).toFixed(1)}B`;
    } else if (absAmount >= 1000000) {
      return `₱${(amount / 1000000).toFixed(1)}M`;
    } else if (absAmount >= 1000) {
      return `₱${(amount / 1000).toFixed(1)}K`;
    } else {
      return `₱${amount.toFixed(0)}`;
    }
  };

  const downloadReceipt = async (reservation) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Colors
      const primaryColor = [220, 38, 38];
      const textDark = [30, 41, 59];
      const textLight = [100, 116, 139];

      // Header
      doc.setFontSize(24);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, "bold");
      doc.text("FUTURA HOMES", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(...textLight);
      doc.setFont(undefined, "normal");
      doc.text("Property Reservation Receipt", pageWidth / 2, 28, {
        align: "center",
      });

      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(20, 32, pageWidth - 20, 32);

      // Receipt Info
      let yPos = 42;
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      doc.setFont(undefined, "bold");
      doc.text(
        `Receipt No: ${reservation.reservation_id?.slice(0, 8).toUpperCase()}`,
        20,
        yPos
      );
      doc.text(
        `Status: ${reservation.status?.toUpperCase()}`,
        pageWidth - 20,
        yPos,
        { align: "right" }
      );

      yPos += 6;
      doc.setFont(undefined, "normal");
      doc.setTextColor(...textLight);
      doc.text(`Date: ${formatDate(reservation.created_at)}`, 20, yPos);

      // Client Information
      yPos += 12;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.text("Client Information", 20, yPos);

      doc.setDrawColor(...textLight);
      doc.setLineWidth(0.3);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");

      const clientInfo = [
        ["Full Name:", reservation.client_name],
        ["Email:", reservation.client_email],
        ["Phone:", reservation.client_phone],
        ["Address:", reservation.client_address],
      ];

      clientInfo.forEach(([label, value]) => {
        doc.setFont(undefined, "bold");
        doc.setTextColor(...textLight);
        doc.text(label, 25, yPos);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...textDark);
        doc.text(value || "N/A", 60, yPos);
        yPos += 6;
      });

      // Property Details
      yPos += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.text("Property Details", 20, yPos);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textLight);
      doc.text("Property:", 25, yPos);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...textDark);
      doc.text(reservation.property_title || "N/A", 60, yPos);

      // Property Price Section
      yPos += 8;
      doc.setFillColor(239, 246, 255); // Blue background
      doc.rect(20, yPos - 3, pageWidth - 40, 12, "F");
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.setFontSize(10);
      doc.text("Total Property Price:", 25, yPos);
      doc.setTextColor(37, 99, 235); // Blue color
      doc.setFontSize(16);
      doc.text(
        formatCurrencyShort(reservation.property_info?.property_price || 0),
        pageWidth - 25,
        yPos,
        { align: "right" }
      );
      yPos += 4;
      doc.setFontSize(8);
      doc.setTextColor(...textLight);
      doc.text(
        formatCurrency(reservation.property_info?.property_price || 0),
        pageWidth - 25,
        yPos,
        { align: "right" }
      );

      // Reservation Fee Section
      const propertyPrice = reservation.property_info?.property_price || 1;
      const reservationFee = reservation.reservation_fee || 0;
      const percentage = ((reservationFee / propertyPrice) * 100).toFixed(0);

      yPos += 10;
      doc.setFillColor(240, 253, 244); // Green background
      doc.setDrawColor(22, 163, 74); // Green border
      doc.setLineWidth(0.5);
      doc.rect(20, yPos - 3, pageWidth - 40, 18, "FD");
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.setFontSize(10);
      doc.text("Reservation Fee (Amount to Pay):", 25, yPos);
      doc.setTextColor(5, 150, 105); // Green color
      doc.setFontSize(16);
      doc.text(formatCurrencyShort(reservationFee), pageWidth - 25, yPos, {
        align: "right",
      });

      yPos += 5;
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.text(
        `${percentage}% of ${formatCurrencyShort(
          propertyPrice
        )} = ${formatCurrencyShort(reservationFee)}`,
        25,
        yPos
      );

      yPos += 4;
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...textLight);
      doc.text(formatCurrency(reservation.reservation_fee), 25, yPos);
      yPos += 2;

      // Employment Information
      yPos += 12;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.text("Employment Information", 20, yPos);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");

      const employmentInfo = [
        ["Occupation:", reservation.occupation],
        ["Employer:", reservation.employer],
        [
          "Employment Status:",
          reservation.employment_status?.replace("-", " ").toUpperCase(),
        ],
        ["Years Employed:", `${reservation.years_employed} years`],
      ];

      employmentInfo.forEach(([label, value]) => {
        doc.setFont(undefined, "bold");
        doc.setTextColor(...textLight);
        doc.text(label, 25, yPos);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...textDark);
        doc.text(value || "N/A", 60, yPos);
        yPos += 6;
      });

      // Income Statement
      yPos += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textDark);
      doc.text("Income Statement", 20, yPos);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textLight);
      doc.text("Monthly Income:", 25, yPos);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...textDark);
      doc.text(formatCurrency(reservation.monthly_income), 60, yPos);
      yPos += 6;

      if (reservation.other_income_source) {
        doc.setFont(undefined, "bold");
        doc.setTextColor(...textLight);
        doc.text("Other Income Source:", 25, yPos);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...textDark);
        doc.text(reservation.other_income_source, 60, yPos);
        yPos += 6;

        doc.setFont(undefined, "bold");
        doc.setTextColor(...textLight);
        doc.text("Other Income Amount:", 25, yPos);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...textDark);
        doc.text(formatCurrency(reservation.other_income_amount), 60, yPos);
        yPos += 6;
      }

      doc.setFont(undefined, "bold");
      doc.setTextColor(...textLight);
      doc.text("Total Monthly Income:", 25, yPos);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.text(formatCurrency(reservation.total_monthly_income), 60, yPos);

      // Additional Notes
      if (reservation.message) {
        yPos += 12;
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.setTextColor(...textDark);
        doc.text("Additional Notes", 20, yPos);
        doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

        yPos += 8;
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...textDark);
        const splitMessage = doc.splitTextToSize(
          reservation.message,
          pageWidth - 50
        );
        doc.text(splitMessage, 25, yPos);
        yPos += splitMessage.length * 5;
      }

      // Important Notice
      yPos += 12;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.rect(20, yPos, pageWidth - 40, 28, "FD");

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(146, 64, 14);
      doc.text("Important Payment Instructions:", 25, yPos + 6);
      doc.setFont(undefined, "normal");
      doc.text(
        "You have 3-5 business days to visit Futura Home and complete your payment.",
        25,
        yPos + 11
      );
      doc.text(
        "Bring this receipt and provide your payment receipt with tracking number.",
        25,
        yPos + 16
      );
      doc.text(
        "Keep your payment receipt as proof of transaction.",
        25,
        yPos + 21
      );

      // Footer
      yPos += 30;
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...textLight);
      doc.text("FUTURA HOMES", pageWidth / 2, yPos, { align: "center" });
      yPos += 4;
      doc.setFont(undefined, "normal");
      doc.text("Thank you for choosing Futura Homes.", pageWidth / 2, yPos, {
        align: "center",
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Futura_Homes_Receipt_${reservation.reservation_id
        ?.slice(0, 8)
        .toUpperCase()}_${timestamp}.pdf`;
      doc.save(filename);

      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF receipt");
    }
  };

  const openContractViewModal = () => {
    setShowContractViewModal(true);
  };

  const handleViewExistingContract = async (reservation) => {
    try {
      // Fetch the contract details
      const response = await fetch(`/api/contracts?contractNumber=${reservation.contract.contract_number}`);
      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        toast.error("Failed to load contract details");
        return;
      }

      const contract = result.data[0];

      // Generate contract HTML
      const trackingNumber = reservation.tracking_number || `TRK-${reservation.reservation_id?.slice(0, 8).toUpperCase()}`;
      const contractNumber = contract.contract_number;
      const currentDate = new Date(contract.contract_signed_date || contract.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const propertyPrice = contract.property_price || 0;
      const downpaymentTotal = contract.downpayment_total || 0;
      const monthlyInstallment = contract.monthly_installment || 0;
      const paymentPlanMonths = contract.payment_plan_months || 12;
      const bankFinancingAmount = contract.bank_financing_amount || 0;

      const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(amount);
      };

      const contractContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contract to Sell - ${contractNumber}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Times New Roman', Times, serif;
                padding: 50px 60px;
                max-width: 900px;
                margin: 0 auto;
                background: white;
                color: #000;
                line-height: 1.9;
                font-size: 12pt;
              }
              .document-header {
                text-align: center;
                margin-bottom: 35px;
                border-bottom: 3px double #000;
                padding-bottom: 20px;
              }
              .company-name {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 8px;
                letter-spacing: 2px;
              }
              .company-details {
                font-size: 11px;
                color: #333;
                line-height: 1.6;
              }
              .document-title {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                margin: 35px 0 25px 0;
                text-transform: uppercase;
                letter-spacing: 1.5px;
              }
              .contract-number {
                text-align: center;
                font-size: 13px;
                margin-bottom: 35px;
                font-weight: bold;
              }
              .section-title {
                font-size: 14px;
                font-weight: bold;
                margin-top: 35px;
                margin-bottom: 18px;
                text-transform: uppercase;
                border-bottom: 2px solid #000;
                padding-bottom: 6px;
                letter-spacing: 0.5px;
              }
              .party-info {
                margin: 20px 0 25px 0;
                padding: 18px 20px;
                background: #f9f9f9;
                border-left: 4px solid #333;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 200px 1fr;
                gap: 12px 15px;
                margin: 12px 0;
              }
              .info-label {
                font-weight: bold;
                padding-top: 3px;
              }
              .info-value {
                border-bottom: 1px solid #ccc;
                padding-bottom: 3px;
              }
              .terms-list {
                margin-left: 35px;
                margin-bottom: 25px;
              }
              .terms-list li {
                margin-bottom: 18px;
                text-align: justify;
                line-height: 1.8;
              }
              .payment-table {
                width: 100%;
                border-collapse: collapse;
                margin: 25px 0;
              }
              .payment-table th,
              .payment-table td {
                border: 1px solid #000;
                padding: 12px 14px;
                text-align: left;
              }
              .payment-table th {
                background: #f0f0f0;
                font-weight: bold;
              }
              .amount-highlight {
                font-weight: bold;
                font-size: 14px;
              }
              .signature-section {
                margin-top: 50px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 70px;
                padding-top: 20px;
              }
              .signature-box {
                text-align: center;
              }
              .signature-line {
                border-top: 2px solid #000;
                margin-top: 75px;
                padding-top: 12px;
              }
              .signature-label {
                font-size: 11px;
                margin-bottom: 6px;
                font-weight: bold;
                text-transform: uppercase;
              }
              .signature-name {
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 13px;
              }
              .witness-section {
                margin-top: 45px;
                padding-top: 25px;
                border-top: 2px solid #000;
              }
              .page-break {
                page-break-before: always;
                break-before: page;
              }
              p {
                margin-bottom: 12px;
              }
              ul {
                margin-bottom: 20px;
                line-height: 1.9;
              }
              ul li {
                margin-bottom: 10px;
              }
              @page {
                size: 8.5in 13in;
                margin: 1in;
              }
              @media print {
                body {
                  padding: 30px 40px;
                  font-size: 11pt;
                }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <!-- Header -->
            <div class="document-header">
              <div class="company-name">FUTURA HOMES</div>
              <div class="company-details">
                Office Address: [Your Complete Address Here]<br>
                Contact: (XXX) XXX-XXXX | Email: info@futurahomes.com<br>
                Business Registration No: [Registration Number]
              </div>
            </div>

            <!-- Document Title -->
            <div class="document-title">Contract to Sell</div>
            <div class="contract-number">Contract No: ${contractNumber}</div>

            <!-- Preamble -->
            <p style="text-align: justify; margin-bottom: 20px;">
              This <strong>CONTRACT TO SELL</strong> is entered into on this <strong>${currentDate}</strong>, in the Philippines, by and between:
            </p>

            <!-- Vendor Section -->
            <div class="section-title">The Vendor</div>
            <div class="party-info">
              <p style="margin-bottom: 10px;"><strong>FUTURA HOMES</strong>, a duly registered real estate company organized and existing under Philippine laws, with principal office address at [Complete Address], hereinafter referred to as the <strong>"VENDOR"</strong>.</p>
            </div>

            <!-- Vendee Section -->
            <div class="section-title">The Vendee / Buyer</div>
            <div class="party-info">
              <div class="info-grid">
                <div class="info-label">Full Name:</div>
                <div class="info-value">${contract.client_name}</div>

                <div class="info-label">Residential Address:</div>
                <div class="info-value">${contract.client_address}</div>

                <div class="info-label">Contact Number:</div>
                <div class="info-value">${contract.client_phone}</div>

                <div class="info-label">Email Address:</div>
                <div class="info-value">${contract.client_email}</div>
              </div>
              <p style="margin-top: 15px;">Hereinafter referred to as the <strong>"VENDEE"</strong> or <strong>"BUYER"</strong>.</p>
            </div>

            <!-- Witnesseth -->
            <p style="text-align: center; font-weight: bold; margin: 30px 0 20px 0; font-size: 13px;">
              W I T N E S S E T H :
            </p>

            <p style="text-align: justify; margin-bottom: 20px;">
              WHEREAS, the VENDOR is the owner and/or authorized developer of certain real estate properties; and
            </p>

            <p style="text-align: justify; margin-bottom: 30px;">
              WHEREAS, the VENDEE desires to purchase from the VENDOR, and the VENDOR agrees to sell to the VENDEE, the property described below, subject to the terms and conditions hereinafter set forth.
            </p>

            <!-- Property Description -->
            <div class="section-title">Property Description</div>
            <div class="party-info">
              <div class="info-grid">
                <div class="info-label">Property Name:</div>
                <div class="info-value">${contract.property_title || 'N/A'}</div>

                <div class="info-label">Property ID:</div>
                <div class="info-value">${contract.property_id?.slice(0, 8).toUpperCase() || 'N/A'}</div>

                <div class="info-label">Tracking Number:</div>
                <div class="info-value">${trackingNumber}</div>
                </div>
              </div>

              <!-- Purchase Price and Payment Terms -->
              <div class="section-title">Purchase Price and Payment Terms</div>

              <table class="payment-table">
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount (PHP)</th>
                </tr>
                <tr>
                  <td><strong>Total Purchase Price</strong></td>
                  <td style="text-align: right;" class="amount-highlight">${formatCurrency(propertyPrice)}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                  <td colspan="2"><strong>PAYMENT STRUCTURE:</strong></td>
                </tr>
                <tr>
                  <td style="padding-left: 30px;"><strong>A. 10% Downpayment (Buyer's Responsibility)</strong></td>
                  <td style="text-align: right;" class="amount-highlight">${formatCurrency(downpaymentTotal)}</td>
                </tr>
                <tr>
                  <td style="padding-left: 50px;">Reservation Fee (Paid on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })})</td>
                  <td style="text-align: right;">${formatCurrency(contract.reservation_fee || 0)}</td>
                </tr>
                <tr>
                  <td style="padding-left: 50px;">Remaining Downpayment (${paymentPlanMonths} monthly installments of ${formatCurrency(monthlyInstallment)})</td>
                  <td style="text-align: right;">${formatCurrency(downpaymentTotal - (contract.reservation_fee || 0))}</td>
                </tr>
                <tr>
                  <td style="padding-left: 30px;"><strong>B. 90% Bank Financing</strong></td>
                  <td style="text-align: right;" class="amount-highlight">${formatCurrency(bankFinancingAmount)}</td>
                </tr>
              </table>

              <p style="text-align: justify; margin: 20px 0;">
                The VENDEE acknowledges the following payment structure:
              </p>

              <p style="text-align: justify; margin: 10px 0 10px 20px;">
                <strong>1. Downpayment (10% of Purchase Price = ${formatCurrency(downpaymentTotal)}):</strong>
              </p>
              <ul style="margin-left: 40px; margin-bottom: 15px;">
                <li>Reservation Fee of <strong>${formatCurrency(contract.reservation_fee || 0)}</strong> has been paid on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} as evidenced by Official Receipt.</li>
                <li>Remaining Downpayment of <strong>${formatCurrency(downpaymentTotal - (contract.reservation_fee || 0))}</strong> shall be paid in <strong>${paymentPlanMonths} monthly installments</strong> of <strong>${formatCurrency(monthlyInstallment)}</strong> per month.</li>
                <li>Monthly payments shall commence one (1) month from the date of signing this contract.</li>
              </ul>

              <p style="text-align: justify; margin: 10px 0 10px 20px;">
                <strong>2. Bank Financing (90% of Purchase Price = ${formatCurrency(bankFinancingAmount)}):</strong>
              </p>
              <ul style="margin-left: 40px; margin-bottom: 15px;">
                <li>The remaining <strong>90%</strong> of the purchase price shall be financed through bank loan/financing.</li>
                <li>The VENDEE shall be responsible for securing bank approval and financing.</li>
                <li>Bank financing terms, interest rates, and payment schedules shall be subject to the lending bank's policies.</li>
                <li>The VENDEE agrees to process the bank loan application within a reasonable time frame.</li>
              </ul>

              <!-- Terms and Conditions -->
              <div class="section-title page-break">Terms and Conditions</div>

              <p style="margin-bottom: 15px;">
                NOW, THEREFORE, for and in consideration of the foregoing premises, the parties hereby agree as follows:
              </p>

              <ol class="terms-list">
                <li>
                  <strong>RESERVATION FEE:</strong> The VENDEE has paid the reservation fee as stated above to reserve the property. This fee shall form part of the total purchase price and is non-refundable once this contract is executed.
                </li>

                <li>
                  <strong>DOWNPAYMENT PAYMENT SCHEDULE:</strong> The VENDEE agrees to pay the remaining downpayment of <strong>${formatCurrency(downpaymentTotal - (contract.reservation_fee || 0))}</strong> in <strong>${paymentPlanMonths} equal monthly installments</strong> of <strong>${formatCurrency(monthlyInstallment)}</strong> per month, commencing one (1) month from the execution of this contract. Failure to comply with this payment schedule may result in the cancellation of this contract and forfeiture of all payments made.
                </li>

                <li>
                  <strong>BANK FINANCING:</strong> The VENDEE acknowledges that <strong>90% (${formatCurrency(bankFinancingAmount)})</strong> of the purchase price shall be financed through a bank loan/financing arrangement. The VENDEE shall be solely responsible for securing bank approval, complying with bank requirements, and fulfilling all obligations under the bank financing agreement. The VENDOR shall cooperate in providing necessary documents for the bank financing application.
                </li>

                <li>
                  <strong>TRANSFER OF OWNERSHIP:</strong> Ownership and title to the property shall be transferred to the VENDEE only upon: (a) full payment of the 10% downpayment (${formatCurrency(downpaymentTotal)}), (b) approval and release of the 90% bank financing (${formatCurrency(bankFinancingAmount)}), and (c) compliance with all terms and conditions of this contract and bank financing agreement.
                </li>

                <li>
                  <strong>DEFAULT:</strong> In case of default by the VENDEE in the payment of any installment or violation of any of the terms and conditions hereof, the VENDOR shall have the right to cancel this contract and forfeit all payments made as liquidated damages.
                </li>

                <li style="background: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
                  <strong style="color: #991b1b;">⚠️ IMPORTANT NOTICE - NON-PAYMENT POLICY:</strong>
                  <span style="color: #7f1d1d;"> If the VENDEE fails to pay the monthly installment for THREE (3) consecutive months, this contract shall be automatically voided and the property will be taken back by FUTURA HOMES. All payments made shall be forfeited, and the VENDEE shall have no further claim to the property. The VENDEE acknowledges and agrees to this condition upon signing this contract.</span>
                </li>

                <li>
                  <strong>TAXES AND FEES:</strong> All taxes, registration fees, documentary stamp tax, transfer fees, and other charges incidental to the sale and transfer of the property shall be for the account of the VENDEE unless otherwise agreed upon.
                </li>

                <li>
                  <strong>WARRANTY:</strong> The VENDOR warrants that the property is free from any liens, encumbrances, or adverse claims, and has the legal right to sell the same.
                </li>

                <li>
                  <strong>POSSESSION:</strong> The VENDEE shall be entitled to possession of the property only upon full payment of the purchase price and execution of the Deed of Absolute Sale.
                </li>

                <li>
                  <strong>GOVERNING LAW:</strong> This contract shall be governed by and construed in accordance with the laws of the Republic of the Philippines.
                </li>

                <li>
                  <strong>ENTIRE AGREEMENT:</strong> This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements, whether written or oral, relating to the subject matter hereof.
                </li>
              </ol>

              <!-- Signatures -->
              <p style="text-align: justify; margin: 30px 0 20px 0;">
                IN WITNESS WHEREOF, the parties have hereunto set their hands on the date and place first above written.
              </p>

              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-line">
                    <div class="signature-name">${contract.client_name}</div>
                    <div class="signature-label">VENDEE / BUYER</div>
                    <div style="margin-top: 15px; font-size: 11px;">
                      Date: _____________________
                    </div>
                  </div>
                </div>

                <div class="signature-box">
                  <div class="signature-line">
                    <div class="signature-name">FUTURA HOMES</div>
                    <div class="signature-label">VENDOR</div>
                    <div style="margin-top: 5px; font-size: 10px;">
                      By: _____________________<br>
                      Authorized Representative
                    </div>
                    <div style="margin-top: 10px; font-size: 11px;">
                      Date: _____________________
                    </div>
                  </div>
                </div>
              </div>

              <!-- Witnesses -->
              <div class="witness-section">
                <p style="font-weight: bold; margin-bottom: 20px;">SIGNED IN THE PRESENCE OF:</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px;">
                  <div>
                    <div style="border-top: 2px solid #000; padding-top: 10px; margin-top: 60px;">
                      <div style="font-weight: bold; text-align: center;">WITNESS #1</div>
                      <div style="text-align: center; font-size: 11px; margin-top: 10px;">
                        Signature Over Printed Name<br>
                        Date: _____________________
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style="border-top: 2px solid #000; padding-top: 10px; margin-top: 60px;">
                      <div style="font-weight: bold; text-align: center;">WITNESS #2</div>
                      <div style="text-align: center; font-size: 11px; margin-top: 10px;">
                        Signature Over Printed Name<br>
                        Date: _____________________
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Acknowledgment Section -->
              <div class="page-break" style="margin-top: 60px; padding: 20px; border: 2px solid #000;">
                <p style="text-align: center; font-weight: bold; margin-bottom: 15px;">ACKNOWLEDGMENT</p>
                <p style="text-align: justify; font-size: 11px;">
                  REPUBLIC OF THE PHILIPPINES )<br>
                  <span style="margin-left: 220px;">)</span> S.S.<br>
                  _________________________________ )<br><br>

                  BEFORE ME, a Notary Public for and in _________________________________, this _____ day of _________________, 20____, personally appeared:
                </p>

                <table style="width: 100%; margin: 15px 0; font-size: 11px;">
                  <tr>
                    <td style="padding: 5px; border-bottom: 1px solid #ccc;"><strong>Name</strong></td>
                    <td style="padding: 5px; border-bottom: 1px solid #ccc;"><strong>ID Type & Number</strong></td>
                    <td style="padding: 5px; border-bottom: 1px solid #ccc;"><strong>Date/Place Issued</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px;">${contract.client_name}</td>
                    <td style="padding: 8px;">_________________________</td>
                    <td style="padding: 8px;">_________________________</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px;">Authorized Rep. (Futura Homes)</td>
                    <td style="padding: 8px;">_________________________</td>
                    <td style="padding: 8px;">_________________________</td>
                  </tr>
                </table>

                <p style="text-align: justify; font-size: 11px; margin-top: 15px;">
                  known to me and to me known to be the same persons who executed the foregoing instrument and acknowledged to me that the same is their free and voluntary act and deed.
                </p>

                <p style="text-align: justify; font-size: 11px; margin-top: 15px;">
                  WITNESS MY HAND AND SEAL on the date and place first above written.
                </p>

                <div style="margin-top: 40px; text-align: center;">
                  <div style="border-top: 2px solid #000; width: 300px; margin: 0 auto; padding-top: 10px;">
                    <div style="font-weight: bold;">NOTARY PUBLIC</div>
                    <div style="font-size: 10px; margin-top: 10px;">
                      Doc. No. _______<br>
                      Page No. _______<br>
                      Book No. _______<br>
                      Series of 20____
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 15px;">
                Contract No: ${contractNumber} | Generated: ${currentDate}<br>
                © ${new Date().getFullYear()} Futura Homes. All Rights Reserved.
              </div>
            </div>
          </body>
        </html>
      `;

      setContractPreviewHtml(contractContent);
      setShowContractViewModal(true);
      toast.success("Contract loaded successfully");
    } catch (error) {
      console.error("Error loading contract:", error);
      toast.error("Failed to load contract: " + error.message);
    }
  };

  const handlePrintContract = () => {
    // Close the view modal
    setShowContractViewModal(false);

    // Wait a moment for modal to close, then open print dialog
    setTimeout(() => {
      const propertyPrice =
        contractData.property_info?.property_price || 0;
      const trackingNumber =
        contractData.tracking_number ||
        `TRK-${contractData.reservation_id
          ?.slice(0, 8)
          .toUpperCase()}`;
      const contractNumber = `CTS-${new Date().getFullYear()}-${trackingNumber.replace(
        "TRK-",
        ""
      )}`;

      // Open in new window for PDF download
      const pdfWindow = window.open("", "_blank");
      pdfWindow.document.write(contractPreviewHtml);
      pdfWindow.document.close();
      pdfWindow.document.title = `Contract_to_Sell_${contractNumber}`;
      pdfWindow.focus();

      setTimeout(() => pdfWindow.print(), 250);
    }, 100);
  };

  const printReceipt = (reservation) => {
    const trackingNumber =
      reservation.tracking_number ||
      `TRK-${reservation.reservation_id?.slice(0, 8).toUpperCase()}`;

    const propertyPrice = reservation.property_info?.property_price || 1;
    const reservationFee = reservation.reservation_fee || 0;
    const tenPercentAmount = propertyPrice * 0.1;
    const percentage = ((reservationFee / propertyPrice) * 100).toFixed(0);
    const isApproved = reservation.status === "approved";

    const receiptNumber = `RCP-${new Date().getFullYear()}-${trackingNumber.replace(
      "TRK-",
      ""
    )}`;
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Reservation Receipt - ${trackingNumber}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background: white;
              color: #1f2937;
              line-height: 1.6;
            }
            .document-header {
              border: 3px solid #dc2626;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 30px;
              background: linear-gradient(135deg, #fee2e2 0%, #ffffff 100%);
            }
            .company-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .company-name {
              font-size: 36px;
              font-weight: 900;
              color: #dc2626;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .company-tagline {
              font-size: 13px;
              color: #6b7280;
              font-style: italic;
              margin-bottom: 10px;
            }
            .company-details {
              font-size: 11px;
              color: #6b7280;
              line-height: 1.4;
            }
            .document-title {
              text-align: center;
              padding: 15px;
              background: #dc2626;
              color: white;
              font-size: 22px;
              font-weight: bold;
              border-radius: 8px;
              margin: 20px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .receipt-meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 20px 0;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .meta-value {
              font-size: 14px;
              color: #1f2937;
              font-weight: 700;
              font-family: 'Courier New', monospace;
            }
            .tracking-number {
              background: #fee2e2;
              border: 3px solid #dc2626;
              padding: 20px;
              text-align: center;
              border-radius: 10px;
              margin: 25px 0;
            }
            .tracking-label {
              font-size: 12px;
              color: #991b1b;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .tracking-value {
              font-size: 32px;
              font-weight: 900;
              color: #dc2626;
              letter-spacing: 3px;
              font-family: 'Courier New', monospace;
            }
            .section {
              margin: 25px 0;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: white;
            }
            .section-header {
              font-size: 16px;
              font-weight: 700;
              color: #1f2937;
              padding-bottom: 12px;
              margin-bottom: 15px;
              border-bottom: 2px solid #dc2626;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .info-value {
              font-size: 14px;
              color: #1f2937;
              font-weight: 600;
            }
            .pricing-card {
              padding: 20px;
              border-radius: 8px;
              margin: 15px 0;
              border: 2px solid;
            }
            .price-amount {
              font-size: 28px;
              font-weight: 900;
              margin: 8px 0;
            }
            .price-detail {
              font-size: 12px;
              margin-top: 5px;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 20px;
              border-radius: 20px;
              font-weight: 700;
              font-size: 14px;
              text-transform: uppercase;
            }
            .status-approved {
              background: #dcfce7;
              color: #166534;
              border: 2px solid #16a34a;
            }
            .status-pending {
              background: #fef3c7;
              color: #92400e;
              border: 2px solid #f59e0b;
            }
            .payment-confirmation {
              background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%);
              border: 3px solid #16a34a;
              border-radius: 12px;
              padding: 25px;
              margin: 25px 0;
            }
            .confirmation-check {
              font-size: 48px;
              color: #16a34a;
              text-align: center;
              margin-bottom: 15px;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin: 40px 0;
              padding: 30px 20px;
              border-top: 2px solid #e5e7eb;
            }
            .signature-box {
              text-align: center;
            }
            .signature-label {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 50px;
              font-weight: 600;
            }
            .signature-line {
              border-top: 2px solid #1f2937;
              padding-top: 8px;
              margin-top: 10px;
            }
            .signature-name {
              font-size: 12px;
              color: #4b5563;
              font-weight: 600;
            }
            .notice-box {
              background: #fef3c7;
              border-left: 5px solid #f59e0b;
              padding: 20px;
              margin: 25px 0;
              border-radius: 5px;
            }
            .notice-title {
              font-weight: 700;
              color: #92400e;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .notice-list {
              font-size: 12px;
              color: #713f12;
              line-height: 1.8;
            }
            .terms-section {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              border: 1px solid #e5e7eb;
            }
            .terms-title {
              font-weight: 700;
              margin-bottom: 12px;
              color: #1f2937;
              font-size: 14px;
            }
            .terms-list {
              font-size: 11px;
              color: #4b5563;
              line-height: 1.8;
              padding-left: 20px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 25px;
              border-top: 3px double #e5e7eb;
              text-align: center;
            }
            .footer-company {
              font-size: 14px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .footer-text {
              font-size: 11px;
              color: #6b7280;
              line-height: 1.6;
            }
            .watermark {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
              color: #9ca3af;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
            }
            @page {
              size: 8.5in 14in;
              margin: 0.5in;
            }
            @media print {
              body {
                padding: 10px;
                max-width: 100%;
                font-size: 11px;
              }
              .no-print { display: none; }
              .document-header {
                padding: 15px;
                margin-bottom: 15px;
              }
              .company-name {
                font-size: 28px;
              }
              .company-tagline {
                font-size: 11px;
              }
              .company-details {
                font-size: 9px;
              }
              .document-title {
                padding: 10px;
                font-size: 18px;
                margin: 12px 0;
              }
              .receipt-meta {
                padding: 10px;
                margin: 12px 0;
              }
              .meta-label {
                font-size: 9px;
              }
              .meta-value {
                font-size: 12px;
              }
              .tracking-value {
                font-size: 24px;
              }
              .section {
                padding: 12px;
                margin: 12px 0;
              }
              .section-header {
                font-size: 13px;
                padding-bottom: 8px;
                margin-bottom: 10px;
              }
              .info-label {
                font-size: 9px;
              }
              .info-value {
                font-size: 11px;
              }
              .pricing-card {
                padding: 12px;
                margin: 10px 0;
              }
              .price-amount {
                font-size: 20px;
              }
              .price-detail {
                font-size: 10px;
              }
              .payment-confirmation {
                padding: 15px;
                margin: 15px 0;
              }
              .confirmation-check {
                font-size: 36px;
                margin-bottom: 10px;
              }
              .signature-section {
                margin: 20px 0;
                padding: 15px 10px;
              }
              .signature-label {
                font-size: 9px;
                margin-bottom: 30px;
              }
              .signature-name {
                font-size: 10px;
              }
              .notice-box {
                padding: 12px;
                margin: 15px 0;
              }
              .notice-title {
                font-size: 12px;
                margin-bottom: 8px;
              }
              .notice-list {
                font-size: 10px;
                line-height: 1.5;
              }
              .terms-section {
                padding: 12px;
                margin: 15px 0;
              }
              .terms-title {
                font-size: 12px;
                margin-bottom: 8px;
              }
              .terms-list {
                font-size: 9px;
                line-height: 1.5;
                padding-left: 15px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 15px;
              }
              .footer-company {
                font-size: 12px;
              }
              .footer-text {
                font-size: 9px;
              }
              .watermark {
                font-size: 8px;
                margin-top: 10px;
              }
            }
          </style>
        </head>
        <body>
          <!-- Company Header -->
          <div class="document-header">
            <div class="company-info">
              <div class="company-name">FUTURA HOMES</div>
              <div class="company-tagline">Your Trusted Partner in Finding the Perfect Home</div>
              <div class="company-details">
                Office Address: [Your Complete Address Here]<br>
                Contact: (XXX) XXX-XXXX | Email: info@futurahomes.com<br>
                Business Registration No: [Registration Number]
              </div>
            </div>
          </div>

          <!-- Document Title -->
          <div class="document-title">
            ${isApproved ? "OFFICIAL PAYMENT RECEIPT" : "RESERVATION RECEIPT"}
          </div>

          <!-- Receipt Metadata -->
          <div class="receipt-meta">
            <div class="meta-item">
              <div class="meta-label">Receipt Number</div>
              <div class="meta-value">${receiptNumber}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Issue Date</div>
              <div class="meta-value">${currentDate}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Tracking Number</div>
              <div class="meta-value">${trackingNumber}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Status</div>
              <div class="meta-value">
                <span class="status-badge ${
                  isApproved ? "status-approved" : "status-pending"
                }">
                  ${reservation.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <!-- Client Information Section -->
          <div class="section">
            <div class="section-header">Client Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Full Name</div>
                <div class="info-value">${reservation.client_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Contact Number</div>
                <div class="info-value">${reservation.client_phone}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email Address</div>
                <div class="info-value">${reservation.client_email}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Residential Address</div>
                <div class="info-value">${reservation.client_address}</div>
              </div>
            </div>
          </div>

          <!-- Property Information Section -->
          <div class="section">
            <div class="section-header">Property Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Property Name</div>
                <div class="info-value">${
                  reservation.property_title || "N/A"
                }</div>
              </div>
              <div class="info-item">
                <div class="info-label">Reservation Date</div>
                <div class="info-value">${formatDate(
                  reservation.created_at
                )}</div>
              </div>
            </div>
          </div>

          <!-- Pricing Breakdown Section -->
          <div class="section">
            <div class="section-header">Financial Summary</div>

            <!-- Total Property Price -->
            <div class="pricing-card" style="background: #eff6ff; border-color: #3b82f6;">
              <div class="info-label" style="color: #1e40af;">Total Property Price</div>
              <div class="price-amount" style="color: #2563eb;">${formatCurrencyShort(
                propertyPrice
              )}</div>
              <div class="price-detail" style="color: #64748b;">${formatCurrency(
                propertyPrice
              )}</div>
            </div>

            <!-- 10% Downpayment Calculation -->
            <div class="pricing-card" style="background: #f3e8ff; border-color: #a855f7;">
              <div class="info-label" style="color: #7c3aed;">Required Downpayment (10%)</div>
              <div class="price-amount" style="color: #9333ea;">${formatCurrencyShort(
                tenPercentAmount
              )}</div>
              <div class="price-detail" style="color: #64748b;">10% of ${formatCurrencyShort(
                propertyPrice
              )} = ${formatCurrency(tenPercentAmount)}</div>
            </div>

            <!-- Reservation Fee Paid -->
            <div class="pricing-card" style="background: #f0fdf4; border-color: #16a34a; border-width: 3px;">
              <div class="info-label" style="color: #166534;">Reservation Fee ${
                isApproved ? "(PAID)" : "(To Pay)"
              }</div>
              <div class="price-amount" style="color: #059669;">${formatCurrencyShort(
                reservationFee
              )}</div>
              <div class="price-detail" style="color: #334155; font-weight: 600;">
                ${percentage}% of Total Price = ${formatCurrency(
      reservationFee
    )}
              </div>
            </div>
          </div>

          ${
            isApproved
              ? `
          <!-- Payment Confirmation (Approved Only) - Page 2 -->
          <div class="payment-confirmation page-break">
            <div class="confirmation-check">✓</div>
            <div class="section-header" style="color: #16a34a; text-align: center; border-bottom: 2px solid #16a34a;">PAYMENT CONFIRMED</div>

            <div class="info-grid" style="margin-top: 20px;">
              <div class="info-item">
                <div class="info-label" style="color: #166534;">Amount Paid</div>
                <div class="info-value" style="color: #16a34a; font-size: 24px; font-weight: 900;">${formatCurrencyShort(
                  reservationFee
                )}</div>
              </div>
              <div class="info-item">
                <div class="info-label" style="color: #166534;">Payment Date</div>
                <div class="info-value" style="color: #16a34a; font-weight: 700;">${formatDate(
                  reservation.updated_at || reservation.created_at
                )}</div>
              </div>
              <div class="info-item">
                <div class="info-label" style="color: #166534;">Payment Status</div>
                <div class="info-value" style="color: #16a34a; font-weight: 700;">CONFIRMED & PROCESSED</div>
              </div>
              <div class="info-item">
                <div class="info-label" style="color: #166534;">Receipt Number</div>
                <div class="info-value" style="color: #16a34a; font-weight: 700; font-family: 'Courier New', monospace;">${receiptNumber}</div>
              </div>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 2px solid #16a34a;">
              <p style="margin: 0; text-align: center; color: #166534; font-weight: 600; font-size: 13px; line-height: 1.6;">
                This is an official receipt confirming that Futura Homes has received and processed the reservation payment of ${formatCurrency(
                  reservationFee
                )} for the property "${
                  reservation.property_title
                }". This document serves as proof of payment and reservation confirmation.
              </p>
            </div>
          </div>
          `
              : ""
          }

          ${
            isApproved
              ? `
          <!-- Signature Section (Approved Only) -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-label">HOMEOWNER / BUYER</div>
              <div class="signature-line">
                <div class="signature-name">Signature Over Printed Name</div>
                <div style="margin-top: 15px; font-size: 11px; color: #6b7280;">
                  <strong>Date:</strong> _____________________
                </div>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-label">FUTURA HOMES AUTHORIZED REPRESENTATIVE</div>
              <div class="signature-line">
                <div class="signature-name">Authorized Signature</div>
                <div style="margin-top: 15px; font-size: 11px; color: #6b7280;">
                  <strong>Date:</strong> _____________________
                </div>
              </div>
            </div>
          </div>

          <!-- Notice for Homeowner -->
          <div class="notice-box">
            <div class="notice-title">📋 IMPORTANT NOTICE FOR HOMEOWNER</div>
            <div class="notice-list">
              • This is an official payment receipt issued by Futura Homes<br>
              • Keep this document in a safe place for your records<br>
              • Present this receipt during property turnover and documentation<br>
              • This receipt is valid and binding between both parties<br>
              • For any concerns or inquiries, contact us immediately
            </div>
          </div>

          <!-- Terms and Conditions -->
          <div class="terms-section">
            <div class="terms-title">TERMS AND CONDITIONS</div>
            <ol class="terms-list">
              <li>This receipt confirms the reservation payment for the specified property</li>
              <li>The reservation fee is non-refundable once approved and processed</li>
              <li>Homeowner agrees to complete the remaining balance as per payment terms</li>
              <li>Futura Homes reserves the right to cancel reservations for non-compliance</li>
              <li>Both parties are bound by this agreement and the terms stated herein</li>
            </ol>
          </div>
          `
              : `
          <!-- Payment Instructions (Pending Only) -->
          <div class="notice-box">
            <div class="notice-title">💳 PAYMENT INSTRUCTIONS</div>
            <div class="notice-list">
              <strong>Please complete your payment within 3-5 business days:</strong><br><br>
              1. Visit our Futura Homes office<br>
              2. Bring this receipt with <strong>Tracking Number: ${trackingNumber}</strong><br>
              3. Pay the reservation fee of <strong>${formatCurrency(
                reservationFee
              )}</strong><br>
              4. Obtain official receipt and payment confirmation<br>
              5. Keep all documents for your records
            </div>
          </div>

          <!-- Terms and Conditions -->
          <div class="terms-section">
            <div class="terms-title">RESERVATION TERMS</div>
            <ol class="terms-list">
              <li>Reservation is subject to approval and payment verification</li>
              <li>Reservation fee must be paid within the specified timeframe</li>
              <li>Failure to pay may result in reservation cancellation</li>
              <li>All information provided must be accurate and truthful</li>
              <li>Terms and conditions are subject to Futura Homes policies</li>
            </ol>
          </div>
          `
          }

          <!-- Footer -->
          <div class="footer">
            <div class="footer-company">FUTURA HOMES</div>
            <div class="footer-text">
              Your Trusted Partner in Finding the Perfect Home<br>
              Office: [Complete Address] | Phone: (XXX) XXX-XXXX<br>
              Email: info@futurahomes.com | Website: www.futurahomes.com<br><br>
              <strong>Business Hours:</strong> Monday - Saturday, 9:00 AM - 6:00 PM
            </div>
            <div class="watermark">
              This is an electronically generated document and is valid without signature.<br>
              Document ID: ${receiptNumber} | Generated: ${currentDate}<br>
              © ${new Date().getFullYear()} Futura Homes. All Rights Reserved.
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const getStatusCounts = () => {
    return {
      all: reservations.length,
      pending: reservations.filter((r) => r.status === "pending").length,
      approved: reservations.filter((r) => r.status === "approved").length,
      rejected: reservations.filter((r) => r.status === "rejected").length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/30">
                <CalendarCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                  Reservation
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  View client reservation from website or mobile
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {statusCounts.all}
                  </p>
                </div>
                <FileText className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {statusCounts.pending}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Approved</p>
                  <p className="text-3xl font-bold text-green-900">
                    {statusCounts.approved}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-900">
                    {statusCounts.rejected}
                  </p>
                </div>
                <XCircle className="w-12 h-12 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* First Row - Search and Status */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by tracking #, name, email, phone, or property..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Status ({statusCounts.all})</option>
                    <option value="pending">
                      Pending ({statusCounts.pending})
                    </option>
                    <option value="approved">
                      Approved ({statusCounts.approved})
                    </option>
                    <option value="rejected">
                      Rejected ({statusCounts.rejected})
                    </option>
                  </select>
                </div>
              </div>

              {/* Second Row - Date Range */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                {/* Start Date */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* End Date */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Clear Filters Button */}
                {(searchTerm ||
                  statusFilter !== "all" ||
                  startDate ||
                  endDate) && (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setStartDate("");
                      setEndDate("");
                    }}
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Table */}
        {filteredReservations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <FileText className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No reservations found
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "No property reservations have been submitted yet"}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Mobile/Tablet Card View */}
            <div className="block 2xl:hidden space-y-4">
              {filteredReservations.map((reservation, index) => (
                <motion.div
                  key={reservation.reservation_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedReservation(reservation);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="space-y-3">
                    {/* Tracking Number and Status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Tracking Number</p>
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-red-600 mr-2" />
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {reservation.tracking_number ||
                              `TRK-${reservation.reservation_id
                                ?.slice(0, 8)
                                .toUpperCase()}`}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    {/* Client Name */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Client Name</p>
                      <p className="font-semibold text-slate-900 text-base">
                        {reservation.client_name || "N/A"}
                      </p>
                      {reservation.client_email && (
                        <p className="text-xs text-slate-600 mt-1">
                          {reservation.client_email}
                        </p>
                      )}
                      {reservation.client_phone && (
                        <p className="text-xs text-slate-600">
                          {reservation.client_phone}
                        </p>
                      )}
                    </div>

                    {/* Property Price Info */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Property Price</p>
                        <div className="font-semibold text-blue-600 text-base">
                          {formatCurrencyShort(
                            reservation.property_info?.property_price || 0
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(
                            reservation.property_info?.property_price || 0
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">10% of Total Price</p>
                        <div className="font-semibold text-purple-600 text-base">
                          {formatCurrencyShort(
                            (reservation.property_info?.property_price || 0) * 0.1
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          10% of{" "}
                          {formatCurrencyShort(
                            reservation.property_info?.property_price || 0
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reservation Fee and Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Reservation Fee</p>
                        <div className="font-semibold text-green-600 text-base">
                          {formatCurrencyShort(reservation.reservation_fee)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(
                            (reservation.reservation_fee /
                              (reservation.property_info?.property_price || 1)) *
                            100
                          ).toFixed(0)}
                          % of{" "}
                          {formatCurrencyShort(
                            reservation.property_info?.property_price || 0
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Date</p>
                        <div className="text-sm text-slate-900">
                          {formatDate(reservation.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      {reservation.status === "pending" && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(reservation.reservation_id);
                            }}
                            disabled={processingId === reservation.reservation_id}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs flex-1"
                          >
                            {processingId === reservation.reservation_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(reservation.reservation_id);
                            }}
                            disabled={processingId === reservation.reservation_id}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-xs flex-1"
                          >
                            {processingId === reservation.reservation_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {reservation.status === "approved" && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevert(reservation.reservation_id);
                            }}
                            disabled={processingId === reservation.reservation_id}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 text-xs flex-1"
                          >
                            {processingId === reservation.reservation_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Revert
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              printReceipt(reservation);
                            }}
                            variant="outline"
                            className="border-slate-300 text-slate-700 px-3 py-2 text-xs"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                          {(userRole === "admin" || userRole === "customer service") && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContractData(reservation);
                                setShowContractModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs"
                              title="Create contract (Admin & Customer Service only)"
                            >
                              <FileSignature className="h-3 w-3 mr-1" />
                              Contract
                            </Button>
                          )}
                        </>
                      )}
                      {reservation.status === "rejected" && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevert(reservation.reservation_id);
                            }}
                            disabled={processingId === reservation.reservation_id}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 text-xs flex-1"
                          >
                            {processingId === reservation.reservation_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Revert
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {/* Contract Button Section */}
                      {reservation.status === "approved" && (
                        <div className="pt-2 border-t border-slate-100 w-full">
                          {reservation.contract?.contract_id ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewExistingContract(reservation);
                              }}
                              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs py-2"
                            >
                              <Home className="h-3 w-3 mr-2" />
                              View Contract
                            </Button>
                          ) : (userRole === "admin" || userRole === "customer service") ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContractData(reservation);
                                setShowContractModal(true);
                              }}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs py-2"
                              title="Create contract for this reservation"
                            >
                              <FileSignature className="h-3 w-3 mr-2" />
                              Create Contract
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContractData(reservation);
                                setShowContractModal(true);
                              }}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs py-2"
                              title="Request contract creation"
                            >
                              <FileSignature className="h-3 w-3 mr-2" />
                              Request Contract
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop Table View (2XL+ screens only) */}
            <Card className="hidden 2xl:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Buyer Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Tracking #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Total Property Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      10% of Total Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Reservation Fee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredReservations.map((reservation, index) => (
                    <motion.tr
                      key={reservation.reservation_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* Buyer Name */}
                      <td
                        className="px-6 py-4"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {reservation.client_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {reservation.client_email}
                          </div>
                        </div>
                      </td>

                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-red-600 mr-2" />
                          <span className="font-mono font-bold text-slate-900">
                            {reservation.tracking_number ||
                              `TRK-${reservation.reservation_id
                                ?.slice(0, 8)
                                .toUpperCase()}`}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="text-sm">
                          <div className="font-semibold text-blue-600">
                            {formatCurrencyShort(
                              reservation.property_info?.property_price || 0
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatCurrency(
                              reservation.property_info?.property_price || 0
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="text-sm">
                          <div className="font-semibold text-purple-600">
                            {formatCurrencyShort(
                              (reservation.property_info?.property_price || 0) *
                                0.1
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            10% of{" "}
                            {formatCurrencyShort(
                              reservation.property_info?.property_price || 0
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="text-sm">
                          <div className="font-semibold text-green-600">
                            {formatCurrencyShort(reservation.reservation_fee)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {(
                              (reservation.reservation_fee /
                                (reservation.property_info?.property_price ||
                                  1)) *
                              100
                            ).toFixed(0)}
                            % of{" "}
                            {formatCurrencyShort(
                              reservation.property_info?.property_price || 0
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        {getStatusBadge(reservation.status)}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="text-sm text-slate-600">
                          {formatDate(reservation.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {reservation.status === "pending" && (
                            <>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(reservation.reservation_id);
                                }}
                                disabled={
                                  processingId === reservation.reservation_id
                                }
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                              >
                                {processingId === reservation.reservation_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(reservation.reservation_id);
                                }}
                                disabled={
                                  processingId === reservation.reservation_id
                                }
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                              >
                                {processingId === reservation.reservation_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                          {reservation.status === "approved" && (
                            <>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevert(reservation.reservation_id);
                                }}
                                disabled={
                                  processingId === reservation.reservation_id
                                }
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs"
                              >
                                {processingId === reservation.reservation_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  printReceipt(reservation);
                                }}
                                variant="outline"
                                className="border-slate-300 text-slate-700 px-3 py-1 text-xs"
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                              {(userRole === "admin" || userRole === "customer service") && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContractData(reservation);
                                    setShowContractModal(true);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                                  title="Create contract (Admin & Customer Service only)"
                                >
                                  <FileSignature className="h-3 w-3 mr-1" />
                                  Create
                                </Button>
                              )}
                            </>
                          )}
                          {reservation.status === "rejected" && (
                            <>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevert(reservation.reservation_id);
                                }}
                                disabled={
                                  processingId === reservation.reservation_id
                                }
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs"
                              >
                                {processingId === reservation.reservation_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                          {/* Contract Button - Show if approved */}
                          {reservation.status === "approved" && (
                            <>
                              {reservation.contract?.contract_id ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewExistingContract(reservation);
                                  }}
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-1 text-xs"
                                  title="View Contract"
                                >
                                  <Home className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              ) : (userRole === "admin" || userRole === "customer service") ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContractData(reservation);
                                    setShowContractModal(true);
                                  }}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 text-xs"
                                  title="Create contract for this reservation"
                                >
                                  <FileSignature className="h-3 w-3 mr-1" />
                                  Create
                                </Button>
                              ) : (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContractData(reservation);
                                    setShowContractModal(true);
                                  }}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 text-xs"
                                  title="Request contract creation"
                                >
                                  <FileSignature className="h-3 w-3 mr-1" />
                                  Request
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReservation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-slate-800">
                    Reservation Details
                  </h2>
                  <Button
                    onClick={() => setShowDetailModal(false)}
                    variant="outline"
                    className="rounded-full"
                  >
                    Close
                  </Button>
                </div>

                {/* Status Badge */}
                <div className="mb-6">
                  {getStatusBadge(selectedReservation.status)}
                </div>

                {/* Property & Pricing Information */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 mb-3 text-lg border-b pb-2 flex items-center gap-2">
                    <Home className="w-5 h-5 text-red-600" />
                    Property & Pricing Details
                  </h3>

                  {/* Property Name */}
                  <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-slate-600 mb-1">
                      Property Name:
                    </p>
                    <p className="font-bold text-slate-900 text-lg">
                      {selectedReservation.property_title}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Total Property Price */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-slate-600 mb-1">
                        Total Property Price:
                      </p>
                      <p className="font-bold text-blue-700 text-2xl">
                        {formatCurrencyShort(
                          selectedReservation.property_info?.property_price || 0
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatCurrency(
                          selectedReservation.property_info?.property_price || 0
                        )}
                      </p>
                    </div>

                    {/* 10% of Total Price */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-slate-600 mb-1">
                        10% of Total Price:
                      </p>
                      <p className="font-bold text-purple-700 text-2xl">
                        {formatCurrencyShort(
                          (selectedReservation.property_info?.property_price ||
                            0) * 0.1
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatCurrency(
                          (selectedReservation.property_info?.property_price ||
                            0) * 0.1
                        )}
                      </p>
                    </div>

                    {/* Reservation Fee (Amount to Pay) */}
                    <div className="p-3 bg-green-50 rounded-lg border-2 border-green-300">
                      <p className="text-xs text-slate-600 mb-1">
                        Reservation Fee:
                      </p>
                      <p className="font-bold text-green-700 text-2xl">
                        {formatCurrencyShort(
                          selectedReservation.reservation_fee
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatCurrency(selectedReservation.reservation_fee)}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-semibold">
                        {(
                          (selectedReservation.reservation_fee /
                            (selectedReservation.property_info
                              ?.property_price || 1)) *
                          100
                        ).toFixed(0)}
                        % of Total
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 mb-3 text-lg border-b pb-2">
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.client_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.client_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.client_phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Address</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.client_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 mb-3 text-lg border-b pb-2">
                    Employment Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Occupation</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.occupation}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Employer</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.employer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">
                        Employment Status
                      </p>
                      <p className="font-medium text-slate-900 capitalize">
                        {selectedReservation.employment_status?.replace(
                          "-",
                          " "
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Years Employed</p>
                      <p className="font-medium text-slate-900">
                        {selectedReservation.years_employed} years
                      </p>
                    </div>
                  </div>
                </div>

                {/* Income Statement */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 mb-3 text-lg border-b pb-2">
                    Income Statement
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Monthly Income:</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(selectedReservation.monthly_income)}
                      </span>
                    </div>
                    {selectedReservation.other_income_source && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">
                            Other Income Source:
                          </span>
                          <span className="font-medium text-slate-900">
                            {selectedReservation.other_income_source}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">
                            Other Income Amount:
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(
                              selectedReservation.other_income_amount
                            )}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
                      <span className="font-bold text-slate-800">
                        Total Monthly Income:
                      </span>
                      <span className="font-bold text-xl text-green-600">
                        {formatCurrency(
                          selectedReservation.total_monthly_income
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ID Upload Information */}
                {selectedReservation.id_type && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-3 text-lg border-b pb-2">
                      ID Upload
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">ID Type</p>
                        <p className="font-medium text-slate-900 capitalize">
                          {selectedReservation.id_type?.replace("-", " ")}
                        </p>
                      </div>
                      {selectedReservation.id_upload_path && (
                        <div>
                          <p className="text-sm text-slate-500 mb-2">
                            ID Document
                          </p>
                          <a
                            href={selectedReservation.id_upload_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                          >
                            <Download className="w-4 h-4" />
                            View/Download ID
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedReservation.message && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-3 text-lg border-b pb-2">
                      Additional Notes
                    </h3>
                    <p className="text-slate-700">
                      {selectedReservation.message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {selectedReservation.status === "pending" && (
                  <div className="flex gap-4 pt-6 border-t">
                    <Button
                      onClick={() =>
                        handleApprove(selectedReservation.reservation_id)
                      }
                      disabled={
                        processingId === selectedReservation.reservation_id
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingId === selectedReservation.reservation_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve Reservation
                    </Button>

                    <Button
                      onClick={() =>
                        handleReject(selectedReservation.reservation_id)
                      }
                      disabled={
                        processingId === selectedReservation.reservation_id
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {processingId === selectedReservation.reservation_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Reject Reservation
                    </Button>
                  </div>
                )}

                {selectedReservation.status === "approved" && (
                  <div className="flex gap-4 pt-6 border-t">
                    <Button
                      onClick={() =>
                        handleRevert(selectedReservation.reservation_id)
                      }
                      disabled={
                        processingId === selectedReservation.reservation_id
                      }
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {processingId === selectedReservation.reservation_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Revert to Pending
                    </Button>

                    <Button
                      onClick={() => printReceipt(selectedReservation)}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print Receipt
                    </Button>
                  </div>
                )}

                {selectedReservation.status === "rejected" && (
                  <div className="flex gap-4 pt-6 border-t">
                    <Button
                      onClick={() =>
                        handleRevert(selectedReservation.reservation_id)
                      }
                      disabled={
                        processingId === selectedReservation.reservation_id
                      }
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {processingId === selectedReservation.reservation_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Revert to Pending
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract to Sell Modal */}
      <AnimatePresence>
        {showContractModal && contractData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowContractModal(false);
              setPaymentMonths(12);
              setMonthlyPayment(0);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileSignature className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-slate-800">
                        Contract to Sell - Payment Plan
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Setup payment plan and generate official contract
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setShowContractModal(false);
                      setPaymentMonths(12);
                      setMonthlyPayment(0);
                    }}
                    variant="outline"
                    className="rounded-full"
                  >
                    Close
                  </Button>
                </div>

                {/* Payment Plan Form */}
                <div className="mb-6 space-y-6">
                  {(() => {
                    const propertyPrice =
                      contractData.property_info?.property_price || 0;
                    const reservationFeePaid =
                      contractData.reservation_fee || 0;
                    const tenPercentDownpayment = propertyPrice * 0.1;
                    const ninetyPercentBankFinancing = propertyPrice * 0.9;
                    const remainingDownpayment =
                      tenPercentDownpayment - reservationFeePaid;
                    const calculatedMonthly =
                      remainingDownpayment / paymentMonths;

                    return (
                      <>
                        {/* Property Price Overview */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
                          <h3 className="font-semibold text-blue-900 mb-4 text-lg flex items-center gap-2">
                            <Home className="w-5 h-5" />
                            Property Purchase Summary
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-700 font-medium">
                                Property:
                              </span>
                              <span className="font-bold text-slate-900">
                                {contractData.property_title}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                              <span className="text-slate-700 font-medium">
                                Total Property Price:
                              </span>
                              <span className="font-bold text-2xl text-blue-700">
                                {formatCurrency(propertyPrice)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Structure */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 10% Downpayment */}
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-6">
                            <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                              <DollarSign className="w-5 h-5" />
                              10% Downpayment (Your Responsibility)
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-purple-700">
                                  10% of {formatCurrencyShort(propertyPrice)}:
                                </span>
                                <span className="font-bold text-xl text-purple-900">
                                  {formatCurrency(tenPercentDownpayment)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                                <span className="text-sm text-purple-700">
                                  Less: Reservation Fee (Paid):
                                </span>
                                <span className="font-semibold text-green-700">
                                  -{formatCurrency(reservationFeePaid)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t-2 border-purple-300">
                                <span className="text-sm font-bold text-purple-900">
                                  Remaining to Pay:
                                </span>
                                <span className="font-bold text-xl text-purple-900">
                                  {formatCurrency(remainingDownpayment)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 90% Bank Financing */}
                          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-6">
                            <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                              <Building2 className="w-5 h-5" />
                              90% Bank Financing
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-green-700">
                                  90% of {formatCurrencyShort(propertyPrice)}:
                                </span>
                                <span className="font-bold text-xl text-green-900">
                                  {formatCurrency(ninetyPercentBankFinancing)}
                                </span>
                              </div>
                              <div className="mt-4 p-3 bg-white rounded-lg border border-green-300">
                                <p className="text-xs text-green-800">
                                  <strong>Note:</strong> This amount will be
                                  handled through bank financing. Payment terms
                                  will be subject to bank approval and their
                                  financing rates.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment Plan Input */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg p-6">
                          <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Choose Your Downpayment Payment Plan
                          </h4>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-amber-900 mb-2">
                                How many months do you want to pay the remaining
                                downpayment of{" "}
                                {formatCurrency(remainingDownpayment)}?
                              </label>
                              <div className="flex items-center gap-4">
                                <Input
                                  type="number"
                                  min="1"
                                  max="60"
                                  value={paymentMonths}
                                  onChange={(e) => {
                                    if (
                                      !createdContract ||
                                      isEditingPaymentPlan
                                    ) {
                                      const months =
                                        parseInt(e.target.value) || 1;
                                      setPaymentMonths(months);
                                      setMonthlyPayment(
                                        remainingDownpayment / months
                                      );
                                    }
                                  }}
                                  disabled={
                                    createdContract && !isEditingPaymentPlan
                                  }
                                  className={`w-32 text-lg font-bold text-center border-2 ${
                                    createdContract && !isEditingPaymentPlan
                                      ? "border-gray-300 bg-gray-100 cursor-not-allowed"
                                      : isEditingPaymentPlan
                                      ? "border-orange-400 bg-orange-50"
                                      : "border-amber-400"
                                  }`}
                                />
                                <span className="text-amber-900 font-medium">
                                  months
                                </span>

                                {/* Quick Select Buttons */}
                                <div className="flex gap-2 ml-auto">
                                  {[6, 12, 18, 24].map((months) => (
                                    <Button
                                      key={months}
                                      onClick={() => {
                                        if (
                                          !createdContract ||
                                          isEditingPaymentPlan
                                        ) {
                                          setPaymentMonths(months);
                                          setMonthlyPayment(
                                            remainingDownpayment / months
                                          );
                                        }
                                      }}
                                      variant={
                                        paymentMonths === months
                                          ? "default"
                                          : "outline"
                                      }
                                      className={`text-xs ${
                                        paymentMonths === months
                                          ? isEditingPaymentPlan
                                            ? "bg-orange-600"
                                            : "bg-amber-600"
                                          : ""
                                      } ${
                                        createdContract && !isEditingPaymentPlan
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      size="sm"
                                      disabled={
                                        createdContract && !isEditingPaymentPlan
                                      }
                                    >
                                      {months}m
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              {createdContract ? (
                                isEditingPaymentPlan ? (
                                  <div className="mt-2 p-3 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm text-orange-900 font-bold flex items-center gap-2 mb-1">
                                          ⚠️ Editing Payment Plan
                                        </p>
                                        <p className="text-xs text-orange-800">
                                          Original plan:{" "}
                                          <strong>
                                            {
                                              createdContract.contract
                                                ?.payment_plan_months
                                            }
                                            -months
                                          </strong>
                                        </p>
                                        <p className="text-xs text-orange-700 mt-1">
                                          Warning: Existing payment schedules
                                          will be deleted and regenerated.
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={async () => {
                                            if (!createdContract?.contract?.contract_id) {
                                              toast.error("Contract ID not found");
                                              return;
                                            }

                                            const contractId = createdContract.contract.contract_id;
                                            const oldMonths = createdContract.contract.payment_plan_months;

                                            // Step 1: Validate plan change first
                                            try {
                                              const validateResponse = await fetch(
                                                `/api/contracts/${contractId}/validate-plan-change`,
                                                {
                                                  method: "POST",
                                                  headers: {
                                                    "Content-Type": "application/json",
                                                  },
                                                  body: JSON.stringify({
                                                    new_payment_plan_months: paymentMonths,
                                                  }),
                                                }
                                              );

                                              const validateResult = await validateResponse.json();

                                              if (!validateResult.allowed) {
                                                toast.error(
                                                  "Plan change not allowed:\n" +
                                                    validateResult.validation_errors.join("\n")
                                                );
                                                return;
                                              }

                                              // Show warnings if any
                                              if (validateResult.warnings?.length > 0) {
                                                console.warn("Warnings:", validateResult.warnings);
                                              }

                                              // Step 2: Show confirmation with impact
                                              const monthlyDiff = validateResult.impact.monthly_payment_difference;
                                              const changePercent = validateResult.impact.monthly_payment_change_percent;

                                              if (
                                                !confirm(
                                                  `Are you sure you want to change the payment plan from ${oldMonths} to ${paymentMonths} months?\n\n` +
                                                    `Impact:\n` +
                                                    `- Old monthly payment: ₱${validateResult.current_plan.monthly_installment.toLocaleString()}\n` +
                                                    `- New monthly payment: ₱${validateResult.proposed_plan.monthly_installment.toLocaleString()}\n` +
                                                    `- Monthly difference: ₱${Math.abs(monthlyDiff).toLocaleString()} (${changePercent}%)\n\n` +
                                                    `This will:\n` +
                                                    `- Delete ${validateResult.impact.schedules_to_recalculate} pending payment schedule(s)\n` +
                                                    `- Generate ${paymentMonths} new monthly installments\n` +
                                                    `- Update the contract`
                                                )
                                              ) {
                                                return;
                                              }

                                              // Step 3: Execute plan change
                                              setCreatingContract(true);
                                              const changeResponse = await fetch(
                                                `/api/contracts/${contractId}/change-plan`,
                                                {
                                                  method: "POST",
                                                  headers: {
                                                    "Content-Type": "application/json",
                                                  },
                                                  body: JSON.stringify({
                                                    new_payment_plan_months: paymentMonths,
                                                    reason: `Payment plan changed from ${oldMonths} to ${paymentMonths} months`,
                                                  }),
                                                }
                                              );

                                              const changeResult = await changeResponse.json();

                                              if (changeResult.success) {
                                                toast.success(
                                                  `Payment plan updated to ${paymentMonths} months! Payment schedules have been regenerated.`
                                                );
                                                setIsEditingPaymentPlan(false);

                                                // Refresh contract data
                                                await checkExistingContract(contractData.reservation_id);
                                              } else {
                                                toast.error(
                                                  changeResult.message || "Failed to update payment plan"
                                                );
                                              }
                                            } catch (error) {
                                              console.error("Error changing payment plan:", error);
                                              toast.error("Error changing payment plan: " + error.message);
                                            } finally {
                                              setCreatingContract(false);
                                            }
                                          }}
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                          disabled={creatingContract}
                                        >
                                          {creatingContract ? (
                                            <>
                                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                              Saving...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Save
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            setIsEditingPaymentPlan(false);
                                            setPaymentMonths(
                                              createdContract.contract
                                                ?.payment_plan_months || 12
                                            );
                                          }}
                                          variant="outline"
                                          size="sm"
                                          className="border-red-500 text-red-700 hover:bg-red-50 text-xs"
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm text-blue-900 font-bold flex items-center gap-2 mb-1">
                                          🔒 Payment plan is locked
                                        </p>
                                        <p className="text-xs text-blue-800">
                                          Contract has been created with{" "}
                                          <strong>{paymentMonths}-month</strong>{" "}
                                          installment plan.
                                        </p>
                                      </div>
                                      <Button
                                        onClick={() => {
                                          setIsEditingPaymentPlan(true);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="border-blue-500 text-blue-700 hover:bg-blue-100 text-xs whitespace-nowrap"
                                      >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Change Plan
                                      </Button>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <p className="text-xs text-amber-700 mt-2">
                                  Choose between 1 to 60 months (5 years) to pay
                                  the remaining downpayment
                                </p>
                              )}
                            </div>

                            {/* Monthly Payment Calculation */}
                            <div className="bg-white border-2 border-amber-400 rounded-lg p-6">
                              <div className="text-center">
                                <p className="text-sm text-amber-800 font-semibold mb-2">
                                  YOUR MONTHLY PAYMENT FOR {paymentMonths}{" "}
                                  {paymentMonths === 1 ? "MONTH" : "MONTHS"}
                                </p>
                                <div className="text-4xl font-bold text-amber-900 mb-2">
                                  {formatCurrency(calculatedMonthly)}
                                </div>
                                <p className="text-xs text-amber-700">
                                  {formatCurrency(remainingDownpayment)} ÷{" "}
                                  {paymentMonths} months ={" "}
                                  {formatCurrency(calculatedMonthly)}/month
                                </p>
                              </div>
                            </div>

                            {/* Payment Schedule Preview */}
                            <div className="bg-white rounded-lg border border-amber-300 p-4">
                              <h5 className="font-semibold text-amber-900 mb-3 text-sm">
                                Payment Schedule Preview:
                              </h5>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                                  <span className="text-amber-700">
                                    Monthly Payment:
                                  </span>
                                  <span className="font-bold text-amber-900">
                                    {formatCurrency(calculatedMonthly)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                                  <span className="text-amber-700">
                                    Number of Months:
                                  </span>
                                  <span className="font-bold text-amber-900">
                                    {paymentMonths} months
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                                  <span className="text-amber-700">
                                    First Payment:
                                  </span>
                                  <span className="font-bold text-amber-900">
                                    {new Date(
                                      new Date().setMonth(
                                        new Date().getMonth() + 1
                                      )
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                                  <span className="text-amber-700">
                                    Final Payment:
                                  </span>
                                  <span className="font-bold text-amber-900">
                                    {new Date(
                                      new Date().setMonth(
                                        new Date().getMonth() + paymentMonths
                                      )
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Important Information */}
                        <div className="border-l-4 border-blue-500 bg-blue-50 p-6 rounded-r-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-blue-900 mb-2">
                                Payment Structure Summary
                              </h4>
                              <ul className="text-sm text-blue-800 space-y-2">
                                <li>
                                  ✓ <strong>Reservation Fee:</strong>{" "}
                                  {formatCurrency(reservationFeePaid)} - Already
                                  paid
                                </li>
                                <li>
                                  ✓ <strong>Remaining Downpayment:</strong>{" "}
                                  {formatCurrency(remainingDownpayment)} - To be
                                  paid in {paymentMonths} months (
                                  {formatCurrency(calculatedMonthly)}/month)
                                </li>
                                <li>
                                  ✓ <strong>Total Downpayment:</strong>{" "}
                                  {formatCurrency(tenPercentDownpayment)} (10%
                                  of property price)
                                </li>
                                <li>
                                  ✓ <strong>Bank Financing:</strong>{" "}
                                  {formatCurrency(ninetyPercentBankFinancing)}{" "}
                                  (90% of property price)
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Generate Contract Buttons */}
                        {!createdContract ? (
                          /* Show Create Contract Button if contract doesn't exist */
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-6">
                            <h4 className="font-bold text-green-900 mb-3 text-center">
                              Ready to Create Your Contract?
                            </h4>
                            <p className="text-sm text-green-800 mb-4 text-center">
                              You've selected a {paymentMonths}-month payment
                              plan with monthly payments of{" "}
                              {formatCurrency(calculatedMonthly)}
                            </p>
                            <Button
                              onClick={handleCreateContract}
                              disabled={creatingContract}
                              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-6"
                            >
                              {creatingContract ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Creating Contract...
                                </>
                              ) : (
                                <>
                                  <FileSignature className="mr-2 h-5 w-5" />
                                  Confirm & Create Contract
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-green-700 mt-3 text-center">
                              By clicking this button, you agree to the payment
                              terms and contract conditions
                            </p>
                          </div>
                        ) : (
                          /* Show Print/Download button if contract exists */
                          <>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-4 mb-4">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                                <div>
                                  <h4 className="font-bold text-blue-900">
                                    Contract Created Successfully!
                                  </h4>
                                  <p className="text-sm text-blue-800">
                                    Contract No:{" "}
                                    <strong>
                                      {
                                        createdContract.contract
                                          ?.contract_number
                                      }
                                    </strong>
                                  </p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    {createdContract.payment_schedules
                                      ?.length || 0}{" "}
                                    monthly payments scheduled
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Combined Print/Download Contract Button */}
                            <Button
                              onClick={() => {
                                try {
                                  // Use the same variables
                                  const propertyPrice =
                                    contractData.property_info
                                      ?.property_price || 0;
                                  const trackingNumber =
                                    contractData.tracking_number ||
                                    `TRK-${contractData.reservation_id
                                      ?.slice(0, 8)
                                      .toUpperCase()}`;
                                  const contractNumber = `CTS-${new Date().getFullYear()}-${trackingNumber.replace(
                                    "TRK-",
                                    ""
                                  )}`;
                                  const downpaymentTotal = propertyPrice * 0.1;
                                  const reservationFeePaid =
                                    contractData.reservation_fee || 0;
                                  const remainingDownpayment =
                                    downpaymentTotal - reservationFeePaid;
                                  const calculatedMonthly =
                                    remainingDownpayment / paymentMonths;
                                  const bankFinancing = propertyPrice * 0.9;
                                  const currentDate =
                                    new Date().toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    });

                                  // Generate HTML content for viewing and printing
                                  const contractContent = `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Contract to Sell - ${contractNumber}</title>
                            <meta charset="UTF-8">
                            <style>
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              body {
                                font-family: 'Times New Roman', Times, serif;
                                padding: 60px;
                                max-width: 900px;
                                margin: 0 auto;
                                background: white;
                                color: #000;
                                line-height: 1.8;
                                font-size: 12pt;
                              }
                              .document-header {
                                text-align: center;
                                margin-bottom: 40px;
                                border-bottom: 3px double #000;
                                padding-bottom: 20px;
                              }
                              .company-name {
                                font-size: 28px;
                                font-weight: bold;
                                margin-bottom: 5px;
                                letter-spacing: 2px;
                              }
                              .company-details {
                                font-size: 11px;
                                color: #333;
                              }
                              .document-title {
                                text-align: center;
                                font-size: 20px;
                                font-weight: bold;
                                margin: 30px 0;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                              }
                              .contract-number {
                                text-align: center;
                                font-size: 13px;
                                margin-bottom: 30px;
                                font-weight: bold;
                              }
                              .section-title {
                                font-size: 14px;
                                font-weight: bold;
                                margin-top: 25px;
                                margin-bottom: 15px;
                                text-transform: uppercase;
                                border-bottom: 2px solid #000;
                                padding-bottom: 5px;
                              }
                              .party-info {
                                margin: 20px 0;
                                padding: 15px;
                                background: #f9f9f9;
                                border-left: 4px solid #333;
                              }
                              .info-grid {
                                display: grid;
                                grid-template-columns: 200px 1fr;
                                gap: 10px;
                                margin: 10px 0;
                              }
                              .info-label {
                                font-weight: bold;
                              }
                              .info-value {
                                border-bottom: 1px solid #ccc;
                              }
                              .terms-list {
                                margin-left: 30px;
                                margin-bottom: 20px;
                              }
                              .terms-list li {
                                margin-bottom: 15px;
                                text-align: justify;
                              }
                              .payment-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin: 20px 0;
                              }
                              .payment-table th,
                              .payment-table td {
                                border: 1px solid #000;
                                padding: 10px;
                                text-align: left;
                              }
                              .payment-table th {
                                background: #f0f0f0;
                                font-weight: bold;
                              }
                              .amount-highlight {
                                font-weight: bold;
                                font-size: 14px;
                              }
                              .signature-section {
                                margin-top: 60px;
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 60px;
                              }
                              .signature-box {
                                text-align: center;
                              }
                              .signature-line {
                                border-top: 2px solid #000;
                                margin-top: 80px;
                                padding-top: 10px;
                              }
                              .signature-label {
                                font-size: 11px;
                                margin-bottom: 5px;
                                font-weight: bold;
                              }
                              .signature-name {
                                font-weight: bold;
                                margin-bottom: 5px;
                              }
                              .witness-section {
                                margin-top: 40px;
                                padding-top: 20px;
                                border-top: 2px solid #000;
                              }
                              .page-break {
                                page-break-before: always;
                                break-before: page;
                              }
                              @page {
                                size: 8.5in 13in;
                                margin: 1in;
                              }
                              @media print {
                                body {
                                  padding: 20px;
                                  font-size: 11pt;
                                }
                                .no-print { display: none; }
                              }
                            </style>
                          </head>
                          <body>
                            <!-- Header -->
                            <div class="document-header">
                              <div class="company-name">FUTURA HOMES</div>
                              <div class="company-details">
                                Office Address: [Your Complete Address Here]<br>
                                Contact: (XXX) XXX-XXXX | Email: info@futurahomes.com<br>
                                Business Registration No: [Registration Number]
                              </div>
                            </div>

                            <!-- Document Title -->
                            <div class="document-title">Contract to Sell</div>
                            <div class="contract-number">Contract No: ${contractNumber}</div>

                            <!-- Preamble -->
                            <p style="text-align: justify; margin-bottom: 20px;">
                              This <strong>CONTRACT TO SELL</strong> is entered into on this <strong>${currentDate}</strong>, in the Philippines, by and between:
                            </p>

                            <!-- Vendor Section -->
                            <div class="section-title">The Vendor</div>
                            <div class="party-info">
                              <p style="margin-bottom: 10px;"><strong>FUTURA HOMES</strong>, a duly registered real estate company organized and existing under Philippine laws, with principal office address at [Complete Address], hereinafter referred to as the <strong>"VENDOR"</strong>.</p>
                            </div>

                            <!-- Vendee Section -->
                            <div class="section-title">The Vendee / Buyer</div>
                            <div class="party-info">
                              <div class="info-grid">
                                <div class="info-label">Full Name:</div>
                                <div class="info-value">${
                                  contractData.client_name
                                }</div>

                                <div class="info-label">Residential Address:</div>
                                <div class="info-value">${
                                  contractData.client_address
                                }</div>

                                <div class="info-label">Contact Number:</div>
                                <div class="info-value">${
                                  contractData.client_phone
                                }</div>

                                <div class="info-label">Email Address:</div>
                                <div class="info-value">${
                                  contractData.client_email
                                }</div>
                              </div>
                              <p style="margin-top: 15px;">Hereinafter referred to as the <strong>"VENDEE"</strong> or <strong>"BUYER"</strong>.</p>
                            </div>

                            <!-- Witnesseth -->
                            <p style="text-align: center; font-weight: bold; margin: 30px 0 20px 0; font-size: 13px;">
                              W I T N E S S E T H :
                            </p>

                            <p style="text-align: justify; margin-bottom: 20px;">
                              WHEREAS, the VENDOR is the owner and/or authorized developer of certain real estate properties; and
                            </p>

                            <p style="text-align: justify; margin-bottom: 30px;">
                              WHEREAS, the VENDEE desires to purchase from the VENDOR, and the VENDOR agrees to sell to the VENDEE, the property described below, subject to the terms and conditions hereinafter set forth.
                            </p>

                            <!-- Property Description -->
                            <div class="section-title">Property Description</div>
                            <div class="party-info">
                              <div class="info-grid">
                                <div class="info-label">Property Name:</div>
                                <div class="info-value">${
                                  contractData.property_title || "N/A"
                                }</div>

                                <div class="info-label">Property ID:</div>
                                <div class="info-value">${
                                  contractData.property_id
                                    ?.slice(0, 8)
                                    .toUpperCase() || "N/A"
                                }</div>

                                <div class="info-label">Tracking Number:</div>
                                <div class="info-value">${trackingNumber}</div>
                              </div>
                            </div>

                            <!-- Purchase Price and Payment Terms -->
                            <div class="section-title">Purchase Price and Payment Terms</div>

                            <table class="payment-table">
                              <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount (PHP)</th>
                              </tr>
                              <tr>
                                <td><strong>Total Purchase Price</strong></td>
                                <td style="text-align: right;" class="amount-highlight">${formatCurrency(
                                  propertyPrice
                                )}</td>
                              </tr>
                              <tr style="background: #f0f0f0;">
                                <td colspan="2"><strong>PAYMENT STRUCTURE:</strong></td>
                              </tr>
                              <tr>
                                <td style="padding-left: 30px;"><strong>A. 10% Downpayment (Buyer's Responsibility)</strong></td>
                                <td style="text-align: right;" class="amount-highlight">${formatCurrency(
                                  downpaymentTotal
                                )}</td>
                              </tr>
                              <tr>
                                <td style="padding-left: 50px;">Reservation Fee (Paid on ${formatDate(
                                  contractData.updated_at ||
                                    contractData.created_at
                                )})</td>
                                <td style="text-align: right;">${formatCurrency(
                                  reservationFeePaid
                                )}</td>
                              </tr>
                              <tr>
                                <td style="padding-left: 50px;">Remaining Downpayment (${paymentMonths} monthly installments of ${formatCurrency(
                                    calculatedMonthly
                                  )})</td>
                                <td style="text-align: right;">${formatCurrency(
                                  remainingDownpayment
                                )}</td>
                              </tr>
                              <tr>
                                <td style="padding-left: 30px;"><strong>B. 90% Bank Financing</strong></td>
                                <td style="text-align: right;" class="amount-highlight">${formatCurrency(
                                  bankFinancing
                                )}</td>
                              </tr>
                            </table>

                            <p style="text-align: justify; margin: 20px 0;">
                              The VENDEE acknowledges the following payment structure:
                            </p>

                            <p style="text-align: justify; margin: 10px 0 10px 20px;">
                              <strong>1. Downpayment (10% of Purchase Price = ${formatCurrency(
                                downpaymentTotal
                              )}):</strong>
                            </p>
                            <ul style="margin-left: 40px; margin-bottom: 15px;">
                              <li>Reservation Fee of <strong>${formatCurrency(
                                reservationFeePaid
                              )}</strong> has been paid on ${formatDate(
                                    contractData.updated_at ||
                                      contractData.created_at
                                  )} as evidenced by Official Receipt.</li>
                              <li>Remaining Downpayment of <strong>${formatCurrency(
                                remainingDownpayment
                              )}</strong> shall be paid in <strong>${paymentMonths} monthly installments</strong> of <strong>${formatCurrency(
                                    calculatedMonthly
                                  )}</strong> per month.</li>
                              <li>Monthly payments shall commence one (1) month from the date of signing this contract.</li>
                            </ul>

                            <p style="text-align: justify; margin: 10px 0 10px 20px;">
                              <strong>2. Bank Financing (90% of Purchase Price = ${formatCurrency(
                                bankFinancing
                              )}):</strong>
                            </p>
                            <ul style="margin-left: 40px; margin-bottom: 15px;">
                              <li>The remaining <strong>90%</strong> of the purchase price shall be financed through bank loan/financing.</li>
                              <li>The VENDEE shall be responsible for securing bank approval and financing.</li>
                              <li>Bank financing terms, interest rates, and payment schedules shall be subject to the lending bank's policies.</li>
                              <li>The VENDEE agrees to process the bank loan application within a reasonable time frame.</li>
                            </ul>

                            <!-- Terms and Conditions -->
                            <div class="section-title page-break">Terms and Conditions</div>

                            <p style="margin-bottom: 15px;">
                              NOW, THEREFORE, for and in consideration of the foregoing premises, the parties hereby agree as follows:
                            </p>

                            <ol class="terms-list">
                              <li>
                                <strong>RESERVATION FEE:</strong> The VENDEE has paid the reservation fee as stated above to reserve the property. This fee shall form part of the total purchase price and is non-refundable once this contract is executed.
                              </li>

                              <li>
                                <strong>DOWNPAYMENT PAYMENT SCHEDULE:</strong> The VENDEE agrees to pay the remaining downpayment of <strong>${formatCurrency(
                                  remainingDownpayment
                                )}</strong> in <strong>${paymentMonths} equal monthly installments</strong> of <strong>${formatCurrency(
                                    calculatedMonthly
                                  )}</strong> per month, commencing one (1) month from the execution of this contract. Failure to comply with this payment schedule may result in the cancellation of this contract and forfeiture of all payments made.
                              </li>

                              <li>
                                <strong>BANK FINANCING:</strong> The VENDEE acknowledges that <strong>90% (${formatCurrency(
                                  bankFinancing
                                )})</strong> of the purchase price shall be financed through a bank loan/financing arrangement. The VENDEE shall be solely responsible for securing bank approval, complying with bank requirements, and fulfilling all obligations under the bank financing agreement. The VENDOR shall cooperate in providing necessary documents for the bank financing application.
                              </li>

                              <li>
                                <strong>TRANSFER OF OWNERSHIP:</strong> Ownership and title to the property shall be transferred to the VENDEE only upon: (a) full payment of the 10% downpayment (${formatCurrency(
                                  downpaymentTotal
                                )}), (b) approval and release of the 90% bank financing (${formatCurrency(
                                    bankFinancing
                                  )}), and (c) compliance with all terms and conditions of this contract and bank financing agreement.
                              </li>

                              <li>
                                <strong>DEFAULT:</strong> In case of default by the VENDEE in the payment of any installment or violation of any of the terms and conditions hereof, the VENDOR shall have the right to cancel this contract and forfeit all payments made as liquidated damages.
                              </li>

                              <li>
                                <strong>TAXES AND FEES:</strong> All taxes, registration fees, documentary stamp tax, transfer fees, and other charges incidental to the sale and transfer of the property shall be for the account of the VENDEE unless otherwise agreed upon.
                              </li>

                              <li>
                                <strong>WARRANTY:</strong> The VENDOR warrants that the property is free from any liens, encumbrances, or adverse claims, and has the legal right to sell the same.
                              </li>

                              <li>
                                <strong>POSSESSION:</strong> The VENDEE shall be entitled to possession of the property only upon full payment of the purchase price and execution of the Deed of Absolute Sale.
                              </li>

                              <li>
                                <strong>GOVERNING LAW:</strong> This contract shall be governed by and construed in accordance with the laws of the Republic of the Philippines.
                              </li>

                              <li>
                                <strong>ENTIRE AGREEMENT:</strong> This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements, whether written or oral, relating to the subject matter hereof.
                              </li>
                            </ol>

                            <!-- Signatures -->
                            <p style="text-align: justify; margin: 30px 0 20px 0;">
                              IN WITNESS WHEREOF, the parties have hereunto set their hands on the date and place first above written.
                            </p>

                            <div class="signature-section">
                              <div class="signature-box">
                                <div class="signature-line">
                                  <div class="signature-name">${
                                    contractData.client_name
                                  }</div>
                                  <div class="signature-label">VENDEE / BUYER</div>
                                  <div style="margin-top: 15px; font-size: 11px;">
                                    Date: _____________________
                                  </div>
                                </div>
                              </div>

                              <div class="signature-box">
                                <div class="signature-line">
                                  <div class="signature-name">FUTURA HOMES</div>
                                  <div class="signature-label">VENDOR</div>
                                  <div style="margin-top: 5px; font-size: 10px;">
                                    By: _____________________<br>
                                    Authorized Representative
                                  </div>
                                  <div style="margin-top: 10px; font-size: 11px;">
                                    Date: _____________________
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Witnesses -->
                            <div class="witness-section">
                              <p style="font-weight: bold; margin-bottom: 20px;">SIGNED IN THE PRESENCE OF:</p>

                              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px;">
                                <div>
                                  <div style="border-top: 2px solid #000; padding-top: 10px; margin-top: 60px;">
                                    <div style="font-weight: bold; text-align: center;">WITNESS #1</div>
                                    <div style="text-align: center; font-size: 11px; margin-top: 10px;">
                                      Signature Over Printed Name<br>
                                      Date: _____________________
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div style="border-top: 2px solid #000; padding-top: 10px; margin-top: 60px;">
                                    <div style="font-weight: bold; text-align: center;">WITNESS #2</div>
                                    <div style="text-align: center; font-size: 11px; margin-top: 10px;">
                                      Signature Over Printed Name<br>
                                      Date: _____________________
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Acknowledgment Section -->
                            <div class="page-break" style="margin-top: 60px; padding: 20px; border: 2px solid #000;">
                              <p style="text-align: center; font-weight: bold; margin-bottom: 15px;">ACKNOWLEDGMENT</p>
                              <p style="text-align: justify; font-size: 11px;">
                                REPUBLIC OF THE PHILIPPINES )<br>
                                <span style="margin-left: 220px;">)</span> S.S.<br>
                                _________________________________ )<br><br>

                                BEFORE ME, a Notary Public for and in _________________________________, this _____ day of _________________, 20____, personally appeared:
                              </p>

                              <table style="width: 100%; margin: 15px 0; font-size: 11px;">
                                <tr>
                                  <td style="padding: 5px; border-bottom: 1px solid #ccc;"><strong>Name</strong></td>
                                  <td style="padding: 5px; border-bottom: 1px solid #ccc;"><strong>ID Type & Number</strong></td>
                                  <td style="padding: 5px; border-bottom: 1px solid #ccc;"><strong>Date/Place Issued</strong></td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px;">${
                                    contractData.client_name
                                  }</td>
                                  <td style="padding: 8px;">_________________________</td>
                                  <td style="padding: 8px;">_________________________</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px;">Authorized Rep. (Futura Homes)</td>
                                  <td style="padding: 8px;">_________________________</td>
                                  <td style="padding: 8px;">_________________________</td>
                                </tr>
                              </table>

                              <p style="text-align: justify; font-size: 11px; margin-top: 15px;">
                                known to me and to me known to be the same persons who executed the foregoing instrument and acknowledged to me that the same is their free and voluntary act and deed.
                              </p>

                              <p style="text-align: justify; font-size: 11px; margin-top: 15px;">
                                WITNESS MY HAND AND SEAL on the date and place first above written.
                              </p>

                              <div style="margin-top: 40px; text-align: center;">
                                <div style="border-top: 2px solid #000; width: 300px; margin: 0 auto; padding-top: 10px;">
                                  <div style="font-weight: bold;">NOTARY PUBLIC</div>
                                  <div style="font-size: 10px; margin-top: 10px;">
                                    Doc. No. _______<br>
                                    Page No. _______<br>
                                    Book No. _______<br>
                                    Series of 20____
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Footer -->
                            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 15px;">
                              Contract No: ${contractNumber} | Generated: ${currentDate}<br>
                              © ${new Date().getFullYear()} Futura Homes. All Rights Reserved.
                            </div>
                          </body>
                        </html>
                      `;

                                  // Store the HTML in state and open view modal
                                  setContractPreviewHtml(contractContent);
                                  openContractViewModal();

                                  toast.success(
                                    "Contract is ready for viewing and printing",
                                    {
                                      autoClose: 3000,
                                    }
                                  );
                                } catch (error) {
                                  console.error(
                                    "Error opening contract:",
                                    error
                                  );
                                  toast.error(
                                    "Failed to open contract: " + error.message
                                  );
                                }
                              }}
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-6"
                            >
                              <FileText className="mr-2 h-5 w-5" />
                              View / Print Contract
                            </Button>
                          </>
                        )}
                        {/* Display Payment Schedule if Contract Exists */}
                        {createdContract &&
                          createdContract.payment_schedules &&
                          createdContract.payment_schedules.length > 0 && (
                            <div className="mt-6 bg-white border-2 border-blue-200 rounded-lg p-6">
                              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Payment Schedule (
                                {createdContract.payment_schedules.length}{" "}
                                Installments)
                              </h4>
                              <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-blue-50 sticky top-0">
                                    <tr>
                                      <th className="text-left p-2 border-b">
                                        #
                                      </th>
                                      <th className="text-left p-2 border-b">
                                        Due Date
                                      </th>
                                      <th className="text-right p-2 border-b">
                                        Amount
                                      </th>
                                      <th className="text-center p-2 border-b">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {createdContract.payment_schedules.map(
                                      (schedule, index) => (
                                        <tr
                                          key={schedule.schedule_id}
                                          className={
                                            index % 2 === 0
                                              ? "bg-white"
                                              : "bg-blue-50"
                                          }
                                        >
                                          <td className="p-2 border-b">
                                            {schedule.installment_number}
                                          </td>
                                          <td className="p-2 border-b">
                                            {new Date(
                                              schedule.due_date
                                            ).toLocaleDateString("en-US", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </td>
                                          <td className="p-2 border-b text-right font-semibold">
                                            {formatCurrency(
                                              schedule.scheduled_amount
                                            )}
                                          </td>
                                          <td className="p-2 border-b text-center">
                                            <span
                                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                schedule.payment_status ===
                                                "paid"
                                                  ? "bg-green-100 text-green-800"
                                                  : schedule.is_overdue
                                                  ? "bg-red-100 text-red-800"
                                                  : "bg-yellow-100 text-yellow-800"
                                              }`}
                                            >
                                              {schedule.payment_status}
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-4 pt-4 border-t border-blue-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">
                                      Total Contract:
                                    </span>
                                    <span className="font-bold ml-2">
                                      {formatCurrency(
                                        createdContract.contract
                                          ?.total_contract_price
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">
                                      Remaining Balance:
                                    </span>
                                    <span className="font-bold ml-2 text-red-600">
                                      {formatCurrency(
                                        Math.max(0, createdContract.contract?.remaining_balance || 0)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                      </>
                    );
                  })()}
                </div>

                {/* Removal of old contract info display - replaced with form */}
                <div className="space-y-6 hidden">
                  {/* Contract Details */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-4 text-lg flex items-center gap-2">
                      <FileSignature className="w-5 h-5" />
                      Contract Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">
                          Contract Number
                        </p>
                        <p className="font-mono font-bold text-blue-900">
                          CTS-{new Date().getFullYear()}-
                          {(
                            contractData.tracking_number ||
                            `TRK-${contractData.reservation_id
                              ?.slice(0, 8)
                              .toUpperCase()}`
                          ).replace("TRK-", "")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">
                          Issue Date
                        </p>
                        <p className="font-semibold text-blue-900">
                          {new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">
                          Tracking Number
                        </p>
                        <p className="font-mono font-bold text-blue-900">
                          {contractData.tracking_number ||
                            `TRK-${contractData.reservation_id
                              ?.slice(0, 8)
                              .toUpperCase()}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">
                          Status
                        </p>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Approved & Ready
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Information */}
                  <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-lg border-b pb-2">
                      Buyer Information (Vendee)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Full Name</p>
                        <p className="font-semibold text-slate-900">
                          {contractData.client_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Email Address</p>
                        <p className="font-semibold text-slate-900">
                          {contractData.client_email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Contact Number</p>
                        <p className="font-semibold text-slate-900">
                          {contractData.client_phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">
                          Residential Address
                        </p>
                        <p className="font-semibold text-slate-900">
                          {contractData.client_address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Property Information */}
                  <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-lg border-b pb-2">
                      Property Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-500">Property Name</p>
                        <p className="font-bold text-slate-900 text-lg">
                          {contractData.property_title || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Property ID</p>
                        <p className="font-mono font-semibold text-slate-900">
                          {contractData.property_id
                            ?.slice(0, 8)
                            .toUpperCase() || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-4 text-lg border-b border-green-300 pb-2">
                      Financial Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-green-200">
                        <span className="text-slate-700 font-semibold">
                          Total Purchase Price:
                        </span>
                        <span className="font-bold text-xl text-blue-700">
                          {formatCurrency(
                            contractData.property_info?.property_price || 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-green-200">
                        <span className="text-slate-700">
                          Less: Reservation Fee (Paid):
                        </span>
                        <span className="font-bold text-green-700">
                          {formatCurrency(contractData.reservation_fee || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-900 font-bold text-lg">
                          Remaining Balance:
                        </span>
                        <span className="font-bold text-2xl text-red-700">
                          {formatCurrency(
                            (contractData.property_info?.property_price || 0) -
                              (contractData.reservation_fee || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="border border-slate-200 rounded-lg p-6">
                    <h3 className="font-semibold text-slate-800 mb-4 text-lg border-b pb-2">
                      Payment History
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">
                          Reservation Fee Payment:
                        </span>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Paid
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Amount Paid:
                        </span>
                        <span className="font-bold text-green-700">
                          {formatCurrency(contractData.reservation_fee || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          Payment Date:
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatDate(
                            contractData.updated_at || contractData.created_at
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Terms Preview */}
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
                    <h3 className="font-semibold text-amber-900 mb-4 text-lg border-b border-amber-300 pb-2">
                      Key Contract Terms
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          The reservation fee of{" "}
                          {formatCurrency(contractData.reservation_fee || 0)}{" "}
                          has been paid and is non-refundable.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          The remaining balance shall be payable according to
                          mutually agreed payment terms.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          Transfer of ownership occurs only upon full payment
                          and compliance with all terms.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          All taxes, fees, and charges incidental to the sale
                          are for the buyer's account.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          Property is warranted free from liens, encumbrances,
                          or adverse claims.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Important Notice */}
                  <div className="border-l-4 border-red-500 bg-red-50 p-6 rounded-r-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-900 mb-2">
                          Important Notice
                        </h4>
                        <p className="text-sm text-red-800">
                          This contract preview is generated from the approved
                          reservation. Please review all details carefully
                          before printing. The contract should be reviewed by
                          both parties and signed in the presence of witnesses.
                          Notarization is required to make this contract legally
                          binding. For any corrections or modifications, please
                          contact Futura Homes administration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract View Modal */}
      <AnimatePresence>
        {showContractViewModal && contractPreviewHtml && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowContractViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl"
            >
              {/* Modern Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white px-8 py-5 flex justify-between items-center border-b border-red-900/20 z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-wide">Contract Preview</h2>
                    <p className="text-xs text-red-100 mt-0.5">Review your contract to sell document</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContractViewModal(false)}
                  className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
                  title="Close preview"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Contract Preview Container */}
              <div className="overflow-y-auto max-h-[calc(95vh-180px)] bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <div
                  className="bg-white shadow-lg rounded-lg p-10"
                  dangerouslySetInnerHTML={{
                    __html: contractPreviewHtml,
                  }}
                />
              </div>

              {/* Modern Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-6 flex gap-4 justify-between items-center z-10 shadow-md">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Document is ready for review and printing</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowContractViewModal(false)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg border border-gray-300 transition-all duration-200 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Close
                  </button>
                  <button
                    onClick={handlePrintContract}
                    className="inline-flex items-center gap-2 px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print / Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
