"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Home,
  User,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { isNewItem, getRelativeTime } from "@/lib/utils";
import { toast } from "react-toastify";
import Select from "react-select";

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
    borderColor: state.isFocused ? "#a855f7" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(168, 85, 247, 0.2)" : "none",
    "&:hover": {
      borderColor: "#a855f7",
    },
    borderRadius: "0.5rem",
    padding: "2px 8px",
    backgroundColor: "white",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#a855f7"
      : state.isFocused
      ? "#f3e8ff"
      : "white",
    color: state.isSelected ? "white" : "#1e293b",
    cursor: "pointer",
    padding: "10px 12px",
    "&:active": {
      backgroundColor: "#9333ea",
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#1e293b",
    fontWeight: "500",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#94a3b8",
  }),
  input: (provided) => ({
    ...provided,
    color: "#1e293b",
  }),
};

export default function Homeowners() {
  const router = useRouter();
  const [homeowners, setHomeowners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [homeownerUsers, setHomeownerUsers] = useState([]);
  const [filteredHomeowners, setFilteredHomeowners] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingHomeowner, setEditingHomeowner] = useState(null);
  const [deletingHomeowner, setDeletingHomeowner] = useState(null);

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Form state
  const [formData, setFormData] = useState({
    user_id: "",
    full_name: "",
    email: "",
    phone: "",
    unit_number: "",
    property_id: "",
    monthly_dues: "",
    move_in_date: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    status: "active",
    total_property_price: "",
    down_payment: "",
    interest_rate: "0.05",
    remaining_balance: "",
    monthly_interest: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterHomeowners();
  }, [homeowners, searchTerm]);

  // Load all homeowners with property information
  const loadHomeowners = async () => {
    try {
      console.log("🔄 Loading homeowners...");

      // Try with simplified query first (no explicit foreign key names)
      let { data, error } = await supabase
        .from("buyer_home_owner_tbl")
        .select(`
          *,
          property_info_tbl(
            property_id,
            property_title,
            property_lot_id,
            property_details_id,
            lot_tbl(
              lot_id,
              lot_number,
              is_occupied
            ),
            property_detail_tbl(
              detail_id,
              property_name
            )
          )
        `)
        .order("full_name", { ascending: true });

      if (error) {
        console.error("❌ First attempt failed, trying alternative query...");
        console.error("Error:", error.message);

        // Fallback: Try without nested relationships
        const result = await supabase
          .from("buyer_home_owner_tbl")
          .select("*")
          .order("full_name", { ascending: true });

        data = result.data;
        error = result.error;

        if (error) {
          console.error("❌ Supabase error:", error);
          console.error("Error details:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        // If we got data without relationships, fetch properties separately
        if (data && data.length > 0) {
          console.log("⚠️ Loading homeowners without property relationships");
          console.log("📊 Fetching property info separately...");

          // Fetch all properties
          const { data: properties } = await supabase
            .from("property_info_tbl")
            .select(`
              property_id,
              property_title,
              lot_tbl(lot_number),
              property_detail_tbl(property_name)
            `);

          // Map properties to homeowners
          if (properties) {
            data = data.map(homeowner => ({
              ...homeowner,
              property_info_tbl: properties.find(p => p.property_id === homeowner.property_id) || null
            }));
          }
        }
      }

      console.log("✅ Loaded homeowners:", data);
      console.log("📊 Total homeowners:", data?.length || 0);

      // Normalize the property_info field name
      const normalizedData = data?.map(homeowner => ({
        ...homeowner,
        property_info: homeowner.property_info_tbl || homeowner.property_info || null
      }));

      // Log sample to check property_info structure
      if (normalizedData && normalizedData.length > 0) {
        console.log("📋 Sample homeowner data:", normalizedData[0]);
        console.log("🏠 Sample property_info:", normalizedData[0]?.property_info);
      }

      return normalizedData || [];
    } catch (error) {
      console.error("Error loading homeowners:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);
      console.error("Full error object:", JSON.stringify(error, null, 2));

      // Return empty array to prevent UI crash
      return [];
    }
  };

  // Load all properties from property_info_tbl with related data
  const loadProperties = async () => {
    try {
      console.log("🔍 Loading properties from property_info_tbl...");

      // Load properties with lot information
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("property_info_tbl")
        .select("*")
        .order("property_title", { ascending: true });

      if (propertiesError) {
        console.error("❌ Error loading properties:", propertiesError);
        throw propertiesError;
      }

      // Load all lots to map lot_id to lot_number
      const { data: lotsData, error: lotsError } = await supabase
        .from("lot_tbl")
        .select("lot_id, lot_number, is_occupied");

      if (lotsError) {
        console.warn("⚠️ Error loading lots:", lotsError);
      }

      // Load all property details
      const { data: detailsData, error: detailsError } = await supabase
        .from("property_detail_tbl")
        .select("*");

      if (detailsError) {
        console.warn("⚠️ Error loading property details:", detailsError);
      }

      // Create lookup maps
      const lotsMap = (lotsData || []).reduce((acc, lot) => {
        acc[lot.lot_id] = lot;
        return acc;
      }, {});

      const detailsMap = (detailsData || []).reduce((acc, detail) => {
        acc[detail.detail_id] = detail;
        return acc;
      }, {});

      // Combine data
      const enrichedProperties = propertiesData.map((prop) => ({
        ...prop,
        lot_tbl: lotsMap[prop.property_lot_id] || { lot_number: "N/A" },
        property_detail_tbl: detailsMap[prop.property_details_id] || {
          property_name: "N/A",
        },
      }));

      console.log("✅ Properties loaded successfully:", enrichedProperties);
      console.log("📋 Total properties:", enrichedProperties.length);

      return enrichedProperties;
    } catch (error) {
      console.error("❌ Error loading properties:", error);
      return [];
    }
  };

  // Load homeowner users from API
  const loadHomeownerUsers = async () => {
    try {
      const response = await fetch("/api/users?role=home owner");
      const result = await response.json();

      if (result.success) {
        console.log("✅ Homeowner users loaded:", result.data);
        return result.data;
      } else {
        console.error("❌ Error loading homeowner users:", result.error);
        return [];
      }
    } catch (error) {
      console.error("❌ Error fetching homeowner users:", error);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [homeownersData, propertiesData, usersData] = await Promise.all([
        loadHomeowners(),
        loadProperties(),
        loadHomeownerUsers(),
      ]);
      setHomeowners(homeownersData);

      setProperties(propertiesData);
      setHomeownerUsers(usersData);
      console.log("📋 Loaded properties:", propertiesData);
      console.log("📋 Properties count:", propertiesData?.length || 0);
      console.log("👥 Loaded homeowner users:", usersData?.length || 0);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter homeowners based on search term
  const filterHomeowners = async () => {
    if (!searchTerm.trim()) {
      setFilteredHomeowners(homeowners);
      return;
    }

    // Client-side filtering for immediate response
    const clientFiltered = homeowners.filter(
      (homeowner) =>
        homeowner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        homeowner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        homeowner.unit_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (homeowner.properties?.name &&
          homeowner.properties.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()))
    );

    setFilteredHomeowners(clientFiltered);

    // Optional: Server-side filtering for more complex searches
    // Uncomment below if you want server-side filtering
    /*
    try {
      const { data, error } = await supabase
        .from('homeowner_tbl')
        .select(`
          *,
          properties (
            id,
            name,
            address
          )
        `)
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,unit_number.ilike.%${searchTerm}%`)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setFilteredHomeowners(data || []);
    } catch (error) {
      console.error('Error filtering homeowners:', error);
      setFilteredHomeowners([]);
    }
    */
  };

  const getPropertyName = (homeowner) => {
    // Check both property_info and property_info_tbl (normalized and original)
    const propertyInfo = homeowner.property_info_tbl || homeowner.property_info;

    if (propertyInfo) {
      const title = propertyInfo.property_title || "";
      const lotNumber = propertyInfo.lot_tbl?.lot_number || "";
      const propertyName = propertyInfo.property_detail_tbl?.property_name || "";

      // Build a descriptive name
      let displayName = title;
      if (lotNumber) displayName += ` - Lot ${lotNumber}`;
      if (propertyName) displayName += ` (${propertyName})`;

      return displayName || "Property";
    }
    return "No Property Assigned";
  };

  // Get short property name for display in grouped view
  const getShortPropertyName = (propertyInfo) => {
    if (!propertyInfo) return "N/A";

    const title = propertyInfo.property_title || "";
    const lotNumber = propertyInfo.lot_tbl?.lot_number || "";

    if (title && lotNumber) return `${title} - Lot ${lotNumber}`;
    if (title) return title;
    if (lotNumber) return `Lot ${lotNumber}`;

    return "Property";
  };

  // Group homeowners by email to show multiple properties
  const groupHomeownersByEmail = (homeownersList) => {
    const grouped = {};

    homeownersList.forEach(homeowner => {
      if (!grouped[homeowner.email]) {
        grouped[homeowner.email] = {
          ...homeowner,
          properties: []
        };
      }

      grouped[homeowner.email].properties.push({
        id: homeowner.id,
        property_id: homeowner.property_id,
        property_info: homeowner.property_info,
        unit_number: homeowner.unit_number,
        monthly_dues: homeowner.monthly_dues,
        move_in_date: homeowner.move_in_date,
        total_property_price: homeowner.total_property_price,
        down_payment: homeowner.down_payment,
        remaining_balance: homeowner.remaining_balance,
        monthly_interest: homeowner.monthly_interest,
        status: homeowner.status
      });
    });

    return Object.values(grouped);
  };

  // Get grouped homeowners for display
  const getDisplayHomeowners = () => {
    return groupHomeownersByEmail(filteredHomeowners);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate interest based on month and remaining balance
  const calculateMonthlyInterest = (
    totalPrice,
    downPayment,
    interestRate,
    currentMonth = new Date().getMonth() + 1
  ) => {
    const total = parseFloat(totalPrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(interestRate) || 0.05;

    if (total <= 0 || down < 0)
      return { remainingBalance: 0, monthlyInterest: 0 };

    const remainingBalance = total - down;
    // Interest calculation varies by month (example: higher rates during holiday months)
    const monthlyRateMultiplier = getMonthlyRateMultiplier(currentMonth);
    const monthlyInterest =
      (remainingBalance * rate * monthlyRateMultiplier) / 12;

    return {
      remainingBalance: remainingBalance,
      monthlyInterest: monthlyInterest,
    };
  };

  // Get rate multiplier based on month (Philippine context)
  const getMonthlyRateMultiplier = (month) => {
    // Higher rates during holiday season (November-January) and school opening (June)
    const seasonalRates = {
      1: 1.2, // January - New Year
      2: 1.0, // February
      3: 1.0, // March
      4: 1.0, // April
      5: 1.0, // May
      6: 1.1, // June - School opening
      7: 1.0, // July
      8: 1.0, // August
      9: 1.0, // September
      10: 1.0, // October
      11: 1.2, // November - Holiday season
      12: 1.3, // December - Christmas
    };
    return seasonalRates[month] || 1.0;
  };

  // Auto-compute when property details change
  const autoComputeInterest = (
    unitNumber,
    propertyId,
    totalPrice,
    downPayment,
    interestRate
  ) => {
    if (unitNumber && propertyId) {
      const currentMonth = new Date().getMonth() + 1;
      const { remainingBalance, monthlyInterest } = calculateMonthlyInterest(
        totalPrice,
        downPayment,
        interestRate,
        currentMonth
      );

      setFormData((prev) => ({
        ...prev,
        remaining_balance: remainingBalance.toFixed(2),
        monthly_interest: monthlyInterest.toFixed(2),
      }));
    }
  };

  // Handler for react-select user selection
  const handleUserSelect = (selectedOption) => {
    if (!selectedOption) {
      setFormData((prev) => ({
        ...prev,
        user_id: "",
        full_name: "",
        email: "",
        phone: "",
      }));
      return;
    }

    const selectedUser = homeownerUsers.find(
      (u) => u.id === selectedOption.value
    );

    // Use user metadata full_name, fallback to first_name + last_name
    const fullName =
      selectedUser?.full_name ||
      `${selectedUser?.first_name || ""} ${
        selectedUser?.last_name || ""
      }`.trim();

    const newFormData = {
      ...formData,
      user_id: selectedOption.value,
      full_name: fullName,
      email: selectedUser?.email || "",
      phone: selectedUser?.phone || "",
    };

    console.log("👤 User selected:", selectedUser?.email);
    console.log("👤 Auto-filled name:", newFormData.full_name);

    setFormData(newFormData);
  };

  // Handler for react-select property selection
  const handlePropertySelect = (selectedOption) => {
    if (!selectedOption) {
      setFormData((prev) => ({ ...prev, property_id: "", unit_number: "" }));
      return;
    }

    const selectedProperty = properties.find(
      (p) => p.property_id === selectedOption.value
    );
    const newFormData = {
      ...formData,
      property_id: selectedOption.value,
      unit_number: selectedProperty?.lot_tbl?.lot_number || "",
    };

    console.log("🏠 Property selected:", selectedProperty?.property_title);
    console.log(
      "🏠 Auto-filled lot number:",
      selectedProperty?.lot_tbl?.lot_number
    );

    setFormData(newFormData);

    // Auto-compute interest
    setTimeout(() => {
      autoComputeInterest(
        newFormData.unit_number,
        newFormData.property_id,
        newFormData.total_property_price,
        newFormData.down_payment,
        newFormData.interest_rate
      );
    }, 100);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value,
    };

    // Auto-fill lot number when property is selected (for regular select, not react-select)
    if (name === "property_id" && value) {
      const selectedProperty = properties.find((p) => p.property_id === value);
      if (selectedProperty && selectedProperty.lot_tbl) {
        newFormData.unit_number = selectedProperty.lot_tbl.lot_number || "";
        console.log(
          "🏠 Auto-filled lot number:",
          selectedProperty.lot_tbl.lot_number
        );
      }
    }

    setFormData(newFormData);

    // Auto-compute when Unit Number is changed or financial fields are updated
    if (
      name === "unit_number" ||
      name === "property_id" ||
      name === "total_property_price" ||
      name === "down_payment" ||
      name === "interest_rate"
    ) {
      setTimeout(() => {
        autoComputeInterest(
          name === "unit_number" ? value : newFormData.unit_number,
          name === "property_id" ? value : newFormData.property_id,
          name === "total_property_price"
            ? value
            : newFormData.total_property_price,
          name === "down_payment" ? value : newFormData.down_payment,
          name === "interest_rate" ? value : newFormData.interest_rate
        );
      }, 100);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      full_name: "",
      email: "",
      phone: "",
      unit_number: "",
      property_id: "",
      monthly_dues: "",
      move_in_date: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      status: "active",
      total_property_price: "",
      down_payment: "",
      interest_rate: "0.05",
      remaining_balance: "",
      monthly_interest: "",
    });
    setCurrentStep(1);
  };

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  // Validate step before proceeding
  const validateStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Personal & Contact Information
        return (
          formData.user_id?.trim() &&
          formData.full_name?.trim() &&
          formData.email?.trim() &&
          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
            formData.email
          )
        );
      case 2:
        // Step 2: Property & Financial Details
        return formData.property_id && formData.unit_number?.trim();
      case 3:
        // Step 3: Emergency Contact & Review (optional fields, always valid)
        return true;
      default:
        return false;
    }
  };

  // Validate entire form before final submission
  const validateAllSteps = () => {
    const errors = [];

    // Validate Step 1
    if (!formData.user_id?.trim()) {
      errors.push("Homeowner user selection is required");
    }
    if (!formData.full_name?.trim()) {
      errors.push("Full name is required");
    }
    if (!formData.email?.trim()) {
      errors.push("Email is required");
    } else if (
      !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)
    ) {
      errors.push("Valid email is required");
    }

    // Validate Step 2
    if (!formData.property_id) {
      errors.push("Property selection is required");
    }
    if (!formData.unit_number?.trim()) {
      errors.push("Lot number is required");
    }

    return errors;
  };

  // Handle opening edit modal
  const handleEditHomeowner = (homeowner) => {
    setEditingHomeowner(homeowner);
    setFormData({
      user_id: homeowner.user_id || "",
      full_name: homeowner.full_name,
      email: homeowner.email,
      phone: homeowner.phone || "",
      unit_number: homeowner.unit_number,
      property_id: homeowner.property_id?.toString() || "",
      monthly_dues: homeowner.monthly_dues?.toString() || "",
      move_in_date: homeowner.move_in_date
        ? homeowner.move_in_date.split("T")[0]
        : "",
      emergency_contact_name: homeowner.emergency_contact_name || "",
      emergency_contact_phone: homeowner.emergency_contact_phone || "",
      status: homeowner.status,
      total_property_price: homeowner.total_property_price?.toString() || "",
      down_payment: homeowner.down_payment?.toString() || "",
      interest_rate: homeowner.interest_rate?.toString() || "0.05",
      remaining_balance: homeowner.remaining_balance?.toString() || "",
      monthly_interest: homeowner.monthly_interest?.toString() || "",
    });
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteHomeowner = (homeowner) => {
    setDeletingHomeowner(homeowner);
    setIsDeleteModalOpen(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (!deletingHomeowner) return;

    setIsSubmitting(true);
    try {
      await deleteHomeowner(deletingHomeowner.id, deletingHomeowner.full_name);
      toast.success("Homeowner deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeletingHomeowner(null);
    } catch (error) {
      console.error("Error deleting homeowner:", error);
      toast.error("Error deleting homeowner: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update homeowner function
  const updateHomeowner = async (homeownerId, updateData) => {
    try {
      const { data, error } = await supabase
        .from("buyer_home_owner_tbl")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", homeownerId)
        .select(`
          *,
          property_info_tbl(
            property_id,
            property_title,
            property_lot_id,
            property_details_id,
            lot_tbl(
              lot_id,
              lot_number,
              is_occupied
            ),
            property_detail_tbl(
              detail_id,
              property_name
            )
          )
        `)
        .single();

      if (error) throw error;

      // Normalize property_info for consistency
      const normalizedData = {
        ...data,
        property_info: data.property_info_tbl || data.property_info || null
      };

      // Update local state
      setHomeowners((prev) =>
        prev.map((homeowner) =>
          homeowner.id === homeownerId ? { ...homeowner, ...normalizedData } : homeowner
        )
      );

      return normalizedData;
    } catch (error) {
      console.error("Error updating homeowner:", error);
      throw error;
    }
  };

  // Delete homeowner function
  const deleteHomeowner = async (homeownerId, homeownerName) => {
    try {
      const { error } = await supabase
        .from("buyer_home_owner_tbl")
        .delete()
        .eq("id", homeownerId);

      if (error) throw error;

      // Remove from local state
      setHomeowners((prev) =>
        prev.filter((homeowner) => homeowner.id !== homeownerId)
      );

      return true;
    } catch (error) {
      console.error("Error deleting homeowner:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all steps before submission
    const validationErrors = validateAllSteps();
    if (validationErrors.length > 0) {
      toast.error(
        <div>
          <strong>Please complete all required fields:</strong>
          <ul className="mt-2 ml-4 list-disc">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>,
        { autoClose: 5000 }
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for insertion or update
      const homeownerData = {
        user_id: formData.user_id, // Use selected user's ID
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        unit_number: formData.unit_number.trim(),
        property_id: formData.property_id, // Keep as UUID string, don't parse as int
        monthly_dues: formData.monthly_dues
          ? parseFloat(formData.monthly_dues)
          : null,
        move_in_date: formData.move_in_date || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone:
          formData.emergency_contact_phone.trim() || null,
        status: formData.status,
        total_property_price: formData.total_property_price
          ? parseFloat(formData.total_property_price)
          : null,
        down_payment: formData.down_payment
          ? parseFloat(formData.down_payment)
          : null,
        interest_rate: formData.interest_rate
          ? parseFloat(formData.interest_rate)
          : 0.05,
        remaining_balance: formData.remaining_balance
          ? parseFloat(formData.remaining_balance)
          : null,
        monthly_interest: formData.monthly_interest
          ? parseFloat(formData.monthly_interest)
          : null,
        updated_at: new Date().toISOString(),
      };

      if (editingHomeowner) {
        // Update existing homeowner
        console.log("📝 Updating homeowner:", editingHomeowner.id);
        const data = await updateHomeowner(editingHomeowner.id, homeownerData);
        toast.success("Homeowner updated successfully!");
        setIsEditModalOpen(false);
        setEditingHomeowner(null);
      } else {
        // Create new homeowner with selected user_id
        homeownerData.created_at = new Date().toISOString();
        console.log("👤 Creating homeowner for user:", formData.user_id);
        console.log("📋 Homeowner data to insert:", homeownerData);
        console.log("📧 Email:", homeownerData.email);
        console.log("🏠 Property ID:", homeownerData.property_id);

        const { data, error } = await supabase
          .from("buyer_home_owner_tbl")
          .insert([homeownerData])
          .select(`
            *,
            property_info_tbl(
              property_id,
              property_title,
              property_lot_id,
              property_details_id,
              lot_tbl(
                lot_id,
                lot_number,
                is_occupied
              ),
              property_detail_tbl(
                detail_id,
                property_name
              )
            )
          `);

        if (error) {
          console.error("❌ Insert error:", error);
          throw error;
        }

        console.log("✅ Insert successful:", data);

        // Success - close modal and refresh data
        setIsModalOpen(false);

        // Add the new homeowner to the current list with normalized property_info
        if (data && data[0]) {
          const normalizedHomeowner = {
            ...data[0],
            property_info: data[0].property_info_tbl || data[0].property_info || null
          };
          setHomeowners((prev) => [...prev, normalizedHomeowner]);
        }

        toast.success("Homeowner added successfully!");
      }

      resetForm();
    } catch (error) {
      console.error("Error adding homeowner:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      let errorMessage = "Error adding homeowner. Please try again.";

      // Handle specific errors
      if (error.code === "23505") {
        if (error.message.includes("email") && error.message.includes("property_id")) {
          errorMessage = "This email is already assigned to this property. Please choose a different property or email.";
        } else if (error.message.includes("email")) {
          errorMessage = "This email with this property combination already exists.";
        } else if (error.message.includes("unit_number")) {
          errorMessage = "Unit number already exists in this property.";
        } else {
          errorMessage = `Duplicate entry: ${error.details || error.message}`;
        }
      } else if (error.code === "23502") {
        errorMessage = "Required field is missing. Please check all required fields.";
      } else if (error.code === "23503") {
        errorMessage = "Invalid property or user selected. Please refresh and try again.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search by status
  const filterByStatus = async (status) => {
    if (!status) {
      setFilteredHomeowners(homeowners);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("buyer_home_owner_tbl")
        .select("*")
        .eq("status", status)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setFilteredHomeowners(data || []);
    } catch (error) {
      console.error("Error filtering by status:", error);
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
              Homeowners
            </h1>
            <p className="text-lg text-slate-600">
              Manage Futura Homes residents ({filteredHomeowners.length} total)
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Homeowner
          </Button>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search homeowners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-red-400"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => filterByStatus("")}
                className="text-sm"
              >
                All
              </Button>
              <Button
                variant="outline"
                onClick={() => filterByStatus("active")}
                className="text-sm text-green-700 hover:bg-green-50"
              >
                Active
              </Button>
              <Button
                variant="outline"
                onClick={() => filterByStatus("pending")}
                className="text-sm text-yellow-700 hover:bg-yellow-50"
              >
                Pending
              </Button>
              <Button
                variant="outline"
                onClick={() => filterByStatus("inactive")}
                className="text-sm text-red-700 hover:bg-red-50"
              >
                Inactive
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Homeowners Grid */}
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
                    className="h-80 bg-slate-200 animate-pulse rounded-2xl"
                  />
                ))}
            </div>
          ) : filteredHomeowners.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No homeowners found
              </h3>
              <p className="text-slate-600">
                {searchTerm
                  ? "Try adjusting your search"
                  : "No homeowners have been added yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHomeowners.map((homeowner, index) => (
                <motion.div
                  key={homeowner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group overflow-hidden bg-white/80 backdrop-blur-sm border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-1">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200">
                            <AvatarFallback className="text-red-700 font-semibold text-lg">
                              {getInitials(homeowner.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-xl text-slate-900">
                              {homeowner.full_name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                className={`${getStatusColor(
                                  homeowner.status
                                )} border font-medium`}
                              >
                                {homeowner.status}
                              </Badge>
                              {isNewItem(homeowner.created_at) && (
                                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md animate-pulse">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Contact Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">
                            {homeowner.email}
                          </span>
                        </div>
                        {homeowner.phone && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">{homeowner.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-slate-600">
                          <Home className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">
                            Unit {homeowner.unit_number} -{" "}
                            {getPropertyName(homeowner)}
                          </span>
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        {homeowner.monthly_dues && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              Monthly Dues
                            </span>
                            <span className="font-bold text-slate-900">
                              ₱{homeowner.monthly_dues?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {homeowner.move_in_date && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-slate-700">
                                Move-in Date
                              </span>
                            </div>
                            <span className="text-sm text-slate-600">
                              {format(
                                new Date(homeowner.move_in_date),
                                "MMM d, yyyy"
                              )}
                            </span>
                          </div>
                        )}

                        {/* Financial Information */}
                        {homeowner.total_property_price && (
                          <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-3">
                            <span className="text-sm font-medium text-red-700">
                              Property Price
                            </span>
                            <span className="font-bold text-red-900">
                              ₱
                              {homeowner.total_property_price?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {homeowner.down_payment && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-700">
                              Down Payment
                            </span>
                            <span className="font-bold text-green-900">
                              ₱{homeowner.down_payment?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {homeowner.remaining_balance && Math.max(0, homeowner.remaining_balance) > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-orange-700">
                              Remaining Balance
                            </span>
                            <span className="font-bold text-orange-900">
                              ₱{Math.max(0, homeowner.remaining_balance)?.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {homeowner.monthly_interest && (
                          <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-red-700">
                                Monthly Interest
                              </span>
                            </div>
                            <span className="font-bold text-red-900">
                              ₱{homeowner.monthly_interest?.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Emergency Contact */}
                      {homeowner.emergency_contact_name && (
                        <div className="pt-3 border-t border-slate-200">
                          <p className="text-xs font-medium text-slate-500 mb-2">
                            Emergency Contact
                          </p>
                          <p className="text-sm text-slate-700">
                            {homeowner.emergency_contact_name}
                          </p>
                          {homeowner.emergency_contact_phone && (
                            <p className="text-sm text-slate-600">
                              {homeowner.emergency_contact_phone}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-slate-200">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleEditHomeowner(homeowner)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDeleteHomeowner(homeowner)}
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
          )}
        </motion.div>
      </div>

      {/* DaisyUI Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Add New Homeowner</h2>
                  <p className="text-red-100 text-sm mt-1">
                    Step {currentStep} of {totalSteps}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="relative mt-6 flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="relative flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => goToStep(step)}
                        disabled={step > currentStep}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                          step < currentStep
                            ? "bg-white text-red-600 shadow-lg"
                            : step === currentStep
                            ? "bg-white text-red-600 shadow-lg ring-4 ring-white/30"
                            : "bg-red-400/30 text-white"
                        } ${
                          step <= currentStep
                            ? "cursor-pointer"
                            : "cursor-not-allowed"
                        }`}
                      >
                        {step < currentStep ? "✓" : step}
                      </button>
                      <span className="text-xs mt-2 text-white font-medium absolute top-12 whitespace-nowrap">
                        {step === 1
                          ? "Personal"
                          : step === 2
                          ? "Property"
                          : "Review"}
                      </span>
                    </div>
                    {step < 3 && (
                      <div
                        className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${
                          step < currentStep ? "bg-white" : "bg-red-400/30"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Form Content - Scrollable */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)] space-y-6">
                {/* STEP 1: Personal & Contact Information */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* User Selection */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        Select Homeowner User
                      </h3>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Homeowner Account{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Select
                          options={homeownerUsers.map((user) => {
                            const displayName =
                              user.full_name ||
                              `${user.first_name} ${user.last_name}`.trim();
                            return {
                              value: user.id,
                              label: `${displayName} (${user.email})`,
                            };
                          })}
                          value={
                            formData.user_id
                              ? {
                                  value: formData.user_id,
                                  label: (() => {
                                    const user = homeownerUsers.find(
                                      (u) => u.id === formData.user_id
                                    );
                                    if (!user) return "Select user...";
                                    const displayName =
                                      user.full_name ||
                                      `${user.first_name} ${user.last_name}`.trim();
                                    return `${displayName} (${user.email})`;
                                  })(),
                                }
                              : null
                          }
                          onChange={handleUserSelect}
                          styles={customSelectStyles}
                          placeholder="Search and select a homeowner user..."
                          isClearable
                          isSearchable
                          menuPortalTarget={
                            typeof document !== "undefined"
                              ? document.body
                              : null
                          }
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Select a user account with "home owner" role. This
                          will auto-fill their personal information below.
                        </p>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all disabled:bg-slate-100 disabled:text-slate-600"
                            placeholder="Enter full name"
                            required
                            disabled={!!formData.user_id}
                          />
                          {formData.user_id && (
                            <p className="text-xs text-slate-500">
                              Auto-filled from user account
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Status
                          </label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                          >
                            <option value="active">✅ Active</option>
                            <option value="pending">⏳ Pending</option>
                            <option value="inactive">❌ Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Email Address{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all disabled:bg-slate-100 disabled:text-slate-600"
                            placeholder="homeowner@example.com"
                            required
                            disabled={!!formData.user_id}
                          />
                          {formData.user_id && (
                            <p className="text-xs text-slate-500">
                              Auto-filled from user account
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all disabled:bg-slate-100 disabled:text-slate-600"
                            placeholder="+63 XXX XXX XXXX"
                            disabled={!!formData.user_id}
                          />
                          {formData.user_id && (
                            <p className="text-xs text-slate-500">
                              Auto-filled from user account
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Property & Financial Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Property Information */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <Home className="w-5 h-5 text-white" />
                        </div>
                        Property Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Property <span className="text-red-500">*</span>
                          </label>
                          <Select
                            options={[
                              ...properties
                                .filter((property) => {
                                  // Exclude properties that are already assigned to other homeowners
                                  const isAssigned = homeowners.some(
                                    (h) => h.property_id === property.property_id && h.id !== editingHomeowner?.id
                                  );
                                  return !isAssigned;
                                })
                                .map((property) => ({
                                  value: property.property_id,
                                  label: `${property.property_title} - Lot ${
                                    property.lot_tbl?.lot_number || "N/A"
                                  } (${
                                    property.property_detail_tbl?.property_name ||
                                    "N/A"
                                  })`,
                                  property: property,
                                })),
                              {
                                value: '__create_new__',
                                label: '➕ Create New Property',
                                isCreateNew: true
                              }
                            ]}
                            value={
                              formData.property_id
                                ? {
                                    value: formData.property_id,
                                    label: properties.find(
                                      (p) =>
                                        p.property_id === formData.property_id
                                    )
                                      ? `${
                                          properties.find(
                                            (p) =>
                                              p.property_id ===
                                              formData.property_id
                                          ).property_title
                                        } - Lot ${
                                          properties.find(
                                            (p) =>
                                              p.property_id ===
                                              formData.property_id
                                          ).lot_tbl?.lot_number || "N/A"
                                        } (${
                                          properties.find(
                                            (p) =>
                                              p.property_id ===
                                              formData.property_id
                                          ).property_detail_tbl
                                            ?.property_name || "N/A"
                                        })`
                                      : "Select a property",
                                  }
                                : null
                            }
                            onChange={(selectedOption) => {
                              if (selectedOption?.value === '__create_new__') {
                                router.push('/properties');
                              } else {
                                handlePropertySelect(selectedOption);
                              }
                            }}
                            styles={customSelectStyles}
                            placeholder="Search and select a property..."
                            isClearable
                            isSearchable
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : null
                            }
                            menuPosition="fixed"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Lot Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="unit_number"
                            value={formData.unit_number}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
                            placeholder="Select property first"
                            readOnly
                            required
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Auto-filled from selected property
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Monthly Dues (₱)
                          </label>
                          <input
                            type="number"
                            name="monthly_dues"
                            value={formData.monthly_dues}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                            placeholder="Enter monthly dues"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Move-in Date
                          </label>
                          <input
                            type="date"
                            name="move_in_date"
                            value={formData.move_in_date}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Information */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        Financial Information & Interest Calculation
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Total Property Price (₱)
                          </label>
                          <input
                            type="number"
                            name="total_property_price"
                            value={formData.total_property_price}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                            placeholder="Enter total property price"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Down Payment (₱)
                          </label>
                          <input
                            type="number"
                            name="down_payment"
                            value={formData.down_payment}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                            placeholder="Enter down payment amount"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Interest Rate (as decimal)
                          </label>
                          <input
                            type="number"
                            name="interest_rate"
                            value={formData.interest_rate}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                            placeholder="0.05 (for 5%)"
                            min="0"
                            max="1"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-green-700">
                            Current Month Rate
                          </label>
                          <div className="p-3 bg-green-100 rounded-lg border border-green-200">
                            <span className="font-semibold text-green-800">
                              {getMonthlyRateMultiplier(
                                new Date().getMonth() + 1
                              ) * 100}
                              % of base rate
                            </span>
                            <div className="text-xs text-green-600 mt-1">
                              {new Date().toLocaleString("en-US", {
                                month: "long",
                              })}{" "}
                              seasonal rate
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Auto-calculated fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-orange-700">
                            Remaining Balance (₱)
                          </label>
                          <input
                            type="text"
                            name="remaining_balance"
                            value={
                              formData.remaining_balance
                                ? `₱${parseFloat(
                                    formData.remaining_balance
                                  ).toLocaleString()}`
                                : ""
                            }
                            className="w-full px-4 py-3 border border-orange-300 rounded-lg bg-orange-50 text-orange-800 font-semibold"
                            readOnly
                            placeholder="Auto-calculated"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-red-700">
                            Monthly Interest (₱)
                          </label>
                          <input
                            type="text"
                            name="monthly_interest"
                            value={
                              formData.monthly_interest
                                ? `₱${parseFloat(
                                    formData.monthly_interest
                                  ).toLocaleString()}`
                                : ""
                            }
                            className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-800 font-semibold"
                            readOnly
                            placeholder="Auto-calculated"
                          />
                        </div>
                      </div>

                      {/* Calculation Info */}
                      <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                        <div className="text-sm text-red-800">
                          <strong>How it works:</strong> When you enter a Unit
                          Number, the system automatically calculates:
                          <ul className="mt-2 ml-4 list-disc text-xs space-y-1">
                            <li>
                              Remaining Balance = Total Property Price - Down
                              Payment
                            </li>
                            <li>
                              Monthly Interest = (Remaining Balance × Interest
                              Rate × Monthly Rate) ÷ 12
                            </li>
                            <li>
                              Monthly rates vary by season (higher during
                              holidays and school opening)
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Emergency Contact & Review */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Emergency Contact */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        Emergency Contact
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Contact Name
                          </label>
                          <input
                            type="text"
                            name="emergency_contact_name"
                            value={formData.emergency_contact_name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                            placeholder="Enter emergency contact name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            name="emergency_contact_phone"
                            value={formData.emergency_contact_phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all"
                            placeholder="Enter emergency contact phone"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Review Summary */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        Review Summary
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">
                              Full Name
                            </p>
                            <p className="font-semibold text-slate-800">
                              {formData.full_name || "—"}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">
                              Status
                            </p>
                            <p className="font-semibold text-slate-800">
                              {formData.status || "—"}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Email</p>
                            <p className="font-semibold text-slate-800">
                              {formData.email || "—"}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">Phone</p>
                            <p className="font-semibold text-slate-800">
                              {formData.phone || "—"}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">
                              Unit Number
                            </p>
                            <p className="font-semibold text-slate-800">
                              {formData.unit_number || "—"}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-1">
                              Monthly Dues
                            </p>
                            <p className="font-semibold text-slate-800">
                              {formData.monthly_dues
                                ? `₱${parseFloat(
                                    formData.monthly_dues
                                  ).toLocaleString()}`
                                : "—"}
                            </p>
                          </div>
                        </div>
                        {(formData.total_property_price ||
                          formData.down_payment ||
                          formData.interest_rate) && (
                          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm font-semibold text-amber-800 mb-2">
                              Financial Summary
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {formData.total_property_price && (
                                <p className="text-slate-700">
                                  Property Price:{" "}
                                  <span className="font-semibold">
                                    ₱
                                    {parseFloat(
                                      formData.total_property_price
                                    ).toLocaleString()}
                                  </span>
                                </p>
                              )}
                              {formData.down_payment && (
                                <p className="text-slate-700">
                                  Down Payment:{" "}
                                  <span className="font-semibold">
                                    ₱
                                    {parseFloat(
                                      formData.down_payment
                                    ).toLocaleString()}
                                  </span>
                                </p>
                              )}
                              {formData.remaining_balance && Math.max(0, parseFloat(formData.remaining_balance)) > 0 && (
                                <p className="text-orange-700">
                                  Balance:{" "}
                                  <span className="font-semibold">
                                    ₱
                                    {Math.max(0, parseFloat(
                                      formData.remaining_balance || 0
                                    )).toLocaleString()}
                                  </span>
                                </p>
                              )}
                              {formData.monthly_interest && (
                                <p className="text-red-700">
                                  Monthly Interest:{" "}
                                  <span className="font-semibold">
                                    ₱
                                    {parseFloat(
                                      formData.monthly_interest
                                    ).toLocaleString()}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    currentStep === 1
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  <span>← Previous</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setCurrentStep(1);
                      resetForm();
                    }}
                    className="px-6 py-3 rounded-lg font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>

                  {currentStep < totalSteps ? (
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={!validateStep()}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                          validateStep()
                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <span>Next →</span>
                      </button>
                      {!validateStep() && (
                        <p className="text-xs text-red-500">
                          {currentStep === 1 &&
                            "Please select a homeowner user and ensure all fields are filled"}
                          {currentStep === 2 && "Please select a property"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg transition-all"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Homeowner
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Homeowner Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 px-6 py-5 text-white shadow-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Edit Homeowner</h3>
                    <p className="text-red-100 text-sm mt-1">Update homeowner information and details</p>
                  </div>
                </div>
                <button
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingHomeowner(null);
                    resetForm();
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 transition-all"
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 transition-all appearance-none cursor-pointer"
                      >
                        <option value="active">✅ Active</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="inactive">❌ Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 transition-all"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 transition-all"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    Property Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Property <span className="text-red-500">*</span>
                      </label>
                      <Select
                      options={[
                        ...properties
                          .filter((property) => {
                            // Exclude properties that are already assigned to other homeowners
                            const isAssigned = homeowners.some(
                              (h) => h.property_id === property.property_id && h.id !== editingHomeowner?.id
                            );
                            return !isAssigned;
                          })
                          .map((property) => ({
                            value: property.property_id,
                            label: `${property.property_title} - Lot ${
                              property.lot_tbl?.lot_number || "N/A"
                            } (${
                              property.property_detail_tbl?.property_name || "N/A"
                            })`,
                            property: property,
                          })),
                        {
                          value: '__create_new__',
                          label: '➕ Create New Property',
                          isCreateNew: true
                        }
                      ]}
                      value={
                        formData.property_id
                          ? {
                              value: formData.property_id,
                              label: properties.find(
                                (p) => p.property_id === formData.property_id
                              )
                                ? `${
                                    properties.find(
                                      (p) =>
                                        p.property_id === formData.property_id
                                    ).property_title
                                  } - Lot ${
                                    properties.find(
                                      (p) =>
                                        p.property_id === formData.property_id
                                    ).lot_tbl?.lot_number || "N/A"
                                  } (${
                                    properties.find(
                                      (p) =>
                                        p.property_id === formData.property_id
                                    ).property_detail_tbl?.property_name ||
                                    "N/A"
                                  })`
                                : "Select a property",
                            }
                          : null
                      }
                      onChange={(selectedOption) => {
                        if (selectedOption?.value === '__create_new__') {
                          router.push('/properties');
                        } else {
                          handlePropertySelect(selectedOption);
                        }
                      }}
                      styles={customSelectStyles}
                      placeholder="Search and select a property..."
                      isClearable
                      isSearchable
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                        menuPosition="fixed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Lot Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="unit_number"
                        value={formData.unit_number}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
                        placeholder="Select property first"
                        readOnly
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">Auto-filled from selected property</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Monthly Dues (₱)</label>
                      <input
                        type="number"
                        name="monthly_dues"
                        value={formData.monthly_dues}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 transition-all"
                        placeholder="Enter monthly dues"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Move-in Date</label>
                      <input
                        type="date"
                        name="move_in_date"
                        value={formData.move_in_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

              {/* Financial Information */}
              <div className="card bg-red-50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Financial Information & Interest Calculation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Total Property Price (₱)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="total_property_price"
                      value={formData.total_property_price}
                      onChange={handleInputChange}
                      className="input input-bordered bg-white focus:input-primary"
                      placeholder="Enter total property price"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Down Payment (₱)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="down_payment"
                      value={formData.down_payment}
                      onChange={handleInputChange}
                      className="input input-bordered bg-white focus:input-primary"
                      placeholder="Enter down payment amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Interest Rate (as decimal)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="interest_rate"
                      value={formData.interest_rate}
                      onChange={handleInputChange}
                      className="input input-bordered bg-white focus:input-primary"
                      placeholder="0.05 (for 5%)"
                      min="0"
                      max="1"
                      step="0.01"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium text-green-600">
                        Current Month Rate
                      </span>
                    </label>
                    <div className="text-sm p-3 bg-green-100 rounded-lg border">
                      <span className="font-semibold text-green-800">
                        {getMonthlyRateMultiplier(new Date().getMonth() + 1) *
                          100}
                        % of base rate
                      </span>
                      <div className="text-xs text-green-600 mt-1">
                        {new Date().toLocaleString("en-US", { month: "long" })}{" "}
                        seasonal rate
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auto-calculated fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium text-orange-600">
                        Remaining Balance (₱)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="remaining_balance"
                      value={
                        formData.remaining_balance
                          ? `₱${parseFloat(
                              formData.remaining_balance
                            ).toLocaleString()}`
                          : ""
                      }
                      className="input input-bordered bg-orange-50 text-orange-800 font-semibold"
                      readOnly
                      placeholder="Auto-calculated"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium text-red-600">
                        Monthly Interest (₱)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="monthly_interest"
                      value={
                        formData.monthly_interest
                          ? `₱${parseFloat(
                              formData.monthly_interest
                            ).toLocaleString()}`
                          : ""
                      }
                      className="input input-bordered bg-red-50 text-red-800 font-semibold"
                      readOnly
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                {/* Calculation Info */}
                <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="text-sm text-red-800">
                    <strong>How it works:</strong> When you enter a Unit Number,
                    the system automatically calculates:
                    <ul className="mt-2 ml-4 list-disc text-xs">
                      <li>
                        Remaining Balance = Total Property Price - Down Payment
                      </li>
                      <li>
                        Monthly Interest = (Remaining Balance × Interest Rate ×
                        Monthly Rate) ÷ 12
                      </li>
                      <li>
                        Monthly rates vary by season (higher during holidays and
                        school opening)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="card bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-red-600" />
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Contact Name
                      </span>
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      className="input input-bordered bg-white focus:input-primary"
                      placeholder="Enter emergency contact name"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        Contact Phone
                      </span>
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      className="input input-bordered bg-white focus:input-primary"
                      placeholder="Enter emergency contact phone"
                    />
                  </div>
                </div>
              </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6 border-t-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingHomeowner(null);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Edit className="w-5 h-5" />
                        Update Homeowner
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setIsDeleteModalOpen(false)
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
                    <h3 className="text-xl font-bold">Delete Homeowner</h3>
                    <p className="text-red-100 text-sm mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingHomeowner(null);
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
                  Are you sure you want to delete this homeowner?
                </h4>
                {deletingHomeowner && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200">
                        <AvatarFallback className="text-red-700 font-semibold">
                          {getInitials(deletingHomeowner.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium text-slate-900">
                          {deletingHomeowner.full_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {deletingHomeowner.email}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      Unit {deletingHomeowner.unit_number}
                    </p>
                  </div>
                )}
                <p className="text-slate-600">
                  This will permanently delete the homeowner record and all
                  associated data. This action cannot be reversed.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingHomeowner(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isSubmitting ? "opacity-80 cursor-not-allowed" : ""
                  }`}
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Homeowner
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
