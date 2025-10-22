import { useEffect, useState } from "react";
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
  };
}

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#e11d48"];

const Sales = () => {
  const [filter, setFilter] = useState("daily");
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      try {
        // Uncomment this when ready to fetch from Supabase

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
            address
          )
        `);
        if (error) throw error;
        setSalesData(data || []);
      } catch (err) {
        console.error("❌ Error fetching sales data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  // 🔹 Aggregate sales data
  const dailyRevenue = salesData.reduce<Record<string, number>>((acc, sale) => {
    const date = new Date(sale.created_at).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
    acc[date] = (acc[date] || 0) + (sale.total_amount || 0);
    return acc;
  }, {});

  const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  const totalRevenue = salesData.reduce(
    (sum, s) => sum + (s.total_amount || 0),
    0
  );
  const totalSales = salesData.length;
  const avgOrder = totalSales ? totalRevenue / totalSales : 0;

  // 🔹 Compute revenue by store
  const storeRevenue: Record<string, number> = {};
  salesData.forEach((sale) => {
    const storeName = sale.store_branches?.name || "Unknown";
    storeRevenue[storeName] =
      (storeRevenue[storeName] || 0) + sale.total_amount;
  });

  const storeChartData = Object.entries(storeRevenue).map(
    ([store, revenue]) => ({ store, revenue })
  );

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500 animate-pulse">
        Loading sales data...
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Sales Dashboard</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 🔹 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              ₱{totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalSales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              ₱{avgOrder.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🔹 Revenue Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
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
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 🔹 Revenue by Store */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Store (Bar)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="store" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Store (Pie)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex justify-center">
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
