'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, User, Calendar, DollarSign, AlertCircle, X, Edit, Trash2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { createClient } from '@supabase/supabase-js';
import { isNewItem, getRelativeTime } from '@/lib/utils';
import { toast } from 'react-toastify';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Billings() {
  const [billings, setBillings] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [filteredBillings, setFilteredBillings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBilling, setEditingBilling] = useState(null);
  const [deletingBilling, setDeletingBilling] = useState(null);

  // Autocomplete states
  const [homeownerSearch, setHomeownerSearch] = useState("");
  const [showHomeownerDropdown, setShowHomeownerDropdown] = useState(false);
  const [selectedHomeowner, setSelectedHomeowner] = useState(null);
  const [editHomeownerSearch, setEditHomeownerSearch] = useState("");
  const [editShowHomeownerDropdown, setEditShowHomeownerDropdown] = useState(false);
  const [editSelectedHomeowner, setEditSelectedHomeowner] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    homeowner_id: '',
    billing_period: '',
    amount: '',
    due_date: '',
    description: '',
    status: 'unpaid'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBillings();
  }, [billings, searchTerm, statusFilter, homeowners]);

  const loadData = async () => {
    try {
      // Fetch billings with homeowner details
      const { data: billingData, error: billingError } = await supabase
        .from('billing_tbl')
        .select(`
          *,
          homeowner:homeowner_id (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (billingError) throw billingError;

      // Fetch homeowners for dropdown with additional data
      const { data: homeownerData, error: homeownerError } = await supabase
        .from('homeowner_tbl')
        .select('id, full_name, email, phone, unit_number, monthly_dues, property_id')
        .order('full_name');

      if (homeownerError) throw homeownerError;

      setBillings(billingData || []);
      setHomeowners(homeownerData || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getHomeownerName = (id) => {
    const homeowner = homeowners.find(h => h.id === id);
    return homeowner?.full_name || 'N/A';
  };

  // Filter homeowners based on search term
  const getFilteredHomeowners = (searchTerm) => {
    if (!searchTerm.trim()) return homeowners.slice(0, 10); // Show top 10 when no search

    return homeowners.filter(homeowner =>
      homeowner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      homeowner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      homeowner.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  };

  // Handle homeowner selection for create modal
  const handleHomeownerSelect = (homeowner) => {
    setSelectedHomeowner(homeowner);
    setHomeownerSearch(homeowner.full_name);
    setShowHomeownerDropdown(false);

    // Auto-populate form data
    setFormData(prev => ({
      ...prev,
      homeowner_id: homeowner.id.toString(),
      amount: homeowner.monthly_dues ? homeowner.monthly_dues.toString() : prev.amount,
      description: homeowner.monthly_dues ?
        `Monthly association dues for ${homeowner.full_name} - Unit ${homeowner.unit_number}` :
        prev.description
    }));
  };

  // Handle homeowner selection for edit modal
  const handleEditHomeownerSelect = (homeowner) => {
    setEditSelectedHomeowner(homeowner);
    setEditHomeownerSearch(homeowner.full_name);
    setEditShowHomeownerDropdown(false);

    // Auto-populate form data
    setFormData(prev => ({
      ...prev,
      homeowner_id: homeowner.id.toString()
    }));
  };

  const filterBillings = () => {
    let filtered = billings;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(b => {
        const homeownerName = getHomeownerName(b.homeowner_id).toLowerCase();
        return homeownerName.includes(searchTerm.toLowerCase()) ||
               b.billing_period.toLowerCase().includes(searchTerm.toLowerCase()) ||
               b.description.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    setFilteredBillings(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'partially_paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Handle opening edit modal
  const handleEditBilling = (billing) => {
    setEditingBilling(billing);

    // Find the homeowner for autocomplete
    const homeowner = homeowners.find(h => h.id === billing.homeowner_id);
    if (homeowner) {
      setEditSelectedHomeowner(homeowner);
      setEditHomeownerSearch(homeowner.full_name);
    } else {
      setEditSelectedHomeowner(null);
      setEditHomeownerSearch('');
    }

    setFormData({
      homeowner_id: billing.homeowner_id?.toString() || '',
      billing_period: billing.billing_period,
      amount: billing.amount?.toString() || '',
      due_date: billing.due_date,
      description: billing.description,
      status: billing.status
    });
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteBilling = (billing) => {
    setDeletingBilling(billing);
    setIsDeleteModalOpen(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingBilling) return;

    setSubmitting(true);
    try {
      await deleteBilling(deletingBilling.id);
      toast.success('Billing deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingBilling(null);
    } catch (error) {
      console.error('Error deleting billing:', error);
      toast.error('Error deleting billing: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Update billing function
  const updateBilling = async (billingId, updateData) => {
    try {
      const { data, error } = await supabase
        .from('billing_tbl')
        .update(updateData)
        .eq('id', billingId)
        .select(`
          *,
          homeowner:homeowner_id (
            id,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      // Update local state
      setBillings(prev => 
        prev.map(billing => 
          billing.id === billingId 
            ? { ...billing, ...data }
            : billing
        )
      );

      return data;
    } catch (error) {
      console.error('Error updating billing:', error);
      throw error;
    }
  };

  // Delete billing function
  const deleteBilling = async (billingId) => {
    try {
      const { error } = await supabase
        .from('billing_tbl')
        .delete()
        .eq('id', billingId);

      if (error) throw error;

      // Remove from local state
      setBillings(prev => prev.filter(billing => billing.id !== billingId));
      
      return true;
    } catch (error) {
      console.error('Error deleting billing:', error);
      throw error;
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      homeowner_id: '',
      billing_period: '',
      amount: '',
      due_date: '',
      description: '',
      status: 'unpaid'
    });

    // Reset autocomplete states
    setHomeownerSearch('');
    setSelectedHomeowner(null);
    setShowHomeownerDropdown(false);
    setEditHomeownerSearch('');
    setEditSelectedHomeowner(null);
    setEditShowHomeownerDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate form data
      if (!formData.homeowner_id || !formData.billing_period || !formData.amount || !formData.due_date) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (editingBilling) {
        // Update existing billing
        const updateData = {
          homeowner_id: parseInt(formData.homeowner_id),
          billing_period: formData.billing_period,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          description: formData.description,
          status: formData.status
        };
        
        await updateBilling(editingBilling.id, updateData);
        toast.success('Billing updated successfully!');
        setIsEditModalOpen(false);
        setEditingBilling(null);
      } else {
        // Create new billing
        const { data, error } = await supabase
          .from('billing_tbl')
          .insert([{
            homeowner_id: parseInt(formData.homeowner_id),
            billing_period: formData.billing_period,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            description: formData.description,
            status: formData.status,
            created_at: new Date().toISOString()
          }])
          .select();

        if (error) throw error;

        setIsModalOpen(false);
        loadData(); // Refresh the data

        toast.success('Billing created successfully!');
      }

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving billing:', error);
      toast.error('Error saving billing: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const totalOverdue = billings.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Billing</h1>
            <p className="text-lg text-slate-600">Manage association dues and payments</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Bill
          </Button>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Unpaid</CardTitle>
                    <DollarSign className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">₱{billings.filter(b => ['unpaid', 'partially_paid'].includes(b.status)).reduce((acc, b) => acc + b.amount, 0).toLocaleString()}</div>
                    <p className="text-xs text-slate-500">{billings.filter(b => ['unpaid', 'partially_paid'].includes(b.status)).length} pending bills</p>
                </CardContent>
            </Card>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
             <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-red-600">Total Overdue</CardTitle>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-800">₱{totalOverdue.toLocaleString()}</div>
                    <p className="text-xs text-slate-500">{billings.filter(b => b.status === 'overdue').length} overdue bills</p>
                </CardContent>
            </Card>
           </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl font-bold text-slate-900">All Billings</CardTitle>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input placeholder="Search homeowner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
               {loading ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="loading loading-spinner loading-lg"></div>
                  <p className="mt-4">Loading billings...</p>
                </div>
              ) : filteredBillings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Billings Found</h3>
                  <p className="text-slate-600">No billings match your current filters.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {filteredBillings.map((bill, index) => (
                  <motion.div
                    key={bill.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-4 mb-3 md:mb-0">
                      <div className={`w-2 h-12 rounded-full ${getStatusColor(bill.status).split(' ')[0]}`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{bill.billing_period}</h4>
                          {isNewItem(bill.created_at) && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md animate-pulse">
                              <Sparkles className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <User className="w-3 h-3" />
                          {getHomeownerName(bill.homeowner_id)}
                        </div>
                        {bill.description && (
                          <p className="text-sm text-slate-500 mt-1">{bill.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-6 w-full md:w-auto">
                        <div className="text-left md:text-right">
                          <p className="text-lg font-bold text-slate-800">₱{bill.amount.toLocaleString()}</p>
                           <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(bill.due_date), "MMM d, yyyy")}
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusColor(bill.status)} border text-sm w-28 justify-center capitalize`}>
                            {bill.status.replace('_', ' ')}
                          </Badge>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2"
                              onClick={() => handleEditBilling(bill)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-2"
                              onClick={() => handleDeleteBilling(bill)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Create New Billing Modal */}
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
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
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Create New Bill</h3>
                    <p className="text-red-100 text-sm mt-1">Add a new billing record to the system</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Homeowner Selection with Autocomplete */}
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-semibold text-slate-700">
                      Homeowner <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={homeownerSearch}
                        onChange={(e) => {
                          setHomeownerSearch(e.target.value);
                          setShowHomeownerDropdown(true);
                          if (!e.target.value.trim()) {
                            setSelectedHomeowner(null);
                            setFormData(prev => ({ ...prev, homeowner_id: '' }));
                          }
                        }}
                        onFocus={() => setShowHomeownerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowHomeownerDropdown(false), 200)}
                        placeholder="Search by name, email, or unit..."
                        className="w-full px-4 py-3 pr-10 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />

                      {/* Dropdown */}
                      {showHomeownerDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                          {getFilteredHomeowners(homeownerSearch).map(homeowner => (
                            <div
                              key={homeowner.id}
                              className="p-4 hover:bg-red-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                              onClick={() => handleHomeownerSelect(homeowner)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{homeowner.full_name}</p>
                                  <p className="text-sm text-slate-600">{homeowner.email}</p>
                                  <p className="text-xs text-slate-400 mt-1">Unit {homeowner.unit_number}</p>
                                </div>
                                {homeowner.monthly_dues && (
                                  <div className="text-right bg-green-50 px-3 py-2 rounded-lg">
                                    <p className="text-sm font-bold text-green-700">
                                      ₱{homeowner.monthly_dues.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-green-600">Monthly dues</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {getFilteredHomeowners(homeownerSearch).length === 0 && (
                            <div className="p-4 text-center text-slate-500">
                              No homeowners found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedHomeowner && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-900">
                              {selectedHomeowner.full_name} - Unit {selectedHomeowner.unit_number}
                            </p>
                            <p className="text-xs text-green-700 mt-1">{selectedHomeowner.email}</p>
                          </div>
                          {selectedHomeowner.monthly_dues && (
                            <p className="text-base font-bold text-green-800">
                              ₱{selectedHomeowner.monthly_dues.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Billing Period */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Billing Period <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="billing_period"
                      value={formData.billing_period}
                      onChange={handleInputChange}
                      placeholder="e.g., January 2024"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold">₱</span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
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
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Additional notes or description..."
                    rows="4"
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/30 ${
                      submitting ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Create Bill
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Billing Modal */}
      {isEditModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
              setEditingBilling(null);
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
                    <h3 className="text-2xl font-bold">Edit Billing</h3>
                    <p className="text-blue-100 text-sm mt-1">Update billing information</p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBilling(null);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Homeowner Selection with Autocomplete */}
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-semibold text-slate-700">
                      Homeowner <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editHomeownerSearch}
                        onChange={(e) => {
                          setEditHomeownerSearch(e.target.value);
                          setEditShowHomeownerDropdown(true);
                          if (!e.target.value.trim()) {
                            setEditSelectedHomeowner(null);
                            setFormData(prev => ({ ...prev, homeowner_id: '' }));
                          }
                        }}
                        onFocus={() => setEditShowHomeownerDropdown(true)}
                        onBlur={() => setTimeout(() => setEditShowHomeownerDropdown(false), 200)}
                        placeholder="Search by name, email, or unit..."
                        className="w-full px-4 py-3 pr-10 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />

                      {/* Dropdown */}
                      {editShowHomeownerDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                          {getFilteredHomeowners(editHomeownerSearch).map(homeowner => (
                            <div
                              key={homeowner.id}
                              className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                              onClick={() => handleEditHomeownerSelect(homeowner)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{homeowner.full_name}</p>
                                  <p className="text-sm text-slate-600">{homeowner.email}</p>
                                  <p className="text-xs text-slate-400 mt-1">Unit {homeowner.unit_number}</p>
                                </div>
                                {homeowner.monthly_dues && (
                                  <div className="text-right bg-green-50 px-3 py-2 rounded-lg">
                                    <p className="text-sm font-bold text-green-700">
                                      ₱{homeowner.monthly_dues.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-green-600">Monthly dues</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {getFilteredHomeowners(editHomeownerSearch).length === 0 && (
                            <div className="p-4 text-center text-slate-500">
                              No homeowners found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {editSelectedHomeowner && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-900">
                              {editSelectedHomeowner.full_name} - Unit {editSelectedHomeowner.unit_number}
                            </p>
                            <p className="text-xs text-green-700 mt-1">{editSelectedHomeowner.email}</p>
                          </div>
                          {editSelectedHomeowner.monthly_dues && (
                            <p className="text-base font-bold text-green-800">
                              ₱{editSelectedHomeowner.monthly_dues.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Billing Period */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Billing Period <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="billing_period"
                      value={formData.billing_period}
                      onChange={handleInputChange}
                      placeholder="e.g., January 2024"
                      className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold">₱</span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
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
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Additional notes or description..."
                    rows="4"
                    className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingBilling(null);
                      resetForm();
                    }}
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/30 ${
                      submitting ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="w-5 h-5" />
                        Update Billing
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
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Delete Billing</h3>
                    <p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
                  </div>
                </div>
                <button 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingBilling(null);
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
                  Are you sure you want to delete this billing?
                </h4>
                {deletingBilling && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-slate-900">
                        {deletingBilling.billing_period}
                      </h5>
                      <Badge className={`${getStatusColor(deletingBilling.status)} border capitalize`}>
                        {deletingBilling.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{getHomeownerName(deletingBilling.homeowner_id)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {format(new Date(deletingBilling.due_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-sm font-medium">Amount:</span>
                      <span className="text-lg font-bold text-slate-900">₱{deletingBilling.amount.toLocaleString()}</span>
                    </div>
                    {deletingBilling.description && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-600">{deletingBilling.description}</p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-slate-600">
                  This will permanently delete the billing record and all associated data. This action cannot be reversed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingBilling(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    submitting ? 'opacity-80 cursor-not-allowed' : ''
                  }`}
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Billing
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}