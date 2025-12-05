"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Armchair,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Package,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

export default function ManageAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [filteredAmenities, setFilteredAmenities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [deletingAmenity, setDeletingAmenity] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    total_quantity: 1,
    available_quantity: 1,
    status: "available",
  });

  useEffect(() => {
    loadAmenities();
  }, []);

  useEffect(() => {
    filterAmenities();
  }, [amenities, searchTerm]);

  const loadAmenities = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/amenities");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load amenities");
      }

      console.log(" Loaded amenities:", result.data);
      setAmenities(result.data || []);
    } catch (error) {
      console.error("Error loading amenities:", error);
      toast.error("Failed to load amenities: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAmenities = () => {
    let filtered = amenities;

    if (searchTerm) {
      filtered = filtered.filter(
        (amenity) =>
          amenity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          amenity.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          amenity.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAmenities(filtered);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      total_quantity: 1,
      available_quantity: 1,
      status: "available",
    });
  };

  const handleEditAmenity = (amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      name: amenity.name,
      category: amenity.category,
      description: amenity.description || "",
      total_quantity: amenity.total_quantity,
      available_quantity: amenity.available_quantity,
      status: amenity.status,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteAmenity = (amenity) => {
    setDeletingAmenity(amenity);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAmenity) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/amenities?amenity_id=${deletingAmenity.amenity_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete amenity");
      }

      toast.success("Amenity deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeletingAmenity(null);
      await loadAmenities();
    } catch (error) {
      console.error("Error deleting amenity:", error);
      toast.error("Failed to delete: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.category) {
        toast.error("Please fill in all required fields");
        setSubmitting(false);
        return;
      }

      const submitData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        total_quantity: parseInt(formData.total_quantity),
        available_quantity: parseInt(formData.available_quantity),
        status: formData.status,
      };

      if (editingAmenity) {
        submitData.amenity_id = editingAmenity.amenity_id;

        const response = await fetch("/api/amenities", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitData),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to update amenity");
        }

        toast.success("Amenity updated successfully!");
        setIsEditModalOpen(false);
        setEditingAmenity(null);
      } else {
        const response = await fetch("/api/amenities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitData),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to create amenity");
        }

        setIsModalOpen(false);
        toast.success("Amenity created successfully!");
      }

      resetForm();
      await loadAmenities();
    } catch (error) {
      console.error("Error saving amenity:", error);
      toast.error("Error saving amenity: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "unavailable":
        return "bg-red-100 text-red-800 border-red-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                  Manage Amenities
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Add, edit, and manage community amenities
                </p>
              </div>
            </div>
            <Button
              onClick={openModal}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 rounded-xl px-6"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Amenity
            </Button>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm"
        >
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search amenities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-11 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </motion.div>

        {/* Amenities Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="p-8 space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-200 animate-pulse rounded-lg"
                  />
                ))}
            </div>
          ) : filteredAmenities.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Armchair className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Amenities Found
              </h3>
              <p className="text-slate-600 mb-4">
                Start by adding your first amenity.
              </p>
              <Button
                onClick={openModal}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Amenity
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Total Qty
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAmenities.map((amenity) => (
                    <tr
                      key={amenity.amenity_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {amenity.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 capitalize">
                          {amenity.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 max-w-xs truncate block">
                          {amenity.description || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">
                          {amenity.total_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-green-600">
                          {amenity.available_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={`${getStatusColor(
                            amenity.status
                          )} border font-semibold capitalize`}
                        >
                          {amenity.status === "available" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {amenity.status === "unavailable" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {amenity.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-300 hover:bg-blue-50"
                            onClick={() => handleEditAmenity(amenity)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => handleDeleteAmenity(amenity)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create/Edit Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingAmenity ? "Edit Amenity" : "Add New Amenity"}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {editingAmenity
                      ? "Update amenity details"
                      : "Create a new amenity"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingAmenity(null);
                    resetForm();
                  }}
                  className="rounded-full hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-bold text-slate-700"
                >
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Folding Chairs"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  className="border-slate-200 rounded-xl h-11"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-bold text-slate-700"
                >
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange("category", value)}
                >
                  <SelectTrigger className="border-slate-200 rounded-xl h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chair">Chair</SelectItem>
                    <SelectItem value="pool">Pool</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="sports_equipment">Sports Equipment</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="decoration">Decoration</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-bold text-slate-700"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the amenity"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={3}
                  className="border-slate-200 rounded-xl resize-none"
                />
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="total_quantity"
                    className="text-sm font-bold text-slate-700"
                  >
                    Total Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="total_quantity"
                    type="number"
                    min="0"
                    placeholder="Total quantity"
                    value={formData.total_quantity}
                    onChange={(e) =>
                      handleInputChange("total_quantity", e.target.value)
                    }
                    required
                    className="border-slate-200 rounded-xl h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="available_quantity"
                    className="text-sm font-bold text-slate-700"
                  >
                    Available Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="available_quantity"
                    type="number"
                    min="0"
                    placeholder="Available quantity"
                    value={formData.available_quantity}
                    onChange={(e) =>
                      handleInputChange("available_quantity", e.target.value)
                    }
                    required
                    className="border-slate-200 rounded-xl h-11"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label
                  htmlFor="status"
                  className="text-sm font-bold text-slate-700"
                >
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger className="border-slate-200 rounded-xl h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingAmenity(null);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-6 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingAmenity ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingAmenity ? (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Update Amenity
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Amenity
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingAmenity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Delete Amenity
                    </h3>
                    <p className="text-red-100 text-sm mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingAmenity(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this amenity?
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                  <h5 className="font-medium text-slate-900 mb-1">
                    {deletingAmenity.name}
                  </h5>
                  <p className="text-sm text-slate-600 capitalize mb-2">
                    {deletingAmenity.category}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Total: {deletingAmenity.total_quantity}</span>
                    <span>Available: {deletingAmenity.available_quantity}</span>
                  </div>
                </div>
                <p className="text-slate-600">
                  This will permanently delete the amenity. This action cannot
                  be reversed.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingAmenity(null);
                  }}
                  className="px-6"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Amenity
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
