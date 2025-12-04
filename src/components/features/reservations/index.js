"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Home,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "react-toastify";
import { GlobalRole } from "@/components/common/layout";
import { isNull } from "lodash";

export default function Appointments() {
  const supabase = createClientComponentClient();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [getRole] = GlobalRole();

  useEffect(() => {
    loadCurrentUser();
    loadAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, statusFilter]);

  useEffect(() => {
    console.log("Current user state changed:", currentUser);
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      console.log("Loading current user...");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("Session:", session);
      if (session?.user) {
        console.log("Current user loaded:", session.user);
        setCurrentUser(session.user);
      } else {
        console.error("No user session found");
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/book-tour`);
      const data = await response.json();

      console.log(data, "get data appointment");

      // if (error) throw error;
      setAppointments(data?.data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    setFilteredAppointments(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertCircle,
        text: "Pending",
      },
      cs_approved: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
        text: "Customer Service Approved",
      },
      sales_approved: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        text: "Fully Approved",
      },
      confirmed: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
        text: "Confirmed",
      },
      rejected: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle,
        text: "Rejected",
      },
      cancelled: {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: XCircle,
        text: "Cancelled",
      },
      completed: {
        color: "bg-slate-100 text-slate-800 border-slate-200",
        icon: CheckCircle,
        text: "Completed",
      },
      no_show: {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        icon: XCircle,
        text: "No Show",
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleApproveClick = (appointment) => {
    console.log("Approve button clicked for appointment:", appointment);
    console.log("Current user at click time:", currentUser);
    setSelectedAppointment(appointment);
    setApprovalNotes("");
    setApproveModalOpen(true);
  };

  const handleRejectClick = (appointment) => {
    setSelectedAppointment(appointment);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedAppointment) {
      console.error("Missing selected appointment");
      toast.error("Missing appointment data");
      return;
    }

    console.log("Starting approval process...");
    console.log("Selected appointment:", selectedAppointment);

    setProcessingId(selectedAppointment.appointment_id);
    try {
      // Get current user directly from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("Session retrieved:", session);

      if (!session?.user) {
        console.error("No active session found");
        toast.error("Please log in to approve appointments");
        setProcessingId(null);
        return;
      }

      const approverId = session.user.id;
      console.log("Approver ID:", approverId);
      console.log("User role:", getRole);

      const requestBody = {
        appointment_id: selectedAppointment.appointment_id,
        approver_id: approverId,
        approval_notes: approvalNotes,
      };

      console.log("Sending request to /api/book-tour/approve");
      console.log("Request body:", requestBody);

      const response = await fetch("/api/book-tour/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      const result = await response.json();
      console.log("Response data:", result);

      if (result.success) {
        toast.success(result.message || "Appointment approved successfully!");
        setApproveModalOpen(false);
        setSelectedAppointment(null);
        setApprovalNotes("");
        await loadAppointments();
      } else {
        console.error("Approval failed:", result.message);
        toast.error(result.message || "Failed to approve appointment");
      }
    } catch (error) {
      console.error("Error approving appointment:", error);
      toast.error("Error approving appointment: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedAppointment || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessingId(selectedAppointment.appointment_id);
    try {
      // Get current user directly from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.error("No active session found");
        toast.error("Please log in to reject appointments");
        setProcessingId(null);
        return;
      }

      const rejectorId = session.user.id;

      const response = await fetch("/api/book-tour/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedAppointment.appointment_id,
          rejector_id: rejectorId,
          rejection_reason: rejectionReason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Appointment rejected");
        setRejectModalOpen(false);
        setSelectedAppointment(null);
        setRejectionReason("");
        await loadAppointments();
      } else {
        toast.error(result.message || "Failed to reject appointment");
      }
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      toast.error("Error rejecting appointment");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Tour Booking Appointments
            </h1>
            <p className="text-lg text-slate-600">
              Review and manage property tour bookings
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">
              Filter by Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="cs_approved">Customer Service Approved</option>
              <option value="sales_approved">Fully Approved</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <span className="text-sm text-slate-600">
              Showing {filteredAppointments.length} of {appointments.length}{" "}
              appointments
            </span>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-red-600 mb-4" />
              <p className="text-slate-600">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Appointments Found
              </h3>
              <p className="text-slate-600">
                No appointments match your filters.
              </p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Message & Notes
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredAppointments.map((appointment, index) => (
                      <motion.tr
                        key={appointment.appointment_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* Property */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Home className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {appointment.property_title || "Property Tour"}
                              </p>
                              <p className="text-xs text-slate-500">
                                ID: {appointment.property_id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-900">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-medium">
                                {appointment.client_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{appointment.client_email}</span>
                            </div>
                            {appointment.client_phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{appointment.client_phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-900">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="font-medium">
                                {formatDate(appointment.appointment_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>
                                {formatTime(appointment.appointment_time)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Booked: {formatDate(appointment.created_at)}
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(appointment.status)}
                        </td>

                        {/* Message */}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {appointment.message ? (
                              <div className="flex items-start gap-2 max-w-xs">
                                <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-600 line-clamp-2">
                                  {appointment.message}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400 italic">
                                No message
                              </span>
                            )}

                            {/* Show Customer Service approval notes if exists */}
                            {appointment.cs_approval_notes && (
                              <div className="flex items-start gap-2 max-w-xs bg-blue-50 p-2 rounded">
                                <CheckCircle className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-blue-900">Customer Service Notes:</p>
                                  <p className="text-xs text-blue-800 line-clamp-2">
                                    {appointment.cs_approval_notes}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Show Sales Representative approval notes if exists */}
                            {appointment.sales_approval_notes && (
                              <div className="flex items-start gap-2 max-w-xs bg-green-50 p-2 rounded">
                                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-green-900">Sales Representative Notes:</p>
                                  <p className="text-xs text-green-800 line-clamp-2">
                                    {appointment.sales_approval_notes}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Customer Service: Can approve/reject when status is "pending" */}
                            {getRole
                              .toLowerCase()
                              .includes("customer service") &&
                              appointment.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() =>
                                      handleApproveClick(appointment)
                                    }
                                    disabled={
                                      processingId ===
                                      appointment.appointment_id
                                    }
                                  >
                                    {processingId ===
                                    appointment.appointment_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <ThumbsUp className="w-4 h-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() =>
                                      handleRejectClick(appointment)
                                    }
                                    disabled={
                                      processingId ===
                                      appointment.appointment_id
                                    }
                                  >
                                    <ThumbsDown className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}

                            {/* Sales Representative: Can approve/reject when status is "cs_approved" */}
                            {getRole.toLowerCase().includes("sales") &&
                              appointment.status === "cs_approved" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() =>
                                      handleApproveClick(appointment)
                                    }
                                    disabled={
                                      processingId ===
                                      appointment.appointment_id
                                    }
                                  >
                                    {processingId ===
                                    appointment.appointment_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <ThumbsUp className="w-4 h-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() =>
                                      handleRejectClick(appointment)
                                    }
                                    disabled={
                                      processingId ===
                                      appointment.appointment_id
                                    }
                                  >
                                    <ThumbsDown className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}

                            {/* Show rejection reason if rejected */}
                            {appointment.status === "rejected" &&
                              appointment.rejection_reason && (
                                <div className="text-xs text-red-600">
                                  <p className="font-medium">Reason:</p>
                                  <p className="line-clamp-2">
                                    {appointment.rejection_reason}
                                  </p>
                                </div>
                              )}

                            {/* Show waiting message for appointments not in user's queue */}
                            {((getRole
                              .toLowerCase()
                              .includes("customer service") &&
                              appointment.status !== "pending") ||
                              (getRole.toLowerCase().includes("sales") &&
                                appointment.status !== "cs_approved")) &&
                              appointment.status !== "rejected" &&
                              appointment.status !== "sales_approved" &&
                              appointment.status !== "confirmed" && (
                                <span className="text-xs text-yellow-600 font-medium">
                                  Awaiting approval from other department
                                </span>
                              )}

                            {/* Show completion status */}
                            {(appointment.status === "sales_approved" ||
                              appointment.status === "confirmed") && (
                              <span className="text-xs text-green-600 font-semibold">
                                Fully Approved
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Approve Modal */}
      {approveModalOpen && selectedAppointment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setApproveModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Approve Appointment</h3>
                    <p className="text-green-100 text-sm">
                      {getRole.toLowerCase().includes("sales")
                        ? "Sales Representative Approval"
                        : "Customer Service Approval"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setApproveModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Property:</p>
                <p className="font-semibold text-slate-900">
                  {selectedAppointment.property_title}
                </p>
                <p className="text-sm text-slate-600 mt-2">Client:</p>
                <p className="font-medium text-slate-900">
                  {selectedAppointment.client_name}
                </p>
              </div>

              {/* Show Customer Service notes when Sales Rep is reviewing */}
              {getRole.toLowerCase().includes("sales") &&
                selectedAppointment.cs_approval_notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          Customer Service Notes:
                        </p>
                        <p className="text-sm text-blue-800">
                          {selectedAppointment.cs_approval_notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Show Sales Representative notes when Customer Service is viewing */}
              {getRole.toLowerCase().includes("customer service") &&
                selectedAppointment.sales_approval_notes && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          Sales Representative Notes:
                        </p>
                        <p className="text-sm text-green-800">
                          {selectedAppointment.sales_approval_notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Add any notes about this approval..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setApproveModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={processingId === selectedAppointment.appointment_id}
                >
                  {processingId === selectedAppointment.appointment_id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedAppointment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setRejectModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Reject Appointment</h3>
                    <p className="text-red-100 text-sm">Provide a reason</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Property:</p>
                <p className="font-semibold text-slate-900">
                  {selectedAppointment.property_title}
                </p>
                <p className="text-sm text-slate-600 mt-2">Client:</p>
                <p className="font-medium text-slate-900">
                  {selectedAppointment.client_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={
                    processingId === selectedAppointment.appointment_id ||
                    !rejectionReason.trim()
                  }
                >
                  {processingId === selectedAppointment.appointment_id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
