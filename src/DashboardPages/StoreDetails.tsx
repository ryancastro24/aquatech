/* eslint-disable react-hooks/exhaustive-deps */
import { useLoaderData, useNavigate } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IoReturnUpBack } from "react-icons/io5";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TbShoppingCartPlus } from "react-icons/tb";
import supabase from "@/backend/config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// 🧩 Types
interface InventoryItem {
  id: string;
  store_id: string;
  item_name: string;
  description?: string | null;
  price: number;
  stock: number;
  image: string;
}

interface SelectedItem extends InventoryItem {
  quantity: number;
}

interface LoaderData {
  storeId: string | null;
}
export async function loader({ params }: LoaderFunctionArgs) {
  const storeId = params.storeId ?? null;
  return { storeId };
}

const StoreDetails: React.FC = () => {
  const { storeId } = useLoaderData() as LoaderData;
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderSuccessPopup, setOrderSuccessPopup] = useState<boolean>(false);
  // 🧾 Ordering states
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);

  // ✅ Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error getting user:", error);
      } else if (data?.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  // ✅ Fetch store inventory
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_id", storeId);

      if (error) {
        console.error("Error fetching inventory:", error);
      } else {
        setItems((data as InventoryItem[]) || []);
      }
      setLoading(false);
    };

    if (storeId) fetchInventory();
  }, [storeId]);

  // ✅ Select/deselect items
  const toggleSelectItem = (item: InventoryItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) return prev.filter((i) => i.id !== item.id);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // ✅ Update quantity
  const updateQuantity = (id: string, quantity: number | string) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Number(quantity) } : item
      )
    );
  };

  // ✅ Compute total
  const totalAmount = selectedItems.reduce((sum, item) => {
    const price = item.price || 0;
    const qty = item.quantity || 0;
    return sum + price * qty;
  }, 0);

  // ✅ Get user's delivery location automatically
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryLat(pos.coords.latitude);
        setDeliveryLng(pos.coords.longitude);
      },
      (err) => console.error("Error getting location:", err),
      { enableHighAccuracy: true }
    );
  }, []);

  // ✅ Submit order
  const handleSubmitOrder = async () => {
    if (!userId) {
      alert("Please log in to place an order.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert("Please enter a delivery address.");
      return;
    }

    // ✅ Ensure we have user's location before submitting
    let lat = deliveryLat;
    let lng = deliveryLng;

    if (lat === null || lng === null) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            })
        );
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        setDeliveryLat(lat);
        setDeliveryLng(lng);
      } catch (error) {
        console.error("❌ Error fetching geolocation:", error);
        alert(
          "Unable to get your current location. Please enable location services."
        );
        return;
      }
    }

    try {
      // ✅ Create order record
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: userId,
            branch_id: storeId,
            total_amount: totalAmount,
            delivery_address: deliveryAddress,
            delivery_lat: lat,
            delivery_lng: lng,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      // ✅ Insert order items
      const orderItemsPayload = selectedItems.map((item) => ({
        order_id: orderId,
        item_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      setOrderSuccessPopup(true);
      setOrderDialogOpen(false);
      setSelectedItems([]);
      setDeliveryAddress("");
    } catch (err) {
      console.error("❌ Error submitting order:", err);
      alert("Something went wrong while submitting your order.");
    }
  };

  return (
    <div className="p-4 space-y-4 font-[Poppins]">
      <Button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <IoReturnUpBack /> return
      </Button>
      <h2 className="text-2xl font-semibold ">Store Inventory</h2>

      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No items available for this store.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const selected = selectedItems.some((i) => i.id === item.id);
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
                <div className="flex items-start gap-4 p-4 w-full">
                  {/* 🖼️ Image on the left */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.item_name}
                      className="w-32 h-32 object-cover rounded-md border"
                    />
                  </div>

                  {/* 📄 Content on the right */}
                  <div className="flex flex-col justify-between flex-grow">
                    <CardHeader className="p-0">
                      <CardTitle className="text-lg font-bold">
                        {item.item_name}
                      </CardTitle>

                      <CardDescription>
                        <p className="text-gray-600 mb-2">
                          {item.description || "No description provided."}
                        </p>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0 mt-2">
                      <p className="text-sm">
                        💰 <span className="font-semibold">₱{item.price}</span>
                      </p>
                      <p className="text-sm">
                        🏷️ Stock:{" "}
                        <span
                          className={
                            item.stock > 0 ? "text-green-600" : "text-red-500"
                          }
                        >
                          {item.stock}
                        </span>
                      </p>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 🛒 Order Now Button */}
      {selectedItems.length > 0 && (
        <div className="text-center mt-6">
          <Button onClick={() => setOrderDialogOpen(true)}>
            <TbShoppingCartPlus className="mr-2" /> Proceed to Checkout
          </Button>
        </div>
      )}

      {/* 🧾 Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-3xl font-[Poppins]">
          <DialogHeader>
            <DialogTitle>🧾 Review Your Order</DialogTitle>
          </DialogHeader>

          {selectedItems.length === 0 ? (
            <p className="text-gray-600 p-4 text-center">No items selected.</p>
          ) : (
            <>
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
                  {selectedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>₱{item.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, e.target.value)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 mt-4">
                <div className="text-right font-semibold text-lg">
                  Total: ₱{totalAmount.toFixed(2)}
                </div>

                <Input
                  placeholder="Enter your delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />

                <DialogFooter>
                  <Button
                    className="w-full"
                    onClick={handleSubmitOrder}
                    disabled={selectedItems.length === 0}
                  >
                    Submit Order
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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

export default StoreDetails;
