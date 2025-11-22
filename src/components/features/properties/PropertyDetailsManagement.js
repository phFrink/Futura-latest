'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, AlertTriangle, Loader2, Home, XCircle, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from '@supabase/supabase-js';
import { isNewItem, getRelativeTime } from '@/lib/utils';
import { toast } from 'react-toastify';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PropertyDetailsManagement() {
  const [propertyDetails, setPropertyDetails] = useState([]);
  const [filteredDetails, setFilteredDetails] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);
  const [deletingDetail, setDeletingDetail] = useState(null);

  // Common specification types
  const specificationTypes = [
    'unit', 'sqm', 'storey', 'pcs', 'meter', 'percent', 'other'
  ];

  // Form state - using flexible specifications array
  const [formData, setFormData] = useState({
    property_name: '',
    specifications: [] // Array of {name, type, value}
  });

  useEffect(() => {
    loadPropertyDetails();
  }, []);

  useEffect(() => {
    filterDetails();
  }, [propertyDetails, searchTerm]);

  // Load all property details
  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_detail_tbl')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPropertyDetails(data || []);
    } catch (error) {
      console.error('Error loading property details:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  // Filter details based on search
  const filterDetails = () => {
    if (!searchTerm.trim()) {
      setFilteredDetails(propertyDetails);
      return;
    }

    const filtered = propertyDetails.filter(detail =>
      detail.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detail.property_area?.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDetails(filtered);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      property_name: '',
      specifications: []
    });
  };

  // Add specification
  const handleAddSpecification = () => {
    setFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { name: '', type: 'unit', value: '' }]
    }));
  };

  // Remove specification
  const handleRemoveSpecification = (index) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  // Update specification field
  const handleSpecificationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      )
    }));
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (detail) => {
    setEditingDetail(detail);
    setFormData({
      property_name: detail.property_name || '',
      specifications: Array.isArray(detail.property_area) ? detail.property_area : []
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (detail) => {
    setDeletingDetail(detail);
    setIsDeleteModalOpen(true);
  };

  // Check if property name already exists
  const checkDuplicateName = async (property_name, excludeId = null) => {
    try {
      let query = supabase
        .from('property_detail_tbl')
        .select('detail_id')
        .eq('property_name', property_name.trim());

      if (excludeId) {
        query = query.neq('detail_id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  };


  // Add new property detail
  const handleAddDetail = async (e) => {
    e.preventDefault();

    if (!formData.property_name.trim()) {
      toast.error('Please enter a property name');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check for duplicate property name
      const isDuplicate = await checkDuplicateName(formData.property_name);

      if (isDuplicate) {
        toast.error(`Property name "${formData.property_name}" already exists!`);
        setIsSubmitting(false);
        return;
      }

      // Filter out empty specifications
      const property_area = formData.specifications
        .filter(spec => spec.name.trim() && spec.value.trim())
        .map(spec => ({
          name: spec.name.trim(),
          type: spec.type,
          value: spec.value.trim()
        }));

      const { data, error } = await supabase
        .from('property_detail_tbl')
        .insert([{
          property_name: formData.property_name.trim(),
          property_area
        }])
        .select();

      if (error) throw error;

      toast.success('Property detail added successfully!');
      setIsModalOpen(false);
      resetForm();
      loadPropertyDetails();
    } catch (error) {
      console.error('Error adding property detail:', error);
      toast.error(error.message || 'Failed to add property detail');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update property detail
  const handleUpdateDetail = async (e) => {
    e.preventDefault();

    if (!formData.property_name.trim()) {
      toast.error('Please enter a property name');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check for duplicate property name (excluding current record)
      const isDuplicate = await checkDuplicateName(formData.property_name, editingDetail.detail_id);

      if (isDuplicate) {
        toast.error(`Property name "${formData.property_name}" already exists!`);
        setIsSubmitting(false);
        return;
      }

      // Filter out empty specifications
      const property_area = formData.specifications
        .filter(spec => spec.name.trim() && spec.value.trim())
        .map(spec => ({
          name: spec.name.trim(),
          type: spec.type,
          value: spec.value.trim()
        }));

      const { error } = await supabase
        .from('property_detail_tbl')
        .update({
          property_name: formData.property_name.trim(),
          property_area,
          updated_at: new Date().toISOString()
        })
        .eq('detail_id', editingDetail.detail_id);

      if (error) throw error;

      toast.success('Property detail updated successfully!');
      setIsEditModalOpen(false);
      setEditingDetail(null);
      resetForm();
      loadPropertyDetails();
    } catch (error) {
      console.error('Error updating property detail:', error);
      toast.error(error.message || 'Failed to update property detail');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete property detail
  const handleDeleteDetail = async () => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('property_detail_tbl')
        .delete()
        .eq('detail_id', deletingDetail.detail_id);

      if (error) throw error;

      toast.success('Property detail deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingDetail(null);
      loadPropertyDetails();
    } catch (error) {
      console.error('Error deleting property detail:', error);
      toast.error(error.message || 'Failed to delete property detail');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: propertyDetails.length,
    totalSpecs: propertyDetails.reduce((sum, d) => sum + (d.property_area?.length || 0), 0),
    avgSpecsPerProperty: propertyDetails.length > 0
      ? (propertyDetails.reduce((sum, d) => sum + (d.property_area?.length || 0), 0) / propertyDetails.length).toFixed(1)
      : 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Types</h1>
          <p className="text-gray-500 mt-1">Manage property types and their areas</p>
        </div>
        <Button onClick={openAddModal} className="gap-2 bg-gradient-to-r from-red-600 to-red-700">
          <Plus className="w-4 h-4" />
          Add Property Type
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Property Types</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Specifications</CardTitle>
            <Tag className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalSpecs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Specs Per Type</CardTitle>
            <Tag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avgSpecsPerProperty}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by property name or block..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Property Details List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : filteredDetails.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Home className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No property types found matching your search' : 'No property types added yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDetails.map((detail, index) => (
            <motion.div
              key={detail.detail_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {detail.property_name}
                      {isNewItem(detail.created_at) && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </CardTitle>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {getRelativeTime(detail.created_at)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold text-gray-700">Specifications ({detail.property_area?.length || 0})</p>
                    </div>
                    {detail.property_area && detail.property_area.length > 0 ? (
                      <div className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50 space-y-1.5">
                        {detail.property_area.map((spec, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white px-2 py-1.5 rounded border border-gray-100">
                            <span className="text-gray-600 capitalize font-medium">{spec.name}</span>
                            <span className="font-semibold text-gray-900">{spec.value} <span className="text-gray-500 text-[10px] uppercase">{spec.type}</span></span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No specifications defined</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(detail)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(detail)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add Property Type</h2>
                    <p className="text-red-100 text-sm">Create new property type</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-8 max-h-[calc(90vh-180px)] overflow-y-auto">
            <form onSubmit={handleAddDetail} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    name="property_name"
                    value={formData.property_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Residential, Commercial, Industrial"
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a unique property type name</p>
              </div>

              {/* Specifications Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Property Specifications</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSpecification}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Specification
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.specifications.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No specifications added yet. Click "Add Specification" to add one.</p>
                  ) : (
                    formData.specifications.map((spec, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <Input
                                type="text"
                                value={spec.name}
                                onChange={(e) => handleSpecificationChange(index, 'name', e.target.value)}
                                placeholder="e.g., Bedroom"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                              <select
                                value={spec.type}
                                onChange={(e) => handleSpecificationChange(index, 'type', e.target.value)}
                                className="h-9 w-full text-sm border-2 border-gray-200 rounded-md px-2 focus:border-red-500 focus:outline-none"
                              >
                                {specificationTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                              <Input
                                type="text"
                                value={spec.value}
                                onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                                placeholder="e.g., 2 or 50.4 - 117"
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSpecification(index)}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 mt-5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Create Type
                    </>
                  )}
                </Button>
              </div>
            </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Property Type</h2>
                    <p className="text-red-100 text-sm">Update property type information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingDetail(null);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-8 max-h-[calc(90vh-180px)] overflow-y-auto">
            <form onSubmit={handleUpdateDetail} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    name="property_name"
                    value={formData.property_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Residential, Commercial, Industrial"
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a unique property type name</p>
              </div>

              {/* Specifications Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Property Specifications</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSpecification}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Specification
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.specifications.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No specifications added yet. Click "Add Specification" to add one.</p>
                  ) : (
                    formData.specifications.map((spec, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                              <Input
                                type="text"
                                value={spec.name}
                                onChange={(e) => handleSpecificationChange(index, 'name', e.target.value)}
                                placeholder="e.g., Bedroom"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                              <select
                                value={spec.type}
                                onChange={(e) => handleSpecificationChange(index, 'type', e.target.value)}
                                className="h-9 w-full text-sm border-2 border-gray-200 rounded-md px-2 focus:border-red-500 focus:outline-none"
                              >
                                {specificationTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                              <Input
                                type="text"
                                value={spec.value}
                                onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                                placeholder="e.g., 2 or 50.4 - 117"
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSpecification(index)}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 mt-5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingDetail(null);
                    resetForm();
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5 mr-2" />
                      Update Type
                    </>
                  )}
                </Button>
              </div>
            </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Delete Property Type</h2>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Warning: Permanent Deletion
                    </p>
                    <p className="text-sm text-red-700">
                      Are you sure you want to delete <span className="font-bold">{deletingDetail?.property_name}</span>?
                      This will permanently remove all associated data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingDetail(null);
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteDetail}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete Type
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
