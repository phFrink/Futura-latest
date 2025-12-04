"use client";

import React, { useState, useEffect } from "react";

import {
  Home,
  Users,
  Wrench,
  FileText,
  AlertTriangle,
  Bell,
  DollarSign,
  TrendingUp,
  Calendar,
  Receipt,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";
import StatsCard from "@/components/ui/stat-card";
import { toast } from "react-toastify";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    contracts: 0,
    activeContracts: 0,
    totalRevenue: 0,
    recentTransactions: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [propertyStats, setPropertyStats] = useState({
    available: 0,
    reserved: 0,
    sold: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions for automatic updates
    const subscriptions = [];

    // Subscribe to contracts changes
    const contractsSubscription = supabase
      .channel("contracts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "property_contracts",
        },
        (payload) => {
          console.log("Contracts data changed:", payload);
          loadDashboardData();
        }
      )
      .subscribe();

    // Subscribe to transactions changes
    const transactionsSubscription = supabase
      .channel("transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contract_payment_transactions",
        },
        (payload) => {
          console.log("Transactions data changed:", payload);
          loadDashboardData();
        }
      )
      .subscribe();

    // Subscribe to new user registrations
    const registrationChannel = supabase
      .channel("user-registrations")
      .on("broadcast", { event: "new-registration" }, (payload) => {
        console.log("New user registered:", payload);
        const { full_name, email, registered_at } = payload.payload;

        // Show toast notification
        toast.success(
          `🎉 New User Registered!\n${full_name} (${email})`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      })
      .subscribe();

    subscriptions.push(contractsSubscription, transactionsSubscription, registrationChannel);

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach((subscription) => {
        supabase.removeChannel(subscription);
      });
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log("Loading dashboard data from Supabase...");

      // Fetch properties from property_info_tbl
      const propertiesResult = await supabase
        .from("property_info_tbl")
        .select("property_id, property_availability");

      // Fetch contracts with property info
      const contractsResult = await supabase
        .from("property_contracts")
        .select("*, property_id");

      // Fetch recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactionsResult = await supabase
        .from("contract_payment_transactions")
        .select("*")
        .gte("transaction_date", thirtyDaysAgo.toISOString())
        .order("transaction_date", { ascending: false })
        .limit(10);

      // Fetch announcements
      const announcementsResult = await supabase
        .from("homeowner_announcements")
        .select("*")
        .order("created_date", { ascending: false })
        .limit(5);

      // Check for errors
      if (propertiesResult.error)
        console.error("Properties error:", propertiesResult.error);
      if (contractsResult.error)
        console.error("Contracts error:", contractsResult.error);
      if (transactionsResult.error)
        console.error("Transactions error:", transactionsResult.error);
      if (announcementsResult.error)
        console.error("Announcements error:", announcementsResult.error);

      // Extract data
      const properties = propertiesResult.data || [];
      const contracts = contractsResult.data || [];
      const transactions = transactionsResult.data || [];
      const announcements = announcementsResult.data || [];

      console.log("Data fetched:", {
        properties: properties.length,
        contracts: contracts.length,
        transactions: transactions.length,
        announcements: announcements.length,
      });

      // Create a Set of property IDs that have contracts
      const propertiesWithContracts = new Set(
        contracts.map(c => c.property_id)
      );

      // Calculate property stats based on property_availability field AND contracts
      // Sold = properties with "occupied" status OR properties that have contracts
      const soldProperties = properties.filter(
        (p) => p.property_availability?.toLowerCase() === "occupied" || propertiesWithContracts.has(p.property_id)
      ).length;

      // Reserved = properties with "reserved" status (but not if they have a contract)
      // Handle both "Reserved" (uppercase) and "reserved" (lowercase)
      const reservedProperties = properties.filter(
        (p) => p.property_availability?.toLowerCase() === "reserved" && !propertiesWithContracts.has(p.property_id)
      ).length;

      // Available = "for_sale" + "vacant" (but not if they have a contract)
      const availableProperties = properties.filter(
        (p) => {
          const avail = p.property_availability?.toLowerCase();
          return (avail === "for_sale" || avail === "vacant") && !propertiesWithContracts.has(p.property_id);
        }
      ).length;

      console.log("Property Stats:", {
        total: properties.length,
        available: availableProperties,
        reserved: reservedProperties,
        sold: soldProperties,
        contractsCount: contracts.length,
        propertiesWithContracts: propertiesWithContracts.size,
        availabilityBreakdown: {
          "for_sale": properties.filter((p) => p.property_availability?.toLowerCase() === "for_sale").length,
          "vacant": properties.filter((p) => p.property_availability?.toLowerCase() === "vacant").length,
          "reserved": properties.filter((p) => p.property_availability?.toLowerCase() === "reserved").length,
          "occupied": properties.filter((p) => p.property_availability?.toLowerCase() === "occupied").length,
          "under_construction": properties.filter((p) => p.property_availability?.toLowerCase() === "under_construction").length,
        },
      });

      setPropertyStats({
        available: availableProperties,
        reserved: reservedProperties,
        sold: soldProperties,
      });

      // Calculate contract stats
      const activeContracts = contracts.filter(
        (c) => c.contract_status === "active"
      ).length;

      // Calculate total revenue from transactions
      const totalRevenue = transactions.reduce(
        (sum, t) => sum + parseFloat(t.total_amount || 0),
        0
      );

      console.log("Calculated stats:", {
        properties: properties.length,
        contracts: contracts.length,
        activeContracts,
        totalRevenue,
        recentTransactions: transactions.length,
      });

      setStats({
        properties: properties.length,
        contracts: contracts.length,
        activeContracts,
        totalRevenue,
        recentTransactions: transactions.length,
      });

      // Group transactions by date and sum amounts
      const paymentsByDate = {};
      transactions.forEach((t) => {
        const date = new Date(t.transaction_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!paymentsByDate[date]) {
          paymentsByDate[date] = {
            date,
            amount: 0,
            count: 0,
            method: t.payment_method,
          };
        }
        paymentsByDate[date].amount += parseFloat(t.total_amount || 0);
        paymentsByDate[date].count += 1;
      });

      setRecentPayments(Object.values(paymentsByDate).slice(0, 4));
      setRecentAnnouncements(announcements);
    } catch (error) {
      console.error("Error loading dashboard data:", error);

      // Fallback to show zero counts if there's an error
      setStats({
        properties: 0,
        contracts: 0,
        activeContracts: 0,
        totalRevenue: 0,
        recentTransactions: 0,
      });
      setRecentPayments([]);
      setRecentAnnouncements([]);
      setPropertyStats({
        available: 0,
        reserved: 0,
        sold: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTodayStats = () => {
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const todayPayments =
      recentPayments.find((p) => p.date === today) || {};
    return {
      amount: todayPayments.amount || 0,
      count: todayPayments.count || 0,
    };
  };

  const todayStats = getTodayStats();

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center md:text-left"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Futura Homes Koronadal
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600">
            Property Management Dashboard
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          <StatsCard
            title="Total Properties"
            value={stats.properties}
            icon={Home}
            trend={`${propertyStats.available} available`}
            delay={0.1}
            color="blue"
          />
          <StatsCard
            title="Total Contracts"
            value={stats.contracts}
            icon={FileText}
            trend={`${stats.activeContracts} active`}
            delay={0.2}
            color="green"
          />
          <StatsCard
            title="Active Contracts"
            value={stats.activeContracts}
            icon={CheckCircle}
            trend={stats.activeContracts > 0 ? "In progress" : "None active"}
            trendDirection={stats.activeContracts > 0 ? "up" : "neutral"}
            delay={0.3}
            color="amber"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            trend="Last 30 days"
            delay={0.4}
            color="red"
          />
          <StatsCard
            title="Recent Transactions"
            value={stats.recentTransactions}
            icon={Receipt}
            trend="Last 30 days"
            trendDirection="up"
            delay={0.5}
            color="purple"
          />
        </div>

        {/* Recent Payment Activities, Property Availability & Daily Transactions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
        >
          {/* Recent Payment Activities */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Recent Payment Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={`payment-skeleton-${i}`}
                        className="h-20 bg-slate-200 animate-pulse rounded-lg"
                      />
                    ))}
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent payments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment, index) => (
                    <div
                      key={`${payment.date}-${index}`}
                      className="p-3 rounded-lg bg-slate-50/50 md:hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-900 text-sm">
                          {payment.method
                            ? `${payment.method} Payments`
                            : "Payments"}
                        </p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {payment.count} transaction
                        {payment.count !== 1 ? "s" : ""} • {payment.date}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Availability */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                Property Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">
                    Available
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {propertyStats.available}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Ready for sale</p>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">
                    Reserved
                  </p>
                  <p className="text-2xl font-bold text-amber-900">
                    {propertyStats.reserved}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">In process</p>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200 col-span-2">
                  <p className="text-xs font-medium text-green-700 mb-1">
                    Sold
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {propertyStats.sold}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Completed sales
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Transactions */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                Today's Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200">
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    Total Amount Today
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(todayStats.amount)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex-1">
                    <p className="text-xs text-slate-600 mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {todayStats.count}
                    </p>
                  </div>
                  <div className="ml-3">
                    <Badge
                      className={
                        todayStats.count > 0
                          ? "bg-green-100 text-green-800 border-green-200 text-xs"
                          : "bg-gray-100 text-gray-800 border-gray-200 text-xs"
                      }
                    >
                      {todayStats.count > 0 ? "Active" : "No activity"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Announcements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid lg:grid-cols-1 gap-3 sm:gap-4 md:gap-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={`announcement-skeleton-${i}`}
                        className="h-20 bg-slate-200 animate-pulse rounded-xl"
                      />
                    ))}
                </div>
              ) : recentAnnouncements.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-slate-500">
                  <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">No recent announcements</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {recentAnnouncements.map((announcement, index) => (
                    <motion.div
                      key={`${announcement.announcement_id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-slate-50/50 md:hover:bg-slate-100/50 transition-colors duration-200"
                    >
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Bell className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 line-clamp-1">
                            {announcement.title}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {announcement.created_date
                            ? new Date(
                                announcement.created_date
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
