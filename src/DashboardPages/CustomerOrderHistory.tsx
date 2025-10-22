import React, { useEffect, useState } from "react";
import supabase from "@/backend/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Inventory {
  id: string;
  item_name: string;
  price: number;
  stock: number;
}

interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  price: number;
  inventory?: Inventory | null;
}

interface StoreBranch {
  id: number;
  name: string;
  stores?: {
    name: string;
  } | null;
}

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  branch_id: number;
  order_items: OrderItem[];
  store_branches?: StoreBranch | null;
}

const CustomerOrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [orderAgainMode, setOrderAgainMode] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          total_amount,
          created_at,
          status,
          branch_id,
          store_branches (
            id,
            name,
            stores ( name )
          ),
          order_items (
            id,
            order_id,
            item_id,
            quantity,
            price,
            inventory ( id, item_name, price, stock )
          )
        `
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching orders:", error);
      else setOrders((data as any) || []);

      setLoading(false);
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((order) =>
        order.order_items.some((item) =>
          item.inventory?.item_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    if (dateFilter !== "") {
      filtered = filtered.filter(
        (order) => order.created_at.split("T")[0] === dateFilter
      );
    }

    setFilteredOrders(filtered);
  }, [searchTerm, dateFilter, orders]);

  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = confirm(
      "Are you sure you want to cancel this order?"
    );
    if (!confirmCancel) return;

    try {
      await supabase.from("order_items").delete().eq("order_id", orderId);
      await supabase.from("orders").delete().eq("id", orderId);

      alert("✅ Order canceled successfully.");
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (err) {
      console.error("Error canceling order:", err);
      alert("Something went wrong while canceling your order.");
    }
  };

  const handleOpenUpdateDialog = async (order: Order) => {
    setOrderAgainMode(false);
    setUpdatingOrder(order);
    setSelectedItems(order.order_items);
    setUpdateDialogOpen(true);
    await fetchInventory(order.branch_id);
  };

  const handleOpenOrderAgainDialog = async (order: Order) => {
    setOrderAgainMode(true);
    setUpdatingOrder(order);
    setSelectedItems([]);
    setDeliveryAddress("");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setUpdateDialogOpen(true);
    await fetchInventory(order.branch_id);
  };

  const fetchInventory = async (branchId: number) => {
    setItemsLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("id, item_name, price, stock, store_id")
      .eq("store_id", branchId);
    if (error) console.error("Error fetching inventory:", error);
    else setInventoryItems(data || []);
    setItemsLoading(false);
  };

  const getCustomerLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryLat(pos.coords.latitude);
        setDeliveryLng(pos.coords.longitude);
        setGettingLocation(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        alert("Could not get your location. Please enable location services.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (orderAgainMode && updateDialogOpen) getCustomerLocation();
  }, [orderAgainMode, updateDialogOpen]);

  const toggleSelectItem = (item: Inventory) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.item_id === item.id);
      if (exists) return prev.filter((i) => i.item_id !== item.id);
      return [
        ...prev,
        {
          id: "",
          order_id: updatingOrder?.id || "",
          item_id: item.id,
          quantity: 1,
          price: item.price,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.item_id === itemId ? { ...i, quantity } : i))
    );
  };

  const totalAmount = selectedItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  const handleSubmitUpdate = async () => {
    if (!updatingOrder) return;
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    try {
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", updatingOrder.id);

      const itemsPayload = selectedItems.map((i) => ({
        order_id: updatingOrder.id,
        item_id: i.item_id,
        quantity: i.quantity,
        price: i.price,
      }));

      await supabase.from("order_items").insert(itemsPayload);
      await supabase
        .from("orders")
        .update({ total_amount: totalAmount })
        .eq("id", updatingOrder.id);

      alert("✅ Order updated successfully.");
      setUpdateDialogOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Error updating order:", err);
      alert("Something went wrong while updating the order.");
    }
  };

  const handleSubmitOrderAgain = async () => {
    if (!updatingOrder) return;
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert("Please enter your delivery address.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login to place an order.");
        return;
      }

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: user.id,
            branch_id: updatingOrder.branch_id,
            total_amount: totalAmount,
            status: "pending",
            delivery_address: deliveryAddress,
            delivery_lat: deliveryLat,
            delivery_lng: deliveryLng,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsPayload = selectedItems.map((i) => ({
        order_id: newOrder.id,
        item_id: i.item_id,
        quantity: i.quantity,
        price: i.price,
      }));

      await supabase.from("order_items").insert(itemsPayload);

      alert("✅ Order placed successfully!");
      setUpdateDialogOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Error placing order again:", err);
      alert("Something went wrong while placing your order.");
    }
  };

  return (
    <div className="p-6 space-y-6 font-[Poppins]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Order History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col flex-1">
              <Label>Search Item</Label>
              <Input
                placeholder="Search item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
              }}
            >
              Clear
            </Button>
          </div>

          <div className="overflow-x-auto mt-6">
            {loading ? (
              <p>Loading order history...</p>
            ) : filteredOrders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border-b">Order Items</th>
                    <th className="p-2 border-b">Total</th>
                    <th className="p-2 border-b">Date</th>
                    <th className="p-2 border-b">Store</th>
                    <th className="p-2 border-b">Status</th>
                    <th className="p-2 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {order.order_items.map((item) => (
                          <div key={item.id}>
                            {item.inventory?.item_name ?? "Unknown"} (
                            {item.quantity} × ₱{item.price.toFixed(2)})
                          </div>
                        ))}
                      </td>
                      <td className="p-2 font-medium">
                        ₱{order.total_amount.toFixed(2)}
                      </td>
                      <td className="p-2">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        {order.store_branches?.stores?.name ?? "Unknown"} (
                        {order.store_branches?.name ?? "Branch"})
                      </td>
                      <td className="p-2 capitalize">{order.status}</td>
                      <td className="p-2 flex gap-2 flex-wrap">
                        {order.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenUpdateDialog(order)}
                            >
                              Update
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenOrderAgainDialog(order)}
                          >
                            Order Again
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-4xl font-[Poppins]">
          <DialogHeader>
            <DialogTitle>
              {orderAgainMode
                ? "Order Again"
                : `Update Order — ${updatingOrder?.store_branches?.name ?? ""}`}
            </DialogTitle>
          </DialogHeader>

          {itemsLoading ? (
            <p className="text-center text-gray-500">Loading inventory...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {inventoryItems.map((item) => {
                  const selected = selectedItems.some(
                    (i) => i.item_id === item.id
                  );
                  return (
                    <Card
                      key={item.id}
                      className={`border-2 cursor-pointer transition ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => toggleSelectItem(item)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{item.item_name}</h3>
                        <p>₱{item.price.toFixed(2)}</p>
                        <p>Stock: {item.stock}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Selected Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item) => {
                        const inv = inventoryItems.find(
                          (inv) => inv.id === item.item_id
                        );
                        return (
                          <TableRow key={item.item_id}>
                            <TableCell>{inv?.item_name}</TableCell>
                            <TableCell>₱{item.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={inv?.stock ?? 1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    item.item_id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              ₱{(item.price * item.quantity).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {orderAgainMode && (
                    <div className="mt-6 space-y-3">
                      {gettingLocation ? (
                        <p>Getting your location...</p>
                      ) : deliveryLat && deliveryLng ? (
                        <p className="text-sm text-gray-600">
                          📍 Location: {deliveryLat.toFixed(5)},{" "}
                          {deliveryLng.toFixed(5)}
                        </p>
                      ) : (
                        <Button variant="outline" onClick={getCustomerLocation}>
                          Retry Location
                        </Button>
                      )}

                      <Input
                        placeholder="Enter your delivery address..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="text-right mt-4 font-semibold text-lg">
                    Total: ₱{totalAmount.toFixed(2)}
                  </div>

                  <div className="flex justify-end mt-6 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setUpdateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={
                        orderAgainMode
                          ? handleSubmitOrderAgain
                          : handleSubmitUpdate
                      }
                    >
                      {orderAgainMode ? "Place Order" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerOrderHistory;
