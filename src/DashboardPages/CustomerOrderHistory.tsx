import React, { useEffect, useState } from "react";
import supabase from "@/backend/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
import { ChevronDown, ChevronUp } from "lucide-react";

interface Inventory {
  id: string;
  item_name: string;
  price: number;
  image: string;
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [userContactNumber, setUserContactNumber] = useState("");
  const [orderSuccessPopup, setOrderSuccessPopup] = useState<boolean>(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelledOrderId, setCancelledOrderId] = useState<string>("");

  console.log(cancelledOrderId);
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
            inventory ( id, item_name, price, stock,image )
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
      .select("id, item_name, price, stock, store_id,image")
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

      setOrderSuccessPopup(true);
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
            contact_number: userContactNumber,
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
    <div className="p-4 sm:p-6 space-y-6 font-[Poppins]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Order History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Filter Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div className="flex flex-col flex-1 w-full">
              <Label>Search Item</Label>
              <Input
                placeholder="Search item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-full sm:w-auto">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
              }}
            >
              Clear
            </Button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto mt-6">
            {loading ? (
              <p>Loading order history...</p>
            ) : filteredOrders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                <thead className="bg-gray-100 hidden sm:table-header-group">
                  <tr>
                    <th className="py-2 border-b">Order Items</th>
                    <th className="py-2 border-b">Total</th>
                    <th className="py-2 border-b">Date</th>
                    <th className="py-2 border-b">Store</th>
                    <th className="py-2 border-b">Status</th>
                    <th className="py-2 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isOpen = openDropdownId === order.id;
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className="border-b hover:bg-gray-50 sm:table-row cursor-pointer"
                          onClick={() =>
                            setOpenDropdownId(isOpen ? null : order.id)
                          }
                        >
                          <td className="text-xs  p-2 sm:text-normal">
                            {order.order_items.map((item) => (
                              <div key={item.id}>
                                {item.inventory?.item_name ?? "Unknown"} (
                                {item.quantity} × ₱{item.price.toFixed(2)})
                              </div>
                            ))}
                          </td>
                          <td className="text-xs  text-center sm:text-normal font-medium">
                            ₱{order.total_amount.toFixed(2)}
                          </td>
                          <td className="text-xs  text-center sm:text-normal">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-center hidden sm:table-cell">
                            {order.store_branches?.stores?.name ?? "Unknown"} (
                            {order.store_branches?.name ?? "Branch"})
                          </td>
                          <td className="p-2 text-center capitalize hidden sm:table-cell">
                            {order.status}
                          </td>
                          <td className="p-2 items-center justify-center hidden sm:flex gap-2 flex-wrap">
                            {order.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenUpdateDialog(order);
                                  }}
                                >
                                  Update
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setCancelDialogOpen(true);
                                    setCancelledOrderId(order.id);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {order.status === "delivered" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOrderAgainDialog(order);
                                }}
                              >
                                Order Again
                              </Button>
                            )}
                          </td>
                          <td className="sm:hidden text-center">
                            <div className="flex justify-center">
                              {isOpen ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Mobile dropdown details */}
                        {isOpen && (
                          <tr className="sm:hidden bg-gray-50">
                            <td colSpan={6} className="p-3">
                              <div className="space-y-2">
                                <p>
                                  <strong>Store:</strong>{" "}
                                  {order.store_branches?.stores?.name ??
                                    "Unknown"}{" "}
                                  ({order.store_branches?.name ?? "Branch"})
                                </p>
                                <p>
                                  <strong>Status:</strong>{" "}
                                  <span className="capitalize">
                                    {order.status}
                                  </span>
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {order.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleOpenUpdateDialog(order)
                                        }
                                      >
                                        Update
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          setCancelDialogOpen(true);
                                          setCancelledOrderId(order.id);
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  )}
                                  {order.status === "delivered" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleOpenOrderAgainDialog(order)
                                      }
                                    >
                                      Order Again
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for Update / Order Again */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden font-[Poppins] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {orderAgainMode
                ? "Order Again"
                : `Update Order — ${updatingOrder?.store_branches?.name ?? ""}`}
            </DialogTitle>
          </DialogHeader>

          {itemsLoading ? (
            <div className="text-center text-gray-500 flex-1 flex items-center justify-center">
              Loading inventory...
            </div>
          ) : (
            <>
              {/* ✅ Scrollable Area */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-6">
                {/* 🧩 Inventory Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-2">
                  {inventoryItems.map((item) => {
                    const selected = selectedItems.some(
                      (i) => i.item_id === item.id
                    );
                    return (
                      <Card
                        key={item.id}
                        className={`border-2 cursor-pointer transition-all duration-150 ${
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() => toggleSelectItem(item)}
                      >
                        <CardContent className="p-3 sm:p-4 text-gray-700 flex flex-col items-center sm:items-start gap-2">
                          {/* ✅ Fixed Image Container */}
                          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.item_name}
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>

                          {/* ✅ Item Details */}
                          <div className="text-center sm:text-left w-full">
                            <h3 className="text-sm sm:text-base font-semibold line-clamp-1">
                              {item.item_name}
                            </h3>
                            <p className="text-xs sm:text-sm">
                              <span className="font-medium">Price:</span> ₱
                              {item.price.toFixed(2)}
                            </p>
                            <p className="text-xs sm:text-sm">
                              <span className="font-medium">Stock:</span>{" "}
                              {item.stock}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* 🧩 Selected Items */}
                {selectedItems.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-semibold mb-3 text-base sm:text-lg">
                      Selected Items
                    </h3>

                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
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
                                <TableCell className="text-xs sm:text-sm">
                                  {inv?.item_name}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  ₱{item.price.toFixed(2)}
                                </TableCell>
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
                                    className="w-16 sm:w-20 text-sm"
                                  />
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  ₱{(item.price * item.quantity).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* 🧩 Order Again Fields */}
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
                          <Button
                            variant="outline"
                            onClick={getCustomerLocation}
                            className="w-full sm:w-auto"
                          >
                            Retry Location
                          </Button>
                        )}

                        <Input
                          placeholder="Enter Contact Number"
                          value={userContactNumber}
                          onChange={(e) => setUserContactNumber(e.target.value)}
                          className="text-sm"
                        />

                        <Input
                          placeholder="Enter your delivery address..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ✅ Fixed Footer */}
              {selectedItems.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-4 border-t flex-shrink-0 bg-white">
                  <div className="text-right sm:text-left font-semibold text-base sm:text-lg">
                    Total: ₱{totalAmount.toFixed(2)}
                  </div>
                  <div className="flex justify-end gap-2 w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      onClick={() => setUpdateDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={
                        orderAgainMode
                          ? handleSubmitOrderAgain
                          : handleSubmitUpdate
                      }
                      className="w-full sm:w-auto"
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

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to cancel this order?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If you cancel now, you will need to place a new order if you
              change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderSuccessPopup(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500"
              onClick={() => handleCancelOrder(cancelledOrderId)}
            >
              Proceed to Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={orderSuccessPopup} onOpenChange={setOrderSuccessPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Order succesfully placed</AlertDialogTitle>
            <AlertDialogDescription>
              Someone will contact you to confirm your order and arrange
              delivery. Thank you for choosing our service!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOrderSuccessPopup(false)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerOrderHistory;
