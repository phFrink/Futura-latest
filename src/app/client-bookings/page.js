'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar, Clock, MapPin, Home, ArrowLeft, Building2, CheckCircle,
  XCircle, AlertCircle, Loader2, MessageSquare, User, Mail, Phone,
  FileText, Download, Printer, Briefcase, DollarSign, TrendingUp, Eye,
  Search, Filter, RefreshCw, Users, Upload, File
} from "lucide-react";
import { motion } from "framer-motion";
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { toast } from 'react-toastify';
import RealNotificationBell from '@/components/ui/RealNotificationBell';

export default function ClientBookingsPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading } = useClientAuth();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  useEffect(() => {
    // Wait for auth to initialize - don't redirect while still loading
    if (authLoading) return;

    // Only redirect if auth is done loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      toast.error('Please login to view your reservations');
      router.push('/client-login');
      return;
    }

    // Only load reservations if authenticated and user data is available
    if (isAuthenticated && user) {
      loadReservations();
    }
  }, [isAuthenticated, user, authLoading]);

  const loadReservations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/property-reservation?userId=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setReservations(result.data);
        setFilteredReservations(result.data);
        // Load documents for each reservation
        loadAllDocuments(result.data);
      } else {
        toast.error(result.message || 'Failed to load reservations');
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Error loading reservations');
    } finally {
      setLoading(false);
    }
  };

  const loadAllDocuments = async (reservations) => {
    const documentsMap = {};
    
    // Load documents for each reservation
    for (const reservation of reservations) {
      if (reservation.status === 'pre-approved' || reservation.status === 'approved') {
        try {
          const response = await fetch(`/api/reservations/${reservation.reservation_id}/documents`);
          const result = await response.json();
          
          if (result.success && result.documents.length > 0) {
            documentsMap[reservation.reservation_id] = result.documents.map(doc => ({
              id: doc.id,
              name: doc.file_name,
              size: doc.file_size,
              type: doc.file_type,
              uploadedAt: doc.uploaded_at,
              url: doc.file_path
            }));
          }
        } catch (error) {
          console.error(`Error loading documents for reservation ${reservation.reservation_id}:`, error);
        }
      }
    }
    
    setUploadedDocuments(documentsMap);
  };

  // Filter reservations based on search and status
  useEffect(() => {
    let filtered = [...reservations];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contract?.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReservations(filtered);
  }, [searchTerm, statusFilter, reservations]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Pending Review',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
      },
      'pre-approved': {
        icon: <Clock className="w-4 h-4" />,
        text: 'Pre-Approved',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
      },
      approved: {
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Approved',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
      },
      rejected: {
        icon: <XCircle className="w-4 h-4" />,
        text: 'Rejected',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
      },
      cancelled: {
        icon: <XCircle className="w-4 h-4" />,
        text: 'Cancelled',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleFileUpload = async (reservationId, files) => {
    if (!files || files.length === 0) return;

    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF and Word documents are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
    }

    setUploadingFiles(prev => ({ ...prev, [reservationId]: true }));

    try {
      const formData = new FormData();
      formData.append('reservationId', reservationId);
      for (let file of files) {
        formData.append('documents', file);
      }

      const response = await fetch('/api/reservations/upload-documents', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Documents uploaded successfully!');
        setUploadedDocuments(prev => ({
          ...prev,
          [reservationId]: [...(prev[reservationId] || []), ...result.documents]
        }));
        loadReservations(); // Refresh to get updated status
      } else {
        toast.error(result.message || 'Failed to upload documents');
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Error uploading documents');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const downloadReceipt = async (reservation) => {
    try {
      // Import jsPDF and autotable dynamically
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Colors
      const primaryColor = [220, 38, 38]; // Red-600
      const textDark = [30, 41, 59]; // Slate-800
      const textLight = [100, 116, 139]; // Slate-500

      // Header
      doc.setFontSize(24);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      doc.text('FUTURA HOMES', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(...textLight);
      doc.setFont(undefined, 'normal');
      doc.text('Property Reservation Receipt', pageWidth / 2, 28, { align: 'center' });

      // Header line
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(20, 32, pageWidth - 20, 32);

      // Receipt Info Box
      let yPos = 42;
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      doc.setFont(undefined, 'bold');
      doc.text(`Receipt No: ${reservation.reservation_id?.slice(0, 8).toUpperCase()}`, 20, yPos);
      doc.text(`Status: ${reservation.status?.toUpperCase()}`, pageWidth - 20, yPos, { align: 'right' });

      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...textLight);
      doc.text(`Date: ${formatDate(reservation.created_at)}`, 20, yPos);

      // Client Information Section
      yPos += 12;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textDark);
      doc.text('Client Information', 20, yPos);

      doc.setDrawColor(...textLight);
      doc.setLineWidth(0.3);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      const clientInfo = [
        ['Full Name:', reservation.client_name],
        ['Email:', reservation.client_email],
        ['Phone:', reservation.client_phone],
        ['Address:', reservation.client_address]
      ];

      clientInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...textLight);
        doc.text(label, 25, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textDark);
        doc.text(value || 'N/A', 60, yPos);
        yPos += 6;
      });

      // Property Details Section
      yPos += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textDark);
      doc.text('Property Details', 20, yPos);

      doc.setDrawColor(...textLight);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textLight);
      doc.text('Property:', 25, yPos);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...textDark);
      doc.text(reservation.property_title || 'N/A', 60, yPos);

      yPos += 6;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textLight);
      doc.text('Reservation Fee:', 25, yPos);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.text(formatCurrency(reservation.reservation_fee), 60, yPos);

      // Employment Information Section
      yPos += 12;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textDark);
      doc.text('Employment Information', 20, yPos);

      doc.setDrawColor(...textLight);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      const employmentInfo = [
        ['Occupation:', reservation.occupation],
        ['Employer:', reservation.employer],
        ['Employment Status:', reservation.employment_status?.replace('-', ' ').toUpperCase()],
        ['Years Employed:', `${reservation.years_employed} years`]
      ];

      employmentInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...textLight);
        doc.text(label, 25, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textDark);
        doc.text(value || 'N/A', 60, yPos);
        yPos += 6;
      });

      // Income Statement Section
      yPos += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textDark);
      doc.text('Income Statement', 20, yPos);

      doc.setDrawColor(...textLight);
      doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textLight);
      doc.text('Monthly Income:', 25, yPos);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...textDark);
      doc.text(formatCurrency(reservation.monthly_income), 60, yPos);
      yPos += 6;

      if (reservation.other_income_source) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...textLight);
        doc.text('Other Income Source:', 25, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textDark);
        doc.text(reservation.other_income_source, 60, yPos);
        yPos += 6;

        doc.setFont(undefined, 'bold');
        doc.setTextColor(...textLight);
        doc.text('Other Income Amount:', 25, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textDark);
        doc.text(formatCurrency(reservation.other_income_amount), 60, yPos);
        yPos += 6;
      }

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textLight);
      doc.text('Total Monthly Income:', 25, yPos);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.text(formatCurrency(reservation.total_monthly_income), 60, yPos);

      // Additional Notes
      if (reservation.message) {
        yPos += 12;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...textDark);
        doc.text('Additional Notes', 20, yPos);

        doc.setDrawColor(...textLight);
        doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

        yPos += 8;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...textDark);

        const splitMessage = doc.splitTextToSize(reservation.message, pageWidth - 50);
        doc.text(splitMessage, 25, yPos);
        yPos += (splitMessage.length * 5);
      }

      // Important Notice Box
      yPos += 12;
      doc.setFillColor(254, 243, 199); // Yellow-100
      doc.setDrawColor(245, 158, 11); // Yellow-600
      doc.setLineWidth(0.5);
      doc.rect(20, yPos, pageWidth - 40, 28, 'FD');

      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(146, 64, 14); // Yellow-900
      doc.text('Important Payment Instructions:', 25, yPos + 6);
      doc.setFont(undefined, 'normal');
      doc.text('You have 3-5 business days to visit Futura Home and complete your payment.', 25, yPos + 11);
      doc.text('Bring this receipt and provide your payment receipt with tracking number.', 25, yPos + 16);
      doc.text('Keep your payment receipt as proof of transaction.', 25, yPos + 21);

      // Footer
      yPos += 30;
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textLight);
      doc.text('FUTURA HOMES', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.setFont(undefined, 'normal');
      doc.text('Thank you for choosing Futura Homes. For inquiries, contact our customer service team.', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, yPos, { align: 'center' });

      // Generate filename and save
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Futura_Homes_Receipt_${reservation.reservation_id?.slice(0, 8).toUpperCase()}_${timestamp}.pdf`;
      doc.save(filename);

      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF receipt');
    }
  };

  const printReceipt = (reservation) => {
    const trackingNumber = reservation.tracking_number || `TRK-${reservation.reservation_id?.slice(0, 8).toUpperCase()}`;

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reservation Receipt - ${trackingNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #dc2626;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #dc2626;
              margin: 0;
              font-size: 28px;
            }
            .tracking-box {
              background: #fee2e2;
              border: 3px solid #dc2626;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 8px;
            }
            .tracking-box .label {
              font-size: 14px;
              color: #991b1b;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .tracking-box .number {
              font-size: 32px;
              font-weight: bold;
              color: #dc2626;
              letter-spacing: 2px;
              font-family: 'Courier New', monospace;
            }
            .info-row {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-label {
              font-weight: 600;
              color: #4b5563;
              width: 150px;
            }
            .info-value {
              color: #1f2937;
              flex: 1;
            }
            .section {
              margin: 20px 0;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .instructions {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              font-size: 13px;
              line-height: 1.6;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
            }
            @media print {
              body { padding: 15px; }
              .tracking-box .number { font-size: 28px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FUTURA HOMES</h1>
            <p style="margin: 5px 0; color: #6b7280;">Reservation Receipt</p>
          </div>

          <div class="tracking-box">
            <div class="label">TRACKING NUMBER</div>
            <div class="number">${trackingNumber}</div>
          </div>

          <div class="section">
            <div class="section-title">Client Information</div>
            <div class="info-row">
              <div class="info-label">Name:</div>
              <div class="info-value">${reservation.client_name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Phone:</div>
              <div class="info-value">${reservation.client_phone}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value">${reservation.client_email}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Property & Payment</div>
            <div class="info-row">
              <div class="info-label">Property:</div>
              <div class="info-value">${reservation.property_title || 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Amount:</div>
              <div class="info-value"><strong>${formatCurrency(reservation.reservation_fee)}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Status:</div>
              <div class="info-value">${reservation.status?.toUpperCase()}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${formatDate(reservation.created_at)}</div>
            </div>
          </div>

          <div class="instructions">
            <strong>Payment Instructions:</strong><br>
            1. Visit Futura Home within <strong>3-5 business days</strong><br>
            2. Bring this receipt with <strong>Tracking Number: ${trackingNumber}</strong><br>
            3. Complete payment and get official receipt<br>
            4. Keep payment receipt as proof
          </div>

          <div class="footer">
            <p><strong>FUTURA HOMES</strong></p>
            <p>Thank you for choosing Futura Homes</p>
            <p>For inquiries: info@futurahomes.com</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-red-600" />
              <span className="text-2xl font-bold text-slate-800">Futura Homes</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              {/* <RealNotificationBell /> */}
              <Button
                onClick={() => router.push('/client-home')}
                variant="outline"
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
            My Property Reservations
          </h1>
          <p className="text-base md:text-lg text-slate-600">
            View and manage your property reservations
          </p>
        </motion.div>

        {/* Filters */}
        {reservations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by property, contract number, or tracking number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="md:w-64">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="pre-approved">Pre-Approved</option>
                        <option value="approved">Approved</option>
                      </select>
                    </div>
                  </div>

                  {/* Results Count */}
                  <div className="flex items-center text-sm text-slate-600">
                    <span className="font-semibold">{filteredReservations.length}</span>
                    <span className="ml-1">of {reservations.length} reservations</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Reservations List */}
        {reservations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <FileText className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No reservations yet
            </h3>
            <p className="text-slate-500 mb-6">
              You haven't made any property reservations
            </p>
            <Button
              onClick={() => router.push('/client-home')}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              <Home className="mr-2 h-4 w-4" />
              Browse Properties
            </Button>
          </motion.div>
        ) : filteredReservations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Filter className="w-24 h-24 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No reservations found
            </h3>
            <p className="text-slate-500 mb-6">
              Try adjusting your filters or search term
            </p>
            <Button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              variant="outline"
              className="border-slate-300 text-slate-700"
            >
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <Card className="bg-white border border-slate-200 shadow-lg">
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Contract #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredReservations.map((reservation, index) => (
                      <React.Fragment key={reservation.reservation_id}>
                        {/* Summary Row */}
                        <motion.tr
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`cursor-pointer transition-colors ${
                            reservation.contract?.contract_status === 'completed'
                              ? 'bg-slate-100 hover:bg-slate-200 opacity-60'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => setExpandedId(expandedId === reservation.reservation_id ? null : reservation.reservation_id)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4 text-red-600" />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">
                                    {reservation.property_title || 'Property'}
                                  </span>
                                  {reservation.transfer_history && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                      <RefreshCw className="w-3 h-3" />
                                      Transferred
                                    </span>
                                  )}
                                </div>
                                {reservation.transfer_history && (
                                  <span className="text-xs text-slate-500 mt-0.5">
                                    From: {reservation.transfer_history.original_client_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-mono text-slate-600">
                                {reservation.contract?.contract_number || 'N/A'}
                              </span>
                              {reservation.contract?.contract_status === 'completed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  Completed
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(reservation.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-red-600">
                            {formatCurrency(reservation.reservation_fee)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {getStatusBadge(reservation.status)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-slate-700 border-slate-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(expandedId === reservation.reservation_id ? null : reservation.reservation_id);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {expandedId === reservation.reservation_id ? 'Hide' : 'View'}
                            </Button>
                          </td>
                        </motion.tr>

                        {/* Expanded Details Row */}
                        {expandedId === reservation.reservation_id && (
                          <tr>
                            <td colSpan="6" className="px-6 py-6 bg-slate-50">
                              <div className="flex flex-col lg:flex-row gap-6">
                                {/* Property & Reservation Info */}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <Home className="w-5 h-5 text-red-600" />
                                        {reservation.property_title || 'Property Reservation'}
                                      </h3>
                                      {getStatusBadge(reservation.status)}
                                    </div>
                                  </div>

                                  {/* Transfer Information */}
                                  {reservation.transfer_history && (
                                    <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                                      <div className="flex items-start gap-3">
                                        <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            Contract Transferred
                                            <span className="text-xs font-normal bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                              {formatDate(reservation.transfer_history.transferred_at)}
                                            </span>
                                          </h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div>
                                              <span className="text-blue-700 font-medium">Previous Owner:</span>
                                              <p className="text-blue-900 font-semibold">{reservation.transfer_history.original_client_name}</p>
                                              <p className="text-blue-700 text-xs">{reservation.transfer_history.original_client_email}</p>
                                            </div>
                                            <div>
                                              <span className="text-blue-700 font-medium">Relationship:</span>
                                              <p className="text-blue-900 font-semibold capitalize">{reservation.transfer_history.relationship?.replace(/_/g, ' ') || 'N/A'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                              <span className="text-blue-700 font-medium">Transfer Reason:</span>
                                              <p className="text-blue-900">{reservation.transfer_history.transfer_reason}</p>
                                            </div>
                                            {reservation.transfer_history.transfer_notes && (
                                              <div className="md:col-span-2">
                                                <span className="text-blue-700 font-medium">Notes:</span>
                                                <p className="text-blue-900 italic">{reservation.transfer_history.transfer_notes}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Reservation Details */}
                                  <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-3 text-slate-700">
                                      <DollarSign className="w-5 h-5 text-red-600 flex-shrink-0" />
                                      <div>
                                        <span className="text-sm text-slate-500">Reservation Fee:</span>
                                        <span className="ml-2 font-bold text-lg text-red-600">
                                          {formatCurrency(reservation.reservation_fee)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700">
                                      <Calendar className="w-5 h-5 text-red-600 flex-shrink-0" />
                                      <div>
                                        <span className="text-sm text-slate-500">Submitted on:</span>
                                        <span className="ml-2 font-medium">{formatDate(reservation.created_at)}</span>
                                      </div>
                                    </div>
                                    {reservation.contract && (
                                      <>
                                        <div className="flex items-center gap-3 text-slate-700">
                                          <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                                          <div>
                                            <span className="text-sm text-slate-500">Contract Number:</span>
                                            <span className="ml-2 font-bold text-slate-900">
                                              {reservation.contract.contract_number}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-700">
                                          <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
                                          <div>
                                            <span className="text-sm text-slate-500">Payment Plan:</span>
                                            <span className="ml-2 font-medium text-slate-900">
                                              {reservation.contract.payment_plan_months} months @ {formatCurrency(reservation.contract.monthly_installment)}/month
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {/* Payment Schedule Table */}
                                  {reservation.payment_schedules && reservation.payment_schedules.length > 0 && (
                                    <div className="mt-6 border-t border-slate-200 pt-4">
                                      <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-red-600" />
                                        Monthly Payment Schedule
                                      </h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">#</th>
                                              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">Due Date</th>
                                              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600">Amount</th>
                                              <th className="text-right py-2 px-3 text-xs font-semibold text-orange-600">Penalty</th>
                                              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {reservation.payment_schedules.map((schedule) => (
                                              <tr key={schedule.schedule_id} className="hover:bg-slate-50">
                                                <td className="py-2 px-3 font-medium text-slate-900">
                                                  {schedule.installment_number}
                                                </td>
                                                <td className="py-2 px-3 text-slate-700">
                                                  {formatDate(schedule.due_date)}
                                                </td>
                                                <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                                  {formatCurrency(schedule.scheduled_amount)}
                                                </td>
                                                <td className="py-2 px-3 text-right font-semibold text-orange-600">
                                                  {schedule.penalty_amount > 0 ? formatCurrency(schedule.penalty_amount) : '—'}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                  {schedule.payment_status === 'paid' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                      <CheckCircle className="w-3 h-3" />
                                                      Paid
                                                    </span>
                                                  ) : schedule.is_overdue ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                      <AlertCircle className="w-3 h-3" />
                                                      Overdue
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                      <Clock className="w-3 h-3" />
                                                      Pending
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Payment Instructions */}
                                      {reservation.contract?.contract_status === 'completed' ? (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <p className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Contract Completed
                                          </p>
                                          <p className="text-sm text-green-800">
                                            This contract has been marked as completed. All payments have been fulfilled. Thank you for choosing Futura Homes!
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                          <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            Payment Instructions
                                          </p>
                                          <p className="text-sm text-blue-800">
                                            To pay your monthly installment, please visit the <strong>Main Futura Homes Office</strong>. Bring your contract number and a valid ID for verification.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Employment & Income Summary */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                                    <div>
                                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" />
                                        Employment
                                      </h4>
                                      <p className="text-sm text-slate-700 font-medium">{reservation.occupation}</p>
                                      <p className="text-xs text-slate-500">{reservation.employer}</p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        {reservation.employment_status?.replace('-', ' ')} • {reservation.years_employed} years
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        Monthly Income
                                      </h4>
                                      <p className="text-sm text-slate-700 font-medium">
                                        Primary: {formatCurrency(reservation.monthly_income)}
                                      </p>
                                      {reservation.other_income_source && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Other: {formatCurrency(reservation.other_income_amount)}
                                        </p>
                                      )}
                                      <p className="text-sm text-slate-700 font-bold mt-1">
                                        Total: {formatCurrency(reservation.total_monthly_income)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Message */}
                                  {reservation.message && (
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                      <div className="flex items-start gap-3 text-slate-700">
                                        <MessageSquare className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                                        <div>
                                          <h4 className="text-sm font-semibold text-slate-700 mb-1">Additional Notes:</h4>
                                          <p className="text-sm text-slate-600">{reservation.message}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Status Message */}
                                  {reservation.status === 'pending' && (
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                                        <AlertCircle className="w-5 h-5 inline mr-2" />
                                        Important Payment Instructions
                                      </p>
                                      <ul className="text-sm text-yellow-800 space-y-1 ml-7">
                                        <li>• You have <strong>3-5 business days</strong> to visit Futura Home and complete your payment</li>
                                        <li>• Please bring your reservation confirmation</li>
                                        <li>• Make sure to provide your <strong>receipt with tracking number</strong> after payment</li>
                                        <li>• Keep your receipt as proof of payment</li>
                                      </ul>
                                    </div>
                                  )}
                                  {reservation.status === 'pre-approved' && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                      <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                                        <Clock className="w-5 h-5 inline mr-2" />
                                        Pre-Approved - Supporting Documents
                                      </p>
                                      
                                      {uploadedDocuments[reservation.reservation_id] && uploadedDocuments[reservation.reservation_id].length > 0 ? (
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-2 text-green-700">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="text-sm font-medium">Documents submitted successfully!</span>
                                          </div>
                                          
                                          <div>
                                            <p className="text-sm font-medium text-blue-700 mb-2">Uploaded Documents:</p>
                                            <div className="space-y-2">
                                              {uploadedDocuments[reservation.reservation_id].map((doc, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                                                  <div className="flex items-center">
                                                    <File className="w-4 h-4 text-blue-600 mr-2" />
                                                    <div>
                                                      <span className="text-sm text-slate-700 font-medium">{doc.name}</span>
                                                      <p className="text-xs text-slate-500">
                                                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                    ✓ Received
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          
                                          {/* Option to upload more documents */}
                                          <div className="border-t border-blue-200 pt-3 mt-3">
                                            <p className="text-sm text-blue-700 mb-2">Need to upload additional documents?</p>
                                            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                                              <input
                                                type="file"
                                                id={`file-upload-${reservation.reservation_id}`}
                                                multiple
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => handleFileUpload(reservation.reservation_id, e.target.files)}
                                                className="hidden"
                                              />
                                              <label
                                                htmlFor={`file-upload-${reservation.reservation_id}`}
                                                className="cursor-pointer"
                                              >
                                                {uploadingFiles[reservation.reservation_id] ? (
                                                  <div className="flex items-center justify-center">
                                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                                                    <span className="text-blue-600">Uploading...</span>
                                                  </div>
                                                ) : (
                                                  <div>
                                                    <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                                                    <p className="text-blue-600 text-sm">Upload more documents</p>
                                                  </div>
                                                )}
                                              </label>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          <p className="text-sm text-blue-700 mb-4">
                                            Your reservation has been pre-approved! Please upload your supporting documents to complete the approval process.
                                          </p>
                                          
                                          {/* File Upload */}
                                          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                            <input
                                              type="file"
                                              id={`file-upload-${reservation.reservation_id}`}
                                              multiple
                                              accept=".pdf,.doc,.docx"
                                              onChange={(e) => handleFileUpload(reservation.reservation_id, e.target.files)}
                                              className="hidden"
                                            />
                                            <label
                                              htmlFor={`file-upload-${reservation.reservation_id}`}
                                              className="cursor-pointer"
                                            >
                                              {uploadingFiles[reservation.reservation_id] ? (
                                                <div className="flex items-center justify-center">
                                                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                                                  <span className="text-blue-600">Uploading...</span>
                                                </div>
                                              ) : (
                                                <div>
                                                  <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                                  <p className="text-blue-600 font-medium">Click to upload documents</p>
                                                  <p className="text-xs text-blue-500 mt-1">PDF, DOC, DOCX (Max 10MB each)</p>
                                                </div>
                                              )}
                                            </label>
                                          </div>
                                          
                                          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                                            <strong>Required documents:</strong> Valid ID, Proof of Income, Employment Certificate, and any other supporting documents that verify your eligibility.
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {reservation.status === 'approved' && !reservation.contract && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <p className="text-sm text-green-800">
                                        <CheckCircle className="w-4 h-4 inline mr-1" />
                                        Congratulations! Your reservation has been approved.
                                      </p>
                                    </div>
                                  )}
                                  {reservation.status === 'rejected' && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-sm text-red-800">
                                        <XCircle className="w-4 h-4 inline mr-1" />
                                        Unfortunately, your reservation was not approved. Please contact us for more information.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Client Info & Actions */}
                                <div className="lg:w-72 space-y-4">
                                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h4>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <User className="w-4 h-4 text-slate-400" />
                                      <span>{reservation.client_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Mail className="w-4 h-4 text-slate-400" />
                                      <span className="truncate">{reservation.client_email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Phone className="w-4 h-4 text-slate-400" />
                                      <span>{reservation.client_phone}</span>
                                    </div>
                                  </div>

                                  {/* Receipt Actions */}
                                  <div className="space-y-2">
                                    <Button
                                      onClick={() => printReceipt(reservation)}
                                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Print Receipt
                                    </Button>
                                    <Button
                                      onClick={() => downloadReceipt(reservation)}
                                      variant="outline"
                                      className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Download PDF
                                    </Button>
                                  </div>

                                  <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-200">
                                    Receipt No: {reservation.reservation_id?.slice(0, 8).toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-200">
                {filteredReservations.map((reservation, index) => (
                  <div
                    key={reservation.reservation_id}
                    className={`p-4 ${
                      reservation.contract?.contract_status === 'completed'
                        ? 'bg-slate-100 opacity-60'
                        : ''
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">{reservation.property_title}</p>
                            {reservation.transfer_history && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                <RefreshCw className="w-3 h-3" />
                                Transferred
                              </span>
                            )}
                          </div>
                          {reservation.transfer_history && (
                            <p className="text-xs text-blue-600 mb-1">
                              From: {reservation.transfer_history.original_client_name}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">{formatDate(reservation.created_at)}</p>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-500">Contract:</span>
                        <span className="ml-2 font-mono">{reservation.contract?.contract_number || 'N/A'}</span>
                        {reservation.contract?.contract_status === 'completed' && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-red-600">
                        {formatCurrency(reservation.reservation_fee)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setExpandedId(expandedId === reservation.reservation_id ? null : reservation.reservation_id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {expandedId === reservation.reservation_id ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
