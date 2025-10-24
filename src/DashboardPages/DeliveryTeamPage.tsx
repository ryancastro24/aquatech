import { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import supabase from "@/backend/config";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id: string;
  customer_id: string;
  store_id: string;
  branch_id: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  price: number;
  inventory: {
    item_name?: string;
  };
}

const ORS_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DeliveryTeamPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  console.log("selected storedId", branchId);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [totalPayment, setTotalPayment] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("cash");
  const [gcashRef, setGcashRef] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const fetchBranch = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("delivery_team")
        .select("store_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setBranchId(data.store_id);
    };
    fetchBranch();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    const fetchOrders = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      if (data) setOrders(data);
      setLoading(false);
    };
    fetchOrders();
  }, [branchId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === 1) {
          console.warn("User denied Geolocation permission.");
          alert("Please allow location access for better results.");
        } else if (err.code === 2) {
          console.warn("Position unavailable.");
        } else if (err.code === 3) {
          console.warn("Geolocation request timed out.");
        } else {
          console.warn("Unknown Geolocation error:", err);
        }

        // optional fallback (e.g., default location)
        setUserLocation({ lat: 8.9475, lng: 125.5406 }); // Butuan City default
      }
    );
  }, []);

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [
              [start[1], start[0]],
              [end[1], end[0]],
            ],
          }),
        }
      );
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates?.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      if (coords) setRouteCoords(coords);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadItems = async () => {
      if (!selectedOrder) return;
      if (userLocation)
        fetchRoute(
          [userLocation.lat, userLocation.lng],
          [selectedOrder.delivery_lat, selectedOrder.delivery_lng]
        );
      const { data } = await supabase
        .from("order_items")
        .select(
          `
    *,
    inventory (*)
  `
        )
        .eq("order_id", selectedOrder.id);

      console.log("order items", data);
      if (data) setOrderItems(data);
    };
    loadItems();
  }, [selectedOrder, userLocation]);

  const handleStartDelivery = async (order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "on_delivery" })
      .eq("id", order.id);
    if (!error) {
      alert("Delivery started!");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: "on_delivery" } : o
        )
      );
      setSelectedOrder(null);
    }
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setCapturedImage(dataUrl);
      }
    }
  };

  const uploadImageToSupabase = async (base64Data: string, orderId: string) => {
    const file = await fetch(base64Data).then((res) => res.blob());
    const { data, error } = await supabase.storage
      .from("delivery_photos")
      .upload(`proof_${orderId}_${Date.now()}.png`, file);
    if (error) throw error;
    const { data: publicUrl } = supabase.storage
      .from("delivery_photos")
      .getPublicUrl(data.path);
    return publicUrl.publicUrl;
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;
    if (!totalPayment || !modeOfPayment)
      return alert("Please fill in all required fields.");

    setActionLoading(true);
    try {
      // 🔹 Get the logged-in user ID
      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !userData?.user) {
        alert("Unable to get current user. Please log in again.");
        setActionLoading(false);
        return;
      }
      const user = userData.user;

      // 🔹 Upload image to Supabase storage (optional)
      const imageUrl = capturedImage
        ? await uploadImageToSupabase(capturedImage, selectedOrder.id)
        : null;

      // 🔹 Insert into sales table
      const { error: salesError } = await supabase.from("sales").insert({
        order_id: selectedOrder.id,
        delivery_id: user.id,
        store_id: branchId,
        total_amount: Number(totalPayment),
        proof_image: imageUrl,
        mode_of_payment: modeOfPayment,
        gcash_ref_code: modeOfPayment === "gcash" ? gcashRef : null,
      });

      if (salesError) throw salesError;

      // 🔹 Fetch all order items for this order
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("item_id, quantity")
        .eq("order_id", selectedOrder.id);

      if (orderItemsError) throw orderItemsError;

      // 🔹 Deduct inventory for each item
      for (const item of orderItems) {
        const { data: inventoryItem, error: inventoryError } = await supabase
          .from("inventory")
          .select("stock")
          .eq("id", item.item_id)
          .single();

        if (inventoryError) throw inventoryError;

        const newQuantity = Math.max(inventoryItem.stock - item.quantity, 0); // avoid negative

        const { error: updateError } = await supabase
          .from("inventory")
          .update({ stock: newQuantity })
          .eq("id", item.item_id);

        if (updateError) throw updateError;
      }

      // 🔹 Update order status
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", selectedOrder.id);

      if (updateOrderError) throw updateOrderError;

      alert("Order delivered, sales recorded, and inventory updated!");
      setShowPaymentDialog(false);
      setSelectedOrder(null);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id ? { ...o, status: "delivered" } : o
        )
      );
    } catch (err) {
      console.error("Delivery error:", err);
      alert("Error confirming delivery. Check console for details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!cancelReason) return alert("Please select or enter a reason.");

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", cancel_reason: cancelReason })
        .eq("id", selectedOrder.id);
      if (error) throw error;

      alert("Order cancelled!");
      setShowCancelDialog(false);
      setSelectedOrder(null);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id ? { ...o, status: "cancelled" } : o
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const renderTable = (filteredOrders: Order[]) => (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.length ? (
            filteredOrders.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => setSelectedOrder(order)}
              >
                <TableCell>{order.id.slice(0, 8)}</TableCell>
                <TableCell>₱{order.total_amount.toFixed(2)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>{order.delivery_address}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500">
                No orders found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading)
    return <div className="p-6 text-gray-600">Loading orders...</div>;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
        Delivery Team Orders
      </h2>

      <Tabs
        defaultValue="pending"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 flex flex-wrap gap-2">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {renderTable(
            orders.filter(
              (o) => o.status === "pending" || o.status === "on_delivery"
            )
          )}
        </TabsContent>
        <TabsContent value="cancelled">
          {renderTable(orders.filter((o) => o.status === "cancelled"))}
        </TabsContent>
        <TabsContent value="delivered">
          {renderTable(orders.filter((o) => o.status === "delivered"))}
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-[95vw] md:max-w-4xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Deliver Order #{selectedOrder.id.slice(0, 8)}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell>{i.inventory.item_name}</TableCell>
                            <TableCell>{i.quantity}</TableCell>
                            <TableCell>₱{i.price.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 text-right font-semibold text-gray-700">
                    Total Amount: ₱
                    {selectedOrder.total_amount?.toFixed(2) || "0.00"}
                  </div>
                </div>

                {userLocation ? (
                  <MapContainer
                    center={[userLocation.lat, userLocation.lng]}
                    zoom={13}
                    style={{
                      height: window.innerWidth < 768 ? "250px" : "400px",
                      width: "100%",
                      borderRadius: "10px",
                    }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[userLocation.lat, userLocation.lng]} />
                    <Marker
                      position={[
                        selectedOrder.delivery_lat,
                        selectedOrder.delivery_lng,
                      ]}
                      icon={redIcon}
                    />
                    {routeCoords.length > 0 && (
                      <Polyline positions={routeCoords} color="blue" />
                    )}
                  </MapContainer>
                ) : (
                  <div className="text-gray-500 py-10 text-center">
                    Getting location...
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleStartDelivery(selectedOrder)}
                  disabled={actionLoading}
                >
                  Start Delivery
                </Button>
                <Button
                  className="bg-green-600"
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={actionLoading}
                >
                  Confirm Delivered
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={actionLoading}
                >
                  Cancel Order
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delivery & Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Total Payment</Label>
            <Input
              type="number"
              value={totalPayment}
              onChange={(e) => setTotalPayment(e.target.value)}
            />

            <Label>Mode of Payment</Label>
            <select
              className="border p-2 rounded w-full"
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
            </select>

            {modeOfPayment === "gcash" && (
              <>
                <Label>GCash Reference Code</Label>
                <Input
                  value={gcashRef}
                  onChange={(e) => setGcashRef(e.target.value)}
                  placeholder="Enter reference code"
                />
              </>
            )}

            <div className="mt-3">
              <Label>Proof of Delivery (Photo)</Label>
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-48 bg-gray-200 rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="hidden"
                  />
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button onClick={startCamera}>Open Camera</Button>
                    <Button onClick={captureImage}>Capture Photo</Button>
                  </div>
                </>
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-48 object-cover rounded-lg mt-2"
                />
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={handleConfirmDelivery} disabled={actionLoading}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Cancel Reason Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Reason for Cancellation</Label>
            <select
              className="border p-2 rounded w-full"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            >
              <option value="">Select Reason</option>
              <option value="Customer unavailable">Customer unavailable</option>
              <option value="Wrong address">Wrong address</option>
              <option value="Other">Other</option>
            </select>

            {cancelReason === "Other" && (
              <Textarea
                className="mt-2"
                placeholder="Enter your reason"
                onChange={(e) => setCancelReason(e.target.value)}
              />
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={actionLoading}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryTeamPage;
