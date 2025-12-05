"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  User,
  Mail,
  Phone,
  Search,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PropertyMap() {
  const [selectedLot, setSelectedLot] = useState(null);
  const [lots, setLots] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Load lots from Supabase with property relationships
  useEffect(() => {
    loadLots();
  }, []);

  const loadLots = async () => {
    try {
      // Get all lots with their property information
      const { data: lotsData, error } = await supabase
        .from("lot_tbl")
        .select(`
          lot_id,
          lot_number,
          property_block,
          is_occupied,
          property_type_id,
          created_at
        `);

      if (error) throw error;

      // Get all properties with their lot relationships
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("property_info_tbl")
        .select(`
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
        `);

      if (propertiesError) throw propertiesError;

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

      // Map lots with their associated properties
      const lotsWithProperties = lotsData.map(lot => {
        const property = propertiesData?.find(p => p.property_lot_id === lot.lot_id);

        // Determine if occupied based on:
        // 1. If property has a contract -> occupied
        // 2. Otherwise, check property_availability
        let isOccupied = false;
        let hasContract = false;

        if (property) {
          hasContract = propertiesWithContracts.has(property.property_id);
          isOccupied = hasContract || property.property_availability?.toLowerCase() !== "vacant";
        }

        return {
          ...lot,
          property: property || null,
          isOccupied: isOccupied,
          hasContract: hasContract
        };
      });

      console.log("All lots loaded:", lotsWithProperties.length);
      console.log("Sample lot data:", lotsWithProperties[0]);
      const block6Lots = lotsWithProperties.filter(l => l.property_block?.toString() === "6");
      console.log("Lots with block 6:", block6Lots);
      console.log("Block 6 lot numbers:", block6Lots.map(l => l.lot_number));

      setLots(lotsWithProperties);
    } catch (error) {
      console.error("Failed to load lots and properties", error);
    } finally {
      setLoading(false);
    }
  };

  // Get lot status by block and lot number based on property_availability and contract
  const getLotStatus = (block, lotNumber) => {
    const lot = lots.find(
      (l) =>
        l.property_block?.toString() === block?.toString() &&
        l.lot_number?.toString() === lotNumber?.toString()
    );

    // If no lot found in database, it's available (not in database yet)
    if (!lot) {
      console.log(`Lot not in database: Block ${block}, Lot ${lotNumber} - showing as available`);
      return "available";
    }

    // If lot exists but no property assigned, it's available
    if (!lot.property) return "available";

    // If property has a contract, it's occupied (highest priority)
    if (lot.hasContract) return "occupied";

    // Otherwise, check property_availability value
    const availability = lot.property.property_availability?.toLowerCase();

    // Map common variations to standard statuses
    if (availability === "vacant") return "vacant";
    if (availability === "reserved" || availability === "reserve") return "reserved";
    if (availability === "for_sale" || availability === "for sale") return "for_sale";
    if (availability === "occupied") return "occupied";
    if (availability === "under_construction" || availability === "under construction") return "under_construction";

    // Default to available if unknown status
    return "available";
  };

  // Get lot with property by block and lot number
  const getLotByBlockAndNumber = (block, lotNumber) => {
    return lots.find(
      (l) =>
        l.property_block?.toString() === block?.toString() &&
        l.lot_number?.toString() === lotNumber?.toString()
    );
  };

  // Get status color for SVG fill
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "for_sale":
        return "#3b82f6"; // blue - for sale
      case "vacant":
        return "#a855f7"; // purple - vacant (property_availability = vacant)
      case "reserved":
        return "#eab308"; // yellow - reserved
      case "occupied":
        return "#ef4444"; // red - occupied
      case "under_construction":
        return "#f59e0b"; // amber/orange - under construction
      case "available":
        return "#22c55e"; // green - available (no property)
      default:
        return "#94a3b8"; // gray - no data
    }
  };

  // Handle lot click
  const handleLotClick = (event) => {
    const path = event.target;
    const lotId = path.id;

    // Extract block and lot number from ID (e.g., "lot1block1" -> block: 1, lot: 1)
    const match = lotId.match(/lot(\d+)block(\d+)/);
    if (match) {
      const lotNumber = match[1];
      const block = match[2];
      const lotData = getLotByBlockAndNumber(block, lotNumber);

      setSelectedLot({
        id: lotId,
        block,
        lot: lotNumber,
        lotData: lotData,
        property: lotData?.property,
        element: path,
      });
      setShowModal(true);
    }
  };

  // Initialize SVG and make lots clickable
  const initializeSvg = () => {
    if (!svgRef.current) return;

    // Access the SVG document from the object element
    const svgDoc =
      svgRef.current.contentDocument || svgRef.current.getSVGDocument();
    if (!svgDoc) {
      console.log("SVG document not ready, retrying...");
      setTimeout(initializeSvg, 100);
      return;
    }

    const lotPaths = svgDoc.querySelectorAll('[id^="lot"][id*="block"]');
    console.log(`Found ${lotPaths.length} lots in the SVG`);

    // Debug: Find all block 6 lots in SVG
    const block6LotsInSvg = Array.from(lotPaths).filter(p => p.id.includes("block6"));
    console.log("Block 6 lots found in SVG:", block6LotsInSvg.map(p => p.id));

    if (lotPaths.length === 0) {
      console.log("No lots found, retrying...");
      setTimeout(initializeSvg, 100);
      return;
    }

    lotPaths.forEach((path) => {
      const lotId = path.id;
      const match = lotId.match(/lot(\d+)block(\d+)/);

      if (match) {
        const lotNumber = match[1];
        const block = match[2];
        const status = getLotStatus(block, lotNumber);
        const color = getStatusColor(status);

        if (block === "6" && lotNumber === "10") {
          console.log(`Block 6 Lot 10 Debug:`, {
            status,
            color,
            expectedColor: status === "vacant" ? "#a855f7 (purple for vacant)" : "#22c55e (green for available)"
          });
        }

        console.log(
          `Setting up lot: Block ${block}, Lot ${lotNumber}, Status: ${status}, Color: ${color}`
        );

        // Set fill and stroke
        path.setAttribute("fill", color);
        path.setAttribute("fill-opacity", "0.6");
        path.setAttribute("stroke", "#000");
        path.setAttribute("stroke-width", "2");
        path.style.cursor = "pointer";
        path.style.transition = "all 0.2s ease";

        // Remove old listeners to prevent duplicates
        path.replaceWith(path.cloneNode(true));
      }
    });

    // Re-query after replacing nodes
    const newLotPaths = svgDoc.querySelectorAll('[id^="lot"][id*="block"]');

    newLotPaths.forEach((path) => {
      const lotId = path.id;

      // Add hover effect
      path.addEventListener("mouseenter", () => {
        path.setAttribute("fill-opacity", "0.8");
        path.setAttribute("stroke-width", "3");
        path.style.cursor = "pointer";
      });

      path.addEventListener("mouseleave", () => {
        const isSelected = selectedLot?.id === lotId;
        path.setAttribute("fill-opacity", isSelected ? "0.9" : "0.6");
        path.setAttribute("stroke-width", isSelected ? "4" : "2");
      });

      // Add click handler
      path.addEventListener("click", (e) => {
        console.log(`Clicked on lot: ${lotId}`);
        if (lotId === "lot10block6") {
          console.log("Block 6 Lot 10 clicked! Path element:", path);
        }
        handleLotClick(e);
      });

      // Debug: verify click handler was added
      if (lotId === "lot10block6") {
        console.log("Click handler added to Block 6 Lot 10");
        console.log("Path style:", path.style.cursor);
        console.log("Path fill:", path.getAttribute("fill"));
      }
    });

    console.log("SVG initialization complete - all lots are clickable");
    setSvgLoaded(true);
  };

  // Apply colors and selection to SVG lots
  useEffect(() => {
    if (!svgLoaded || loading) return;

    const svgDoc =
      svgRef.current?.contentDocument || svgRef.current?.getSVGDocument();
    if (!svgDoc) return;

    const lotPaths = svgDoc.querySelectorAll('[id^="lot"][id*="block"]');

    lotPaths.forEach((path) => {
      const lotId = path.id;
      const match = lotId.match(/lot(\d+)block(\d+)/);

      if (match) {
        const lotNumber = match[1];
        const block = match[2];
        const status = getLotStatus(block, lotNumber);
        const color = getStatusColor(status);

        // Update fill color based on current status
        path.setAttribute("fill", color);
      }
    });

    // Highlight selected lot
    if (selectedLot) {
      lotPaths.forEach((path) => {
        if (path.id === selectedLot.id) {
          path.setAttribute("fill-opacity", "0.9");
          path.setAttribute("stroke-width", "4");
          path.setAttribute("stroke", "#ef4444");
        } else {
          const isHovering = path.matches(":hover");
          path.setAttribute("fill-opacity", isHovering ? "0.8" : "0.6");
          path.setAttribute("stroke-width", isHovering ? "3" : "2");
          path.setAttribute("stroke", "#000");
        }
      });
    }
  }, [svgLoaded, lots, selectedLot]);

  // Zoom functions
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setZoom(1);

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
              Property Map
            </h1>
            <p className="text-lg text-slate-600">
              Interactive subdivision map - Click on any lot
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
            <MapPin className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Total Lots
              </p>
              <p className="text-xl font-bold text-slate-900">
                {Array.isArray(lots) ? lots.length : 0}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Legend & Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-blue-700 font-medium">For Sale</span>
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold min-w-[28px] text-center">
                  {Array.isArray(lots) ? lots.filter(l => {
                    if (!l?.property) return false;
                    if (l.hasContract) return false; // Has contract = not for sale (occupied)
                    const availability = l.property.property_availability?.toLowerCase();
                    return availability === "for_sale" || availability === "for sale";
                  }).length : 0}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-purple-700 font-medium">Vacant</span>
                <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold min-w-[28px] text-center">
                  {Array.isArray(lots) ? lots.filter(l => {
                    // Vacant if: no property OR (property exists but no contract AND availability is vacant)
                    if (!l?.property) return true;
                    if (l.hasContract) return false; // Has contract = not vacant
                    const availability = l.property.property_availability?.toLowerCase();
                    return availability === "vacant";
                  }).length : 0}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-yellow-700 font-medium">Reserved</span>
                <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold min-w-[28px] text-center">
                  {Array.isArray(lots) ? lots.filter(l => {
                    if (!l?.property) return false;
                    if (l.hasContract) return false; // Has contract = not reserved (occupied)
                    const availability = l.property.property_availability?.toLowerCase();
                    return availability === "reserved" || availability === "reserve";
                  }).length : 0}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-red-700 font-medium">Occupied</span>
                <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-bold min-w-[28px] text-center">
                  {Array.isArray(lots) ? lots.filter(l => {
                    if (!l?.property) return false;
                    // Occupied if: has contract OR property_availability is "occupied"
                    const availability = l.property.property_availability?.toLowerCase();
                    return l.hasContract || availability === "occupied";
                  }).length : 0}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-amber-700 font-medium">Under Construction</span>
                <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold min-w-[28px] text-center">
                  {Array.isArray(lots) ? lots.filter(l => {
                    if (!l?.property) return false;
                    if (l.hasContract) return false; // Has contract = not under construction (occupied)
                    const availability = l.property.property_availability?.toLowerCase();
                    return availability === "under_construction" || availability === "under construction";
                  }).length : 0}
                </span>
              </div>
            </div>

            {svgLoaded && (
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-blue-700 font-medium text-sm">
                  Click any lot to view details
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Map Area - Full Width */}
        <div className="w-full">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  Subdivision Layout
                </CardTitle>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-slate-600 min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                ref={containerRef}
                className="w-full h-[600px] overflow-auto bg-slate-50"
                style={{ cursor: "grab" }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-slate-500 ml-4">Loading map...</p>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Loading overlay */}
                    {!svgLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                        <div className="animate-pulse flex flex-col items-center">
                          <MapPin className="w-12 h-12 text-blue-500 mb-4" />
                          <p className="text-slate-600 font-medium">
                            Initializing interactive map...
                          </p>
                          <p className="text-sm text-slate-500 mt-2">
                            Making all lots clickable
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SVG Map */}
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        transition: "transform 0.2s ease-out",
                        opacity: svgLoaded ? 1 : 0,
                      }}
                    >
                      <object
                        ref={svgRef}
                        data="/property-map.svg"
                        type="image/svg+xml"
                        className="w-full h-auto pointer-events-auto"
                        style={{ pointerEvents: "auto" }}
                        onLoad={(e) => {
                          console.log(
                            "SVG object loaded, initializing..."
                          );
                          setTimeout(() => {
                            initializeSvg();
                          }, 500);
                        }}
                      >
                        <p>Your browser does not support SVG</p>
                      </object>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popup Modal */}
        <AnimatePresence>
          {showModal && selectedLot && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowModal(false)}
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
              >
                <Card className="bg-white border-slate-200 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                          <Home className="w-4 h-4 text-white" />
                        </div>
                        Lot Details
                      </CardTitle>
                      <button
                        onClick={() => setShowModal(false)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Lot Header */}
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
                          <Home className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">
                          Block {String(selectedLot.block)} - Lot {String(selectedLot.lot)}
                        </h3>
                        <Badge
                          className={`${
                            (() => {
                              if (!selectedLot.property) return "bg-green-100 text-green-800 border-green-200";

                              // If property has a contract, always show as occupied (highest priority)
                              if (selectedLot.lotData?.hasContract) {
                                return "bg-red-100 text-red-800 border-red-200";
                              }

                              const availability = selectedLot.property.property_availability?.toLowerCase();

                              if (availability === "for_sale" || availability === "for sale") {
                                return "bg-blue-100 text-blue-800 border-blue-200";
                              }
                              if (availability === "vacant") {
                                return "bg-purple-100 text-purple-800 border-purple-200";
                              }
                              if (availability === "reserved" || availability === "reserve") {
                                return "bg-yellow-100 text-yellow-800 border-yellow-200";
                              }
                              if (availability === "occupied") {
                                return "bg-red-100 text-red-800 border-red-200";
                              }
                              if (availability === "under_construction" || availability === "under construction") {
                                return "bg-amber-100 text-amber-800 border-amber-200";
                              }

                              return "bg-slate-100 text-slate-800 border-slate-200";
                            })()
                          } border font-medium text-sm px-3 py-1 uppercase`}
                        >
                          {(() => {
                            if (!selectedLot.property) return "AVAILABLE";

                            // If property has a contract, always show as occupied (highest priority)
                            if (selectedLot.lotData?.hasContract) return "OCCUPIED";

                            const availability = selectedLot.property.property_availability?.toLowerCase();

                            if (availability === "for_sale" || availability === "for sale") return "FOR SALE";
                            if (availability === "vacant") return "VACANT";
                            if (availability === "reserved" || availability === "reserve") return "RESERVED";
                            if (availability === "occupied") return "OCCUPIED";
                            if (availability === "under_construction" || availability === "under construction") return "UNDER CONSTRUCTION";

                            return availability?.toUpperCase() || "UNKNOWN";
                          })()}
                        </Badge>
                      </div>

                      {/* Property Info */}
                      {selectedLot.property ? (
                        <>
                          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 space-y-3 border border-slate-200">
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                              <span className="text-sm font-semibold text-slate-600">
                                Property Title
                              </span>
                              <span className="font-bold text-slate-900">
                                {String(selectedLot.property.property_title || "N/A")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                              <span className="text-sm font-semibold text-slate-600">
                                Property Type
                              </span>
                              <span className="capitalize text-slate-900 font-medium">
                                {(() => {
                                  const propDetail = selectedLot.property.property_detail_tbl;
                                  if (!propDetail) return "N/A";
                                  if (Array.isArray(propDetail)) return propDetail[0]?.property_name || "N/A";
                                  return String(propDetail.property_name || "N/A");
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                              <span className="text-sm font-semibold text-slate-600">
                                Property Area
                              </span>
                              <span className="text-slate-900 font-medium">
                                {(() => {
                                  try {
                                    const propDetail = selectedLot.property.property_detail_tbl;
                                    if (!propDetail) return "N/A";

                                    let area = Array.isArray(propDetail) ? propDetail[0]?.property_area : propDetail.property_area;

                                    // If area is an array, get the first element
                                    if (Array.isArray(area)) {
                                      if (area.length > 0) {
                                        area = area[0];
                                      }
                                    }

                                    // If area is still an object, try to extract the value
                                    if (area && typeof area === 'object' && !Array.isArray(area)) {
                                      area = area.value || area.name || area.property_area || "N/A";
                                    }

                                    // Convert to string/number
                                    if (area !== undefined && area !== null && area !== '' && typeof area !== 'object') {
                                      return `${area} sqm`;
                                    }
                                    return "N/A";
                                  } catch (error) {
                                    console.error("Error rendering area:", error);
                                    return "N/A";
                                  }
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-sm font-semibold text-slate-600">
                                Availability
                              </span>
                              <span className="capitalize text-slate-900 font-medium">
                                {String(selectedLot.property.property_availability?.replace('_', ' ') || "N/A")}
                              </span>
                            </div>
                          </div>

                          {/* Contract Status Indicator */}
                          {selectedLot.lotData?.hasContract && (
                            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border-2 border-red-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-xl">📄</span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-red-900">Has Active Contract</p>
                                  <p className="text-xs text-red-700 mt-0.5">This property is under contract and marked as occupied</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-green-700">
                                Total Price
                              </span>
                              <span className="font-bold text-green-900 text-xl">
                                ₱{Number(selectedLot.property.property_price || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-green-700">
                                Down Payment
                              </span>
                              <span className="font-bold text-green-900 text-xl">
                                ₱{Number(selectedLot.property.property_downprice || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 text-center border border-green-200">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Home className="w-8 h-8 text-green-600" />
                          </div>
                          <h4 className="font-bold text-green-900 mb-2">
                            Available Lot
                          </h4>
                          <p className="text-sm text-green-700">
                            Block {String(selectedLot.block)} - Lot {String(selectedLot.lot)}
                          </p>
                          <p className="text-xs text-green-600 mt-2">
                            This lot is available and has no property assigned yet.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
