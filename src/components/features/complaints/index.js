'use client';
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ReactSelect from "react-select";
import { Plus, Search, AlertTriangle, Building2, User, X, Edit, Trash2, AlertTriangle as AlertTriangleIcon, Loader2, Sparkles, Eye, CheckCircle, XCircle, Ban, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { formattedDate, isNewItem, getRelativeTime } from "@/lib/utils";
import { toast } from "react-toastify";

// Initialize Supabase client
const supabase = createClientComponentClient();

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [properties, setProperties] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [deletingComplaint, setDeletingComplaint] = useState(null);
  const [viewingComplaint, setViewingComplaint] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    complaint_type: '',
    severity: 'medium',
    status: 'pending',
    contract_id: '', // Changed from homeowner_id to contract_id
    property_id: '',
    created_date: new Date().toISOString()
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter, severityFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch complaints with related data
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaint_tbl')
        .select(`
          *,
          property_contracts!contract_id(contract_id, client_name),
          property_info_tbl!property_id(property_id, property_title)
        `)
        .order('created_date', { ascending: false });

      if (complaintsError) throw complaintsError;

      // Fetch properties for dropdown
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('property_info_tbl')
        .select('property_id, property_title')
        .order('property_title');

      if (propertiesError) throw propertiesError;

      // Load contracts (which link homeowners to properties) for the dropdown
      const { data: contractsData, error: contractsError } = await supabase
        .from("property_contracts")
        .select(`
          contract_id,
          client_name,
          client_email,
          property_id,
          property_title,
          contract_status
        `)
        .in("contract_status", ["active", "pending", "completed"])
        .order("client_name");

      if (contractsError) throw contractsError;

      console.log("✅ Loaded contracts:", contractsData?.length || 0);

      setComplaints(complaintsData || []);
      setProperties(propertiesData || []);
      setHomeowners(contractsData || []); // Using contracts as "homeowners" for the dropdown
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.property_contracts?.client_name && c.property_contracts.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter(c => c.severity === severityFilter);
    }

    setFilteredComplaints(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContractChange = (selectedOption) => {
    if (!selectedOption) {
      setFormData(prev => ({ ...prev, contract_id: '', property_id: '' }));
      return;
    }

    // Find the selected contract and set both contract_id and property_id
    const selectedContract = homeowners.find(h => h.contract_id === selectedOption.value);
    setFormData(prev => ({
      ...prev,
      contract_id: selectedOption.value,
      property_id: selectedContract?.property_id || ''
    }));
  };

  // Handle opening edit modal
  const handleEditComplaint = (complaint) => {
    setEditingComplaint(complaint);
    setFormData({
      subject: complaint.subject,
      description: complaint.description,
      complaint_type: complaint.complaint_type,
      severity: complaint.severity,
      status: complaint.status,
      contract_id: complaint.contract_id?.toString() || '', // Changed from homeowner_id
      property_id: complaint.property_id?.toString() || '',
      created_date: complaint.created_date
    });
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteComplaint = (complaint) => {
    setDeletingComplaint(complaint);
    setIsDeleteModalOpen(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingComplaint) return;

    setFormSubmitting(true);
    try {
      await deleteComplaint(deletingComplaint.id, deletingComplaint.subject);
      toast.success('Complaint deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingComplaint(null);
    } catch (error) {
      console.error('Error deleting complaint:', error);
      toast.info('Error deleting complaint: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle opening view modal
  const handleViewComplaint = (complaint) => {
    setViewingComplaint(complaint);
    setIsViewModalOpen(true);
  };

  // Handle approve complaint
  const handleApproveComplaint = async (complaint) => {
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: complaint.id,
          status: 'investigating',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve complaint');
      }

      // Update local state
      await loadData();
      toast.success('Complaint approved and moved to investigating!');
    } catch (error) {
      console.error('Error approving complaint:', error);
      toast.error('Error approving complaint: ' + error.message);
    }
  };

  // Handle reject complaint
  const handleRejectComplaint = async (complaint) => {
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: complaint.id,
          status: 'closed',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject complaint');
      }

      // Update local state
      await loadData();
      toast.success('Complaint rejected and closed!');
    } catch (error) {
      console.error('Error rejecting complaint:', error);
      toast.error('Error rejecting complaint: ' + error.message);
    }
  };

  // Handle close complaint
  const handleCloseComplaint = async (complaint) => {
    try {
      // Call API to update status to closed
      const response = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: complaint.id,
          status: 'closed',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to close complaint');
      }

      // Update local state
      await loadData();
      toast.success('Complaint closed successfully!');
    } catch (error) {
      console.error('Error closing complaint:', error);
      toast.error('Error closing complaint: ' + error.message);
    }
  };

  // Handle decline complaint
  const handleDeclineComplaint = async (complaint) => {
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: complaint.id,
          status: 'escalated',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to decline complaint');
      }

      // Update local state
      await loadData();
      toast.info('Complaint declined and escalated!');
    } catch (error) {
      console.error('Error declining complaint:', error);
      toast.error('Error declining complaint: ' + error.message);
    }
  };

  // Handle revert complaint to pending
  const handleRevertComplaint = async (complaint) => {
    try {
      // Call API to update status and trigger notification
      const response = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: complaint.id,
          status: 'pending',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to revert complaint');
      }

      // Update local state
      await loadData();
      toast.success('Complaint reverted to pending!');
    } catch (error) {
      console.error('Error reverting complaint:', error);
      toast.error('Error reverting complaint: ' + error.message);
    }
  };

  // Update complaint function
  const updateComplaint = async (complaintId, updateData) => {
    try {
      const { data, error } = await supabase
        .from('complaint_tbl')
        .update(updateData)
        .eq('id', complaintId)
        .select(`
          *,
          property_contracts!contract_id(contract_id, client_name),
          property_info_tbl!property_id(property_id, property_title)
        `)
        .single();

      if (error) throw error;

      // Update local state
      setComplaints(prev =>
        prev.map(complaint =>
          complaint.id === complaintId
            ? { ...complaint, ...data }
            : complaint
        )
      );

      return data;
    } catch (error) {
      console.error('Error updating complaint:', error);
      throw error;
    }
  };

  // Delete complaint function
  const deleteComplaint = async (complaintId, complaintSubject) => {
    try {
      const { error } = await supabase
        .from('complaint_tbl')
        .delete()
        .eq('id', complaintId);

      if (error) throw error;

      // Remove from local state
      setComplaints(prev => prev.filter(complaint => complaint.id !== complaintId));
      
      return true;
    } catch (error) {
      console.error('Error deleting complaint:', error);
      throw error;
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      subject: '',
      description: '',
      complaint_type: '',
      severity: 'medium',
      status: 'pending',
      contract_id: '', // Changed from homeowner_id
      property_id: '',
      created_date: new Date().toISOString()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      // Validate required fields
      if (!formData.subject || !formData.description || !formData.complaint_type) {
        toast.error("Please fill in all required fields");
        setFormSubmitting(false);
        return;
      }

      if (!formData.contract_id) {
        toast.error("Please select a homeowner");
        setFormSubmitting(false);
        return;
      }

      if (editingComplaint) {
        // Update existing complaint
        const updateData = {
          subject: formData.subject,
          description: formData.description,
          complaint_type: formData.complaint_type,
          severity: formData.severity,
          status: formData.status,
          contract_id: formData.contract_id,
          property_id: formData.property_id
        };

        await updateComplaint(editingComplaint.id, updateData);
        toast.success('Complaint updated successfully!');
        setIsEditModalOpen(false);
        setEditingComplaint(null);
      } else {
        // Insert new complaint into Supabase
        const { data, error } = await supabase
          .from('complaint_tbl')
          .insert([{
            subject: formData.subject,
            description: formData.description,
            complaint_type: formData.complaint_type,
            severity: formData.severity,
            status: formData.status,
            contract_id: formData.contract_id,
            property_id: formData.property_id,
            created_date: new Date().toISOString()
          }])
          .select(`
            *,
            property_contracts!contract_id(contract_id, client_name),
            property_info_tbl!property_id(property_id, property_title)
          `);

        if (error) throw error;

        setComplaints(prev => [data[0], ...prev]);
        setIsModalOpen(false);

        toast.success('Complaint filed successfully!');
      }

      // Reset form
      resetForm();
      await loadData(); // Reload to ensure fresh state
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('Error filing complaint: ' + (error.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const getPropertyName = (complaint) => {
    return complaint.property_info_tbl?.property_title || 'N/A';
  };

  const getHomeownerName = (complaint) => {
    return complaint.property_contracts?.client_name || 'N/A';
  };
  
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      investigating: 'Under Review',
      closed: 'Closed',
    };
    return labels[status] || status;
  };
  
  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-400 text-white',
      medium: 'bg-yellow-400 text-yellow-900',
      low: 'bg-green-400 text-green-900',
    };
    return colors[severity] || 'bg-gray-400 text-white';
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Complaints</h1>
            <p className="text-lg text-slate-600">Address and resolve homeowner complaints</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" /> File Complaint
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Search complaints..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="investigating">Under Review</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {loading ? (
            <div className="text-center py-12">Loading complaints...</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Complaints Found</h3>
              <p className="text-slate-600">No complaints match the current filters.</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Filed By</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Filed Date</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredComplaints.map((complaint, index) => (
                      <motion.tr
                        key={complaint.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-slate-900">{complaint.subject}</div>
                              <div className="text-xs text-slate-500 mt-1 line-clamp-1">{complaint.description}</div>
                            </div>
                            {isNewItem(complaint.created_date) && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md animate-pulse text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                New
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="capitalize text-xs">
                            {complaint.complaint_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{getHomeownerName(complaint)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{getPropertyName(complaint)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className={`${getSeverityColor(complaint.severity)} capitalize text-xs`}>
                            {complaint.severity}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${getStatusColor(complaint.status)} border text-xs`}>
                            {getStatusLabel(complaint.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formattedDate(new Date(complaint.created_date), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => handleViewComplaint(complaint)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleEditComplaint(complaint)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleCloseComplaint(complaint)}
                              disabled={complaint.status === 'closed'}
                              title="Close Complaint"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteComplaint(complaint)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Complaint Modal */}
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">File New Complaint</h3>
                    <p className="text-red-100 text-sm mt-1">Submit a new homeowner complaint</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Enter complaint subject"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Complaint Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="complaint_type"
                      value={formData.complaint_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="noise">Noise</option>
                      <option value="parking">Parking</option>
                      <option value="security">Security</option>
                      <option value="billing">Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the complaint in detail..."
                    rows="4"
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="homeowner" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Homeowner <span className="text-red-500">*</span>
                    </Label>
                    <ReactSelect
                      className="mt-2 react-select-container"
                      classNamePrefix="react-select"
                      options={homeowners.map(contract => ({
                        value: contract.contract_id,
                        label: `${contract.client_name} - ${contract.property_title || 'No property'}`
                      }))}
                      value={
                        formData.contract_id
                          ? {
                              value: formData.contract_id,
                              label: homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString())
                                ? `${homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString()).client_name} - ${homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString()).property_title || 'No property'}`
                                : 'Select homeowner'
                            }
                          : null
                      }
                      onChange={handleContractChange}
                      placeholder="Search and select a homeowner..."
                      isClearable
                      isSearchable
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="property" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Property
                    </Label>
                    <Input
                      type="text"
                      className="mt-2 h-11 bg-slate-50 border-slate-300 cursor-not-allowed rounded-xl"
                      value={
                        formData.contract_id
                          ? homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString())?.property_title || ''
                          : ''
                      }
                      placeholder={formData.contract_id ? "Auto-filled from contract" : "Select homeowner first"}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Severity
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="investigating">Under Review</option>
                    </select>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/30 ${
                      formSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        File Complaint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Complaint Modal */}
      {isEditModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
              setEditingComplaint(null);
              resetForm();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Edit Complaint</h3>
                    <p className="text-blue-100 text-sm mt-1">Update complaint information</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingComplaint(null);
                    resetForm();
                  }}
                  disabled={formSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Enter complaint subject"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Complaint Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="complaint_type"
                      value={formData.complaint_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="noise">Noise</option>
                      <option value="parking">Parking</option>
                      <option value="security">Security</option>
                      <option value="billing">Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the complaint in detail..."
                    rows="4"
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-homeowner" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Homeowner <span className="text-red-500">*</span>
                    </Label>
                    <ReactSelect
                      className="mt-2 react-select-container"
                      classNamePrefix="react-select"
                      options={homeowners.map(contract => ({
                        value: contract.contract_id,
                        label: `${contract.client_name} - ${contract.property_title || 'No property'}`
                      }))}
                      value={
                        formData.contract_id
                          ? {
                              value: formData.contract_id,
                              label: homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString())
                                ? `${homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString()).client_name} - ${homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString()).property_title || 'No property'}`
                                : 'Select homeowner'
                            }
                          : null
                      }
                      onChange={handleContractChange}
                      placeholder="Search and select a homeowner..."
                      isClearable
                      isSearchable
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-property" className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      Property
                    </Label>
                    <Input
                      type="text"
                      className="mt-2 h-11 bg-slate-50 border-slate-300 cursor-not-allowed rounded-xl"
                      value={
                        formData.contract_id
                          ? homeowners.find(h => h.contract_id?.toString() === formData.contract_id.toString())?.property_title || ''
                          : ''
                      }
                      placeholder={formData.contract_id ? "Auto-filled from contract" : "Select homeowner first"}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Severity
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="investigating">Under Review</option>
                    </select>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingComplaint(null);
                      resetForm();
                    }}
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/30 ${
                      formSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="w-5 h-5" />
                        Update Complaint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setIsDeleteModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Delete Complaint</h3>
                    <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                  </div>
                </div>
                <button 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingComplaint(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this complaint?
                </h4>
                {deletingComplaint && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                    <h5 className="font-medium text-slate-900 mb-1">{deletingComplaint.subject}</h5>
                    <p className="text-sm text-slate-600 mb-2">{deletingComplaint.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">{deletingComplaint.complaint_type}</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded capitalize ${getSeverityColor(deletingComplaint.severity)}`}>
                          {deletingComplaint.severity}
                        </span>
                        <span className={`px-2 py-1 rounded capitalize ${getStatusColor(deletingComplaint.status)}`}>
                          {deletingComplaint.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      <p>Filed by: {getHomeownerName(deletingComplaint)}</p>
                      <p>Property: {getPropertyName(deletingComplaint)}</p>
                    </div>
                  </div>
                )}
                <p className="text-slate-600">
                  This will permanently delete the complaint and all associated data. This action cannot be reversed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingComplaint(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    formSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                  }`}
                  onClick={handleConfirmDelete}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Complaint
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* View Complaint Modal */}
      {isViewModalOpen && viewingComplaint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsViewModalOpen(false);
              setViewingComplaint(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">View Complaint Details</h3>
                    <p className="text-indigo-100 text-sm mt-1">Complete complaint information</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingComplaint(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                <div className="flex gap-3">
                  <Badge className={`${getStatusColor(viewingComplaint.status)} border capitalize`}>
                    {viewingComplaint.status}
                  </Badge>
                  <Badge variant="secondary" className={`${getSeverityColor(viewingComplaint.severity)} capitalize`}>
                    {viewingComplaint.severity}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {viewingComplaint.complaint_type}
                  </Badge>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Subject</h4>
                    <p className="text-slate-900 font-medium">{viewingComplaint.subject}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Description</h4>
                    <p className="text-slate-900">{viewingComplaint.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                      <User className="w-4 h-4" />
                      <h4 className="text-sm font-semibold">Filed By</h4>
                    </div>
                    <p className="text-slate-900">{getHomeownerName(viewingComplaint)}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                      <Building2 className="w-4 h-4" />
                      <h4 className="text-sm font-semibold">Property</h4>
                    </div>
                    <p className="text-slate-900">{getPropertyName(viewingComplaint)}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Filed Date</h4>
                    <p className="text-slate-900">
                      {formattedDate(new Date(viewingComplaint.created_date), "MMM d, yyyy, p")}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Last Updated</h4>
                    <p className="text-slate-900">
                      {formattedDate(new Date(viewingComplaint.updated_date || viewingComplaint.created_date), "MMM d, yyyy, p")}
                    </p>
                  </div>
                </div>

                {viewingComplaint.resolution_notes && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">Resolution Notes</h4>
                    <p className="text-green-800">{viewingComplaint.resolution_notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingComplaint(null);
                  }}
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewingComplaint(null);
                    handleEditComplaint(viewingComplaint);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  <Edit className="w-5 h-5" />
                  Edit Complaint
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}