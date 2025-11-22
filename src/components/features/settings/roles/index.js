"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Sparkles,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { isNewItem } from "@/lib/utils";
import { toast } from "react-toastify";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    rolename: "",
  });

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    filterRoles();
  }, [roles, searchTerm]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/roles");
      const result = await response.json();

      if (result.success) {
        setRoles(result.data);
      } else {
        toast.error("Failed to load roles");
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Error loading roles");
    } finally {
      setLoading(false);
    }
  };

  const filterRoles = () => {
    let filtered = roles;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((role) =>
        role.rolename?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRoles(filtered);
  };

  const getRoleColor = (roleName) => {
    const roleStr = roleName?.toLowerCase() || "";

    if (roleStr.includes("admin")) {
      return "bg-purple-100 text-purple-800 border-purple-200";
    } else if (roleStr.includes("manager") || roleStr.includes("supervisor")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    } else if (roleStr.includes("staff") || roleStr.includes("employee")) {
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    } else if (roleStr.includes("owner") || roleStr.includes("customer")) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    } else if (
      roleStr.includes("sales") ||
      roleStr.includes("representative")
    ) {
      return "bg-green-100 text-green-800 border-green-200";
    } else if (roleStr.includes("service")) {
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    } else {
      return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      rolename: "",
    });
    setEditingRole(null);
    setIsEditMode(false);
  };

  const handleAddRole = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setIsEditMode(true);
    setFormData({
      rolename: role.rolename || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Update role
        const response = await fetch("/api/roles", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleId: editingRole.role_id,
            ...formData,
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("Role updated successfully!");
          setIsModalOpen(false);
          resetForm();
          loadRoles();
        } else {
          toast.error(result.message || "Failed to update role");
        }
      } else {
        // Create new role
        const response = await fetch("/api/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("Role created successfully!");
          setIsModalOpen(false);
          resetForm();
          loadRoles();
        } else {
          toast.error(result.message || "Failed to create role");
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = (role) => {
    setDeletingRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/roles?roleId=${deletingRole.role_id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Role deleted successfully!");
        setIsDeleteModalOpen(false);
        setDeletingRole(null);
        loadRoles();
      } else {
        toast.error(result.message || "Failed to delete role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 lg:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-2 md:gap-3">
              <Shield className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
              System Roles
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-slate-600">
              Manage user roles and permissions ({filteredRoles.length} total)
            </p>
          </div>
          <Button
            onClick={handleAddRole}
            className="bg-gradient-to-r from-red-400 to-red-500 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg w-full md:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Role
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 md:p-6 shadow-lg"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search roles by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200 focus:border-blue-400 w-full"
            />
          </div>
        </motion.div>

        {/* Roles Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
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
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No roles found
              </h3>
              <p className="text-slate-600">
                {searchTerm
                  ? "Try adjusting your search"
                  : "No roles have been created yet"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Role ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Role Name
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedRoles.map((role, index) => (
                      <motion.tr
                        key={role.role_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        {/* Role ID Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-slate-600">
                            {role.role_id}
                          </span>
                        </td>

                        {/* Role Name Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${getRoleColor(
                                role.rolename
                              )} border font-medium`}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              {role.rolename}
                            </Badge>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteRole(role)}
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

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-200">
                {paginatedRoles.map((role, index) => (
                  <motion.div
                    key={role.role_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Badge
                          className={`${getRoleColor(
                            role.rolename
                          )} border font-medium mb-2`}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {role.rolename}
                        </Badge>
                        <p className="text-xs text-slate-500 mb-1">
                          ID: {role.role_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-600 hover:text-slate-700 hover:bg-slate-100 flex-1"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                        onClick={() => handleDeleteRole(role)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {filteredRoles.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-50 px-4 md:px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Items per page */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) =>
                          handleItemsPerPageChange(e.target.value)
                        }
                        className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                      <span className="text-sm text-slate-600">per page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-slate-600">
                      Showing{" "}
                      <span className="font-semibold text-slate-900">
                        {startIndex + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-slate-900">
                        {Math.min(endIndex, filteredRoles.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-900">
                        {filteredRoles.length}
                      </span>{" "}
                      roles
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            return (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 &&
                                page <= currentPage + 1)
                            );
                          })
                          .map((page, index, array) => (
                            <div key={page} className="flex items-center">
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-slate-400">...</span>
                              )}
                              <Button
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className={
                                  currentPage === page
                                    ? "bg-gradient-to-r from-red-400 to-red-500 text-white hover:from-red-500 hover:to-red-600"
                                    : ""
                                }
                              >
                                {page}
                              </Button>
                            </div>
                          ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Add/Edit Role Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-red-400 to-red-500 px-4 md:px-6 py-3 md:py-4 text-white rounded-t-xl md:rounded-t-2xl">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-bold truncate">
                        {isEditMode ? "Edit Role" : "Add New Role"}
                      </h3>
                      <p className="text-red-100 text-xs md:text-sm mt-0.5 md:mt-1 truncate">
                        {isEditMode
                          ? "Update role information"
                          : "Create a new role"}
                      </p>
                    </div>
                  </div>
                  <button
                    className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                  >
                    <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role Name *
                  </label>
                  <Input
                    type="text"
                    name="rolename"
                    value={formData.rolename}
                    onChange={handleInputChange}
                    placeholder="Enter role name"
                    required
                    className="w-full"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-red-400 to-red-500 hover:from-blue-700 hover:to-blue-800 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        {isEditMode ? (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Update Role
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Role
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
        {isDeleteModalOpen && deletingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Delete Role</h3>
                      <p className="text-red-100 text-sm mt-1">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  <button
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletingRole(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <XCircle className="w-5 h-5" />
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
                    Are you sure you want to delete this role?
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <Badge
                      className={`${getRoleColor(
                        deletingRole.rolename
                      )} border font-medium text-base`}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      {deletingRole.rolename}
                    </Badge>
                    <p className="text-sm text-slate-600 mt-2">
                      ID: {deletingRole.role_id}
                    </p>
                  </div>
                  <p className="text-slate-600">
                    This will permanently delete the role. This action cannot be
                    reversed.
                  </p>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletingRole(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                    onClick={handleConfirmDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Role
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
