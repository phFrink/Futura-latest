"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Bed,
  Bath,
  Maximize,
  X,
  Calendar,
  Phone,
  Mail,
  User,
  Home,
  ChevronLeft,
  ChevronRight,
  Filter,
  Menu,
  Building2,
  LogOut,
  LogIn,
  Settings,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Wrench,
  MessageSquare,
  Armchair,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import RealNotificationBell from "@/components/ui/RealNotificationBell";

// Initialize Supabase client with proper persistence
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'futura-client-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

export default function ClientLandingPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, logout } = useClientAuth();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [approvedReservations, setApprovedReservations] = useState([]);
  const [pendingReservations, setPendingReservations] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    propertyType: "all",
    bedrooms: "all",
  });

  // Reservation form state (formerly appointment form)
  const [reservationForm, setReservationForm] = useState({
    // Contact information
    phone: "",
    address: "",

    // Employment/Income information
    occupation: "",
    employer: "",
    employment_status: "employed", // employed, self-employed, retired, unemployed
    years_employed: "",
    monthly_income: "",
    other_income_source: "",
    other_income_amount: "",

    // ID Upload information
    id_type: "",
    id_file: null,

    // Additional notes
    message: "",
  });

  // Inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    message: "",
  });

  // OTP verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, properties]);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest(".relative")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const fetchProperties = async () => {
    try {
      setLoading(true);

      // Fetch properties
      const { data: propertiesData, error } = await supabase
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
            lot_number
          )
        `
        )
        .eq("property_availability", "for_sale")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch approved reservations
      const { data: reservationsData, error: reservationsError } =
        await supabase
          .from("property_reservations")
          .select("property_id, status")
          .eq("status", "approved");

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError);
      } else {
        setApprovedReservations(reservationsData || []);
      }

      // Fetch PENDING reservations for current user
       console.log("🔍 Fetching pending reservations for user ID:", user);
      if (user?.id) {
        console.log("🔍 Fetching pending reservations for user ID:", user);

        const { data: pendingData, error: pendingError } = await supabase
          .from("property_reservations")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending");

        if (pendingError) {
          console.error("❌ Error fetching pending reservations:", pendingError);
        } else {
          console.log("📋 Pending reservations found:", pendingData?.length || 0);
          console.log("📋 Pending reservations data:", pendingData);

          if (pendingData && pendingData.length > 0) {
            console.log("📋 Property IDs with pending reservations:",
              pendingData.map(r => r.property_id)
            );
          }

          setPendingReservations(pendingData || []);
        }
      } else {
        console.log("⚠️ No user ID available, skipping pending reservations fetch");
      }

      setProperties(propertiesData || []);
      setFilteredProperties(propertiesData || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if property has pending reservation for current user
  const hasPendingReservation = (propertyId) => {
    const hasPending = pendingReservations.some(
      reservation => reservation.property_id === propertyId
    );

    if (hasPending) {
      console.log(`✅ Property ${propertyId} has pending reservation`);
    }

    return hasPending;
  };

  // Helper function to get spec value from property_area array
  const getSpecValue = (property, specName) => {
    if (!property?.property_detail_tbl?.property_area) return null;
    const spec = property.property_detail_tbl.property_area.find((s) =>
      s.name?.toLowerCase().includes(specName.toLowerCase())
    );
    return spec ? spec.value : null;
  };

  // Helper function to check if property is already reserved
  const isPropertyReserved = (propertyId) => {
    return approvedReservations.some(
      (reservation) => reservation.property_id === propertyId
    );
  };

  const applyFilters = () => {
    let filtered = [...properties];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.property_title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.lot_tbl?.lot_number
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          property.property_detail_tbl?.property_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Property type filter
    if (filters.propertyType !== "all") {
      filtered = filtered.filter(
        (property) =>
          property.property_detail_tbl?.property_name === filters.propertyType
      );
    }

    // Bedrooms filter
    if (filters.bedrooms !== "all") {
      filtered = filtered.filter((property) => {
        const bedrooms = getSpecValue(property, "bedroom");
        return bedrooms && parseInt(bedrooms) >= parseInt(filters.bedrooms);
      });
    }

    setFilteredProperties(filtered);
  };

  const handleSendOTP = async () => {
    // Validate email first
    const email = isAuthenticated ? user.email : inquiryForm.email;

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setSendingOtp(true);
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          purpose: "inquiry verification",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("OTP sent to your email! Please check your inbox.");
        setOtpSent(true);
        setOtpTimer(300); // 5 minutes = 300 seconds
        setOtpCode("");
        setOtpVerified(false);
      } else {
        toast.error(result.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }

    const email = isAuthenticated ? user.email : inquiryForm.email;

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Email verified successfully!");
        setOtpVerified(true);
        setOtpTimer(0);
      } else {
        toast.error(result.message || "Invalid OTP code");
        setOtpCode("");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify OTP. Please try again.");
    }
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();

    // For non-authenticated users, require OTP verification
    if (!isAuthenticated && !otpVerified) {
      toast.error("Please verify your email with OTP first");
      return;
    }

    try {
      // Generate reCAPTCHA token
      let recaptchaToken = null;
      if (window.grecaptcha && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        try {
          recaptchaToken = await window.grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "inquiry_submit" }
          );
          console.log("✅ reCAPTCHA token generated");
        } catch (recaptchaError) {
          console.error("❌ reCAPTCHA error:", recaptchaError);
          toast.error(
            "Security verification failed. Please refresh the page and try again."
          );
          return;
        }
      }

      // Split full name for authenticated users
      let firstname = "";
      let lastname = "";

      if (isAuthenticated) {
        const fullName =
          profile?.full_name ||
          profile?.first_name ||
          user?.email?.split("@")[0] ||
          "";
        const nameParts = fullName.trim().split(" ");
        firstname = nameParts[0] || "";
        lastname = nameParts.slice(1).join(" ") || "";
      } else {
        firstname = inquiryForm.firstname;
        lastname = inquiryForm.lastname;
      }

      const response = await fetch("/api/send-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          property_id: selectedProperty?.property_id,
          property_title: selectedProperty?.property_title,
          user_id: user?.id || null,
          role_id: profile?.role_id || null,
          client_firstname: firstname,
          client_lastname: lastname,
          client_email: isAuthenticated ? user.email : inquiryForm.email,
          client_phone: isAuthenticated
            ? profile?.phone || ""
            : inquiryForm.phone,
          message: inquiryForm.message,
          is_authenticated: isAuthenticated,
          recaptcha_token: recaptchaToken,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to send inquiry");
      }

      toast.success(
        result.message || "Inquiry sent successfully! We will contact you soon."
      );
      setShowInquiryModal(false);
      setInquiryForm({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        message: "",
      });
      // Reset OTP states
      setOtpSent(false);
      setOtpCode("");
      setOtpVerified(false);
      setOtpTimer(0);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast.error(error.message || "Failed to submit inquiry");
    }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      toast.error("Please login to submit a reservation");
      router.push("/client-login");
      return;
    }

    try {
      // Calculate total monthly income
      const totalMonthlyIncome =
        parseFloat(reservationForm.monthly_income || 0) +
        parseFloat(reservationForm.other_income_amount || 0);

      // Create FormData for file upload
      const formData = new FormData();

      // Add the ID file if present
      if (reservationForm.id_file) {
        formData.append("id_file", reservationForm.id_file);
      }

      // Add ID type
      if (reservationForm.id_type) {
        formData.append("id_type", reservationForm.id_type);
      }

      // Use the property_downprice from the property (not calculated)
      const downpaymentAmount = selectedProperty?.property_downprice || 0;

      // Add reservation data as JSON string
      const reservationData = {
        // Property Information
        property_id: selectedProperty?.property_id,
        property_title: selectedProperty?.property_title,
        reservation_fee: downpaymentAmount,

        // User Information
        user_id: user.id,
        client_name: profile?.full_name || user.email,
        client_email: user.email,

        // Contact Details
        client_phone: reservationForm.phone,
        client_address: reservationForm.address,

        // Employment Information
        occupation: reservationForm.occupation,
        employer: reservationForm.employer,
        employment_status: reservationForm.employment_status,
        years_employed: parseInt(reservationForm.years_employed),

        // Income Information
        monthly_income: parseFloat(reservationForm.monthly_income),
        other_income_source: reservationForm.other_income_source || null,
        other_income_amount: reservationForm.other_income_amount
          ? parseFloat(reservationForm.other_income_amount)
          : null,
        total_monthly_income: totalMonthlyIncome,

        // Additional Notes
        message: reservationForm.message || null,

        // Status
        status: "pending",
      };

      formData.append("reservation_data", JSON.stringify(reservationData));

      const response = await fetch("/api/property-reservation", {
        method: "POST",
        body: formData, // Send FormData instead of JSON
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to submit reservation");
      }

      // Close reservation modal
      setShowAppointmentModal(false);

      // Show receipt with reservation data
      setReceiptData({
        ...result.data,
        property_title: selectedProperty?.property_title,
        reservation_fee: downpaymentAmount,
        property_price: selectedProperty?.property_price || 0,
        client_name: profile?.full_name || user.email,
        client_email: user.email,
        client_phone: reservationForm.phone,
        client_address: reservationForm.address,
      });
      setShowReceiptModal(true);

      toast.success(result.message || "Reservation submitted successfully!");

      // Refresh properties and pending reservations
      fetchProperties();

      // Reset form
      setReservationForm({
        phone: "",
        address: "",
        occupation: "",
        employer: "",
        employment_status: "employed",
        years_employed: "",
        monthly_income: "",
        other_income_source: "",
        other_income_amount: "",
        id_type: "",
        id_file: null,
        message: "",
      });
    } catch (error) {
      console.error("Error submitting reservation:", error);
      toast.error(error.message || "Failed to submit reservation request");
    }
  };

  const formatPrice = (price) => {
    if (!price) return null;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format price with K, M, B suffix
  const formatPriceShort = (price) => {
    if (!price) return "₱0";

    const absPrice = Math.abs(price);

    if (absPrice >= 1000000000) {
      return `₱${(price / 1000000000).toFixed(1)}B`;
    } else if (absPrice >= 1000000) {
      return `₱${(price / 1000000).toFixed(1)}M`;
    } else if (absPrice >= 1000) {
      return `₱${(price / 1000).toFixed(1)}K`;
    } else {
      return `₱${price.toFixed(0)}`;
    }
  };

  // Helper to get property type options
  const getPropertyTypes = () => {
    const types = new Set(
      properties
        .map((p) => p.property_detail_tbl?.property_name)
        .filter(Boolean)
    );
    return Array.from(types);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header/Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-red-600" />
              <span className="text-2xl font-bold text-slate-800">
                Futura Homes
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#properties"
                className="text-slate-600 hover:text-red-600 transition-colors"
              >
                Properties
              </a>
              <a
                href="#about"
                className="text-slate-600 hover:text-red-600 transition-colors"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-slate-600 hover:text-red-600 transition-colors"
              >
                Contact
              </a>
              {isAuthenticated && (
                <div className="flex items-center gap-4">
                  <RealNotificationBell />
                </div>
              )}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <span className="text-slate-600">
                      Hi, {profile?.full_name || user?.email?.split("@")[0]}
                    </span>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white font-semibold shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                      {profile?.profile_photo ? (
                        <img
                          src={profile.profile_photo}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{getUserInitials()}</span>
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                      <Link
                        href="/client-account"
                        className="flex items-center px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        <span>Account Settings</span>
                      </Link>
                      <Link
                        href="/client-bookings"
                        className="flex items-center px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Calendar className="mr-3 h-4 w-4" />
                        <span>My Bookings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/client-login">
                  <Button className="bg-red-600 hover:bg-red-700">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
            <div className="md:hidden flex items-center gap-3">
              {/* Mobile Notification Bell */}
              {isAuthenticated && <RealNotificationBell />}
              <button>
                <Menu className="h-6 w-6 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-red-600 to-red-700 text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Find Your Dream Home Today
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-red-50">
              Discover the perfect property that matches your lifestyle and
              budget
            </p>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by title or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-slate-900 text-lg border-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <Button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className="h-14 px-8 bg-slate-100 text-slate-900 hover:bg-slate-200 font-semibold"
                >
                  <Filter className="mr-2 h-5 w-5" />
                  Filters
                </Button>
                <Button
                  onClick={applyFilters}
                  className="h-14 px-8 bg-red-600 hover:bg-red-700 font-semibold text-lg"
                >
                  Search
                </Button>
              </div>

              {/* Filter Panel */}
              <AnimatePresence>
                {showFilterPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-6 pt-6 border-t border-slate-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Property Type
                        </label>
                        <select
                          value={filters.propertyType}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              propertyType: e.target.value,
                            })
                          }
                          className="w-full h-10 px-3 rounded-md border border-slate-300 text-slate-900"
                        >
                          <option value="all">All Types</option>
                          {getPropertyTypes().map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Min Bedrooms
                        </label>
                        <select
                          value={filters.bedrooms}
                          onChange={(e) =>
                            setFilters({ ...filters, bedrooms: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-md border border-slate-300 text-slate-900"
                        >
                          <option value="all">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="properties" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Available Properties
            </h2>
            <p className="text-lg text-slate-600">
              {filteredProperties.length} properties found
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-20">
              <Home className="h-20 w-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-slate-600 mb-2">
                No properties found
              </h3>
              <p className="text-slate-500">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.property_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex"
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col w-full">
                    <div className="relative h-64 bg-slate-200 overflow-hidden flex-shrink-0">
                      {property.property_photo ? (
                        <img
                          src={property.property_photo}
                          alt={property.property_title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <Home className="h-20 w-20 text-slate-300" />
                        </div>
                      )}
                      <Badge
                        className={`absolute top-4 right-4 ${
                          isPropertyReserved(property.property_id)
                            ? "bg-slate-500"
                            : "bg-red-600"
                        } text-white`}
                      >
                        {isPropertyReserved(property.property_id)
                          ? "Reserved"
                          : "For Sale"}
                      </Badge>
                    </div>

                    <CardContent className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">
                        {property.property_title}
                      </h3>

                      <div className="flex items-center text-slate-600 mb-4">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="text-sm line-clamp-1">
                          {property.lot_tbl?.lot_number
                            ? `Lot ${property.lot_tbl.lot_number}`
                            : "Lot not specified"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4 min-h-[24px]">
                        {getSpecValue(property, "bedroom") && (
                          <div className="flex items-center text-slate-600">
                            <Bed className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {getSpecValue(property, "bedroom")}
                            </span>
                          </div>
                        )}
                        {getSpecValue(property, "bath") && (
                          <div className="flex items-center text-slate-600">
                            <Bath className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {getSpecValue(property, "bath")}
                            </span>
                          </div>
                        )}
                        {getSpecValue(property, "floor") && (
                          <div className="flex items-center text-slate-600">
                            <Maximize className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {getSpecValue(property, "floor")} sqm
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200 mb-4">
                        <div className="flex-1">
                          <p className="text-sm text-slate-500">
                            Property Type
                          </p>
                          <p className="text-base font-semibold text-slate-800 line-clamp-1">
                            {property.property_detail_tbl?.property_name ||
                              "Contact for details"}
                          </p>
                        </div>
                        {property.property_price && (
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Price</p>
                            <p className="text-xl font-bold text-red-600">
                              {formatPrice(property.property_price)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto space-y-2">
                        {isPropertyReserved(property.property_id) ? (
                          // Property is already reserved - show disabled button
                          <Button
                            disabled
                            className="w-full bg-slate-400 text-white cursor-not-allowed"
                          >
                            Reserved
                          </Button>
                        ) : (
                          // Property is available - check if user has pending reservation
                          <>
                            {(() => {
                              const isPending = isAuthenticated && hasPendingReservation(property.property_id);
                              console.log(`🏠 Property ${property.property_id}:`, {
                                isAuthenticated,
                                hasPending: isPending,
                                pendingReservationsCount: pendingReservations.length
                              });
                              return isPending;
                            })() ? (
                              // Show waiting for approval message
                              <div className="w-full">
                                <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 text-center">
                                  <div className="flex items-center justify-center gap-2 text-amber-700">
                                    <AlertCircle className="h-5 w-5" />
                                    <span className="font-semibold">Waiting for Approval</span>
                                  </div>
                                  <p className="text-sm text-amber-600 mt-1">
                                    Your reservation request is pending review
                                  </p>
                                </div>
                              </div>
                            ) : (
                              // Show action buttons
                              <>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => setSelectedProperty(property)}
                                    className="flex-1 bg-slate-100 text-slate-900 hover:bg-slate-200"
                                  >
                                    View Details
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (!isAuthenticated) {
                                        sessionStorage.setItem(
                                          "redirect_after_login",
                                          "/client-home"
                                        );
                                        sessionStorage.setItem(
                                          "selected_property",
                                          JSON.stringify(property)
                                        );
                                        toast.info(
                                          "Please login to reserve this property"
                                        );
                                        router.push("/client-login");
                                      } else if (
                                        !profile?.phone ||
                                        !profile?.address
                                      ) {
                                        // Check if phone and address are in user profile
                                        toast.warning(
                                          "Please complete your profile (phone and address) before making a reservation"
                                        );
                                        sessionStorage.setItem(
                                          "redirect_after_profile_update",
                                          "/client-home"
                                        );
                                        sessionStorage.setItem(
                                          "selected_property",
                                          JSON.stringify(property)
                                        );
                                        router.push("/client-account");
                                      } else {
                                        setSelectedProperty(property);
                                        // Pre-fill phone and address from user metadata
                                        setReservationForm((prev) => ({
                                          ...prev,
                                          phone: profile?.phone || "",
                                          address: profile?.address || "",
                                        }));
                                        setShowAppointmentModal(true);
                                      }
                                    }}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                  >
                                    Reserve Now
                                  </Button>
                                </div>
                                <Button
                                  onClick={() => {
                                    setSelectedProperty(property);
                                    setShowInquiryModal(true);
                                    // Reset OTP states
                                    setOtpSent(false);
                                    setOtpCode("");
                                    setOtpVerified(false);
                                    setOtpTimer(0);
                                    if (isAuthenticated) {
                                      const fullName =
                                        profile?.full_name ||
                                    profile?.first_name ||
                                    user?.email?.split("@")[0] ||
                                    "";
                                  const nameParts = fullName.trim().split(" ");
                                  setInquiryForm({
                                    firstname: nameParts[0] || "",
                                    lastname:
                                      nameParts.slice(1).join(" ") || "",
                                    email: user?.email || "",
                                    phone: profile?.phone || "",
                                    message: "",
                                  });
                                }
                              }}
                              className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                            >
                              Send Inquiry
                            </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Property Detail Modal */}
      <AnimatePresence>
        {selectedProperty && !showAppointmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProperty(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="relative">
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-6 w-6 text-slate-600" />
                </button>

                {/* Property Image */}
                <div className="relative h-96 bg-slate-200">
                  {selectedProperty.property_photo ? (
                    <img
                      src={selectedProperty.property_photo}
                      alt={selectedProperty.property_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <Home className="h-32 w-32 text-slate-300" />
                    </div>
                  )}
                </div>

                <div className="p-8">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">
                      {selectedProperty.property_title}
                    </h2>
                    <div className="flex items-center text-slate-600">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span>
                        {selectedProperty.lot_tbl?.lot_number
                          ? `Lot ${selectedProperty.lot_tbl.lot_number}`
                          : "Lot not specified"}
                      </span>
                    </div>
                  </div>

                  {/* Display all specifications from property_area */}
                  {selectedProperty.property_detail_tbl?.property_area &&
                    selectedProperty.property_detail_tbl.property_area.length >
                      0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {selectedProperty.property_detail_tbl.property_area
                          .slice(0, 4)
                          .map((spec, index) => (
                            <div
                              key={`spec-top-${spec.name}-${index}`}
                              className="bg-slate-50 p-4 rounded-lg text-center"
                            >
                              <p className="text-2xl font-bold text-slate-800">
                                {spec.value}
                              </p>
                              <p className="text-sm text-slate-600">
                                {spec.name}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}

                  {/* Property Details */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">
                      Property Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProperty.property_detail_tbl?.property_name && (
                        <div className="flex justify-between py-2 border-b border-slate-200">
                          <span className="text-slate-600">Property Type:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedProperty.property_detail_tbl.property_name}
                          </span>
                        </div>
                      )}
                      {selectedProperty.lot_tbl?.lot_number && (
                        <div className="flex justify-between py-2 border-b border-slate-200">
                          <span className="text-slate-600">Lot Number:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedProperty.lot_tbl.lot_number}
                          </span>
                        </div>
                      )}
                      {selectedProperty.property_detail_tbl?.property_area &&
                        selectedProperty.property_detail_tbl.property_area
                          .length > 4 && (
                          <div className="col-span-full">
                            <h4 className="font-semibold text-slate-700 mb-3">
                              All Specifications:
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {selectedProperty.property_detail_tbl.property_area.map(
                                (spec, idx) => (
                                  <div
                                    key={`spec-all-${spec.name}-${idx}`}
                                    className="flex justify-between py-2 px-3 bg-slate-50 rounded"
                                  >
                                    <span className="text-slate-600 text-sm">
                                      {spec.name}:
                                    </span>
                                    <span className="font-semibold text-slate-800 text-sm">
                                      {spec.value}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Amenities */}
                  {selectedProperty.amenities &&
                    selectedProperty.amenities.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">
                          Amenities
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedProperty.amenities.map((amenity, index) => (
                            <Badge
                              key={`amenity-${amenity}-${index}`}
                              variant="secondary"
                              className="px-3 py-1"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Call to Action */}
                  <div className="flex items-center justify-center pt-6 border-t border-slate-200">
                    <Button
                      onClick={() => {
                        if (!isAuthenticated) {
                          sessionStorage.setItem(
                            "redirect_after_login",
                            "/client-home"
                          );
                          sessionStorage.setItem(
                            "selected_property",
                            JSON.stringify(selectedProperty)
                          );
                          toast.info("Please login to book a tour");
                          router.push("/client-login");
                        } else if (!profile?.phone || !profile?.address) {
                          // Check if phone and address are in user profile
                          toast.warning(
                            "Please complete your profile (phone and address) before making a reservation"
                          );
                          sessionStorage.setItem(
                            "redirect_after_profile_update",
                            "/client-home"
                          );
                          sessionStorage.setItem(
                            "selected_property",
                            JSON.stringify(selectedProperty)
                          );
                          router.push("/client-account");
                        } else {
                          // Pre-fill phone and address from user metadata
                          setReservationForm((prev) => ({
                            ...prev,
                            phone: profile?.phone || "",
                            address: profile?.address || "",
                          }));
                          setShowAppointmentModal(true);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 px-12 py-6 text-lg w-full md:w-auto"
                    >
                      <Home className="mr-2 h-5 w-5" />
                      Reserve This Property
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appointment Modal */}
      <AnimatePresence>
        {showAppointmentModal && selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAppointmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-slate-800">
                    Property Reservation
                  </h2>
                  <button
                    onClick={() => setShowAppointmentModal(false)}
                    className="bg-slate-100 rounded-full p-2 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-6 w-6 text-slate-600" />
                  </button>
                </div>

                <div className="mb-6 space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-slate-600 mb-1">
                      Selected Property:
                    </p>
                    <p className="font-bold text-slate-900 text-lg">
                      {selectedProperty.property_title}
                    </p>
                  </div>

                  {/* Property Price and Downpayment Display */}
                  {selectedProperty.property_price &&
                    selectedProperty.property_downprice && (
                      <div className="space-y-3">
                        {/* Total Property Price */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-600 mb-1">
                                Total Property Price:
                              </p>
                              <p className="text-3xl font-bold text-blue-700">
                                {formatPriceShort(
                                  selectedProperty.property_price
                                )}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatPrice(selectedProperty.property_price)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Reservation Fee (Downpayment) */}
                        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-600 mb-1">
                                Reservation Fee:
                              </p>
                              <p className="text-3xl font-bold text-green-700">
                                {formatPriceShort(
                                  selectedProperty.property_downprice
                                )}
                              </p>
                              <p className="text-sm text-slate-600 mt-2 font-semibold">
                                {(
                                  (selectedProperty.property_downprice /
                                    selectedProperty.property_price) *
                                  100
                                ).toFixed(0)}
                                % of{" "}
                                {formatPriceShort(
                                  selectedProperty.property_price
                                )}{" "}
                                ={" "}
                                {formatPriceShort(
                                  selectedProperty.property_downprice
                                )}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatPrice(
                                  selectedProperty.property_downprice
                                )}
                              </p>
                            </div>
                            <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                              To Pay
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {!selectedProperty.property_price && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        💡 Pricing information will be discussed during
                        application review
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAppointmentSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-700 mb-3 text-lg">
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Name:</span>
                          <p className="font-medium text-slate-900">
                            {profile?.full_name || user?.email}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-600">Email:</span>
                          <p className="font-medium text-slate-900">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3 text-lg">
                      Contact Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                          <Input
                            type="tel"
                            required
                            value={reservationForm.phone}
                            onChange={(e) =>
                              setReservationForm({
                                ...reservationForm,
                                phone: e.target.value,
                              })
                            }
                            className="pl-10"
                            placeholder="+63 XXX XXX XXXX"
                          />
                        </div>
                        {profile?.phone && (
                          <p className="text-xs text-slate-500 mt-1">
                            From your profile
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Current Address *
                        </label>
                        <Input
                          type="text"
                          required
                          value={reservationForm.address}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              address: e.target.value,
                            })
                          }
                          placeholder="Street, City, Province"
                        />
                        {profile?.address && (
                          <p className="text-xs text-slate-500 mt-1">
                            From your profile
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3 text-lg">
                      Employment & Income Statement
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Employment Status *
                        </label>
                        <select
                          required
                          value={reservationForm.employment_status}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              employment_status: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="employed">Employed</option>
                          <option value="self-employed">Self-Employed</option>
                          <option value="business-owner">Business Owner</option>
                          <option value="retired">Retired</option>
                          <option value="unemployed">Unemployed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Occupation/Position *
                        </label>
                        <Input
                          type="text"
                          required
                          value={reservationForm.occupation}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              occupation: e.target.value,
                            })
                          }
                          placeholder="e.g., Software Engineer, Teacher"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Employer/Company Name *
                        </label>
                        <Input
                          type="text"
                          required
                          value={reservationForm.employer}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              employer: e.target.value,
                            })
                          }
                          placeholder="Company or Business Name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Years Employed *
                        </label>
                        <Input
                          type="number"
                          required
                          min="0"
                          max="50"
                          value={reservationForm.years_employed}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              years_employed: e.target.value,
                            })
                          }
                          placeholder="Years"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Monthly Income (₱) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                            ₱
                          </span>
                          <Input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={reservationForm.monthly_income}
                            onChange={(e) =>
                              setReservationForm({
                                ...reservationForm,
                                monthly_income: e.target.value,
                              })
                            }
                            className="pl-8"
                            placeholder="50,000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Other Income Source (Optional)
                        </label>
                        <Input
                          type="text"
                          value={reservationForm.other_income_source}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              other_income_source: e.target.value,
                            })
                          }
                          placeholder="e.g., Rental, Freelance"
                        />
                      </div>
                    </div>

                    {reservationForm.other_income_source && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Other Monthly Income (₱)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                            ₱
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationForm.other_income_amount}
                            onChange={(e) =>
                              setReservationForm({
                                ...reservationForm,
                                other_income_amount: e.target.value,
                              })
                            }
                            className="pl-8"
                            placeholder="10,000"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ID Upload Section */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3 text-lg">
                      Valid ID Upload
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          ID Type *
                        </label>
                        <select
                          required
                          value={reservationForm.id_type}
                          onChange={(e) =>
                            setReservationForm({
                              ...reservationForm,
                              id_type: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Select ID Type</option>
                          <option value="passport">Passport</option>
                          <option value="drivers-license">
                            Driver's License
                          </option>
                          <option value="national-id">
                            National ID (PhilSys)
                          </option>
                          <option value="umid">UMID</option>
                          <option value="postal-id">Postal ID</option>
                          <option value="voters-id">Voter's ID</option>
                          <option value="tin-id">TIN ID</option>
                          <option value="sss-id">SSS ID</option>
                          <option value="prc-id">PRC ID</option>
                          <option value="company-id">Company ID</option>
                          <option value="other">Other Valid ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Upload ID Document *
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            id="id-upload"
                            required
                            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setReservationForm({
                                  ...reservationForm,
                                  id_file: file,
                                });
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="id-upload"
                            className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:border-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Upload className="h-5 w-5 text-slate-400 mr-2" />
                            <span className="text-sm text-slate-600">
                              {reservationForm.id_file
                                ? reservationForm.id_file.name
                                : "Choose file"}
                            </span>
                          </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Accepted: JPG, PNG, PDF (Max 10MB)
                        </p>
                      </div>
                    </div>

                    {reservationForm.id_file && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800">
                            {reservationForm.id_file.name}
                          </p>
                          <p className="text-xs text-green-600">
                            {(
                              reservationForm.id_file.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReservationForm({
                              ...reservationForm,
                              id_file: null,
                            });
                            document.getElementById("id-upload").value = "";
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Additional Information */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={reservationForm.message}
                      onChange={(e) =>
                        setReservationForm({
                          ...reservationForm,
                          message: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Any specific requirements or questions about this property..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAppointmentModal(false);
                        setReservationForm({
                          phone: "",
                          address: "",
                          occupation: "",
                          employer: "",
                          employment_status: "employed",
                          years_employed: "",
                          monthly_income: "",
                          other_income_source: "",
                          other_income_amount: "",
                          id_type: "",
                          id_file: null,
                          message: "",
                        });
                      }}
                      className="flex-1 bg-slate-100 text-slate-900 hover:bg-slate-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Submit Reservation
                    </Button>
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    By submitting, you agree that the information provided is
                    accurate and complete.
                  </p>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {showInquiryModal && selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowInquiryModal(false);
              setOtpSent(false);
              setOtpCode("");
              setOtpVerified(false);
              setOtpTimer(0);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-slate-800">
                    Send Inquiry
                  </h2>
                  <button
                    onClick={() => {
                      setShowInquiryModal(false);
                      // Reset OTP states
                      setOtpSent(false);
                      setOtpCode("");
                      setOtpVerified(false);
                      setOtpTimer(0);
                    }}
                    className="bg-slate-100 rounded-full p-2 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-6 w-6 text-slate-600" />
                  </button>
                </div>

                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Property:</p>
                  <p className="font-semibold text-slate-800">
                    {selectedProperty.property_title}
                  </p>
                </div>

                <form onSubmit={handleInquirySubmit} className="space-y-6">
                  {/* Show user information if authenticated */}
                  {isAuthenticated ? (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-slate-700 mb-3">
                        Your Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-slate-500 mr-2" />
                          <span className="text-slate-600">Name:</span>
                          <span className="ml-2 font-medium">
                            {profile?.full_name || user?.email}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-slate-500 mr-2" />
                          <span className="text-slate-600">Email:</span>
                          <span className="ml-2 font-medium">
                            {user?.email}
                          </span>
                        </div>
                        {profile?.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-slate-500 mr-2" />
                            <span className="text-slate-600">Phone:</span>
                            <span className="ml-2 font-medium">
                              {profile.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Show input fields for non-authenticated users */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            First Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                            <Input
                              type="text"
                              required
                              value={inquiryForm.firstname}
                              onChange={(e) =>
                                setInquiryForm({
                                  ...inquiryForm,
                                  firstname: e.target.value,
                                })
                              }
                              className="pl-10"
                              placeholder="John"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Last Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                            <Input
                              type="text"
                              required
                              value={inquiryForm.lastname}
                              onChange={(e) =>
                                setInquiryForm({
                                  ...inquiryForm,
                                  lastname: e.target.value,
                                })
                              }
                              className="pl-10"
                              placeholder="Doe"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address *
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                            <Input
                              type="email"
                              required
                              value={inquiryForm.email}
                              onChange={(e) => {
                                setInquiryForm({
                                  ...inquiryForm,
                                  email: e.target.value,
                                });
                                // Reset OTP states when email changes
                                setOtpSent(false);
                                setOtpVerified(false);
                                setOtpCode("");
                                setOtpTimer(0);
                              }}
                              className="pl-10"
                              placeholder="your.email@example.com"
                              disabled={otpVerified}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={
                              sendingOtp ||
                              otpTimer > 0 ||
                              !inquiryForm.email ||
                              otpVerified
                            }
                            className={`whitespace-nowrap ${
                              otpVerified
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-slate-600 hover:bg-slate-700"
                            }`}
                          >
                            {sendingOtp
                              ? "Sending..."
                              : otpVerified
                              ? "✓ Verified"
                              : otpTimer > 0
                              ? `Resend (${Math.floor(otpTimer / 60)}:${(
                                  otpTimer % 60
                                )
                                  .toString()
                                  .padStart(2, "0")})`
                              : "Send OTP"}
                          </Button>
                        </div>
                      </div>

                      {/* OTP Input Field */}
                      {otpSent && !otpVerified && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">
                              Enter OTP Code
                            </p>
                            <p className="text-xs text-slate-600">
                              We've sent a 6-digit code to your email. Please
                              enter it below.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) =>
                                setOtpCode(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="123456"
                              className="flex-1 text-center text-lg font-bold tracking-widest"
                            />
                            <Button
                              type="button"
                              onClick={handleVerifyOTP}
                              disabled={otpCode.length !== 6}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Verify
                            </Button>
                          </div>
                          {otpTimer > 0 && (
                            <p className="text-xs text-slate-600 mt-2">
                              Code expires in: {Math.floor(otpTimer / 60)}:
                              {(otpTimer % 60).toString().padStart(2, "0")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Verification Success Message */}
                      {otpVerified && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                          <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                          <p className="text-sm font-medium text-green-800">
                            Email verified successfully! You can now submit your
                            inquiry.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                          <Input
                            type="tel"
                            required
                            value={inquiryForm.phone}
                            onChange={(e) =>
                              setInquiryForm({
                                ...inquiryForm,
                                phone: e.target.value,
                              })
                            }
                            className="pl-10"
                            placeholder="+63 XXX XXX XXXX"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Your Message *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={inquiryForm.message}
                      onChange={(e) =>
                        setInquiryForm({
                          ...inquiryForm,
                          message: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      placeholder="Please tell us about your inquiry, questions, or specific requirements..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowInquiryModal(false);
                        // Reset OTP states on cancel
                        setOtpSent(false);
                        setOtpCode("");
                        setOtpVerified(false);
                        setOtpTimer(0);
                      }}
                      className="flex-1 bg-slate-100 text-slate-900 hover:bg-slate-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isAuthenticated && !otpVerified}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send Inquiry
                    </Button>
                  </div>

                  {/* Warning for non-authenticated users */}
                  {!isAuthenticated && !otpVerified && (
                    <p className="text-xs text-amber-600 text-center -mt-2">
                      Please verify your email with OTP to submit inquiry
                    </p>
                  )}

                  {/* reCAPTCHA Badge */}
                  <div className="text-center">
                    <p className="text-xs text-slate-500">
                      This form is protected by reCAPTCHA and the Google{" "}
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:underline"
                      >
                        Privacy Policy
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://policies.google.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:underline"
                      >
                        Terms of Service
                      </a>{" "}
                      apply.
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && receiptData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReceiptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div id="receipt-content" className="p-8">
                {/* Receipt Header */}
                <div className="text-center mb-8 border-b-2 border-red-600 pb-6">
                  <div className="flex items-center justify-center mb-4">
                    <Building2 className="h-12 w-12 text-red-600 mr-3" />
                    <h1 className="text-4xl font-bold text-slate-900">
                      Futura Homes
                    </h1>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-700">
                    Property Reservation Receipt
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Official Confirmation Document
                  </p>
                </div>

                {/* Receipt Number and Date */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">
                      Tracking Number
                    </p>
                    <p className="font-mono font-bold text-slate-900">
                      {receiptData.tracking_number ||
                        `TRK-${receiptData.reservation_id
                          ?.slice(0, 8)
                          .toUpperCase()}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 mb-1">Date Issued</p>
                    <p className="font-semibold text-slate-900">
                      {new Date(receiptData.created_at).toLocaleDateString(
                        "en-PH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-6 flex justify-center">
                  <div className="bg-green-100 border-2 border-green-600 px-6 py-3 rounded-lg inline-flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                    <span className="text-lg font-bold text-green-700">
                      RESERVATION CONFIRMED
                    </span>
                  </div>
                </div>

                {/* Client Information */}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 mb-3 text-lg border-b border-slate-300 pb-2">
                    Client Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600">Full Name</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.client_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Email Address</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.client_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Phone Number</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.client_phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Address</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.client_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 mb-3 text-lg border-b border-slate-300 pb-2">
                    Property Details
                  </h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="font-bold text-xl text-slate-900 mb-2">
                      {receiptData.property_title}
                    </p>
                    <p className="text-sm text-slate-600">
                      Property ID: {receiptData.property_id}
                    </p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 mb-3 text-lg border-b border-slate-300 pb-2">
                    Payment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b-2 border-slate-300">
                      <div>
                        <span className="text-slate-700 font-semibold block">
                          Total Property Price
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatPrice(receiptData.property_price || 0)}
                        </span>
                      </div>
                      <span className="font-bold text-3xl text-blue-700">
                        {formatPriceShort(receiptData.property_price || 0)}
                      </span>
                    </div>
                    <div className="py-3 bg-green-50 px-3 rounded-lg border-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-slate-700 font-semibold block">
                            Reservation Fee
                          </span>
                          <span className="text-sm text-slate-700 font-semibold mt-1 block">
                            {(
                              (receiptData.reservation_fee /
                                receiptData.property_price) *
                              100
                            ).toFixed(0)}
                            % of{" "}
                            {formatPriceShort(receiptData.property_price || 0)}{" "}
                            = {formatPriceShort(receiptData.reservation_fee)}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            {formatPrice(receiptData.reservation_fee)}
                          </span>
                        </div>
                        <span className="font-bold text-3xl text-green-700">
                          {formatPriceShort(receiptData.reservation_fee)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-700">
                        Monthly Income (Declared)
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(receiptData.monthly_income)}
                      </span>
                    </div>
                    {receiptData.other_income_amount > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-200">
                        <span className="text-slate-700">
                          Other Income ({receiptData.other_income_source})
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatPrice(receiptData.other_income_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 bg-slate-100 px-4 rounded-lg mt-2">
                      <span className="font-bold text-slate-800">
                        Total Monthly Income
                      </span>
                      <span className="font-bold text-xl text-green-700">
                        {formatPrice(receiptData.total_monthly_income)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 mb-3 text-lg border-b border-slate-300 pb-2">
                    Employment Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600">
                        Employment Status
                      </p>
                      <p className="font-semibold text-slate-900 capitalize">
                        {receiptData.employment_status.replace("-", " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Occupation</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.occupation}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Employer/Company</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.employer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Years Employed</p>
                      <p className="font-semibold text-slate-900">
                        {receiptData.years_employed}{" "}
                        {receiptData.years_employed === 1 ? "year" : "years"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <h4 className="font-bold text-yellow-800 mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Important Payment Instructions:
                  </h4>
                  <ul className="text-sm text-yellow-900 space-y-2 list-disc list-inside">
                    <li>This is an official reservation confirmation</li>
                    <li>
                      <strong>You have 3-5 business days</strong> to visit
                      Futura Home and complete your payment
                    </li>
                    <li>
                      Bring this receipt with{" "}
                      <strong>
                        Tracking Number:{" "}
                        {receiptData.tracking_number ||
                          `TRK-${receiptData.reservation_id
                            ?.slice(0, 8)
                            .toUpperCase()}`}
                      </strong>
                    </li>
                    <li>
                      Make sure to provide your{" "}
                      <strong>payment receipt with tracking number</strong>{" "}
                      after payment
                    </li>
                    <li>Keep your payment receipt as proof of transaction</li>
                    <li>
                      Contact us if you have any questions about the payment
                      process
                    </li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-500 pt-6 border-t border-slate-300">
                  <p>© 2025 Futura Homes. All rights reserved.</p>
                  <p className="mt-1">
                    For inquiries, contact us at info@futurahomes.com
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-8 pb-8 flex gap-4">
                <Button
                  onClick={() => {
                    const content = document.getElementById("receipt-content");
                    const printWindow = window.open("", "_blank");
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Reservation Receipt - ${receiptData.reservation_id
                            ?.slice(0, 8)
                            .toUpperCase()}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            @media print { button { display: none; } }
                          </style>
                        </head>
                        <body>${content.innerHTML}</body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-700"
                >
                  Print Receipt
                </Button>
                <Button
                  onClick={() => {
                    setShowReceiptModal(false);
                    router.push("/client-bookings");
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  View My Reservations
                </Button>
                <Button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-8 w-8 text-red-600" />
                <span className="text-2xl font-bold">Futura Homes</span>
              </div>
              <p className="text-slate-400">
                Your trusted partner in finding the perfect home
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#properties"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Properties
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +63 XXX XXX XXXX
                </li>
                <li className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  info@futurahomes.com
                </li>
                <li className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Philippines
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-slate-400">
            <p>&copy; 2025 Futura Homes. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
