import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import supabase from "@/backend/config";
import LoadingUI from "@/components/LoadingUI";
import logo from "@/assets/aquatech_logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFullName, setUserFullName] = useState("User");

  // ✅ Fetch current user role + fullname
  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("User not found or not logged in");
        navigate("/login");
        return;
      }

      const userRole = user.user_metadata?.role || "customer";
      const firstname = user.user_metadata?.firstname || "";
      const lastname = user.user_metadata?.lastname || "";
      const fullName = `${firstname} ${lastname}`.trim() || "User";

      setRole(userRole);
      console.log("User Role:", userRole);
      setUserFullName(fullName);
      setLoading(false);
    };

    fetchUserRole();
  }, [navigate]);

  // ✅ Role-based navigation items
  const allNavItems = [
    {
      path: "/dashboard/dashboard_main",
      label: "Dashboard",
      roles: ["customer", "delivery", "business_owner", "admin"],
    },
    {
      path: "/dashboard/stores",
      label: "Stores",
      roles: ["customer", "admin"],
    },
    {
      path: "/dashboard/sales",
      label: "Sales Report",
      roles: ["business_owner"],
    },
    {
      path: "/dashboard/create_business_owner_account",
      label: "Business Owner Accounts",
      roles: ["admin"],
    },
    {
      path: "/dashboard/mystorepage",
      label: "My Store",
      roles: ["business_owner"],
    },

    {
      path: "/dashboard/delivery_team_management",
      label: "Delivery",
      roles: ["delivery"],
    },

    {
      path: "/dashboard/customerorderhistory",
      label: "My Orders",
      roles: ["customer"],
    },
    {
      path: "/dashboard/ads_management",
      label: "Ads Management",
      roles: ["admin"],
    },
  ];

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(role || "")
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <LoadingUI />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-[Poppins]">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white">
        {/* Left Section */}
        <div className="flex items-center w-full">
          {/* Logo */}
          <div className="p-2">
            <img src={logo} alt="aquatech logo" className="w-[150px]" />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:block w-full">
            <ul className="flex items-center gap-6 px-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path.replace("/dashboard/", "")}
                  className={`pb-2 transition-colors ${
                    location.pathname === item.path
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "hover:text-blue-500"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </ul>
          </nav>
        </div>

        {/* Right Section (Avatar + Menu Button) */}
        <div className="flex items-center gap-3 px-4">
          {/* ✅ Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden sm:block" asChild>
              <button>
                <Avatar className="cursor-pointer">
                  <AvatarImage src="https://github.com/shadcn.png" />

                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 ">
              <DropdownMenuLabel className="font-semibold">
                {userFullName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 cursor-pointer focus:bg-red-100"
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-b bg-white">
          <ul className="flex flex-col items-start gap-3 p-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path.replace("/dashboard/", "")}
                onClick={() => setMenuOpen(false)}
                className={`w-full pb-1 ${
                  location.pathname === item.path
                    ? "text-blue-600 font-semibold border-l-4 border-blue-500 pl-2"
                    : "hover:text-blue-500 pl-2"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </ul>

          <div
            className="w-full bg-red-500 px-4 py-2 flex items-center gap-1 text-white cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 sm:p-4 bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;
