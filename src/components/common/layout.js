"use client";

import { usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import {
  LayoutDashboard,
  Home,
  Users,
  FileText,
  Wrench,
  MessageSquare,
  AlertTriangle,
  Megaphone,
  Calendar,
  DollarSign,
  Settings,
  MapPin,
  Power,
  FileBarChart,
  ChevronDown,
  ChevronRight,
  FileSignature,
  MessageCircleQuestion,
  CalendarCheck,
  UserCog,
  HandCoins,
  Bell,
  Armchair,
  Package,
} from "lucide-react";
import AdminNotificationBell from "@/components/ui/AdminNotificationBell";
import { useNewItemCounts } from "@/hooks/useNewItemCounts";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { createGlobalState } from "react-use";

const NavItem = ({ item, pathname, counts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive =
    pathname === item.url ||
    (hasChildren && item.children.some((child) => pathname === child.url));

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <div className="space-y-1">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`group hover:bg-blue-50 transition-all duration-200 rounded-xl mb-1 w-full ${
              isActive
                ? "bg-gradient-to-r from-red-400  text-white shadow-md hover:from-red-400 to-red-500 hover:to-blue-600"
                : "text-slate-700 hover:text-blue-700"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 w-full">
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-amber-300"
                      : "text-slate-500 group-hover:text-blue-600"
                  }`}
                />
                <span className="font-medium">{item.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.countKey && counts[item.countKey] > 0 && (
                  <span
                    className={`w-4 h-4 p-2 flex justify-center items-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-amber-400 text-amber-900"
                        : "bg-red-500 text-white group-hover:bg-red-600"
                    } animate-pulse`}
                  >
                    {counts[item.countKey] > 99 ? "99+" : counts[item.countKey]}
                  </span>
                )}
                {isOpen ? (
                  <ChevronDown
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  />
                ) : (
                  <ChevronRight
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  />
                )}
              </div>
            </div>
          </button>
          {isOpen && (
            <div className="ml-4 space-y-1">
              {item.children.map((child) => (
                <SidebarMenuButton
                  key={child.title}
                  asChild
                  className={`group hover:bg-blue-50 transition-all duration-200 rounded-xl ${
                    pathname === child.url
                      ? "bg-gradient-to-r from-red-400  text-white shadow-md hover:from-red-400 to-red-500 hover:to-blue-600"
                      : "text-slate-700 hover:text-blue-700"
                  }`}
                >
                  <Link
                    href={child.url}
                    className="flex items-center justify-between px-4 py-2 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <child.icon
                        className={`w-4 h-4 ${
                          pathname === child.url
                            ? "text-amber-300"
                            : "text-slate-500 group-hover:text-blue-600"
                        }`}
                      />
                      <span className="font-medium text-sm">{child.title}</span>
                    </div>
                    {child.countKey && counts[child.countKey] > 0 && (
                      <span
                        className={`w-4 h-4 p-2 flex justify-center items-center rounded-full text-xs font-bold ${
                          pathname === child.url
                            ? "bg-amber-400 text-amber-900"
                            : "bg-red-500 text-white group-hover:bg-red-600"
                        } animate-pulse`}
                      >
                        {counts[child.countKey] > 99
                          ? "99+"
                          : counts[child.countKey]}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              ))}
            </div>
          )}
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={`group hover:bg-blue-50 transition-all duration-200 rounded-xl mb-1 ${
          pathname === item.url
            ? "bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md hover:from-red-400 to-red-500 hover:to-blue-600"
            : "text-slate-700 hover:text-blue-700"
        }`}
      >
        <Link
          href={item.url}
          className="flex items-center justify-between px-4 py-3 w-full"
        >
          <div className="flex items-center gap-3">
            <item.icon
              className={`w-5 h-5 ${
                pathname === item.url
                  ? "text-amber-300"
                  : "text-slate-500 group-hover:text-blue-600"
              }`}
            />
            <span className="font-medium">{item.title}</span>
          </div>
          {item.countKey && counts[item.countKey] > 0 && (
            <span
              className={`w-4 h-4 p-2 flex justify-center items-center rounded-full text-xs font-bold ${
                pathname === item.url
                  ? "bg-amber-400 text-amber-900"
                  : "bg-red-500 text-white group-hover:bg-red-600"
              } animate-pulse`}
            >
              {counts[item.countKey] > 99 ? "99+" : counts[item.countKey]}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    countKey: null,
    roles: [
      "admin",
      "customer service",
      "sales representative",
      "home owner",
      "collection",
    ],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    countKey: null,
    roles: ["admin", "customer service", "sales representative", "collection"],
  },
  {
    title: "User Management",
    url: "/settings/users",
    icon: Users,
    countKey: null,
    roles: ["admin"],
    children: [
      {
        title: "Users",
        url: "/settings/users",
        icon: Users,
        countKey: null,
        roles: ["admin"],
      },
      {
        title: "Role",
        url: "/settings/roles",
        icon: UserCog,
        countKey: null,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Property",
    url: "/properties",
    icon: Home,
    countKey: "properties",
    roles: ["admin", "sales representative"],
    children: [
      {
        title: "Property details",
        url: "/properties",
        icon: Users,
        countKey: null,
        roles: ["admin"],
      },
      {
        title: "Property type",
        url: "/properties/proptype",
        icon: Users,
        countKey: null,
        roles: ["admin"],
      },
      {
        title: "Lot Number",
        url: "/properties/lot",
        icon: Users,
        countKey: null,
        roles: ["admin"],
      },
    ],
  },
  // {
  //   title: "Homeowner",
  //   url: "/homeowners",
  //   icon: Users,
  //   countKey: "homeowners",
  //   roles: ["admin"],
  // },
  {
    title: "Mapping",
    url: "/property-map",
    icon: MapPin,
    countKey: null,
    roles: ["admin", "sales representative"],
  },

  // {
  //   title: "Billing",
  //   url: "/billing",
  //   icon: FileText,
  //   countKey: null,
  //   roles: ["admin"],
  // },

  {
    title: "Billing",
    url: "/loans",
    icon: HandCoins,
    countKey: null,
    roles: ["admin", "collection"],
  },
  {
    title: "Transaction",
    url: "/transactions",
    icon: DollarSign,
    countKey: "transactions",
    roles: ["admin", "collection"],
  },
  // {
  //   title: "Inquiries",
  //   url: "/inquiries",
  //   icon: MessageSquare,
  //   countKey: "inquiries",
  //   roles: ["admin", "customer service"],
  // },
  {
    title: "Inquiries",
    url: "/client-inquiries",
    icon: MessageCircleQuestion,
    countKey: "inquiries",
    roles: ["admin", "sales representative"],
  },
  {
    title: "Reservation",
    url: "/client-reservation",
    icon: CalendarCheck,
    countKey: "inquiries",
    roles: ["admin", "sales representative"],
  },

  {
    title: "Contract",
    url: "/client-contract-to-sell",
    icon: FileSignature,
    countKey: "inquiries",
    roles: ["admin", "sales representative"],
  },
  {
    title: "Announcement",
    url: "/homeowner-announcement",
    icon: Megaphone,
    countKey: "announcements",
    roles: ["admin", "customer service"],
  },
  {
    title: "Homeowner",
    url: "/certified-homeowner",
    icon: FileSignature,
    countKey: "certified",
    roles: ["admin", "customer service"],
  },
  {
    title: "Amenities",
    url: "/amenties",
    icon: Armchair,
    countKey: null,
    roles: ["admin", "customer service"],
    children: [
      {
        title: "Manage Amenities",
        url: "/manage-amenities",
        icon: Package,
        countKey: null,
        roles: ["admin", "customer service"],
      },
      {
        title: "Borrow Requests",
        url: "/amenties",
        icon: Armchair,
        countKey: null,
        roles: ["admin", "customer service"],
      },
    ],
  },
  {
    title: "Service Requests",
    url: "/service-requests",
    icon: Wrench,
    countKey: "serviceRequests",
    roles: ["admin", "customer service"],
  },

  {
    title: "File Complaint",
    url: "/complaints",
    icon: AlertTriangle,
    countKey: "complaints",
    roles: ["admin", "customer service"],
  },

  // {
  //   title: "Appointments",
  //   url: "/reservations",
  //   icon: Calendar,
  //   countKey: "reservations",
  //   roles: ["admin", "customer service"],
  // },

  {
    title: "Report",
    url: "/reports",
    icon: FileBarChart,
    countKey: null,
    roles: ["admin"],
  },
];

export const GlobalRole = createGlobalState(null);

export default function MainLayout({ children, currentPageName }) {
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  // custom hook
  const { counts, loading } = useNewItemCounts();

  const [showLogout, setShowLogout] = useState(false);
  const [userRole, setUserRole] = GlobalRole();
  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("FM");
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Get user role and name on mount
  useEffect(() => {
    const getUserInfo = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.role?.toLowerCase();
        const firstName = session.user.user_metadata?.first_name || "";
        const lastName = session.user.user_metadata?.last_name || "";
        const fullName =
          `${firstName} ${lastName}`.trim() ||
          session.user.email?.split("@")[0] ||
          "User";
        const photo = session.user.user_metadata?.profile_photo || null;

        setUserRole(role);
        setUserName(fullName);
        setProfilePhoto(photo);

        // Generate initials
        if (firstName && lastName) {
          setUserInitials(
            `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
          );
        } else if (firstName) {
          setUserInitials(firstName.charAt(0).toUpperCase());
        } else {
          setUserInitials("U");
        }
      }
    };
    getUserInfo();
  }, [supabase]);

  // Helper function to format role name for display
  const formatRoleName = (role) => {
    if (!role) return "User";
    const roleMap = {
      admin: "Administrator",
      collection: "Collection",
      "customer service": "Customer Service",
      "sales representative": "Sales Representative",
      "home owner": "Home Owner",
    };
    return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter((item) => {
    if (!userRole) return false;
    return item.roles?.includes(userRole);
  });

  //  event handlers
  const handleContainerClick = () => {
    setShowLogout(!showLogout);
  };

  //  event handlers
  const handleLogout = async () => {
    try {
      setShowLogout(false);

      // Sign out from Supabase with scope 'local' to clear session
      await supabase.auth.signOut({ scope: "local" });

      // Clear all localStorage and sessionStorage
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Show success message
      toast.success("Logged out successfully");

      // Force hard redirect to login page (clears all cache)
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  console.log("Current location:", pathname);
  console.log("New item counts:", counts);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
          <Sidebar className="border-r border-slate-200 bg-white/90 backdrop-blur-sm shadow-xl">
            <SidebarHeader className="border-b border-slate-200 p-6 bg-gradient-to-r from-red-400 to-red-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Home className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">Futura Homes</h2>
                  <p className="text-xs text-blue-200 font-medium">
                    Koronadal Property Management
                  </p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredNavigationItems.map((item) => (
                      <NavItem
                        key={item.title}
                        item={item}
                        pathname={pathname}
                        counts={counts}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Quick Stats</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Total Units</span>
                    <span className="font-semibold text-amber-900">150</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Occupancy</span>
                    <span className="font-semibold text-green-600">92%</span>
                  </div>
                </div>
              </div> */}
            </SidebarContent>

            {/* <SidebarFooter className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{userInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {userName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatRoleName(userRole)}
                  </p>
                </div>
              </div>
            </SidebarFooter> */}
          </Sidebar>

          <main className="flex-1 flex flex-col">
            {/* Main Header - Visible on all screen sizes */}
            <header className="relative bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 shadow-sm z-10">
              <div className="flex items-center justify-between">
                {/* Left side - Mobile menu trigger and title */}
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="md:hidden hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
                  <div className="flex items-center gap-2 md:hidden">
                    <Home className="w-5 h-5 text-red-600" />
                    <h1 className="text-base font-bold text-slate-900">
                      Futura Homes
                    </h1>
                  </div>
                  {/* Desktop page title */}
                  <div className="hidden md:block">
                    <h1 className="text-xl font-semibold text-slate-900">
                      {currentPageName || "Dashboard"}
                    </h1>
                    <p className="text-sm text-slate-600">
                      Futura Homes Koronadal Property Management
                    </p>
                  </div>
                </div>

                {/* Right side - Notification Bell and User Info */}
                <div className="flex items-center gap-3">
                  {/* Notification Bell */}
                  <AdminNotificationBell />

                  {/* User Avatar with Dropdown - Desktop only */}
                  <div className="hidden md:block relative">
                    <div
                      className="flex items-center gap-3 pl-3 border-l border-slate-200 cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-colors"
                      onClick={handleContainerClick}
                    >
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {userName || "User"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatRoleName(userRole)}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-r from-red-400 to-red-500 shadow-md">
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt={userName || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {userInitials}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dropdown Menu */}
                    {showLogout && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
                        <Link
                          href="/account"
                          className="flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900"
                          onClick={() => setShowLogout(false)}
                        >
                          <Settings size={18} />
                          <span className="font-medium text-sm">Account</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 transition-colors text-red-600 hover:text-red-700 border-t border-slate-100"
                        >
                          <Power size={18} />
                          <span className="font-medium text-sm">Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50/30 to-indigo-100/30">
              {children}
            </div>
          </main>
      </div>
    </SidebarProvider>
  );
}
