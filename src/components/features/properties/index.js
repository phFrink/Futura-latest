"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Grid,
  List,
  X,
  Home,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  Sparkles,
  XCircle,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { isNewItem, getRelativeTime } from "@/lib/utils";
import ReactSelect from "react-select";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Custom styles for react-select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "48px",
    borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "none",
    "&:hover": {
      borderColor: "#3b82f6",
    },
    borderRadius: "0.5rem",
    padding: "2px 8px",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#ef4444"
      : state.isFocused
      ? "#fee2e2"
      : "white",
    color: state.isSelected ? "white" : "#1e293b",
    "&:active": {
      backgroundColor: "#dc2626",
    },
  }),
};

export default function Properties() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [blockFilter, setBlockFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [viewingSpecs, setViewingSpecs] = useState(null);

  // Dropdown data
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [lotNumbers, setLotNumbers] = useState([]);
  const [blocks, setBlocks] = useState([]);

  // Common amenities list
  const commonAmenities = [
    "Living Area",
    "Dining Area",
    "Kitchen",
    "Toilet & Bath",
    "Balcony",
    "Terrace",
    "Garage",
    "Carport",
    "Garden",
    "Lanai",
    "Maid Room",
    "Storage Room",
    "Family Room",
    "Laundry Area",
    "Powder Room",
    "Walk-in Closet",
    "Patio",
    "Deck",
    "Attic",
    "Basement",
    "Fireplace",
    "Study Room",
  ];

  // Amenity input state
  const [amenityInput, setAmenityInput] = useState("");

  // Photo upload state
  const [propertyPhoto, setPropertyPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    property_title: "",
    property_price: 1000000,
    property_downprice: 20000,
    property_block: "",
    property_lot_id: "",
    property_details_id: "",
    property_availability: "vacant",
    amenities: [],
    property_photo: "",
  });

  useEffect(() => {
    loadProperties();
    loadPropertyTypes();
    loadLotNumbers();
    loadBlocks();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, statusFilter, typeFilter, blockFilter]);

  // Load all properties from Supabase
  const loadProperties = async () => {
    try {
      setLoading(true);

      // Get all properties with related data using joins
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("property_info_tbl")
        .select(
          `
          *,
          property_detail_tbl!property_details_id(
            detail_id,
            property_name,
            property_area
          ),
          lot_tbl!property_lot_id(
            lot_id,
            lot_number,
            property_block
          )
        `
        )
        .order("created_at", { ascending: false });

      if (propertiesError) {
        console.error("Error loading properties:", propertiesError);
        return;
      }

      // Get all contracts to check which properties have contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from("property_contracts")
        .select("property_id");

      if (contractsError) {
        console.error("Error loading contracts:", contractsError);
      }

      // Create a Set of property IDs that have contracts
      const propertiesWithContracts = new Set(
        contractsData?.map(c => c.property_id) || []
      );

      // Map properties with contract status
      const propertiesWithContractStatus = propertiesData.map(property => ({
        ...property,
        hasContract: propertiesWithContracts.has(property.property_id),
        // Override availability if has contract
        displayAvailability: propertiesWithContracts.has(property.property_id)
          ? "occupied"
          : property.property_availability
      }));

      console.log("Properties loaded:", propertiesWithContractStatus);

      setProperties(propertiesWithContractStatus || []);
    } catch (error) {
      console.error("Error loading properties:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load property types from property_detail_tbl
  const loadPropertyTypes = async () => {
    try {
      // Get all property details
      const { data, error } = await supabase
        .from("property_detail_tbl")
        .select("detail_id, property_name, property_area")
        .order("property_name", { ascending: true });

      if (error) {
        console.error("Error loading property types:", error);
        return;
      }

      // Get all properties to check which property details are used
      const { data: usedDetails, error: usedError } = await supabase
        .from("property_info_tbl")
        .select("property_details_id");

      if (usedError) {
        console.error("Error loading used property details:", usedError);
        return;
      }

      // Mark property details as used if they're already in properties
      const usedDetailIds = new Set(
        usedDetails.map((p) => p.property_details_id)
      );
      const detailsWithStatus = (data || []).map((detail) => ({
        ...detail,
        is_used: usedDetailIds.has(detail.detail_id),
      }));

      console.log("Property types with property_area:", detailsWithStatus);
      setPropertyTypes(detailsWithStatus);
    } catch (error) {
      console.error("Error loading property types:", error);
    }
  };

  // Load lot numbers from lot_tbl
  const loadLotNumbers = async () => {
    try {
      // Get all lots with property_type_id
      const { data: lots, error: lotsError } = await supabase
        .from("lot_tbl")
        .select("lot_id, lot_number, is_occupied, property_type_id")
        .order("lot_number", { ascending: true });

      if (lotsError) {
        console.error("Error loading lot numbers:", lotsError);
        return;
      }

      // Get all properties to check which lots are used
      const { data: usedLots, error: usedError } = await supabase
        .from("property_info_tbl")
        .select("property_lot_id");

      if (usedError) {
        console.error("Error loading used lots:", usedError);
        return;
      }

      // Mark lots as occupied if they're used in properties
      const usedLotIds = new Set(usedLots.map((p) => p.property_lot_id));
      const lotsWithStatus = (lots || []).map((lot) => ({
        ...lot,
        is_occupied: usedLotIds.has(lot.lot_id),
      }));

      setLotNumbers(lotsWithStatus);
    } catch (error) {
      console.error("Error loading lot numbers:", error);
    }
  };

  // Load unique blocks from lot_tbl
  const loadBlocks = async () => {
    try {
      const { data: lots, error } = await supabase
        .from("lot_tbl")
        .select("property_block")
        .not("property_block", "is", null)
        .order("property_block", { ascending: true });

      if (error) {
        console.error("Error loading blocks:", error);
        return;
      }

      // Get unique blocks
      const uniqueBlocks = [...new Set(lots.map((lot) => lot.property_block))];
      setBlocks(uniqueBlocks);
    } catch (error) {
      console.error("Error loading blocks:", error);
    }
  };

  // Get available lot numbers based on selected property detail
  const getAvailableLots = (selectedPropertyDetailId, currentLotId = null) => {
    console.log("🔍 Filtering lots:", {
      selectedPropertyDetailId,
      totalLots: lotNumbers.length,
      lotsWithPropertyType: lotNumbers.filter((l) => l.property_type_id).length,
    });

    const filtered = lotNumbers.filter((lot) => {
      // When editing, always include the current lot
      const isCurrentLot = currentLotId && lot.lot_id === currentLotId;

      // If no property detail selected, show all available lots
      if (!selectedPropertyDetailId) {
        return !lot.is_occupied || isCurrentLot;
      }

      // Show only lots that match the property type AND are available
      const matchesPropertyType =
        lot.property_type_id === selectedPropertyDetailId;
      const isAvailable = !lot.is_occupied || isCurrentLot;

      console.log(`Lot ${lot.lot_number}:`, {
        property_type_id: lot.property_type_id,
        selectedPropertyDetailId,
        matchesPropertyType,
        isAvailable,
        included: matchesPropertyType && isAvailable,
      });

      return matchesPropertyType && isAvailable;
    });

    console.log("✅ Filtered lots:", filtered.length);
    return filtered;
  };

  // Filter properties based on search and filters
  const filterProperties = async () => {
    let filtered = properties;

    // Apply local filters first for better performance
    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.property_title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.lot_tbl?.lot_number
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (property) => property.displayAvailability === statusFilter
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (property) => property.property_details_id === typeFilter
      );
    }

    if (blockFilter !== "all") {
      filtered = filtered.filter(
        (property) => property.lot_tbl?.property_block?.toString() === blockFilter.toString()
      );
    }

    setFilteredProperties(filtered);

    // For complex filters, you could also use Supabase query:
    /*
    try {
      let query = supabase
        .from('property_tbl')
        .select('*');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,unit_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq('property_type', typeFilter);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      
      setFilteredProperties(data || []);
    } catch (error) {
      console.error('Error filtering properties:', error);
    }
    */
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    // Auto-fill fields when property type is selected
    if (name === "property_type" && value) {
      const selectedPropertyType = propertyTypes.find(
        (t) => t.detail_id === value
      );
      if (selectedPropertyType && selectedPropertyType.property_area) {
        const specs = selectedPropertyType.property_area;
        const updatedFormData = { ...formData, property_type: value };

        // Map specifications to form fields
        specs.forEach((spec) => {
          const specName = spec.name.toLowerCase();
          if (specName.includes("bedroom")) {
            updatedFormData.bedrooms = spec.value;
          } else if (
            specName.includes("bathroom") ||
            specName.includes("bath")
          ) {
            updatedFormData.bathrooms = spec.value;
          } else if (specName.includes("floor") && specName.includes("area")) {
            updatedFormData.floor_area = spec.value;
          } else if (specName.includes("lot") && specName.includes("area")) {
            updatedFormData.lot_area = spec.value;
          }
        });

        console.log(updatedFormData, "get update form");

        setFormData(updatedFormData);
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      property_title: "",
      property_price: 1000000,
      property_downprice: 20000,
      property_block: "",
      property_lot_id: "",
      property_details_id: "",
      property_availability: "vacant",
      amenities: [],
      property_photo: "",
    });
    setAmenityInput("");
    setPropertyPhoto(null);
    setPhotoPreview(null);
  };

  // Add amenity
  const handleAddAmenity = (amenity) => {
    const trimmedAmenity = amenity.trim();
    if (!trimmedAmenity) {
      return;
    }

    if (
      formData.amenities.some(
        (a) => a.toLowerCase() === trimmedAmenity.toLowerCase()
      )
    ) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      amenities: [...prev.amenities, trimmedAmenity],
    }));
    setAmenityInput("");
  };

  // Remove amenity
  const handleRemoveAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }));
  };

  // Handle photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      setPropertyPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected photo
  const handleRemovePhoto = () => {
    setPropertyPhoto(null);
    setPhotoPreview(null);
    setFormData((prev) => ({
      ...prev,
      property_photo: "",
    }));
  };

  // Handle opening edit modal
  const handleEditProperty = (property) => {
    console.log("get property", property);
    setEditingProperty(property);
    setFormData({
      property_title: property.property_title || "",
      property_price:
        Number(property.property_price) > 0
          ? Number(property.property_price)
          : 1000000,
      property_downprice: Number(property.property_downprice),
      property_block: property.property_block || "",
      property_lot_id: property.property_lot_id || "",
      property_details_id: property.property_details_id || "",
      property_availability: property.property_availability || "vacant",
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      property_photo: property.property_photo || "",
    });
    setAmenityInput("");
    setPropertyPhoto(null);
    setPhotoPreview(property.property_photo || null);
    setShowEditModal(true);
  };

  // Handle opening delete modal
  const handleDeleteProperty = (property) => {
    setDeletingProperty(property);
    setShowDeleteModal(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingProperty) return;

    setFormSubmitting(true);
    try {
      await deleteProperty(
        deletingProperty.property_id,
        deletingProperty.property_title
      );
      toast.success("Property deleted successfully!");
      setShowDeleteModal(false);
      setDeletingProperty(null);

      // Reload lot numbers and property types to update availability
      await loadLotNumbers();
      await loadPropertyTypes();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.info("Error deleting property: " + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Update property function
  const updateProperty = async (propertyId, updateData) => {
    try {
      const { data, error } = await supabase
        .from("property_tbl")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProperties((prev) =>
        prev.map((prop) =>
          prop.id === propertyId ? { ...prop, ...data } : prop
        )
      );

      await logPropertyActivity(
        "updated",
        propertyId,
        data.name,
        "Property details updated"
      );
      return data;
    } catch (error) {
      console.error("Error updating property:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      // Validate required fields
      if (
        !formData.property_title.trim() ||
        !formData.property_block ||
        !formData.property_lot_id ||
        !formData.property_details_id
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Check if lot number is already used by another property
      const { data: existingProperty, error: checkError } = await supabase
        .from("property_info_tbl")
        .select("property_id, property_title")
        .eq("property_lot_id", formData.property_lot_id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 means no rows found, which is good
        throw checkError;
      }

      // If editing, allow the same lot if it's the current property's lot
      if (existingProperty) {
        if (
          !editingProperty ||
          existingProperty.property_id !== editingProperty.property_id
        ) {
          const lotInfo = lotNumbers.find(
            (l) => l.lot_id === formData.property_lot_id
          );
          throw new Error(
            `Lot ${lotInfo?.lot_number || "number"} is already assigned to "${
              existingProperty.property_title
            }". Please select a different lot.`
          );
        }
      }

      // Upload photo if a new file is selected
      let photoUrl = formData.property_photo || "";
      if (propertyPhoto) {
        setPhotoUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append("property_photo", propertyPhoto);

        const uploadResponse = await fetch("/api/upload-property-photo", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload photo");
        }

        const uploadResult = await uploadResponse.json();
        photoUrl = uploadResult.url;
        setPhotoUploading(false);
      }

      // Prepare data for insert/update
      const propertyData = {
        property_title: formData.property_title.trim(),
        property_block: formData.property_block || null,
        property_lot_id: formData.property_lot_id || null,
        property_price: formData.property_price,
        property_downprice: formData.property_downprice,
        property_details_id: formData.property_details_id || null,
        property_availability: formData.property_availability,
        amenities: formData.amenities,
        property_photo: photoUrl,
        updated_at: new Date().toISOString(),
      };

      if (editingProperty) {
        // Check if lot has changed
        const lotChanged =
          editingProperty.property_lot_id !== formData.property_lot_id;
        const oldLotId = editingProperty.property_lot_id;
        const newLotId = formData.property_lot_id;

        // Update existing property
        const { data, error } = await supabase
          .from("property_info_tbl")
          .update(propertyData)
          .eq("property_id", editingProperty.property_id).select(`
            *,
            property_detail_tbl!property_details_id(
              detail_id,
              property_name,
              property_area
            ),
            lot_tbl!property_lot_id(
              lot_id,
              lot_number
            )
          `);

        if (error) throw error;

        // If lot changed, update both old and new lots
        if (lotChanged) {
          // Mark old lot as vacant
          if (oldLotId) {
            const { error: oldLotError } = await supabase
              .from("lot_tbl")
              .update({ is_occupied: false })
              .eq("lot_id", oldLotId);

            if (oldLotError) {
              console.error("Error updating old lot status:", oldLotError);
            }
          }

          // Mark new lot as occupied
          if (newLotId) {
            const { error: newLotError } = await supabase
              .from("lot_tbl")
              .update({ is_occupied: true })
              .eq("lot_id", newLotId);

            if (newLotError) {
              console.error("Error updating new lot status:", newLotError);
            }
          }
        }

        // Update local state
        setProperties((prev) =>
          prev.map((prop) =>
            prop.property_id === editingProperty.property_id ? data[0] : prop
          )
        );

        toast.success("Property updated successfully!");
        setShowEditModal(false);
        setEditingProperty(null);

        // Reload lot numbers and property types to update availability
        await loadLotNumbers();
        await loadPropertyTypes();
      } else {
        // Create new property
        propertyData.created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("property_info_tbl")
          .insert([propertyData]).select(`
            *,
            property_detail_tbl!property_details_id(
              detail_id,
              property_name,
              property_area
            ),
            lot_tbl!property_lot_id(
              lot_id,
              lot_number
            )
          `);

        if (error) {
          throw error;
        }

        // Update lot_tbl to mark lot as occupied
        if (formData.property_lot_id) {
          const { error: lotError } = await supabase
            .from("lot_tbl")
            .update({ is_occupied: true })
            .eq("lot_id", formData.property_lot_id);

          if (lotError) {
            console.error("Error updating lot status:", lotError);
          }
        }

        // Success - add to local state and close modal
        if (data && data[0]) {
          setProperties((prev) => [data[0], ...prev]); // Add to top of list
        }

        toast.success("Property added successfully!");
        setShowModal(false);

        // Reload lot numbers and property types to update availability
        await loadLotNumbers();
        await loadPropertyTypes();
      }

      resetForm();
    } catch (error) {
      console.error("Error adding property:", error);
      toast.info("Error adding property: " + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Database manipulation functions
  const updatePropertyStatus = async (propertyId, newStatus) => {
    try {
      const { data, error } = await supabase
        .from("property_tbl")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProperties((prev) =>
        prev.map((prop) =>
          prop.id === propertyId
            ? { ...prop, status: newStatus, updated_at: data.updated_at }
            : prop
        )
      );

      await logPropertyActivity(
        "status_updated",
        propertyId,
        data.name,
        `Status changed to ${newStatus}`
      );
      return data;
    } catch (error) {
      console.error("Error updating property status:", error);
      throw error;
    }
  };

  const deleteProperty = async (propertyId, propertyName) => {
    try {
      // Get the property to find its lot_id before deleting
      const propertyToDelete = properties.find(
        (p) => p.property_id === propertyId
      );
      const lotIdToFree = propertyToDelete?.property_lot_id;

      const { error } = await supabase
        .from("property_info_tbl")
        .delete()
        .eq("property_id", propertyId);

      if (error) throw error;

      // Mark the lot as vacant
      if (lotIdToFree) {
        const { error: lotError } = await supabase
          .from("lot_tbl")
          .update({ is_occupied: false })
          .eq("lot_id", lotIdToFree);

        if (lotError) {
          console.error("Error updating lot status:", lotError);
        }
      }

      // Remove from local state
      setProperties((prev) =>
        prev.filter((prop) => prop.property_id !== propertyId)
      );

      return true;
    } catch (error) {
      console.error("Error deleting property:", error);
      throw error;
    }
  };

  const searchProperties = async (searchParams) => {
    try {
      let query = supabase.from("property_tbl").select("*");

      // Apply filters
      if (searchParams.name) {
        query = query.ilike("name", `%${searchParams.name}%`);
      }

      if (searchParams.status && searchParams.status !== "all") {
        query = query.eq("status", searchParams.status);
      }

      if (searchParams.property_type && searchParams.property_type !== "all") {
        query = query.eq("property_type", searchParams.property_type);
      }

      if (searchParams.min_bedrooms) {
        query = query.gte("bedrooms", parseInt(searchParams.min_bedrooms));
      }

      if (searchParams.max_bedrooms) {
        query = query.lte("bedrooms", parseInt(searchParams.max_bedrooms));
      }

      if (searchParams.min_floor_area) {
        query = query.gte(
          "floor_area",
          parseFloat(searchParams.min_floor_area)
        );
      }

      if (searchParams.max_floor_area) {
        query = query.lte(
          "floor_area",
          parseFloat(searchParams.max_floor_area)
        );
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error searching properties:", error);
      throw error;
    }
  };

  const getPropertyStats = async () => {
    try {
      const { data, error } = await supabase
        .from("property_info_tbl")
        .select("property_availability, property_details_id");

      if (error) throw error;

      const stats = {
        total: data.length,
        by_status: {},
        by_type: {},
      };

      data.forEach((property) => {
        // Count by availability
        stats.by_status[property.property_availability] =
          (stats.by_status[property.property_availability] || 0) + 1;

        // Count by type
        stats.by_type[property.property_details_id] =
          (stats.by_type[property.property_details_id] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error getting property stats:", error);
      throw error;
    }
  };

  const logPropertyActivity = async (
    action,
    propertyId,
    propertyName,
    details = null
  ) => {
    try {
      const logData = {
        property_id: propertyId,
        property_name: propertyName,
        action: action,
        details: details,
        timestamp: new Date().toISOString(),
      };

      // Optional: Create activity log table and insert
      // const { error } = await supabase
      //   .from('property_activity_log')
      //   .insert([logData]);

      // For now, just console log
      console.log("Property Activity:", logData);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "occupied":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "vacant":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "for_sale":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "under_construction":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "house":
        return "🏠";
      case "townhouse":
        return "🏘️";
      case "condominium":
        return "🏢";
      case "lot":
        return "🟫";
      default:
        return "🏠";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4 sm:p-6 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header with Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Title and Action */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 bg-clip-text text-transparent mb-2">
                Properties Portfolio
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium">
                Comprehensive property management for Futura Homes Koronadal
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-6 text-base font-semibold group"
            >
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Add New Property
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-4 sm:p-5 shadow-md md:hover:shadow-xl transition-all duration-300 md:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Total Properties
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {properties.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/80 backdrop-blur-sm border border-emerald-200/60 rounded-xl p-4 sm:p-5 shadow-md md:hover:shadow-xl transition-all duration-300 md:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Occupied
                  </p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {
                      properties.filter(
                        (p) => (p.displayAvailability || p.property_availability) === "occupied"
                      ).length
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Badge className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm border border-rose-200/60 rounded-xl p-4 sm:p-5 shadow-md md:hover:shadow-xl transition-all duration-300 md:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Vacant
                  </p>
                  <p className="text-3xl font-bold text-rose-600">
                    {
                      properties.filter(
                        (p) => (p.displayAvailability || p.property_availability) === "vacant" && !p.hasContract
                      ).length
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-xl p-4 sm:p-5 shadow-md md:hover:shadow-xl transition-all duration-300 md:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    Filtered Results
                  </p>
                  <p className="text-3xl font-bold text-amber-600">
                    {filteredProperties.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Search className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-md border-2 border-slate-200/80 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by title or lot number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-6 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white rounded-xl shadow-sm transition-all duration-200"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white border-2 border-slate-200 hover:border-slate-300 py-6 rounded-xl shadow-sm transition-all duration-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="occupied">🟢 Occupied</SelectItem>
                  <SelectItem value="vacant">🔴 Vacant</SelectItem>
                  <SelectItem value="for_sale">🔵 For Sale</SelectItem>
                  <SelectItem value="under_construction">
                    🟠 Under Construction
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-white border-2 border-slate-200 hover:border-slate-300 py-6 rounded-xl shadow-sm transition-all duration-200">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.detail_id} value={type.detail_id}>
                      {type.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={blockFilter} onValueChange={setBlockFilter}>
                <SelectTrigger className="w-48 bg-white border-2 border-slate-200 hover:border-slate-300 py-6 rounded-xl shadow-sm transition-all duration-200">
                  <SelectValue placeholder="All Blocks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blocks</SelectItem>
                  {blocks.map((block) => (
                    <SelectItem key={block} value={block.toString()}>
                      Block {block}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex border-2 border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-none px-4 py-5 ${
                    viewMode === "grid"
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <div className="w-px bg-slate-200" />
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`rounded-none px-4 py-5 ${
                    viewMode === "list"
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Properties Grid/List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-96 bg-white border-2 border-slate-200 rounded-2xl overflow-hidden"
                  >
                    <div className="h-56 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
                    <div className="p-5 space-y-4">
                      <div className="h-6 bg-slate-200 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
                      <div className="h-16 bg-slate-200 rounded-lg animate-pulse" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-12 bg-slate-200 rounded animate-pulse" />
                        <div className="h-12 bg-slate-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="w-32 h-32 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"
              >
                <Home className="w-16 h-16 text-slate-400" />
              </motion.div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No properties found
              </h3>
              <p className="text-lg text-slate-600 mb-6">
                Try adjusting your search or filters
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setBlockFilter("all");
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.property_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card className="group relative overflow-hidden bg-white border-2 border-slate-200/60 hover:border-red-300 hover:shadow-2xl hover:shadow-red-100/50 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] rounded-2xl h-full flex flex-col">
                    {/* Property Photo */}
                    {property.property_photo ? (
                      <div className="relative w-full h-56 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                        <img
                          src={property.property_photo}
                          alt={property.property_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                          onClick={() =>
                            window.open(property.property_photo, "_blank")
                          }
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Status Badges */}
                        <div className="absolute top-3 right-3 flex gap-2 pointer-events-none">
                          <Badge
                            className={`${getStatusColor(
                              property.displayAvailability || property.property_availability
                            )} border-0 font-semibold capitalize shadow-lg backdrop-blur-sm`}
                          >
                            {(property.displayAvailability || property.property_availability)?.replace(
                              "_",
                              " "
                            ) || "N/A"}
                          </Badge>
                          {isNewItem(property.created_at) && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg animate-pulse">
                              <Sparkles className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                          {property.hasContract && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                              📄 Contract
                            </Badge>
                          )}
                        </div>

                        {/* Property Title Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <h3 className="text-white font-bold text-lg line-clamp-1 mb-1">
                            {property.property_title}
                          </h3>
                          <p className="text-white/90 text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.lot_tbl?.property_block && `Block ${property.lot_tbl.property_block} - `}
                            Lot {property.lot_tbl?.lot_number || "N/A"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-56 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-medium">
                            No Image
                          </p>
                        </div>
                        {/* Status Badges for No Image */}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <Badge
                            className={`${getStatusColor(
                              property.displayAvailability || property.property_availability
                            )} border-0 font-semibold capitalize shadow-lg`}
                          >
                            {(property.displayAvailability || property.property_availability)?.replace(
                              "_",
                              " "
                            ) || "N/A"}
                          </Badge>
                          {isNewItem(property.created_at) && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg animate-pulse">
                              <Sparkles className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                          {property.hasContract && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                              📄 Contract
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
                      {/* Property Title (if no photo) */}
                      {!property.property_photo && (
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-900 line-clamp-1 mb-1">
                            {property.property_title}
                          </CardTitle>
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.lot_tbl?.property_block && `Block ${property.lot_tbl.property_block} - `}
                            Lot {property.lot_tbl?.lot_number || "N/A"}
                          </p>
                        </div>
                      )}

                      {/* Property Type Badge */}
                      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-slate-100/50 p-3 rounded-xl border border-slate-200/50">
                        <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                          <Home className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                            Property Type
                          </p>
                          <p className="text-base font-bold text-slate-900 line-clamp-1">
                            {property.property_detail_tbl?.property_name ||
                              "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Property Specifications */}
                      {property.property_detail_tbl?.property_area &&
                        property.property_detail_tbl.property_area.length >
                          0 && (
                          <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Specifications
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-slate-300"
                              >
                                {
                                  property.property_detail_tbl.property_area
                                    .length
                                }{" "}
                                specs
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {property.property_detail_tbl.property_area
                                .slice(0, 4)
                                .map((spec, idx) => (
                                  <div
                                    key={idx}
                                    className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100/50 px-3 py-2 rounded-lg border border-slate-200/50"
                                  >
                                    <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
                                      {spec.name}
                                    </span>
                                    <span className="text-sm text-slate-900 font-bold mt-0.5">
                                      {spec.value}{" "}
                                      <span className="text-[10px] text-slate-500 font-normal uppercase">
                                        {spec.type}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                            </div>
                            {property.property_detail_tbl.property_area.length >
                              4 && (
                              <button
                                onClick={() => {
                                  setViewingSpecs(property);
                                  setShowSpecModal(true);
                                }}
                                className="w-full mt-2 text-xs text-red-600 hover:text-red-700 font-medium py-1 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                View all{" "}
                                {
                                  property.property_detail_tbl.property_area
                                    .length
                                }{" "}
                                specifications →
                              </button>
                            )}
                          </div>
                        )}

                      {/* Amenities */}
                      {property.amenities && property.amenities.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Amenities
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-slate-300"
                            >
                              {property.amenities.length} items
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {property.amenities
                              .slice(0, 4)
                              .map((amenity, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] px-2 py-1 border-slate-300 bg-white font-medium"
                                >
                                  {amenity}
                                </Badge>
                              ))}
                            {property.amenities.length > 4 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-1 border-red-300 text-red-600 bg-red-50 font-semibold"
                              >
                                +{property.amenities.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pricing Information */}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="bg-gradient-to-br from-red-50 via-red-50/50 to-orange-50 p-4 rounded-xl border-2 border-red-200/60 shadow-sm">
                          {/* Main Price */}
                          <div className="mb-3">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Property Price
                            </p>
                            <p className="text-3xl font-black text-red-600">
                              ₱
                              {(property?.property_price || 0).toLocaleString(
                                "en-PH"
                              )}
                            </p>
                          </div>

                          {/* Divider */}
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-red-300 to-transparent my-3"></div>

                          {/* Reservation Fee */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                                Reservation Fee
                              </p>
                              <p className="text-xl font-bold text-emerald-700">
                                ₱
                                {(
                                  property?.property_downprice || 0
                                ).toLocaleString("en-PH")}
                              </p>
                            </div>
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                              {property.property_downprice &&
                              property.property_price
                                ? `${(
                                    (property.property_downprice /
                                      property.property_price) *
                                    100
                                  ).toFixed(1)}%`
                                : "0%"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-blue-600 border-2 border-blue-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white hover:border-blue-600 font-semibold transition-all duration-300 shadow-md hover:shadow-lg py-5"
                          onClick={() => handleEditProperty(property)}
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-2 border-red-300 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-600 font-semibold transition-all duration-300 shadow-md hover:shadow-lg py-5"
                          onClick={() => handleDeleteProperty(property)}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Modern Professional Modal */}
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 px-6 py-5 text-white shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Add New Property</h3>
                      <p className="text-red-100 text-sm mt-1">
                        Create a new property record for your portfolio
                      </p>
                    </div>
                  </div>
                  <button
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110"
                    onClick={() => setShowModal(false)}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto overflow-x-hidden">
                  <div className="space-y-6 pb-4">
                    {/* Property Basic Info Section */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                        Basic Information
                      </h4>

                      {/* Property Title */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Property Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="property_title"
                          value={formData.property_title}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter property title"
                          required
                          maxLength={50}
                        />
                      </div>

                      {/* Property Price */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Property Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="property_price"
                          value={formData.property_price}
                          onChange={handleInputChange}
                          onBlur={(e) => {
                            const value = Number(e.target.value);
                            if (value && value < 1000000) {
                              toast.error(
                                "Property price must be at least ₱1,000,000"
                              );
                            } else if (value > 1000000000) {
                              toast.error(
                                "Property price cannot exceed ₱1,000,000,000"
                              );
                            }
                          }}
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter property price (min: ₱1,000,000)"
                          min="1000000"
                          max="1000000000"
                          step="500"
                          required
                        />
                        {formData.property_price < 1000000 &&
                          formData.property_price > 0 && (
                            <p className="text-xs text-red-600 font-medium">
                              ⚠ Minimum price is ₱1,000,000
                            </p>
                          )}
                        {formData.property_price > 1000000000 && (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠ Maximum price is ₱1,000,000,000
                          </p>
                        )}
                        <input
                          type="range"
                          name="property_price"
                          value={Math.min(
                            Math.max(formData.property_price, 1000000),
                            1000000000
                          )}
                          className="w-full"
                          min="1000000"
                          max="1000000000"
                          step="500"
                          disabled
                        />
                        <span className="text-base font-semibold text-blue-600">
                          ₱
                          {(formData.property_price || 0).toLocaleString(
                            "en-PH"
                          )}
                        </span>
                      </div>

                      {/* Property Price */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Reservation Fee{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="property_downprice"
                          value={formData.property_downprice}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter property price"
                          min="20000"
                          max="1000000000"
                        />
                      </div>

                      {/* Property Photo */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Property Photo
                        </label>
                        <div className="flex flex-col gap-3">
                          {photoPreview ? (
                            <div className="relative w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden">
                              <img
                                src={photoPreview}
                                alt="Property preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-full h-48 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors">
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm text-slate-600 font-medium">
                                Click to upload photo
                              </span>
                              <span className="text-xs text-slate-400 mt-1">
                                PNG, JPG, GIF up to 5MB
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Block Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Block
                        </label>
                        <ReactSelect
                          options={blocks.map((block) => ({
                            value: block,
                            label: `Block ${block}`,
                          }))}
                          value={
                            formData.property_block
                              ? {
                                  value: formData.property_block,
                                  label: `Block ${formData.property_block}`,
                                }
                              : null
                          }
                          onChange={(option) => {
                            handleSelectChange(
                              "property_block",
                              option?.value || ""
                            );
                          }}
                          styles={customSelectStyles}
                          menuPortalTarget={
                            typeof document !== "undefined"
                              ? document.body
                              : null
                          }
                          placeholder="Select Block"
                          isClearable
                          required
                        />
                      </div>

                      {/* Property Details and Lot Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Property Details{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <ReactSelect
                            options={[
                              ...propertyTypes.map((type) => {
                                const isCurrentDetail =
                                  editingProperty &&
                                  editingProperty.property_details_id ===
                                    type.detail_id;
                                return {
                                  value: type.detail_id,
                                  label: `${type.property_name}${
                                    isCurrentDetail ? " (Current)" : ""
                                  }`,
                                };
                              }),
                              {
                                value: "__create_new__",
                                label: "➕ Create New Property Type",
                                className: "font-semibold text-blue-600",
                              },
                            ]}
                            value={
                              formData.property_details_id
                                ? propertyTypes.find(
                                    (t) =>
                                      t.detail_id ===
                                      formData.property_details_id
                                  )
                                  ? {
                                      value: formData.property_details_id,
                                      label: propertyTypes.find(
                                        (t) =>
                                          t.detail_id ===
                                          formData.property_details_id
                                      ).property_name,
                                    }
                                  : null
                                : null
                            }
                            onChange={(option) => {
                              if (option?.value === "__create_new__") {
                                router.push("/properties/proptype");
                              } else {
                                handleSelectChange(
                                  "property_details_id",
                                  option?.value || ""
                                );
                              }
                            }}
                            styles={customSelectStyles}
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : null
                            }
                            placeholder="Select Property Details"
                            isClearable
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Lot Number <span className="text-red-500">*</span>
                          </label>
                          <ReactSelect
                            options={[
                              ...getAvailableLots(
                                formData.property_details_id,
                                editingProperty?.property_lot_id
                              ).map((lot) => {
                                const isCurrentLot =
                                  editingProperty &&
                                  editingProperty.property_lot_id ===
                                    lot.lot_id;

                                return {
                                  value: lot.lot_id,
                                  label: `${lot.lot_number}${
                                    isCurrentLot ? " (Current)" : ""
                                  }`,
                                };
                              }),
                              {
                                value: "__create_new__",
                                label: "➕ Create New Lot",
                                className: "font-semibold text-blue-600",
                              },
                            ]}
                            value={
                              formData.property_lot_id
                                ? lotNumbers.find(
                                    (l) => l.lot_id === formData.property_lot_id
                                  )
                                  ? {
                                      value: formData.property_lot_id,
                                      label: lotNumbers.find(
                                        (l) =>
                                          l.lot_id === formData.property_lot_id
                                      ).lot_number,
                                    }
                                  : null
                                : null
                            }
                            onChange={(option) => {
                              if (option?.value === "__create_new__") {
                                router.push("/properties/lot");
                              } else {
                                handleSelectChange(
                                  "property_lot_id",
                                  option?.value || ""
                                );
                              }
                            }}
                            styles={customSelectStyles}
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : null
                            }
                            placeholder={
                              formData.property_details_id
                                ? "Select Available Lot"
                                : "Select Property Details First"
                            }
                            isClearable
                            required
                            isDisabled={!formData.property_details_id}
                            noOptionsMessage={() =>
                              formData.property_details_id
                                ? "No available lots for this property type"
                                : "Please select a property detail first"
                            }
                          />
                          {formData.property_details_id &&
                            getAvailableLots(formData.property_details_id)
                              .length === 0 && (
                              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                No available lots. Create a new lot with this
                                property type.
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Address */}
                      {/* <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter full address"
                        required
                      />
                    </div> */}

                      {/* Availability */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Availability <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="property_availability"
                          value={formData.property_availability}
                          onChange={(e) =>
                            handleSelectChange(
                              "property_availability",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        >
                          <option value="vacant">🟡 Vacant</option>
                          <option value="occupied">🟢 Occupied</option>
                          <option value="for_sale">🔵 For Sale</option>
                          <option value="under_construction">
                            🟠 Under Construction
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Property Details Section - Read Only from Property Details */}
                    {formData.property_details_id && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                          Property Specifications
                        </h4>

                        {/* Display specifications from selected property details */}
                        {(() => {
                          const selectedType = propertyTypes.find(
                            (t) => t.detail_id === formData.property_details_id
                          );
                          if (
                            selectedType?.property_area &&
                            selectedType.property_area.length > 0
                          ) {
                            return (
                              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                                {selectedType.property_area.map((spec, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded border border-slate-200"
                                  >
                                    <span className="text-slate-600 capitalize font-medium">
                                      {spec.name}
                                    </span>
                                    <span className="text-slate-900 font-semibold">
                                      {spec.value}{" "}
                                      <span className="text-slate-500 text-xs uppercase">
                                        {spec.type}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg">
                              No specifications available for this property
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    {/* Amenities */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Amenities
                      </label>

                      {/* Common Amenities */}
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-2">
                          Quick Add:
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {commonAmenities.map((amenity) => (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => handleAddAmenity(amenity)}
                              disabled={formData.amenities.includes(amenity)}
                              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                formData.amenities.includes(amenity)
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              }`}
                            >
                              {amenity}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Amenity Input */}
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={amenityInput}
                          onChange={(e) => setAmenityInput(e.target.value)}
                          placeholder="Add custom amenity..."
                          className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddAmenity(amenityInput);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAmenity(amenityInput)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Selected Amenities */}
                      {formData.amenities.length > 0 && (
                        <div className="border-2 border-slate-200 rounded-lg p-3 bg-slate-50">
                          <p className="text-xs font-medium text-slate-700 mb-2">
                            Selected Amenities:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {formData.amenities.map((amenity, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs flex items-center gap-1 pr-1 border-slate-300"
                              >
                                {amenity}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAmenity(amenity)}
                                  className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Actions - Fixed Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-6 py-3 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      formSubmitting ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding Property...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Property
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Property Modal */}
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setShowEditModal(false)
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 px-6 py-5 text-white shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                      <Edit className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Edit Property</h3>
                      <p className="text-blue-100 text-sm mt-1">
                        Update property information and details
                      </p>
                    </div>
                  </div>
                  <button
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProperty(null);
                      resetForm();
                    }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Same form as Add Property */}
              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto overflow-x-hidden">
                  <div className="space-y-6 pb-4">
                    {/* Property Basic Info Section */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                        Basic Information
                      </h4>

                      {/* Property Title */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Property Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="property_title"
                          value={formData.property_title}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter property title"
                          required
                          maxLength={50}
                        />
                      </div>

                      {/* Property Price */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Property Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="property_price"
                          value={formData.property_price}
                          onChange={handleInputChange}
                          onBlur={(e) => {
                            const value = Number(e.target.value);
                            if (value && value < 1000000) {
                              toast.error(
                                "Property price must be at least ₱1,000,000"
                              );
                            } else if (value > 1000000000) {
                              toast.error(
                                "Property price cannot exceed ₱1,000,000,000"
                              );
                            }
                          }}
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter property price (min: ₱1,000,000)"
                          min="1000000"
                          max="1000000000"
                          step="500"
                          required
                        />
                        {formData.property_price < 1000000 &&
                          formData.property_price > 0 && (
                            <p className="text-xs text-red-600 font-medium">
                              ⚠ Minimum price is ₱1,000,000
                            </p>
                          )}
                        {formData.property_price > 1000000000 && (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠ Maximum price is ₱1,000,000,000
                          </p>
                        )}
                        <input
                          type="range"
                          name="property_price"
                          value={Math.min(
                            Math.max(formData.property_price, 1000000),
                            1000000000
                          )}
                          className="w-full"
                          min="1000000"
                          max="1000000000"
                          step="500"
                          disabled
                        />
                        <span className="text-base font-semibold text-blue-600">
                          ₱
                          {(formData.property_price || 0).toLocaleString(
                            "en-PH"
                          )}
                        </span>
                      </div>

                      {/* Property Price */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Reservation Fee{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="property_downprice"
                          value={formData.property_downprice}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter property price"
                          min="20000"
                          max="1000000000"
                        />
                      </div>

                      {/* Property Photo */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Property Photo
                        </label>
                        <div className="flex flex-col gap-3">
                          {photoPreview ? (
                            <div className="relative w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden">
                              <img
                                src={photoPreview}
                                alt="Property preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-full h-48 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors">
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm text-slate-600 font-medium">
                                Click to upload photo
                              </span>
                              <span className="text-xs text-slate-400 mt-1">
                                PNG, JPG, GIF up to 5MB
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Block Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Block
                        </label>
                        <ReactSelect
                          options={blocks.map((block) => ({
                            value: block,
                            label: `Block ${block}`,
                          }))}
                          value={
                            formData.property_block
                              ? {
                                  value: formData.property_block,
                                  label: `Block ${formData.property_block}`,
                                }
                              : null
                          }
                          onChange={(option) => {
                            handleSelectChange(
                              "property_block",
                              option?.value || ""
                            );
                          }}
                          styles={customSelectStyles}
                          menuPortalTarget={
                            typeof document !== "undefined"
                              ? document.body
                              : null
                          }
                          placeholder="Select Block"
                          isClearable
                          required
                        />
                      </div>

                      {/* Property Details and Lot Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Property Details{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <ReactSelect
                            options={[
                              ...propertyTypes.map((type) => {
                                const isCurrentDetail =
                                  editingProperty &&
                                  editingProperty.property_details_id ===
                                    type.detail_id;
                                return {
                                  value: type.detail_id,
                                  label: `${type.property_name}${
                                    isCurrentDetail ? " (Current)" : ""
                                  }`,
                                };
                              }),
                              {
                                value: "__create_new__",
                                label: "➕ Create New Property Type",
                                className: "font-semibold text-blue-600",
                              },
                            ]}
                            value={
                              formData.property_details_id
                                ? propertyTypes.find(
                                    (t) =>
                                      t.detail_id ===
                                      formData.property_details_id
                                  )
                                  ? {
                                      value: formData.property_details_id,
                                      label: propertyTypes.find(
                                        (t) =>
                                          t.detail_id ===
                                          formData.property_details_id
                                      ).property_name,
                                    }
                                  : null
                                : null
                            }
                            onChange={(option) => {
                              if (option?.value === "__create_new__") {
                                router.push("/properties/proptype");
                              } else {
                                handleSelectChange(
                                  "property_details_id",
                                  option?.value || ""
                                );
                              }
                            }}
                            styles={customSelectStyles}
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : null
                            }
                            placeholder="Select Property Details"
                            isClearable
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Lot Number <span className="text-red-500">*</span>
                          </label>
                          <ReactSelect
                            options={[
                              ...getAvailableLots(
                                formData.property_details_id,
                                editingProperty?.property_lot_id
                              ).map((lot) => {
                                const isCurrentLot =
                                  editingProperty &&
                                  editingProperty.property_lot_id ===
                                    lot.lot_id;

                                return {
                                  value: lot.lot_id,
                                  label: `${lot.lot_number}${
                                    isCurrentLot ? " (Current)" : ""
                                  }`,
                                };
                              }),
                              {
                                value: "__create_new__",
                                label: "➕ Create New Lot",
                                className: "font-semibold text-blue-600",
                              },
                            ]}
                            value={
                              formData.property_lot_id
                                ? lotNumbers.find(
                                    (l) => l.lot_id === formData.property_lot_id
                                  )
                                  ? {
                                      value: formData.property_lot_id,
                                      label: lotNumbers.find(
                                        (l) =>
                                          l.lot_id === formData.property_lot_id
                                      ).lot_number,
                                    }
                                  : null
                                : null
                            }
                            onChange={(option) => {
                              if (option?.value === "__create_new__") {
                                router.push("/properties/lot");
                              } else {
                                handleSelectChange(
                                  "property_lot_id",
                                  option?.value || ""
                                );
                              }
                            }}
                            styles={customSelectStyles}
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : null
                            }
                            placeholder={
                              formData.property_details_id
                                ? "Select Available Lot"
                                : "Select Property Details First"
                            }
                            isClearable
                            required
                            isDisabled={!formData.property_details_id}
                            noOptionsMessage={() =>
                              formData.property_details_id
                                ? "No available lots for this property type"
                                : "Please select a property detail first"
                            }
                          />
                          {formData.property_details_id &&
                            getAvailableLots(formData.property_details_id)
                              .length === 0 && (
                              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                No available lots. Create a new lot with this
                                property type.
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Address */}
                      {/* <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter full address"
                        required
                      />
                    </div> */}

                      {/* Availability */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Availability <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="property_availability"
                          value={formData.property_availability}
                          onChange={(e) =>
                            handleSelectChange(
                              "property_availability",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        >
                          <option value="vacant">🟡 Vacant</option>
                          <option value="occupied">🟢 Occupied</option>
                          <option value="for_sale">🔵 For Sale</option>
                          <option value="under_construction">
                            🟠 Under Construction
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Property Details Section - Read Only from Property Details */}
                    {formData.property_details_id && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                          Property Specifications
                        </h4>

                        {/* Display specifications from selected property details */}
                        {(() => {
                          const selectedType = propertyTypes.find(
                            (t) => t.detail_id === formData.property_details_id
                          );
                          if (
                            selectedType?.property_area &&
                            selectedType.property_area.length > 0
                          ) {
                            return (
                              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                                {selectedType.property_area.map((spec, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded border border-slate-200"
                                  >
                                    <span className="text-slate-600 capitalize font-medium">
                                      {spec.name}
                                    </span>
                                    <span className="text-slate-900 font-semibold">
                                      {spec.value}{" "}
                                      <span className="text-slate-500 text-xs uppercase">
                                        {spec.type}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg">
                              No specifications available for this property
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    {/* Amenities */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Amenities
                      </label>

                      {/* Common Amenities */}
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-2">
                          Quick Add:
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {commonAmenities.map((amenity) => (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => handleAddAmenity(amenity)}
                              disabled={formData.amenities.includes(amenity)}
                              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                formData.amenities.includes(amenity)
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              }`}
                            >
                              {amenity}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Amenity Input */}
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={amenityInput}
                          onChange={(e) => setAmenityInput(e.target.value)}
                          placeholder="Add custom amenity..."
                          className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddAmenity(amenityInput);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAmenity(amenityInput)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Selected Amenities */}
                      {formData.amenities.length > 0 && (
                        <div className="border-2 border-slate-200 rounded-lg p-3 bg-slate-50">
                          <p className="text-xs font-medium text-slate-700 mb-2">
                            Selected Amenities:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {formData.amenities.map((amenity, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs flex items-center gap-1 pr-1 border-slate-300"
                              >
                                {amenity}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAmenity(amenity)}
                                  className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Actions - Fixed Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-6 py-3 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProperty(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      formSubmitting ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Property...
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4" />
                        Update Property
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setShowDeleteModal(false)
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Delete Property</h3>
                      <p className="text-red-100 text-sm mt-1">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  <button
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingProperty(null);
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
                    Are you sure you want to delete this property?
                  </h4>
                  {deletingProperty && (
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <p className="font-medium text-slate-900">
                        {deletingProperty.property_title}
                      </p>
                      <p className="text-sm text-slate-600">
                        Lot {deletingProperty.lot_tbl?.lot_number || "N/A"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {deletingProperty.property_detail_tbl?.property_name ||
                          "N/A"}
                      </p>
                    </div>
                  )}
                  <p className="text-slate-600">
                    This will permanently delete the property and all associated
                    data. This action cannot be reversed.
                  </p>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingProperty(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      formSubmitting ? "opacity-80 cursor-not-allowed" : ""
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
                        Delete Property
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Specifications Modal */}
        {showSpecModal && viewingSpecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setShowSpecModal(false)
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white sticky top-0 z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">
                      {viewingSpecs.property_title}
                    </h3>
                    <p className="text-red-100 text-sm mt-1">
                      All{" "}
                      {viewingSpecs.property_detail_tbl?.property_area
                        ?.length || 0}{" "}
                      Specifications
                    </p>
                  </div>
                  <button
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => {
                      setShowSpecModal(false);
                      setViewingSpecs(null);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                {viewingSpecs.property_detail_tbl?.property_area &&
                viewingSpecs.property_detail_tbl.property_area.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {viewingSpecs.property_detail_tbl.property_area.map(
                      (spec, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-200/50 hover:shadow-md hover:border-red-200 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
                              {spec.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-slate-300"
                            >
                              #{idx + 1}
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl text-slate-900 font-bold">
                              {spec.value}
                            </span>
                            <span className="text-xs text-slate-500 font-medium uppercase">
                              {spec.type}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Maximize className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      No specifications available
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold">Property:</span>{" "}
                    {viewingSpecs.property_detail_tbl?.property_name || "N/A"}
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200"
                    onClick={() => {
                      setShowSpecModal(false);
                      setViewingSpecs(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
