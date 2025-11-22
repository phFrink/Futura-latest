"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  XCircle,
  Loader2,
  UserPlus,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  FileSignature,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import Select from "react-select";

// Custom styles for react-select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "44px",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.2)" : "none",
    "&:hover": {
      borderColor: "#3b82f6",
    },
    borderRadius: "0.5rem",
    padding: "2px 4px",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#3b82f6"
      : state.isFocused
      ? "#dbeafe"
      : "white",
    color: state.isSelected ? "white" : "#1f2937",
    cursor: "pointer",
  }),
};

export default function TransferContractModal({
  isOpen,
  onClose,
  contract,
  onTransferSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingHomeowners, setLoadingHomeowners] = useState(false);
  const [homeowners, setHomeowners] = useState([]);
  const [selectedHomeowner, setSelectedHomeowner] = useState(null);
  const [formData, setFormData] = useState({
    new_client_name: "",
    new_client_email: "",
    new_client_phone: "",
    new_client_address: "",
    relationship: "",
    transfer_reason: "",
    transfer_notes: "",
  });

  // Relationship options
  const relationshipOptions = [
    { value: "spouse", label: "Spouse" },
    { value: "child", label: "Child (Son/Daughter)" },
    { value: "parent", label: "Parent (Father/Mother)" },
    { value: "sibling", label: "Sibling (Brother/Sister)" },
    { value: "grandparent", label: "Grandparent" },
    { value: "grandchild", label: "Grandchild" },
    { value: "nephew", label: "Nephew" },
    { value: "niece", label: "Niece" },
    { value: "uncle", label: "Uncle" },
    { value: "aunt", label: "Aunt" },
    { value: "cousin", label: "Cousin" },
    { value: "in-law", label: "In-law" },
    { value: "business_partner", label: "Business Partner" },
    { value: "friend", label: "Friend" },
    // { value: "other", label: "Other" },
  ];

  // Load homeowners when modal opens
  useEffect(() => {
    if (isOpen) {
      loadHomeowners();
    }
  }, [isOpen]);

  // Load homeowner users with role = "home owner"
  const loadHomeowners = async () => {
    setLoadingHomeowners(true);
    try {
      const response = await fetch("/api/homeowners/users");
      const result = await response.json();

      if (result.success && result.data) {
        // Filter out the current contract owner by email
        const filteredHomeowners = result.data.filter(
          (homeowner) =>
            homeowner.email.toLowerCase() !==
            contract?.client_email?.toLowerCase()
        );

        setHomeowners(
          filteredHomeowners.map((homeowner) => ({
            value: homeowner.id,
            label: `${homeowner.full_name} (${homeowner.email})`,
            data: homeowner,
          }))
        );

        console.log(
          `✅ Loaded ${filteredHomeowners.length} homeowners (excluded current owner)`
        );
      } else {
        console.error("Failed to load homeowners:", result.message);
        toast.error("Failed to load homeowner users");
      }
    } catch (error) {
      console.error("Error loading homeowners:", error);
      toast.error("Failed to load homeowner users");
    } finally {
      setLoadingHomeowners(false);
    }
  };

  const handleHomeownerSelect = (selected) => {
    setSelectedHomeowner(selected);
    if (selected && selected.data) {
      setFormData((prev) => ({
        ...prev,
        new_client_name:
          selected.data.full_name || selected.data.client_name || "",
        new_client_email: selected.data.email || "",
        new_client_phone:
          selected.data.phone || selected.data.client_phone || "",
        new_client_address:
          selected.data.address || selected.data.client_address || "",
      }));
    } else {
      // Clear form when deselected
      setFormData((prev) => ({
        ...prev,
        new_client_name: "",
        new_client_email: "",
        new_client_phone: "",
        new_client_address: "",
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    // Check if homeowner is selected
    if (!selectedHomeowner) {
      toast.error("Please select a homeowner to transfer the contract to");
      return false;
    }

    if (!formData.new_client_name.trim()) {
      toast.error("New client name is required");
      return false;
    }
    if (!formData.new_client_email.trim()) {
      toast.error("New client email is required");
      return false;
    }
    if (!formData.relationship.trim()) {
      toast.error("Relationship to current owner is required");
      return false;
    }
    if (!formData.transfer_reason.trim()) {
      toast.error("Transfer reason is required");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.new_client_email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const transferData = {
        contract_id: contract.contract_id,
        new_user_id: selectedHomeowner?.value, // Pass the new homeowner's user ID
        ...formData,
      };

      console.log("🔄 Submitting transfer with data:", transferData);

      const response = await fetch("/api/contracts/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferData),
      });

      const result = await response.json();

      console.log("📥 Transfer API response:", result);

      if (result.success) {
        toast.success("Contract transferred successfully!");
        console.log("✅ Transfer completed:", result.data);
        onTransferSuccess(result.data);
        resetForm();
        onClose();
      } else {
        console.error("❌ Transfer failed:", result.message);
        toast.error(result.message || "Failed to transfer contract");
      }
    } catch (error) {
      console.error("❌ Error transferring contract:", error);
      toast.error("Error transferring contract. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      new_client_name: "",
      new_client_email: "",
      new_client_phone: "",
      new_client_address: "",
      relationship: "",
      transfer_reason: "",
      transfer_notes: "",
    });
    setSelectedHomeowner(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!contract) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 sticky top-0 z-10 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      Transfer Contract
                    </h2>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Transfer contract ownership to a new client
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-white hover:bg-white/20"
                  disabled={loading}
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Current Contract Info */}
              <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Current Contract Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Contract #:</span>
                          <span className="font-semibold text-gray-900 ml-2">
                            {contract.contract_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Property:</span>
                          <span className="font-semibold text-gray-900 ml-2">
                            {contract.property_title}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Owner:</span>
                          <span className="font-semibold text-gray-900 ml-2">
                            {contract.client_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="font-semibold text-gray-900 ml-2 capitalize">
                            {contract.contract_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Client Information */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-bold text-gray-900">
                    New Client Information
                  </h3>
                </div>

                {/* Homeowner Selection Dropdown */}
                <div className="mb-4">
                  <Label
                    htmlFor="homeowner_select"
                    className="flex items-center gap-2 mb-2"
                  >
                    <Users className="w-4 h-4 text-gray-600" />
                    Select Registered Homeowner{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    id="homeowner_select"
                    options={homeowners}
                    value={selectedHomeowner}
                    onChange={handleHomeownerSelect}
                    styles={customSelectStyles}
                    placeholder={
                      loadingHomeowners
                        ? "Loading homeowners..."
                        : "Search and select a homeowner..."
                    }
                    isClearable
                    isSearchable
                    isLoading={loadingHomeowners}
                    isDisabled={loading}
                    noOptionsMessage={() => "No homeowner users found"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select an existing registered homeowner to transfer this
                    contract.
                  </p>
                </div>

                {/* Show homeowner details only when selected */}
                {selectedHomeowner && (
                  <Card className="border-l-4 border-l-green-500 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            Selected Homeowner Details
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Verified User
                            </Badge>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <User className="w-3 h-3" />
                                Full Name
                              </div>
                              <p className="font-medium text-gray-900">
                                {formData.new_client_name}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <Mail className="w-3 h-3" />
                                Email Address
                              </div>
                              <p className="font-medium text-gray-900">
                                {formData.new_client_email}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <Phone className="w-3 h-3" />
                                Phone Number
                              </div>
                              <p className="font-medium text-gray-900">
                                {formData.new_client_phone || "Not provided"}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <MapPin className="w-3 h-3" />
                                Address
                              </div>
                              <p className="font-medium text-gray-900">
                                {formData.new_client_address || "Not provided"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Transfer Details */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileSignature className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-bold text-gray-900">
                    Transfer Details
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Relationship */}
                  <div>
                    <Label
                      htmlFor="relationship"
                      className="flex items-center gap-2 mb-2"
                    >
                      <Users className="w-4 h-4 text-gray-600" />
                      Relationship to Current Owner{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="relationship"
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleChange}
                      className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                      disabled={loading}
                    >
                      <option value="">Select relationship...</option>
                      {relationshipOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      How is the new owner related to {contract?.client_name}?
                    </p>
                  </div>

                  {/* Transfer Reason */}
                  <div>
                    <Label htmlFor="transfer_reason" className="mb-2 block">
                      Reason for Transfer{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="transfer_reason"
                      name="transfer_reason"
                      type="text"
                      value={formData.transfer_reason}
                      onChange={handleChange}
                      placeholder="e.g., Sale, Gift, Inheritance, etc."
                      className="h-11"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label htmlFor="transfer_notes" className="mb-2 block">
                      Additional Notes (Optional)
                    </Label>
                    <textarea
                      id="transfer_notes"
                      name="transfer_notes"
                      value={formData.transfer_notes}
                      onChange={handleChange}
                      placeholder="Any additional information about this transfer..."
                      className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <Card className="mb-6 border-l-4 border-l-amber-500 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Important Notice
                      </h4>
                      <p className="text-sm text-gray-700">
                        This action will transfer the contract ownership to the
                        new client. All payment schedules and contract terms
                        will remain the same. Please ensure all information is
                        correct before proceeding.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Transfer Contract
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
