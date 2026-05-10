import { useEffect, useMemo, useState } from "react";
import supabase from "@/backend/config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface SalesRecord {
  id: string;
  order_id?: string;
  delivery_id?: string;
  store_id: string;
  total_amount: number;
  created_at: string;

  orders?: {
    customer_id: string;
    status: string;
    total_amount: number;
    delivery_address: string;
  };

  store_branches?: {
    id: string;
    name: string;
    address: string;
    stores?: {
      id: string;
    };
  };
}

interface Branch {
  id: string;
  name: string;
  address: string;
  store_id: string;
}

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#e11d48",
  "#8b5cf6",
  "#06b6d4",
  "#facc15",
  "#14b8a6",
];

const Sales = () => {
  const [filter, setFilter] = useState("today");
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);

      try {
        // ✅ Get logged-in user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("No user logged in");

        const userId = user.id;

        // ✅ Get owned stores
        const { data: ownedStores, error: storeError } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", userId);

        if (storeError) throw storeError;

        if (!ownedStores?.length) {
          console.warn("⚠️ No stores found for this user.");
          setSalesData([]);
          setBranches([]);
          return;
        }

        const ownedStoreIds = ownedStores.map((s) => s.id);

        // ✅ Fetch all branches
        const { data: branchData, error: branchError } = await supabase
          .from("store_branches")
          .select(
            `
            id,
            name,
            address,
            store_id
          `,
          )
          .in("store_id", ownedStoreIds);

        if (branchError) throw branchError;

        setBranches(branchData || []);

        // ✅ Fetch sales
        const { data, error } = await supabase.from("sales").select(`
            id,
            store_id,
            total_amount,
            created_at,

            orders:order_id (
              id,
              customer_id,
              status,
              delivery_address
            ),

            store_branches:store_id (
              id,
              name,
              address,
              stores (
                id
              )
            )
          `);

        if (error) throw error;

        // ✅ Filter only owned store sales
        const filteredSales = (data as any[]).filter((sale) =>
          ownedStoreIds.includes(sale.store_branches?.stores?.id),
        );

        setSalesData(filteredSales);
      } catch (err) {
        console.error("❌ Error fetching sales:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  // ✅ Timeline filtering
  const filteredSales = useMemo(() => {
    const now = new Date();

    return salesData.filter((sale) => {
      const saleDate = new Date(sale.created_at);

      // Today
      if (filter === "today") {
        return (
          saleDate.getDate() === now.getDate() &&
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }

      // Last 7 days
      if (filter === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        return saleDate >= sevenDaysAgo;
      }

      // Last 30 days
      if (filter === "30days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        return saleDate >= thirtyDaysAgo;
      }

      return true;
    });
  }, [salesData, filter]);

  // ✅ Revenue over time
  const dailyRevenue = filteredSales.reduce<Record<string, number>>(
    (acc, sale) => {
      const date = new Date(sale.created_at).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      });

      acc[date] = (acc[date] || 0) + (sale.total_amount || 0);

      return acc;
    },
    {},
  );

  const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // ✅ Summary
  const totalRevenue = filteredSales.reduce(
    (sum, s) => sum + (s.total_amount || 0),
    0,
  );

  const totalSales = filteredSales.length;

  const avgOrder = totalSales ? totalRevenue / totalSales : 0;

  // ✅ Revenue per branch (includes branches with 0 sales)
  const storeRevenue: Record<string, number> = {};

  // Initialize all branches
  branches.forEach((branch) => {
    storeRevenue[branch.name] = 0;
  });

  // Add actual sales
  filteredSales.forEach((sale) => {
    const storeName = sale.store_branches?.name || "Unknown";

    storeRevenue[storeName] =
      (storeRevenue[storeName] || 0) + sale.total_amount;
  });

  const storeChartData = Object.entries(storeRevenue).map(
    ([store, revenue]) => ({
      store,
      revenue,
    }),
  );

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 animate-pulse">
        Loading sales data...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {filteredSales.length === 0 && (
        <div className="rounded-xl border p-10 text-center text-gray-500">
          No sales found for the selected timeline.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold">
              ₱{totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold">{totalSales}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Order Value</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold">₱{avgOrder.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>

        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="date" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Branch (Bar)</CardTitle>
          </CardHeader>

          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeChartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="store" />

                <YAxis />

                <Tooltip />

                <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Branch (Pie)</CardTitle>
          </CardHeader>

          <CardContent className="h-[320px] flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storeChartData}
                  dataKey="revenue"
                  nameKey="store"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {storeChartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sales;
