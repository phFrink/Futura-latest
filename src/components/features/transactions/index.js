"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Download,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  generateTransactionReceipt,
  generateDateRangeReceipt,
} from "@/lib/receipt-generator";

// Define all available payment methods
const PAYMENT_METHODS = [
  "cash",
  "check",
  "bank transfer",
  "credit card",
  "debit card",
  "online payment",
  "gcash",
  "paymaya",
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [contractId, setContractId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClients, setSelectedClients] = useState(new Set());

  // Column visibility and pagination states
  const [visibleColumns, setVisibleColumns] = useState({
    transactionId: true,
    clientName: true,
    contractId: true,
    date: true,
    amount: true,
    penalty: true,
    method: true,
    processedBy: true,
    status: true,
    actions: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [
    transactions,
    startDate,
    endDate,
    paymentStatus,
    paymentMethod,
    contractId,
    searchTerm,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch contract payment transactions from API
      const response = await fetch("/api/contracts/payment/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const result = await response.json();

      if (!result.success) {
        console.error("Error loading transactions:", result.error);
        toast.error(result.error || "Failed to load transactions");
        throw new Error(result.error);
      }

      setTransactions(result.data || []);
      console.log("✅ Loaded", result.data.length, "transactions");
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate <= new Date(endDate);
      });
    }

    // Filter by payment status
    if (paymentStatus !== "all") {
      filtered = filtered.filter((t) => t.payment_status === paymentStatus);
    }

    // Filter by payment method
    if (paymentMethod !== "all") {
      filtered = filtered.filter((t) => t.payment_method === paymentMethod);
    }

    // Filter by contract ID
    if (contractId !== "all") {
      filtered = filtered.filter(
        (t) => t.contract_id?.toString() === contractId
      );
    }

    // Filter by search term (transaction_id, client_name, contract_id)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      // Debug: Log first transaction structure
      if (filtered.length > 0) {
        console.log("Sample transaction:", filtered[0]);
        console.log("Available fields:", Object.keys(filtered[0]));
      }

      filtered = filtered.filter((t) => {
        // Check transaction_id, client_name, and contract_id fields
        const transactionId = (
          t.transaction_id?.toString() || ""
        ).toLowerCase();

        const clientName = (
          t.property_contracts?.client_name || ""
        ).toLowerCase();
        const contractIdStr = (t.contract_id?.toString() || "").toLowerCase();

        const matches =
          transactionId.includes(searchLower) ||
          clientName.includes(searchLower) ||
          contractIdStr.includes(searchLower);

        // Debug: Log what we're comparing (only for long searches like UUIDs)
        if (searchLower.length > 10 && transactionId) {
          console.log("Searching for:", searchLower);
          console.log("Checking transaction_id:", transactionId);
          console.log("Checking client_name:", clientName);
          console.log("Checking contract_id:", contractIdStr);
          console.log("Match found:", matches);
        }

        return matches;
      });
    }

    setFilteredTransactions(filtered);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setPaymentStatus("all");
    setPaymentMethod("all");
    setContractId("all");
    setSearchTerm("");
    setSelectedClients(new Set());
    setCurrentPage(1);
  };

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Generate individual receipt
  const handleGenerateReceipt = async (transactionId, action = "download") => {
    try {
      toast.info("Generating receipt...");

      const response = await fetch(
        `/api/transactions/receipt?transaction_id=${transactionId}`
      );
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || "Failed to generate receipt");
        return;
      }

      // Generate PDF
      const doc = generateTransactionReceipt(result.data);

      if (action === "print") {
        // Open print dialog
        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank");
        toast.success("Opening print dialog...");
      } else {
        // Download PDF
        doc.save(`receipt-${transactionId}.pdf`);
        toast.success("Receipt downloaded successfully!");
      }
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast.error("Failed to generate receipt");
    }
  };

  // Generate date range receipt (filtered by selected clients)
  const handleGenerateDateRangeReceipt = async (action = "download") => {
    try {
      // If multiple clients selected, use bulk print logic
      if (selectedClients.size > 1) {
        handleBulkPrintByClients(action);
        return;
      }

      // If single client selected, filter by that client
      if (selectedClients.size === 1) {
        const selectedClientName = Array.from(selectedClients)[0];
        const clientTransactions = filteredTransactions.filter(
          (t) => t.property_contracts?.client_name === selectedClientName
        );

        if (clientTransactions.length === 0) {
          toast.error("No transactions found for the selected client");
          return;
        }

        toast.info("Generating receipt...");

        // Generate PDF with filtered transactions
        const doc = generateDateRangeReceipt(
          clientTransactions,
          startDate,
          endDate
        );

        if (action === "print") {
          doc.autoPrint();
          window.open(doc.output("bloburl"), "_blank");
          toast.success("Opening print dialog...");
        } else {
          const filename = `transaction-${selectedClientName}-${startDate || "start"}-to-${
            endDate || "end"
          }.pdf`;
          doc.save(filename);
          toast.success("Receipt downloaded successfully!");
        }
        return;
      }

      // If no client selected, show error
      toast.error(
        "Please select a client to print/download. Select one for single person report or multiple for bulk."
      );
    } catch (error) {
      console.error("Error generating date range receipt:", error);
      toast.error("Failed to generate receipt");
    }
  };

  // Handle bulk print for multiple clients
  const handleBulkPrintByClients = async (action = "download") => {
    try {
      toast.info("Generating bulk receipts...");

      const selectedClientNames = Array.from(selectedClients);
      const docs = [];

      // Generate a separate PDF for each selected client
      for (const clientName of selectedClientNames) {
        const clientTransactions = filteredTransactions.filter(
          (t) => t.property_contracts?.client_name === clientName
        );

        if (clientTransactions.length > 0) {
          const doc = generateDateRangeReceipt(
            clientTransactions,
            startDate,
            endDate
          );
          docs.push({ doc, clientName });
        }
      }

      if (docs.length === 0) {
        toast.error("No transactions found for selected clients");
        return;
      }

      if (action === "print") {
        // Open each document for printing in separate windows
        docs.forEach(({ doc }, index) => {
          setTimeout(() => {
            doc.autoPrint();
            window.open(doc.output("bloburl"), "_blank");
          }, index * 500); // Stagger window opens
        });
        toast.success(
          `Opening ${docs.length} print dialog${docs.length > 1 ? "s" : ""}...`
        );
      } else {
        // For bulk download, create a single file with all clients
        // Using the first doc as base and appending others
        let mergedDoc = docs[0].doc;

        for (let i = 1; i < docs.length; i++) {
          // Add new page and merge
          const pageCount = docs[i].doc.internal.pages.length - 1;
          for (let p = 1; p <= pageCount; p++) {
            mergedDoc.addPage();
            const pageSize = docs[i].doc.internal.pageSize;
            const imgData = docs[i].doc.internal.pages[p].getDrawing();
            mergedDoc.internal.pages[mergedDoc.internal.pages.length - 1] =
              imgData;
          }
        }

        const filename = `transaction-bulk-${startDate || "start"}-to-${
          endDate || "end"
        }.pdf`;
        mergedDoc.save(filename);
        toast.success(
          `Bulk receipt with ${docs.length} client${docs.length > 1 ? "s" : ""} downloaded!`
        );
      }
    } catch (error) {
      console.error("Error generating bulk receipt:", error);
      toast.error("Failed to generate bulk receipt");
    }
  };

  // Toggle client selection for bulk print
  const toggleClientSelection = (clientName) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientName)) {
      newSelected.delete(clientName);
    } else {
      newSelected.add(clientName);
    }
    setSelectedClients(newSelected);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Calculate summary statistics
  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + parseFloat(t.total_amount || 0),
    0
  );
  const totalPenalties = filteredTransactions.reduce(
    (sum, t) => sum + parseFloat(t.penalty_paid || 0),
    0
  );
  const completedCount = filteredTransactions.filter(
    (t) => t.payment_status === "completed"
  ).length;

  // Get unique clients for bulk print selection
  const uniqueClients = [
    ...new Map(
      transactions.map((t) => [
        t.property_contracts?.client_name,
        {
          name: t.property_contracts?.client_name,
          phone: t.property_contracts?.client_phone,
        },
      ])
    ).values(),
  ].filter((c) => c.name);

  // Use predefined payment methods (always show all available methods)
  const uniquePaymentMethods = PAYMENT_METHODS;

  // Get unique contract IDs for filter
  const uniqueContractIds = [
    ...new Set(transactions.map((t) => t.contract_id).filter(Boolean)),
  ].sort((a, b) => a - b);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              Contract Payment Transactions
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600">
              Monitor and manage all payment transactions
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
            <Button
              onClick={() => handleGenerateDateRangeReceipt("print")}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Print Receipt</span>
            </Button>
            <Button
              onClick={() => handleGenerateDateRangeReceipt("download")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Download Receipt</span>
            </Button>
            <Button
              onClick={loadData}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Refresh</span>
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-blue-700">
                      Total Transactions
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">
                      {filteredTransactions.length}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {completedCount} completed
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-blue-200/50">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-green-700">
                      Total Amount Paid
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">
                      ₱{totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      All transactions
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-green-200/50">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-orange-700">
                      Total Penalties
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-900 mt-1">
                      ₱{totalPenalties.toLocaleString()}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Penalty charges
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-xl bg-orange-200/50">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Client Selection for Print/Download */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  *
                </div>
                Select Client(s) for Print/Download
              </CardTitle>
              <p className="text-sm text-blue-700 mt-1">
                Select one client for a single report, or multiple clients for bulk printing
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {uniqueClients.length === 0 ? (
                  <p className="text-sm text-slate-500 col-span-full">
                    No clients found in transactions
                  </p>
                ) : (
                  uniqueClients.map((client) => (
                    <label
                      key={client.name}
                      className="flex items-start p-3 rounded-lg border border-blue-200 hover:bg-blue-100/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedClients.has(client.name)}
                        onChange={() => toggleClientSelection(client.name)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{client.name}</p>
                        {client.phone && (
                          <p className="text-xs text-slate-600">{client.phone}</p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedClients.size > 0 && (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    Selected: {selectedClients.size} client{selectedClients.size > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Column Visibility Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-5 h-5 bg-slate-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ⚙
                </div>
                Column Visibility
              </CardTitle>
              <p className="text-sm text-slate-700 mt-1">
                Toggle which columns to show in the transactions table
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries({
                  transactionId: "Transaction ID",
                  clientName: "Client Name",
                  contractId: "Contract ID",
                  date: "Date",
                  amount: "Amount",
                  penalty: "Penalty",
                  method: "Payment Method",
                  processedBy: "Processed By",
                  status: "Status",
                  actions: "Actions",
                }).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-100/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumnVisibility(key)}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium text-slate-900">{label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Start Date Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* End Date Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Contract ID Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Contract ID
                  </label>
                  <Select value={contractId} onValueChange={setContractId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Contracts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contracts</SelectItem>
                      {uniqueContractIds.map((id) => (
                        <SelectItem
                          key={`contract-${id}`}
                          value={id.toString()}
                        >
                          Contract #{id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Status
                  </label>
                  <Select
                    value={paymentStatus}
                    onValueChange={setPaymentStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Method
                  </label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {uniquePaymentMethods.map((method, index) => (
                        <SelectItem
                          key={`payment-method-${index}-${method}`}
                          value={method}
                        >
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Button */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 opacity-0">
                    Reset
                  </label>
                  <Button
                    onClick={handleResetFilters}
                    variant="outline"
                    className="w-full border-slate-300 hover:bg-slate-100"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Transactions
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Transaction ID, Client Name, or Contract ID..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Transactions
                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                  {filteredTransactions.length} records
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-slate-600">
                    Try adjusting your filters or check back later.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile/Tablet Card View */}
                  <div className="block 2xl:hidden space-y-4 p-4">
                    {paginatedTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.transaction_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="space-y-3">
                          {/* Transaction ID and Status */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Transaction ID</p>
                              <p className="text-sm font-semibold text-slate-900 break-all">
                                {transaction.transaction_id}
                              </p>
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                transaction.payment_status
                              )} capitalize flex items-center gap-1 shrink-0 ml-2`}
                            >
                              {getStatusIcon(transaction.payment_status)}
                              <span className="text-xs">{transaction.payment_status || "N/A"}</span>
                            </Badge>
                          </div>

                          {/* Client Info */}
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Client Name</p>
                            <p className="text-sm font-medium text-slate-900">
                              {transaction.property_contracts?.client_name || "N/A"}
                            </p>
                            {transaction.property_contracts?.client_phone && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {transaction.property_contracts.client_phone}
                              </p>
                            )}
                          </div>

                          {/* Contract and Date */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Contract ID</p>
                              <p className="text-sm text-slate-900">
                                {transaction.contract_id || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Date</p>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <p className="text-sm text-slate-900">
                                  {transaction.transaction_date
                                    ? format(new Date(transaction.transaction_date), "MMM dd, yyyy")
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Amount and Penalty */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Amount</p>
                              <p className="text-base font-semibold text-green-600">
                                ₱{parseFloat(transaction.total_amount || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Penalty</p>
                              <p className="text-base font-semibold text-orange-600">
                                ₱{parseFloat(transaction.penalty_paid || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Payment Method and Processed By */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                                {transaction.payment_method || "N/A"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Processed By</p>
                              <p className="text-sm text-slate-700 font-medium">
                                {transaction.processed_by_name || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleGenerateReceipt(transaction.transaction_id, "print")
                              }
                              className="bg-purple-500 hover:bg-purple-600 text-white flex-1"
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Print
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleGenerateReceipt(transaction.transaction_id, "download")
                              }
                              className="bg-green-500 hover:bg-green-600 text-white flex-1"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Desktop Table View (2XL+ screens only) */}
                  <div className="hidden 2xl:block overflow-x-auto">
                    <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {visibleColumns.transactionId && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Transaction ID
                          </th>
                        )}
                        {visibleColumns.clientName && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Client Name
                          </th>
                        )}
                        {visibleColumns.contractId && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Contract ID
                          </th>
                        )}
                        {visibleColumns.date && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Date
                          </th>
                        )}
                        {visibleColumns.amount && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Amount
                          </th>
                        )}
                        {visibleColumns.penalty && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Penalty
                          </th>
                        )}
                        {visibleColumns.method && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Method
                          </th>
                        )}
                        {visibleColumns.processedBy && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Processed By
                          </th>
                        )}
                        {visibleColumns.status && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Status
                          </th>
                        )}
                        {visibleColumns.actions && (
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedTransactions.map((transaction, index) => (
                        <motion.tr
                          key={transaction.transaction_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          {visibleColumns.transactionId && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-900">
                                {transaction.transaction_id}
                              </span>
                            </td>
                          )}
                          {visibleColumns.clientName && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900">
                                  {transaction.property_contracts?.client_name ||
                                    "N/A"}
                                </span>
                                {transaction.property_contracts?.client_phone && (
                                  <span className="text-xs text-slate-500">
                                    {transaction.property_contracts.client_phone}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.contractId && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-slate-600">
                                {transaction.contract_id || "N/A"}
                              </span>
                            </td>
                          )}
                          {visibleColumns.date && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {transaction.transaction_date
                                  ? format(
                                      new Date(transaction.transaction_date),
                                      "MMM dd, yyyy"
                                    )
                                  : "N/A"}
                              </div>
                            </td>
                          )}
                          {visibleColumns.amount && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-green-600">
                                ₱
                                {parseFloat(
                                  transaction.total_amount || 0
                                ).toLocaleString()}
                              </span>
                            </td>
                          )}
                          {visibleColumns.penalty && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-orange-600">
                                ₱
                                {parseFloat(
                                  transaction.penalty_paid || 0
                                ).toLocaleString()}
                              </span>
                            </td>
                          )}
                          {visibleColumns.method && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                                {transaction.payment_method || "N/A"}
                              </Badge>
                            </td>
                          )}
                          {visibleColumns.processedBy && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-slate-700">
                                {transaction.processed_by_name || "—"}
                              </span>
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                className={`${getStatusColor(
                                  transaction.payment_status
                                )} capitalize flex items-center gap-1 w-fit`}
                              >
                                {getStatusIcon(transaction.payment_status)}
                                {transaction.payment_status || "N/A"}
                              </Badge>
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleGenerateReceipt(
                                      transaction.transaction_id,
                                      "print"
                                    )
                                  }
                                  className="bg-purple-500 hover:bg-purple-600 text-white"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleGenerateReceipt(
                                      transaction.transaction_id,
                                      "download"
                                    )
                                  }
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  title="Download Receipt"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center items-center gap-2 mt-6"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4"
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                let page;
                if (totalPages <= 5) {
                  page = index + 1;
                } else if (currentPage <= 3) {
                  page = index + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + index;
                } else {
                  page = currentPage - 2 + index;
                }
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10 h-10"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4"
            >
              Next
            </Button>
            <div className="ml-4 text-sm text-slate-600">
              Page {currentPage} of {totalPages} ({filteredTransactions.length} total records)
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
