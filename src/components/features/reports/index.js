'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  Home,
  Wrench,
  AlertTriangle,
  Bell,
  CreditCard,
  FileBarChart,
  Search,
  Loader2,
  CalendarCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from '@supabase/supabase-js';
import { format } from "date-fns";
import { toast } from "react-toastify";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Reports() {
  const [activeReport, setActiveReport] = useState('homeowners');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const reportTypes = [
    {
      id: 'homeowners',
      title: 'Homeowners Report',
      icon: Users,
      description: 'Complete list of homeowners with their details',
      color: 'blue'
    },
    {
      id: 'properties',
      title: 'Properties Report',
      icon: Home,
      description: 'All properties with their current status',
      color: 'green'
    },
    {
      id: 'service_requests',
      title: 'Service Requests Report',
      icon: Wrench,
      description: 'Service requests with status and dates',
      color: 'amber'
    },
    {
      id: 'complaints',
      title: 'Complaints Report',
      icon: AlertTriangle,
      description: 'All complaints and their resolution status',
      color: 'red'
    },
    {
      id: 'billings',
      title: 'Billing Report',
      icon: CreditCard,
      description: 'Billing records with payment status',
      color: 'purple'
    },
    {
      id: 'announcements',
      title: 'General Announcements',
      icon: Bell,
      description: 'All homeowners and their announcement publications',
      color: 'indigo'
    },
    {
      id: 'reservations',
      title: 'Reservations Report',
      icon: CalendarCheck,
      description: 'All property reservations with client details and status',
      color: 'blue'
    }
  ];

  useEffect(() => {
    if (activeReport) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport]);

  useEffect(() => {
    // Filter data based on search term
    if (searchTerm === '') {
      setFilteredData(reportData);
    } else {
      const filtered = reportData.filter(item => {
        return Object.values(item).some(value =>
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredData(filtered);
    }
  }, [searchTerm, reportData]);

  useEffect(() => {
    // Reset to page 1 when filtered data changes
    setCurrentPage(1);
  }, [filteredData]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const generateReport = async () => {
    setLoading(true);
    toast.info('Generating report, please wait...');
    try {
      // Determine table name based on active report
      const tableName = activeReport === 'service_requests' ? 'request_tbl' :
        activeReport === 'homeowners' ? 'property_contracts' :
          activeReport === 'properties' ? 'property_info_tbl' :
            activeReport === 'complaints' ? 'complaint_tbl' :
              activeReport === 'billings' ? 'contract_payment_schedules' :
                activeReport === 'announcements' ? 'homeowner_announcements' :
                  activeReport === 'reservations' ? 'property_reservations' :
                    'announcement_tbl';

      // Fetch ALL records from the table without any limits or pagination
      // No .limit() is applied - all data will be loaded and displayed
      const { data, error } = await supabase.from(tableName).select('*');

      if (error) {
        // Set empty data to show "No data" message
        setReportData([]);
        setFilteredData([]);
        toast.error('Failed to load report data. Please try again.');
        return;
      }

      // Ensure data is fresh (force deep copy to avoid stale references)
      let sortedData = data && data.length > 0 ? JSON.parse(JSON.stringify(data)) : [];

      if (sortedData.length > 0) {
        // Sort data client-side to avoid ordering errors
        sortedData = sortedData.sort((a, b) => {
          // Try to sort by created_at, id, or any available field
          if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
          }
          if (a.id && b.id) {
            return b.id - a.id;
          }
          return 0;
        });

        // Apply client-side date filtering if dates are provided
        if (startDate && endDate) {
          // Define multiple possible date fields to check for each report type
          const possibleDateFields = activeReport === 'homeowners'
            ? ['contract_date', 'created_at', 'updated_at', 'move_in_date'] :
            activeReport === 'service_requests'
            ? ['created_at', 'request_date', 'updated_at'] :
            activeReport === 'properties'
            ? ['created_date', 'created_at', 'updated_at', 'date_added'] :
            activeReport === 'complaints'
            ? ['created_at', 'complaint_date', 'updated_at'] :
            activeReport === 'billings'
            ? ['due_date', 'created_at', 'payment_date', 'updated_at'] :
            activeReport === 'announcements'
            ? ['created_date', 'created_at', 'updated_at', 'publish_date'] :
            activeReport === 'reservations'
            ? ['created_at', 'reservation_date', 'check_in_date', 'updated_at'] :
            ['created_at', 'updated_at'];

          const originalLength = sortedData.length;

          sortedData = sortedData.filter(item => {
            // Try each possible date field
            for (const dateField of possibleDateFields) {
              const itemDate = item[dateField];
              if (!itemDate) continue;

              try {
                const date = new Date(itemDate);
                const start = new Date(startDate);
                const end = new Date(endDate);

                // Set time to start of day for proper comparison
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                if (date >= start && date <= end) {
                  return true; // Record matches date range
                }
              } catch {
                continue;
              }
            }
            return false; // No date field matched
          });

          if (sortedData.length === 0 && originalLength > 0) {
            toast.info('No records found for the selected date range.');
          }
        }
      }

      // Force state update with fresh data
      setReportData(sortedData);
      setFilteredData(sortedData);

      if (sortedData.length > 0) {
        toast.success(`Report generated successfully! ${sortedData.length} records found.`);
      } else {
        toast.warning('Report generated but no records found.');
      }
    } catch (error) {
      // Set empty data on error
      setReportData([]);
      setFilteredData([]);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setPdfLoading(true);

      if (!activeReport) {
        toast.info('Please select a report type first.');
        return;
      }

      if (filteredData.length === 0) {
        // Provide sample data for testing if no real data is available
        const sampleData = [{
          full_name: 'Sample User',
          email: 'sample@example.com',
          phone: '09123456789',
          status: 'active',
          move_in_date: new Date().toISOString(),
          monthly_dues: 5000
        }];

        // Use sample data temporarily for PDF generation
        const tempFilteredData = sampleData;

        // Generate PDF with sample data
        generatePDFWithData(tempFilteredData);
        return;
      }

      // Generate PDF with actual data
      generatePDFWithData(filteredData);
    } catch (error) {
      toast.info(`Error generating PDF: ${error.message || 'Unknown error'}.`);
    } finally {
      setPdfLoading(false);
    }
  };

  const generatePDFWithData = async (data) => {
    try {

      // Import jsPDF and autotable dynamically
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // Use landscape orientation to fit more columns
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const reportType = reportTypes.find(r => r.id === activeReport);

      // Add title - very compact
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(reportType?.title || 'Report', 10, 15);

      // Add date range if applied - very compact
      let yPos = 22;
      doc.setFontSize(7);
      if (startDate && endDate) {
        doc.text(`Date Range: ${startDate} to ${endDate}`, 10, yPos);
        yPos += 5;
      }

      // Add generation date
      doc.text(`Generated: ${format(new Date(), 'PPP')}`, 10, yPos);
      yPos += 5;

      // Add record count
      doc.text(`Total Records: ${data.length}`, 10, yPos);
      yPos += 8;

      // Prepare table data
      let columns = [];
      let rows = [];

      if (data.length > 0) {
        // Get column headers from first item
        let allColumns = Object.keys(data[0]).filter(key =>
          !key.includes('id') &&
          !key.includes('password') &&
          key !== 'created_at' &&
          key !== 'updated_at'
        );

        // Special filtering for Homeowners Report in PDF
        if (activeReport === 'homeowners') {
          const allowedColumns = [
            'contract_number',
            'property_title',
            'property_price',
            'client_name',
            'client_email',
            'client_phone'
          ];
          columns = allColumns.filter(key => allowedColumns.includes(key));
        } else {
          columns = allColumns;
        }

        // Prepare rows with better data formatting
        rows = data.map((item, index) => {
          return columns.map(col => {
            let value = item[col];

            if (value === null || value === undefined) return '-';

            if (typeof value === 'boolean') return value ? 'Yes' : 'No';

            if (typeof value === 'object') {
              return Array.isArray(value) ? value.join(', ') : 'Object';
            }

            if (col.includes('date') && value) {
              try {
                return format(new Date(value), 'MMM dd, yyyy');
              } catch (error) {
                return value.toString();
              }
            }

            // Handle long text fields with very aggressive truncation to fit page
            const str = value.toString();

            // Very short text to fit everything on one page
            if (col.includes('content') || col.includes('description') || col.includes('message')) {
              return str.length > 30 ? str.substring(0, 27) + '...' : str;
            }

            // For most fields, use extremely short truncation
            return str.length > 20 ? str.substring(0, 17) + '...' : str;
          });
        });

        // Add table to PDF using autoTable with very compact settings
        autoTable(doc, {
          head: [columns.map(col => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))],
          body: rows,
          startY: yPos + 3,
          theme: 'striped',
          headStyles: {
            fillColor: [239, 68, 68], // Red color to match theme
            textColor: 255,
            fontSize: 6,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 1.5
          },
          bodyStyles: {
            fontSize: 5,
            textColor: [40, 40, 40],
            halign: 'left',
            cellPadding: 1.5,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          margin: { top: 15, left: 5, right: 5, bottom: 15 },
          tableWidth: 'auto',
          styles: {
            overflow: 'linebreak',
            cellWidth: 'wrap',
            minCellHeight: 6,
            fontSize: 5
          },
          // Auto-calculate column widths to fit page
          columnStyles: {},
          didDrawPage: function (data) {
            // Add page numbers
            const pageCount = doc.internal.getNumberOfPages();
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.setFontSize(8);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
          }
        });
      } else {
        doc.text('No data available for the selected criteria.', 20, yPos + 10);
      }

      // Generate filename
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `${(reportType?.title || 'report').toLowerCase().replace(/ /g, '_')}_${timestamp}.pdf`;

      // Save the PDF
      doc.save(filename);

      toast.success('PDF generated and downloaded successfully!');
    } catch (error) {
      throw error;
    }
  };

  const printReport = () => {
    const printContent = document.getElementById('report-table');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    const reportType = reportTypes.find(r => r.id === activeReport);

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportType.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              color: #374151;
              border-bottom: 2px solid #ef4444;
              padding-bottom: 10px;
            }
            .report-info {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9fafb;
              border-left: 4px solid #ef4444;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 6px;
              text-align: left;
              word-wrap: break-word;
            }
            th {
              background-color: #ef4444;
              color: white;
              font-weight: bold;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .no-data {
              text-align: center;
              padding: 40px;
              color: #6b7280;
            }
            @media print {
              body { margin: 10px; }
              .no-print { display: none; }
              table { font-size: 8px; }
              th, td { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <h1>${reportType.title}</h1>
          <div class="report-info">
            ${startDate && endDate ? `<p><strong>Date Range:</strong> ${startDate} to ${endDate}</p>` : ''}
            <p><strong>Generated:</strong> ${format(new Date(), 'PPP')}</p>
            <p><strong>Total Records:</strong> ${filteredData.length}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
      printWindow.close();
    };
  };

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
      amber: 'bg-amber-500 hover:bg-amber-600',
      red: 'bg-red-500 hover:bg-red-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
      indigo: 'bg-indigo-500 hover:bg-indigo-600'
    };
    return colors[color] || colors.blue;
  };

  // Filter columns for table display
  const getFilteredColumns = (allKeys) => {
    // Only filter out sensitive/system fields for table display
    let filteredKeys = allKeys.filter(key =>
      !key.includes('password') &&
      key !== 'created_at' &&
      key !== 'updated_at'
    );

    // Special filtering for Homeowners Report
    if (activeReport === 'homeowners') {
      const allowedColumns = [
        'contract_number',
        'property_title',
        'property_price',
        'client_name',
        'client_email',
        'client_phone'
      ];
      filteredKeys = filteredKeys.filter(key => allowedColumns.includes(key));
    } else {
      // For other reports, exclude id fields for cleaner display
      filteredKeys = filteredKeys.filter(key => !key.includes('id'));
    }

    return filteredKeys;
  };

  return (
    <div className="min-h-full w-full">
      <div className="h-full max-w-none mx-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center md:text-left"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              Reports & Analytics
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600">Generate and export detailed reports</p>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">

            {/* Report Types Sidebar - Desktop */}
            <div className="hidden xl:block xl:col-span-4 2xl:col-span-3">
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl h-fit sticky top-4">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileBarChart className="w-5 h-5 text-red-600" />
                    Report Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportTypes.map((report, index) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setActiveReport(report.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${activeReport === report.id
                            ? 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 shadow-md'
                            : 'bg-slate-50/50 hover:bg-slate-100/50 hover:shadow-sm'
                          }`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${activeReport === report.id
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                          }`}>
                          <report.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm mb-1 ${activeReport === report.id ? 'text-red-900' : 'text-slate-900'
                            }`}>
                            {report.title}
                          </h4>
                          <p className={`text-xs leading-relaxed ${activeReport === report.id ? 'text-red-700' : 'text-slate-600'
                            }`}>
                            {report.description}
                          </p>
                          {activeReport === report.id && (
                            <Badge className="bg-red-600 text-white text-xs mt-2">
                              Active
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="xl:col-span-8 2xl:col-span-9 space-y-6">

              {/* Report Types - Mobile/Tablet */}
              <div className="block xl:hidden">
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileBarChart className="w-5 h-5 text-red-600" />
                      Select Report Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {reportTypes.map((report, index) => (
                        <motion.div
                          key={report.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setActiveReport(report.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeReport === report.id
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                            }`}
                        >
                          <div className={`p-2 rounded-md ${activeReport === report.id
                              ? 'bg-white/20'
                              : 'bg-slate-200'
                            }`}>
                            <report.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {report.title}
                            </p>
                          </div>
                          {activeReport === report.id && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters & Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Filter className="w-5 h-5 text-red-600" />
                      Filters & Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      {/* Date Filters */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-red-500" />
                            Start Date
                          </div>
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-red-500" />
                            End Date
                          </div>
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="w-4 h-4 text-red-500" />
                            Search
                          </div>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                      <button
                        onClick={generateReport}
                        disabled={loading || !activeReport}
                        className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 ${loading || !activeReport ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <FileBarChart className="w-5 h-5" />
                            Generate Report
                          </>
                        )}
                      </button>
                      <button
                        onClick={downloadPDF}
                        disabled={filteredData.length === 0 || pdfLoading}
                        className={`px-6 py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${filteredData.length === 0 || pdfLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        {pdfLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            Download PDF
                          </>
                        )}
                      </button>
                      <button
                        onClick={printReport}
                        disabled={filteredData.length === 0}
                        className={`px-6 py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${filteredData.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        <Printer className="w-5 h-5" />
                        Print Report
                      </button>
                    </div>

                    {/* Summary Statistics */}
                    {(filteredData.length > 0 || reportData.length > 0) && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-6 border-t border-slate-200">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                          <p className="text-xs text-blue-700 font-semibold mb-1">Total Records</p>
                          <p className="text-2xl font-bold text-blue-900">{reportData.length}</p>
                        </div>
                        {(startDate || endDate) && (
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                            <p className="text-xs text-purple-700 font-semibold mb-1">Filtered Records</p>
                            <p className="text-2xl font-bold text-purple-900">{filteredData.length}</p>
                          </div>
                        )}
                        {!startDate && !endDate && (
                          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                            <p className="text-xs text-green-700 font-semibold mb-1">Displaying</p>
                            <p className="text-2xl font-bold text-green-900">{filteredData.length}</p>
                          </div>
                        )}
                        {searchTerm && (
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                            <p className="text-xs text-orange-700 font-semibold mb-1">Search Results</p>
                            <p className="text-2xl font-bold text-orange-900">{filteredData.length}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Report Results Table */}
              {activeReport && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-600" />
                        {reportTypes.find(r => r.id === activeReport)?.title || 'Report Results'}
                        {filteredData.length > 0 && (
                          <span className="ml-auto text-sm font-normal text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                            {searchTerm ? `${filteredData.length} of ${reportData.length} records found` : `${filteredData.length} total records`}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div id="report-table" className="overflow-x-auto">
                        {loading ? (
                          <div className="space-y-4">
                            {Array(5).fill(0).map((_, i) => (
                              <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />
                            ))}
                          </div>
                        ) : filteredData.length === 0 ? (
                          <div className="text-center py-8 md:py-12 text-slate-500">
                            <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-50" />
                            <p className="text-base md:text-lg font-medium mb-1 md:mb-2">No Data Available</p>
                            <p className="text-xs md:text-sm px-4">Try adjusting your filters or generate a new report</p>
                          </div>
                        ) : (
                          <>
                            {/* Desktop Table View - Full height, all data displayed */}
                            <div className="hidden md:block">
                              <style jsx>{`
                          .custom-scrollbar::-webkit-scrollbar {
                            height: 6px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-track {
                            background: #f1f5f9;
                            border-radius: 3px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 3px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                          }
                        `}</style>
                              {/* Table container - displays ALL rows without limits */}
                              <div className="w-full overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 shadow-sm bg-white">
                                <div className="inline-block min-w-full align-middle">
                                  <table className="min-w-full divide-y divide-slate-200">
                                    <thead>
                                      <tr className="bg-gradient-to-r from-red-500 to-red-600">
                                        {getFilteredColumns(Object.keys(filteredData[0]))
                                          .map((key, index) => {
                                            // Define responsive column width classes based on content type
                                            let widthClass = 'min-w-[100px] md:min-w-[120px]'; // default
                                            if (key === 'email') widthClass = 'min-w-[150px] md:min-w-[200px] lg:min-w-[220px]';
                                            if (key === 'phone') widthClass = 'min-w-[120px] md:min-w-[140px]';
                                            if (key === 'address' || key === 'description' || key === 'message') widthClass = 'min-w-[180px] md:min-w-[250px] lg:min-w-[280px]';
                                            if (key === 'status' || key === 'priority') widthClass = 'min-w-[80px] md:min-w-[100px]';
                                            if (key.includes('date')) widthClass = 'min-w-[120px] md:min-w-[140px] lg:min-w-[160px]';
                                            if (key === 'amount' || key.includes('cost') || key.includes('fee')) widthClass = 'min-w-[100px] md:min-w-[120px]';
                                            if (key === 'full_name' || key === 'name') widthClass = 'min-w-[120px] md:min-w-[160px] lg:min-w-[180px]';
                                            if (key === 'title' || key === 'subject') widthClass = 'min-w-[140px] md:min-w-[200px] lg:min-w-[240px]';

                                            return (
                                              <th
                                                key={key}
                                                className={`${widthClass} px-3 md:px-4 lg:px-6 py-3 md:py-4 text-left font-semibold text-white text-xs md:text-sm uppercase tracking-wider whitespace-nowrap sticky-header`}
                                              >
                                                <div className="flex items-center space-x-1">
                                                  <span className="truncate">{key.replace(/_/g, ' ')}</span>
                                                </div>
                                              </th>
                                            );
                                          })}
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                      {paginatedData.map((item, index) => (
                                        <tr
                                          key={index}
                                          className={`transition-colors duration-200 hover:bg-red-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                            }`}
                                        >
                                          {getFilteredColumns(Object.keys(item))
                                            .map((key, cellIndex) => {
                                              // Match the same responsive width classes as headers
                                              let widthClass = 'min-w-[100px] md:min-w-[120px]'; // default
                                              if (key === 'email') widthClass = 'min-w-[150px] md:min-w-[200px] lg:min-w-[220px]';
                                              if (key === 'phone') widthClass = 'min-w-[120px] md:min-w-[140px]';
                                              if (key === 'address' || key === 'description' || key === 'message') widthClass = 'min-w-[180px] md:min-w-[250px] lg:min-w-[280px]';
                                              if (key === 'status' || key === 'priority') widthClass = 'min-w-[80px] md:min-w-[100px]';
                                              if (key.includes('date')) widthClass = 'min-w-[120px] md:min-w-[140px] lg:min-w-[160px]';
                                              if (key === 'amount' || key.includes('cost') || key.includes('fee')) widthClass = 'min-w-[100px] md:min-w-[120px]';
                                              if (key === 'full_name' || key === 'name') widthClass = 'min-w-[120px] md:min-w-[160px] lg:min-w-[180px]';
                                              if (key === 'title' || key === 'subject') widthClass = 'min-w-[140px] md:min-w-[200px] lg:min-w-[240px]';

                                              return (
                                                <td
                                                  key={key}
                                                  className={`${widthClass} px-3 md:px-4 lg:px-6 py-3 md:py-4 text-slate-700 text-xs md:text-sm border-b border-slate-100 whitespace-nowrap`}
                                                >
                                                  <div className="flex items-center">
                                                    {(() => {
                                                      let value = item[key];
                                                      if (value === null || value === undefined) return <span className="text-slate-400">-</span>;

                                                      if (typeof value === 'boolean') {
                                                        return (
                                                          <Badge className={`text-xs ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {value ? 'Yes' : 'No'}
                                                          </Badge>
                                                        );
                                                      }

                                                      if (typeof value === 'object') {
                                                        return <span className="text-slate-500 text-xs">Object</span>;
                                                      }

                                                      if (key.includes('date') && value) {
                                                        try {
                                                          return (
                                                            <span className="text-slate-600">
                                                              {format(new Date(value), 'MMM dd, yyyy')}
                                                            </span>
                                                          );
                                                        } catch {
                                                          return <span className="text-slate-600">{value}</span>;
                                                        }
                                                      }

                                                      if (key === 'status') {
                                                        return (
                                                          <Badge className={`text-xs font-medium ${value === 'active' || value === 'completed' || value === 'paid' ?
                                                              'bg-green-100 text-green-800 border-green-200' :
                                                              value === 'pending' || value === 'unpaid' ?
                                                                'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                'bg-red-100 text-red-800 border-red-200'
                                                            } border`}>
                                                            {value.toString().charAt(0).toUpperCase() + value.toString().slice(1)}
                                                          </Badge>
                                                        );
                                                      }

                                                      if (key === 'priority') {
                                                        return (
                                                          <Badge className={`text-xs font-medium border ${value === 'urgent' || value === 'high' ?
                                                              'bg-red-100 text-red-800 border-red-200' :
                                                              value === 'medium' ?
                                                                'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                'bg-green-100 text-green-800 border-green-200'
                                                            }`}>
                                                            {value.toString().charAt(0).toUpperCase() + value.toString().slice(1)}
                                                          </Badge>
                                                        );
                                                      }

                                                      if (key === 'amount' || key.includes('cost') || key.includes('fee')) {
                                                        return (
                                                          <span className="font-medium text-slate-900">
                                                            {typeof value === 'number' ? `₱${value.toLocaleString()}` : value}
                                                          </span>
                                                        );
                                                      }

                                                      if (key === 'email') {
                                                        return (
                                                          <span className="text-blue-600 hover:text-blue-800 cursor-pointer truncate max-w-[180px]" title={value.toString()}>
                                                            {value.toString()}
                                                          </span>
                                                        );
                                                      }

                                                      if (key === 'phone') {
                                                        return (
                                                          <span className="text-slate-600 font-mono text-sm">
                                                            {value.toString()}
                                                          </span>
                                                        );
                                                      }

                                                      // Long text fields with truncation
                                                      if (key === 'address' || key === 'description' || key === 'message') {
                                                        return (
                                                          <span className="text-slate-600 truncate max-w-[200px]" title={value.toString()}>
                                                            {value.toString()}
                                                          </span>
                                                        );
                                                      }

                                                      return (
                                                        <span className="text-slate-600 truncate max-w-[150px]" title={value.toString()}>
                                                          {value.toString()}
                                                        </span>
                                                      );
                                                    })()}
                                                  </div>
                                                </td>
                                              );
                                            })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Table Info Banner with Pagination */}
                              <div className="bg-slate-50 border-t border-slate-200 px-4 py-4 space-y-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                  <div className="flex items-center space-x-4">
                                    <span className="text-slate-600 font-medium text-sm">
                                      {filteredData.length > 0 ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} of ${filteredData.length}` : 'No records'} {filteredData.length === 1 ? 'record' : 'records'}
                                    </span>
                                    {searchTerm && (
                                      <span className="text-slate-500 text-xs">
                                        Filtered by: "{searchTerm}"
                                      </span>
                                    )}
                                  </div>
                                  <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Scroll horizontally to view all columns</span>
                                  </div>
                                </div>

                                {/* Pagination Controls */}
                                {filteredData.length > itemsPerPage && (
                                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="text-xs"
                                      >
                                        Previous
                                      </Button>

                                      <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                          <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                                              currentPage === page
                                                ? 'bg-red-600 text-white'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                            }`}
                                          >
                                            {page}
                                          </button>
                                        ))}
                                      </div>

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="text-xs"
                                      >
                                        Next
                                      </Button>
                                    </div>

                                    <span className="text-xs text-slate-600 font-medium">
                                      Page {currentPage} of {totalPages}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Mobile Card View - displays paginated rows */}
                            <div className="block md:hidden space-y-4">
                              {paginatedData.map((item, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="space-y-3">
                                    {getFilteredColumns(Object.keys(item))
                                      .map((key, keyIndex) => {
                                        let value = item[key];
                                        if (value === null || value === undefined) value = '-';

                                        return (
                                          <div key={key} className={`flex justify-between items-center ${keyIndex === 0 ? 'pb-2 border-b border-slate-100' : ''}`}>
                                            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                                              {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-sm font-medium text-slate-900 text-right max-w-[60%]">
                                              {(() => {
                                                if (typeof value === 'boolean') {
                                                  return (
                                                    <Badge className={`text-xs ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                      {value ? 'Yes' : 'No'}
                                                    </Badge>
                                                  );
                                                }
                                                if (typeof value === 'object') return JSON.stringify(value);
                                                if (key.includes('date') && value !== '-') {
                                                  try {
                                                    return format(new Date(value), 'PP');
                                                  } catch {
                                                    return value;
                                                  }
                                                }
                                                if (key === 'status') {
                                                  return (
                                                    <Badge className={`text-xs ${value === 'active' || value === 'completed' || value === 'paid' ?
                                                        'bg-green-100 text-green-800' :
                                                        value === 'pending' || value === 'unpaid' ?
                                                          'bg-yellow-100 text-yellow-800' :
                                                          'bg-red-100 text-red-800'
                                                      }`}>
                                                      {value.toString()}
                                                    </Badge>
                                                  );
                                                }
                                                return (
                                                  <span className="break-words">
                                                    {value.toString()}
                                                  </span>
                                                );
                                              })()}
                                            </span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </motion.div>
                              ))}

                              {/* Mobile Pagination Controls */}
                              {filteredData.length > itemsPerPage && (
                                <div className="flex flex-col items-center gap-3 pt-4 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                      disabled={currentPage === 1}
                                      className="text-xs"
                                    >
                                      Previous
                                    </Button>

                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                          key={page}
                                          onClick={() => setCurrentPage(page)}
                                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                                            currentPage === page
                                              ? 'bg-red-600 text-white'
                                              : 'bg-white border border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {page}
                                        </button>
                                      ))}
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                      disabled={currentPage === totalPages}
                                      className="text-xs"
                                    >
                                      Next
                                    </Button>
                                  </div>

                                  <span className="text-xs text-slate-600 font-medium">
                                    Page {currentPage} of {totalPages}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}