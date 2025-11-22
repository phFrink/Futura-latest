"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Download,
  Printer,
  Eye,
  Loader2,
  DollarSign,
  Calendar,
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
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

export default function ContractToSell() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          // Load contracts for this user
          await loadContracts(user.id);
        } else {
          // No user logged in, load all contracts
          await loadContracts();
        }
      } catch (error) {
        console.error("Error getting current user:", error);
        // If error occurs, just load all contracts
        await loadContracts();
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, contracts]);

  const loadContracts = async (userId) => {
    setLoading(true);
    try {
      // Build URL with user_id if available
      const url = userId ? `/api/contracts?user_id=${userId}` : "/api/contracts";
      const response = await fetch(url);
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          contract.contract_number
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          contract.client?.client_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          contract.property?.property_title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (contract) => contract.contract_status === statusFilter
      );
    }

    setFilteredContracts(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  const formatCurrencyShort = (amount) => {
    if (amount >= 1000000) {
      return `₱${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `₱${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        label: "Active",
      },
      completed: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
        label: "Completed",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle,
        label: "Cancelled",
      },
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
        label: "Pending",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paidAmount, totalAmount) => {
    const percentage = (paidAmount / totalAmount) * 100;

    if (percentage >= 100) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 border">
          <CheckCircle className="w-3 h-3 mr-1" />
          Fully Paid
        </Badge>
      );
    } else if (percentage >= 50) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
          <Clock className="w-3 h-3 mr-1" />
          {percentage.toFixed(0)}% Paid
        </Badge>
      );
    } else if (percentage > 0) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border">
          <Clock className="w-3 h-3 mr-1" />
          {percentage.toFixed(0)}% Paid
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 border">
          <AlertCircle className="w-3 h-3 mr-1" />
          No Payment
        </Badge>
      );
    }
  };

  const calculateProgress = (paidAmount, totalAmount) => {
    const percentage = Math.min((paidAmount / totalAmount) * 100, 100);
    return percentage;
  };

  const handlePrintContract = (contract) => {
    handlePrintDownloadContract(contract);
  };

  const handleDownloadContract = (contract) => {
    handlePrintDownloadContract(contract);
  };

  const handlePrintDownloadContract = (contract) => {
    try {
      // Use the same variables
      const propertyPrice = contract.property_price || 0;
      const trackingNumber =
        contract.tracking_number ||
        `TRK-${contract.reservation_id?.slice(0, 8).toUpperCase()}`;
      const contractNumber = `CTS-${new Date().getFullYear()}-${trackingNumber.replace(
        "TRK-",
        ""
      )}`;
      const paymentMonths = contract.payment_plan_months || 12;
      const downpaymentTotal = propertyPrice * 0.1;
      const reservationFeePaid = contract.reservation_fee_paid || 0;
      const remainingDownpayment = downpaymentTotal - reservationFeePaid;
      const calculatedMonthly = remainingDownpayment / paymentMonths;
      const bankFinancing = propertyPrice * 0.9;
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Generate HTML content
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
                                                          contract.client_name
                                                        }</div>
                        
                                                        <div class="info-label">Residential Address:</div>
                                                        <div class="info-value">${
                                                          contract.client_address
                                                        }</div>
                        
                                                        <div class="info-label">Contact Number:</div>
                                                        <div class="info-value">${
                                                          contract.client_phone
                                                        }</div>
                        
                                                        <div class="info-label">Email Address:</div>
                                                        <div class="info-value">${
                                                          contract.client_email
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
                                                          contract.property_title ||
                                                          "N/A"
                                                        }</div>
                        
                                                        <div class="info-label">Property ID:</div>
                                                        <div class="info-value">${
                                                          contract.property_id
                                                            ?.slice(0, 8)
                                                            .toUpperCase() ||
                                                          "N/A"
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
                                                          contract.updated_at ||
                                                            contract.created_at
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
        contract.updated_at || contract.created_at
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
                                                            contract.client_name
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
                                                            contract.client_name
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

      // Open in new window for PDF download
      const pdfWindow = window.open("", "_blank");

      // Add download instruction banner (hidden when printing)
      const downloadBanner = `
                                                  <style>
                                                    @media print {
                                                      .download-banner, .banner-spacer { display: none !important; }
                                                    }
                                                    .guide-popup {
                                                      display: none;
                                                      position: fixed;
                                                      top: 50%;
                                                      left: 50%;
                                                      transform: translate(-50%, -50%);
                                                      background: white;
                                                      padding: 20px;
                                                      border-radius: 12px;
                                                      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                                                      z-index: 10000;
                                                      max-width: 90%;
                                                      max-height: 90vh;
                                                      overflow: auto;
                                                    }
                                                    .guide-overlay {
                                                      display: none;
                                                      position: fixed;
                                                      top: 0;
                                                      left: 0;
                                                      right: 0;
                                                      bottom: 0;
                                                      background: rgba(0,0,0,0.5);
                                                      z-index: 9999;
                                                    }
                                                    .guide-popup.active, .guide-overlay.active {
                                                      display: block;
                                                    }
                                                  </style>
                                                  <div class="download-banner" style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px; text-align: center; z-index: 9999; font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                                    <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px;">
                                                      <strong style="font-size: 16px;">To Download as PDF:</strong>
                                                      <span style="font-size: 14px;">Press Ctrl+P (or Cmd+P on Mac), select "Save as PDF" → Click Save</span>
                                                      <button onclick="window.print()" style="background: white; color: #10b981; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s;">
                                                        Download PDF Now
                                                      </button>
                                                      <button onclick="document.querySelector('.guide-popup').classList.add('active'); document.querySelector('.guide-overlay').classList.add('active');" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.3s;">
                                                        View Guide
                                                      </button>
                                                      <button onclick="this.closest('.download-banner').remove(); document.querySelector('.banner-spacer').remove();" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                                                        ✕
                                                      </button>
                                                    </div>
                                                  </div>
                                                  <div class="banner-spacer" style="height: 90px;"></div>
                        
                                                  <!-- Guide Popup -->
                                                  <div class="guide-overlay" onclick="this.classList.remove('active'); document.querySelector('.guide-popup').classList.remove('active');"></div>
                                                  <div class="guide-popup">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
                                                      <h2 style="margin: 0; color: #10b981; font-size: 20px;">📖 How to Download Contract as PDF</h2>
                                                      <button onclick="this.closest('.guide-popup').classList.remove('active'); document.querySelector('.guide-overlay').classList.remove('active');" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                                        ✕ Close
                                                      </button>
                                                    </div>
                                                    <div style="text-align: center;">
                                                      <img src="https://res.cloudinary.com/dzmmibxoq/image/upload/v1761149253/guidepdfdownload_gueifd.png"
                                                           alt="PDF Download Guide"
                                                           style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
                                                      <div style="margin-top: 20px; text-align: left; color: #333; line-height: 1.8;">
                                                        <h3 style="color: #10b981; margin-bottom: 10px;">📋 Step-by-Step Instructions:</h3>
                                                        <ol style="padding-left: 20px;">
                                                          <li style="margin-bottom: 10px;"><strong>Step 1:</strong> Click the green <strong>"Download PDF Now"</strong> button at the top</li>
                                                          <li style="margin-bottom: 10px;"><strong>Step 2:</strong> In the print dialog, find <strong>"Destination"</strong> or <strong>"Printer"</strong></li>
                                                          <li style="margin-bottom: 10px;"><strong>Step 3:</strong> Select <strong>"Save as PDF"</strong> or <strong>"Microsoft Print to PDF"</strong></li>
                                                          <li style="margin-bottom: 10px;"><strong>Step 4:</strong> Click <strong>"Save"</strong> button</li>
                                                          <li style="margin-bottom: 10px;"><strong>Step 5:</strong> Choose where to save the file and click <strong>"Save"</strong></li>
                                                        </ol>
                                                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 15px; border-radius: 6px;">
                                                          <strong style="color: #92400e;">💡 Tip:</strong>
                                                          <span style="color: #78350f;"> The filename will be automatically suggested as "Contract_to_Sell_[contract_number]"</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                `;

      // Inject download banner before body content
      const modifiedContent = contractContent.replace(
        "<body>",
        "<body>" + downloadBanner
      );

      pdfWindow.document.write(modifiedContent);
      pdfWindow.document.close();

      // Set title for PDF filename
      pdfWindow.document.title = `Contract_to_Sell_${contractNumber}`;

      toast.success(
        "Contract opened! Click 'Download PDF Now' or 'View Guide' for help",
        {
          autoClose: 6000,
        }
      );
    } catch (error) {
      console.error("Error opening contract:", error);
      toast.error("Failed to open contract: " + error.message);
    }
  };

  const handlePreviewContract = (contract) => {
    setSelectedContract(contract);
    setShowPreviewModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedSchedule(null);
    loadContracts(); // Reload contracts to get updated data
    toast.success("Payment processed successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Contracts
          </h1>
          <p className="text-slate-600 mt-1">
            Manage and track all property contracts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total Contracts: {filteredContracts.length}
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active</p>
                <p className="text-2xl font-bold text-green-900">
                  {
                    contracts.filter((c) => c.contract_status === "active")
                      .length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Completed</p>
                <p className="text-2xl font-bold text-blue-900">
                  {
                    contracts.filter((c) => c.contract_status === "completed")
                      .length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {
                    contracts.filter((c) => c.contract_status === "pending")
                      .length
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">
                  Total Value
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrencyShort(
                    contracts.reduce(
                      (sum, c) => sum + (c.total_contract_price || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search by contract number, client name, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No contracts found</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Contract #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Contract Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredContracts.map((contract, index) => (
                  <motion.tr
                    key={contract.contract_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Contract Number */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="font-mono font-bold text-slate-900">
                          {contract.contract_number}
                        </span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {contract.client_name || "-"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {contract.client_email || ""}
                        </div>
                      </div>
                    </td>

                    {/* Property */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {contract.property?.property_title || "-"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(contract.total_contract_price)}
                      </div>
                    </td>

                    {/* Contract Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(contract.contract_status)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* <Button
                          onClick={() => handlePreviewContract(contract)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                          title="Preview Contract"
                        >
                          <Eye className="h-3 w-3" />
                        </Button> */}
                        <Button
                          onClick={() => handlePrintContract(contract)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-xs"
                          title="Print Contract"
                        >
                          <Printer className="h-3 w-3" /> /{" "}
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedContract && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Contract Preview
                    </h2>
                    <p className="text-slate-600 mt-1">
                      {selectedContract.contract_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handlePrintContract(selectedContract)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      onClick={() => handleDownloadContract(selectedContract)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setShowPreviewModal(false)}
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Contract Header */}
                <div className="text-center border-b-2 border-blue-600 pb-6">
                  <h1 className="text-3xl font-bold text-blue-900">
                    CONTRACT TO SELL
                  </h1>
                  <div className="text-xl text-slate-600 mt-2">
                    {selectedContract.contract_number}
                  </div>
                  <div className="text-slate-500 mt-2">
                    Date: {formatDate(selectedContract.contract_date)}
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-blue-900 mb-2">
                      VENDOR (Seller)
                    </h3>
                    <p className="text-slate-900">
                      {selectedContract.vendor_name || "Futura Homes"}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-bold text-green-900 mb-2">
                      VENDEE (Buyer)
                    </h3>
                    <p className="text-slate-900">
                      {selectedContract.client_name || "-"}
                    </p>
                  </div>
                </div>

                {/* Client Information */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">
                    Client Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Full Name</p>
                      <p className="font-medium">
                        {selectedContract.client_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">
                        {selectedContract.client_email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium">
                        {selectedContract.client_phone || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Address</p>
                      <p className="font-medium">
                        {selectedContract.client_address || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">
                    Property Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Property Title</p>
                      <p className="font-medium">
                        {selectedContract.property?.property_title || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Property Price</p>
                      <p className="font-medium">
                        {formatCurrency(selectedContract.total_contract_price)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Structure */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">
                    Payment Structure
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Total Contract Price
                      </span>
                      <span className="font-bold">
                        {formatCurrency(selectedContract.total_contract_price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Downpayment (
                        {(
                          (selectedContract.downpayment /
                            selectedContract.total_contract_price) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                      <span className="font-bold text-purple-600">
                        {formatCurrency(selectedContract.downpayment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Monthly Payment ({selectedContract.payment_plan_months}{" "}
                        months)
                      </span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(selectedContract.monthly_payment)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-bold text-slate-900">
                        Total Amount Paid
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(selectedContract.total_amount_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-900">
                        Remaining Balance
                      </span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(selectedContract.balance_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Schedule */}
                {selectedContract.payment_schedules &&
                  selectedContract.payment_schedules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b flex items-center justify-between">
                        <span>Payment Schedule</span>
                        <Badge variant="outline">
                          {selectedContract.payment_schedules.length}{" "}
                          Installments
                        </Badge>
                      </h3>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-3 border-b">#</th>
                              <th className="text-left p-3 border-b">
                                Due Date
                              </th>
                              <th className="text-right p-3 border-b">
                                Amount
                              </th>
                              <th className="text-right p-3 border-b">Paid</th>
                              <th className="text-right p-3 border-b">
                                Balance
                              </th>
                              <th className="text-center p-3 border-b">
                                Status
                              </th>
                              <th className="text-center p-3 border-b">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedContract.payment_schedules.map(
                              (schedule) => (
                                <tr
                                  key={schedule.schedule_id}
                                  className="border-b hover:bg-slate-50"
                                >
                                  <td className="p-3">
                                    {schedule.installment_number}
                                  </td>
                                  <td className="p-3">
                                    {formatDate(schedule.due_date)}
                                  </td>
                                  <td className="p-3 text-right">
                                    {formatCurrency(
                                      schedule.installment_amount
                                    )}
                                  </td>
                                  <td className="p-3 text-right text-green-600">
                                    {formatCurrency(schedule.paid_amount)}
                                  </td>
                                  <td className="p-3 text-right text-red-600">
                                    {formatCurrency(schedule.remaining_amount)}
                                  </td>
                                  <td className="p-3 text-center">
                                    {schedule.payment_status === "paid" ? (
                                      <Badge className="bg-green-100 text-green-800">
                                        Paid
                                      </Badge>
                                    ) : schedule.payment_status ===
                                      "partial" ? (
                                      <Badge className="bg-yellow-100 text-yellow-800">
                                        Partial
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-800">
                                        Pending
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {schedule.payment_status !== "paid" && (
                                      <Button
                                        onClick={() => {
                                          setSelectedSchedule(schedule);
                                          setShowPaymentModal(true);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                                      >
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Contract Dates */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">
                    Contract Dates
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">Contract Date</p>
                      <p className="font-bold text-blue-900">
                        {formatDate(selectedContract.contract_date)}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-700">Start Date</p>
                      <p className="font-bold text-green-900">
                        {formatDate(selectedContract.payment_start_date)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-700">End Date</p>
                      <p className="font-bold text-purple-900">
                        {formatDate(selectedContract.payment_end_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                {selectedContract.terms_and_conditions && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                    <h4 className="font-bold text-amber-900 mb-2">
                      Terms and Conditions
                    </h4>
                    <p className="text-amber-800 text-sm">
                      {selectedContract.terms_and_conditions}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk-in Payment Modal */}
      {showPaymentModal && selectedSchedule && (
        <WalkInPaymentModal
          schedule={selectedSchedule}
          contract={selectedContract}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
