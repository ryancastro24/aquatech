import { useState, useEffect } from "react";
import { useParams, useLoaderData } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import supabase from "@/backend/config";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// ---------------------- Loader Function ----------------------
export async function loader({ params }: LoaderFunctionArgs) {
  const branchId = params.branchId ?? null;

  // 1️⃣ Get logged-in user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error("Auth error:", userError);
    return { branchId, staff: null, orders: [] };
  }
  const authId = userData.user.id;

  // 2️⃣ Fetch staff info
  const { data: staffData, error: staffError } = await supabase
    .from("staffs")
    .select("*")
    .eq("user_id", authId)
    .single();

  if (staffError || !staffData) {
    console.error("Staff fetch error:", staffError);
    return { branchId, staff: null, orders: [] };
  }

  // 3️⃣ Fetch orders for staff's store
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
      id,
      customer_id,
      branch_id,
      total_amount,
      status,
      delivery_address,
      created_at,
      is_confirmed,
      users:customer_id(email),
      order_items:order_items(
        id,
        item_id,
        quantity,
        price,
        inventory:item_id(item_name)
      )
      `
    )
    .eq("branch_id", staffData.store_id)
    .order("created_at", { ascending: false });

  if (ordersError) console.error("Orders fetch error:", ordersError);

  return { branchId, staff: staffData, orders: ordersData ?? [] };
}

// ---------------------- Component ----------------------
const StoreBranch = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const loaderData = useLoaderData() as any;

  const [orders, setOrders] = useState(loaderData?.orders || []);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchOrders = async () => {
    if (!loaderData.staff?.store_id) return;
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        customer_id,
        branch_id,
        total_amount,
        status,
        delivery_address,
        created_at,
        is_confirmed,
        users:customer_id(email),
        order_items:order_items(
          id,
          item_id,
          quantity,
          price,
          inventory:item_id(item_name)
        )
        `
      )
      .eq("branch_id", loaderData.staff.store_id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching orders:", error);
    else setOrders(data ?? []);
    setLoadingOrders(false);
  };

  const confirmOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ is_confirmed: true })
      .eq("id", orderId);

    if (error) alert("Failed to confirm order");
    else {
      alert("Order confirmed successfully!");
      setOrders((prev: any) =>
        prev.map((o: any) =>
          o.id === orderId ? { ...o, is_confirmed: true } : o
        )
      );
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Customer Orders</h1>
      <div className="overflow-x-auto rounded border">
        {loadingOrders ? (
          <div className="p-4 text-gray-600">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-gray-600 text-center">
            No orders found for this branch.
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>{order.users?.email || "Unknown"}</TableCell>
                  <TableCell>
                    {order.order_items
                      ?.map(
                        (oi: any) =>
                          `${oi.inventory?.item_name} (x${oi.quantity})`
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell>₱{order.total_amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{order.status}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.delivery_address}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {!order.is_confirmed ? (
                      <Button size="sm" onClick={() => confirmOrder(order.id)}>
                        Confirm
                      </Button>
                    ) : (
                      <span className="text-green-600 font-semibold">
                        Confirmed
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default StoreBranch;
