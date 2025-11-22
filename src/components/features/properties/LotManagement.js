'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, AlertTriangle, Loader2, MapPin, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from '@supabase/supabase-js';
import { isNewItem, getRelativeTime } from '@/lib/utils';
import { toast } from 'react-toastify';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LotManagement() {
  const [lots, setLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [deletingLot, setDeletingLot] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    lot_number: '',
    property_type_id: '',
    property_block: '',
    is_occupied: false
  });

  useEffect(() => {
    loadLots();
    loadPropertyTypes();
  }, []);

  useEffect(() => {
    filterLots();
  }, [lots, searchTerm, propertyTypeFilter]);

  // Load all lots
  const loadLots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lot_tbl')
        .select(`
          *,
          property_detail_tbl (
            detail_id,
            property_name
          )
        `)
        .order('lot_number', { ascending: true });

      if (error) throw error;
      setLots(data || []);
    } catch (error) {
      console.error('Error loading lots:', error);
      toast.error('Failed to load lots');
    } finally {
      setLoading(false);
    }
  };

  // Load property types
  const loadPropertyTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('property_detail_tbl')
        .select('detail_id, property_name')
        .order('property_name', { ascending: true });

      if (error) throw error;
      setPropertyTypes(data || []);
    } catch (error) {
      console.error('Error loading property types:', error);
      toast.error('Failed to load property types');
    }
  };

  // Filter lots based on search and property type
  const filterLots = () => {
    let filtered = lots;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(lot =>
        lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.property_detail_tbl?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by property type
    if (propertyTypeFilter !== 'all') {
      if (propertyTypeFilter === 'unassigned') {
        filtered = filtered.filter(lot => !lot.property_type_id);
      } else {
        filtered = filtered.filter(lot => lot.property_type_id === propertyTypeFilter);
      }
    }

    setFilteredLots(filtered);
  };

  // Group lots by property type
  const groupedLots = filteredLots.reduce((groups, lot) => {
    const propertyType = lot.property_detail_tbl?.property_name || 'Unassigned';
    if (!groups[propertyType]) {
      groups[propertyType] = [];
    }
    groups[propertyType].push(lot);
    return groups;
  }, {});

  const groupedLotsArray = Object.entries(groupedLots).sort((a, b) => {
    // Put "Unassigned" last
    if (a[0] === 'Unassigned') return 1;
    if (b[0] === 'Unassigned') return -1;
    return a[0].localeCompare(b[0]);
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      lot_number: '',
      property_type_id: '',
      property_block: '',
      is_occupied: false
    });
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (lot) => {
    setEditingLot(lot);
    setFormData({
      lot_number: lot.lot_number,
      property_type_id: lot.property_type_id || '',
      property_block: lot.property_block || '',
      is_occupied: lot.is_occupied
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (lot) => {
    setDeletingLot(lot);
    setIsDeleteModalOpen(true);
  };

  // Add new lot
  const handleAddLot = async (e) => {
    e.preventDefault();

    if (!formData.lot_number.trim()) {
      toast.error('Please enter a lot number');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if lot number already exists (simplified check)
      const { data: existingLots, error: checkError } = await supabase
        .from('lot_tbl')
        .select('lot_number, property_type_id, property_block')
        .eq('lot_number', formData.lot_number.trim());

      if (checkError) {
        console.error('Error checking existing lots:', checkError);
        toast.error('Error checking lot number. Please ensure database is set up correctly.');
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate based on property type
      if (existingLots && existingLots.length > 0) {
        const duplicate = existingLots.find(lot => {
          // Both have no property type
          if (!lot.property_type_id && !formData.property_type_id) {
            return true;
          }
          // Both have the same property type
          if (lot.property_type_id === formData.property_type_id) {
            return true;
          }
          return false;
        });

        if (duplicate) {
          const typeName = formData.property_type_id
            ? propertyTypes.find(t => t.detail_id === formData.property_type_id)?.property_name || 'Selected Type'
            : 'No Property Type';
          toast.error(`Lot #${formData.lot_number} with property type "${typeName}" already exists!`);
          setIsSubmitting(false);
          return;
        }
      }

      // Check for duplicate Block + Lot combination
      if (formData.property_block) {
        const { data: existingBlockLot, error: blockLotCheckError } = await supabase
          .from('lot_tbl')
          .select('lot_id, lot_number, property_block')
          .eq('lot_number', formData.lot_number.trim())
          .eq('property_block', formData.property_block);

        if (blockLotCheckError) {
          console.error('Error checking existing block-lot combination:', blockLotCheckError);
        } else if (existingBlockLot && existingBlockLot.length > 0) {
          toast.error(`Block ${formData.property_block} with Lot #${formData.lot_number} already exists!`);
          setIsSubmitting(false);
          return;
        }
      }

      // Proceed with insert
      const insertData = {
        lot_number: formData.lot_number.trim(),
        is_occupied: formData.is_occupied
      };

      // Only add property_type_id if the column exists (graceful degradation)
      if (formData.property_type_id) {
        insertData.property_type_id = formData.property_type_id;
      }

      // Add property_block if provided
      if (formData.property_block) {
        insertData.property_block = formData.property_block;
      }

      const { data, error } = await supabase
        .from('lot_tbl')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Insert error:', error);
        if (error.message.includes('property_type_id')) {
          toast.error('Database migration required! Please run the SQL migration script first.');
          console.error('⚠️ MIGRATION NEEDED: Run the SQL commands from database_migration_lot_unique_constraint.sql');
        } else {
          toast.error('Failed to create lot: ' + error.message);
        }
        setIsSubmitting(false);
        return;
      }

      toast.success('Lot added successfully!');
      setIsModalOpen(false);
      resetForm();
      loadLots();
    } catch (error) {
      console.error('Error adding lot:', error);
      toast.error(error.message || 'Failed to add lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update lot
  const handleUpdateLot = async (e) => {
    e.preventDefault();

    if (!formData.lot_number.trim()) {
      toast.error('Please enter a lot number');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check for duplicate Block + Lot combination (excluding current lot)
      if (formData.property_block) {
        const { data: existingBlockLot, error: blockLotCheckError } = await supabase
          .from('lot_tbl')
          .select('lot_id, lot_number, property_block')
          .eq('lot_number', formData.lot_number.trim())
          .eq('property_block', formData.property_block)
          .neq('lot_id', editingLot.lot_id);

        if (blockLotCheckError) {
          console.error('Error checking existing block-lot combination:', blockLotCheckError);
        } else if (existingBlockLot && existingBlockLot.length > 0) {
          toast.error(`Block ${formData.property_block} with Lot #${formData.lot_number} already exists!`);
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('lot_tbl')
        .update({
          lot_number: formData.lot_number.trim(),
          property_type_id: formData.property_type_id || null,
          property_block: formData.property_block || null,
          is_occupied: formData.is_occupied,
          updated_at: new Date().toISOString()
        })
        .eq('lot_id', editingLot.lot_id);

      if (error) throw error;

      toast.success('Lot updated successfully!');
      setIsEditModalOpen(false);
      setEditingLot(null);
      resetForm();
      loadLots();
    } catch (error) {
      console.error('Error updating lot:', error);
      toast.error(error.message || 'Failed to update lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete lot
  const handleDeleteLot = async () => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('lot_tbl')
        .delete()
        .eq('lot_id', deletingLot.lot_id);

      if (error) throw error;

      toast.success('Lot deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingLot(null);
      loadLots();
    } catch (error) {
      console.error('Error deleting lot:', error);
      toast.error(error.message || 'Failed to delete lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: lots.length,
    occupied: lots.filter(l => l.is_occupied).length,
    available: lots.filter(l => !l.is_occupied).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-red-800 p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] pointer-events-none" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Lot Management</h1>
                <p className="text-red-100 mt-1 font-medium">Manage property lots and availability</p>
              </div>
            </div>
          </div>
          <Button
            onClick={openAddModal}
            className="gap-2 bg-white text-red-700 hover:bg-red-50 shadow-xl hover:shadow-2xl transition-all duration-300 h-12 px-6 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5" />
            Add New Lot
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Lots</CardTitle>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900 mb-1">{stats.total}</div>
              <p className="text-xs text-slate-500 font-medium">Properties registered</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-green-50 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">Occupied</CardTitle>
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-700 mb-1">{stats.occupied}</div>
              <p className="text-xs text-slate-500 font-medium">Currently in use</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">Available</CardTitle>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <XCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-blue-700 mb-1">{stats.available}</div>
              <p className="text-xs text-slate-500 font-medium">Ready to assign</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by lot number or property type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 border-2 border-slate-200 focus:border-red-500 rounded-xl text-base bg-white shadow-sm transition-all"
                />
              </div>

              {/* Property Type Filter */}
              <div className="relative">
                <select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  className="w-full h-14 pl-4 pr-10 border-2 border-slate-200 focus:border-red-500 rounded-xl text-base bg-white shadow-sm transition-all appearance-none font-medium text-slate-700 cursor-pointer"
                >
                  <option value="all">All Property Types</option>
                  {propertyTypes.map((type) => (
                    <option key={type.detail_id} value={type.detail_id}>
                      {type.property_name}
                    </option>
                  ))}
                  <option value="unassigned">Unassigned</option>
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(searchTerm || propertyTypeFilter !== 'all') && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>
                {searchTerm && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none px-3 py-1.5 font-medium">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {propertyTypeFilter !== 'all' && (
                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none px-3 py-1.5 font-medium">
                    Type: {propertyTypeFilter === 'unassigned' ? 'Unassigned' : propertyTypes.find(t => t.detail_id === propertyTypeFilter)?.property_name}
                    <button
                      onClick={() => setPropertyTypeFilter('all')}
                      className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPropertyTypeFilter('all');
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-bold underline"
                >
                  Clear All
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Lots List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Loading lots...</p>
          </div>
        </div>
      ) : filteredLots.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center h-96">
              <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl mb-6">
                <MapPin className="w-16 h-16 text-slate-400" />
              </div>
              <p className="text-slate-600 text-xl font-bold mb-2">
                {searchTerm ? 'No lots found' : 'No lots added yet'}
              </p>
              <p className="text-slate-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Click "Add New Lot" to get started'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-12">
          {groupedLotsArray.map(([propertyType, lotsInGroup], groupIndex) => (
            <motion.div
              key={propertyType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              {/* Property Type Header */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t-2 border-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                </div>
                <div className="relative flex justify-center">
                  <div className="group cursor-default">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-red-800 px-8 py-4 shadow-2xl transform hover:scale-105 transition-all duration-300">
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none"></div>
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">{propertyType}</h2>
                          <p className="text-red-100 text-xs font-medium mt-0.5">
                            {lotsInGroup.length} {lotsInGroup.length === 1 ? 'Property' : 'Properties'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {lotsInGroup.map((lot, index) => (
                  <motion.div
                    key={lot.lot_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -8 }}
                  >
                    <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-white overflow-hidden group h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <CardHeader className="relative pb-3">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                                <MapPin className="w-4 h-4 text-white" />
                              </div>
                              <CardTitle className="text-xl font-black text-slate-900">
                                #{lot.lot_number}
                              </CardTitle>
                            </div>
                            {isNewItem(lot.created_at) && (
                              <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-none text-xs font-bold px-2 py-0.5">
                                ✨ New
                              </Badge>
                            )}
                          </div>
                          <Badge
                            className={`${
                              lot.is_occupied
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                            } border-none shadow-lg font-bold px-3 py-1`}
                          >
                            {lot.is_occupied ? '🔒 Occupied' : '✓ Available'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            {getRelativeTime(lot.created_at)}
                          </p>
                          {lot.property_block && (
                            <p className="text-xs text-slate-700 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                              <span className="text-blue-600">■</span>
                              Block {lot.property_block}
                            </p>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="relative pt-0">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(lot)}
                            className="flex-1 border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-700 font-bold transition-all duration-300 rounded-lg"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteModal(lot)}
                            className="flex-1 border-2 border-red-200 hover:bg-red-50 hover:border-red-400 text-red-600 font-bold transition-all duration-300 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence mode="wait">
        {isModalOpen && (
          <motion.div
            key="add-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
                resetForm();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add New Lot</h2>
                    <p className="text-red-100 text-sm">Create a new property lot</p>
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
            <form onSubmit={handleAddLot} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Lot Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="lot_number"
                    value={formData.lot_number}
                    onChange={handleInputChange}
                    placeholder="e.g., A-101, B-205, etc."
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a unique identifier for this lot</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Property Type
                </label>
                <select
                  name="property_type_id"
                  value={formData.property_type_id}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors bg-white"
                >
                  <option value="">Select Property Type (Optional)</option>
                  {propertyTypes.map((type) => (
                    <option key={type.detail_id} value={type.detail_id}>
                      {type.property_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Select the type of property for this lot</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Block
                </label>
                <select
                  name="property_block"
                  value={formData.property_block}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors bg-white"
                >
                  <option value="">Select Block (Optional)</option>
                  {Array.from({ length: 30 }, (_, i) => {
                    const blockNumber = i + 1;
                    const isDisabled = [25, 16, 30].includes(blockNumber);
                    return (
                      <option
                        key={blockNumber}
                        value={blockNumber}
                        disabled={isDisabled}
                      >
                        Block {blockNumber}{isDisabled ? ' (Unavailable)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500">Select the block number for this lot</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      {formData.is_occupied ? (
                        <CheckCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <label htmlFor="is_occupied" className="text-sm font-semibold text-gray-700 cursor-pointer">
                        Occupancy Status
                      </label>
                      <p className="text-xs text-gray-500">
                        {formData.is_occupied ? 'This lot is currently occupied' : 'This lot is available'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_occupied"
                      name="is_occupied"
                      checked={formData.is_occupied}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
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
                      Create Lot
                    </>
                  )}
                </Button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsEditModalOpen(false);
                setEditingLot(null);
                resetForm();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Lot</h2>
                    <p className="text-red-100 text-sm">Update lot information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingLot(null);
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
            <form onSubmit={handleUpdateLot} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Lot Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="lot_number"
                    value={formData.lot_number}
                    onChange={handleInputChange}
                    placeholder="e.g., A-101, B-205, etc."
                    className="pl-10 h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a unique identifier for this lot</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Property Type
                </label>
                <select
                  name="property_type_id"
                  value={formData.property_type_id}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors bg-white"
                >
                  <option value="">Select Property Type (Optional)</option>
                  {propertyTypes.map((type) => (
                    <option key={type.detail_id} value={type.detail_id}>
                      {type.property_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Select the type of property for this lot</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Block
                </label>
                <select
                  name="property_block"
                  value={formData.property_block}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border-2 border-gray-200 focus:border-red-500 rounded-xl transition-colors bg-white"
                >
                  <option value="">Select Block (Optional)</option>
                  {Array.from({ length: 30 }, (_, i) => {
                    const blockNumber = i + 1;
                    const isDisabled = [25, 16, 30].includes(blockNumber);
                    return (
                      <option
                        key={blockNumber}
                        value={blockNumber}
                        disabled={isDisabled}
                      >
                        Block {blockNumber}{isDisabled ? ' (Unavailable)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500">Select the block number for this lot</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      {formData.is_occupied ? (
                        <CheckCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <label htmlFor="is_occupied_edit" className="text-sm font-semibold text-gray-700 cursor-pointer">
                        Occupancy Status
                      </label>
                      <p className="text-xs text-gray-500">
                        {formData.is_occupied ? 'This lot is currently occupied' : 'This lot is available'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="is_occupied_edit"
                      name="is_occupied"
                      checked={formData.is_occupied}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingLot(null);
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
                      Update Lot
                    </>
                  )}
                </Button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsDeleteModalOpen(false);
                setDeletingLot(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Delete Lot</h2>
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
                      Are you sure you want to delete <span className="font-bold">Lot #{deletingLot?.lot_number}</span>?
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
                    setDeletingLot(null);
                  }}
                  className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteLot}
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
                      Delete Lot
                    </>
                  )}
                </Button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
