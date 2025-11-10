import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TbShoppingCartPlus } from "react-icons/tb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { IoLocationOutline } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import supabase from "@/backend/config";

// 🏪 Store Branch Interface
interface StoreBranch {
  id: number;
  name: string;
  address: string;
  contact_number: string;
  latitude: number | null;
  longitude: number | null;
  stores: {
    name: string;
  };
}

// 🧾 Inventory Interfaces
interface InventoryItem {
  id: string;
  item_name: string;
  price: number;
  stock: number;
  store_id: number;
  image: string;
}

interface SelectedItem extends InventoryItem {
  quantity: number;
}

const Stores = () => {
  const [branches, setBranches] = useState<StoreBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<StoreBranch | null>(
    null
  );
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [userContactNumber, setUserContactNumber] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [orderSuccessPopup, setOrderSuccessPopup] = useState<boolean>(false);
  const [branchDistances, setBranchDistances] = useState<
    Record<number, number>
  >({});
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 Added for search

  // ✅ Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Error getting user:", error);
      else if (data?.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  // ✅ Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("store_branches")
        .select(
          `
      *,
      stores ( name )
    `
        )
        .eq("is_closed", false); // ✅ only get open branches

      if (error) {
        console.error("Error fetching branches:", error);
      } else {
        setBranches(data);
      }

      setLoading(false);
    };

    fetchBranches();
  }, []);

  // ✅ Haversine formula (compute distance in KM)
  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ✅ Compute distance between user and all stores
  const calculateDistances = (lat: number, lng: number) => {
    const distances: Record<number, number> = {};
    branches.forEach((b) => {
      if (b.latitude && b.longitude) {
        distances[b.id] = haversineDistance(lat, lng, b.latitude, b.longitude);
      } else {
        distances[b.id] = Infinity;
      }
    });
    setBranchDistances(distances);
  };

  // ✅ Get user's location on first load (before showing stores)
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log("📍 User location:", lat, lng);

        console.log(lat, lng);
        setDeliveryLat(lat);
        setDeliveryLng(lng);
        calculateDistances(lat, lng);
        setGettingLocation(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        alert("⚠️ Could not get your location. Please enable location access.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  }, [branches.length]);

  // ✅ Fetch inventory when a store is opened
  const fetchInventory = async (branchId: number) => {
    setItemsLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("id, item_name, price, stock, store_id, image")
      .eq("store_id", branchId);
    if (error) console.error("Error fetching inventory:", error);
    else setInventoryItems(data);
    setItemsLoading(false);
  };

  // ✅ Select/deselect items
  const toggleSelectItem = (item: InventoryItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) return prev.filter((i) => i.id !== item.id);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // ✅ Update quantity
  const updateQuantity = (id: string, quantity: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  // ✅ Total amount
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // ✅ Submit order
  const handleSubmitOrder = async () => {
    if (!userId) {
      alert("Please log in to place an order.");
      return;
    }
    if (!selectedBranch) return;
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert("Please enter a delivery address.");
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: userId,
            branch_id: selectedBranch.id,
            total_amount: totalAmount,
            delivery_address: deliveryAddress,
            delivery_lat: deliveryLat,
            delivery_lng: deliveryLng,
            contact_number: userContactNumber,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;
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
      console.error("Error submitting order:", err);
      alert("Something went wrong while submitting your order.");
    }
  };

  // ✅ Reset when closing dialog
  const handleCloseOrderDialog = (open: boolean) => {
    if (!open) {
      setSelectedItems([]);
      setDeliveryAddress("");
      setDeliveryLat(null);
      setDeliveryLng(null);
      setSelectedBranch(null);
    }
    setOrderDialogOpen(open);
  };

  // 🕒 While getting location
  if (gettingLocation) {
    return (
      <div className="p-6 text-gray-600 text-center">
        📍 Getting your location... Please wait.
      </div>
    );
  }

  // 🕒 While loading branches
  if (loading) {
    return (
      <div className="p-6 text-gray-600 text-center">Loading branches...</div>
    );
  }

  // ✅ Filter & group stores
  const filteredBranches = branches.filter((b) =>
    b.stores.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nearbyStores = filteredBranches.filter(
    (b) => branchDistances[b.id] && branchDistances[b.id] <= 10
  );

  const otherStores = filteredBranches.filter(
    (b) => !branchDistances[b.id] || branchDistances[b.id] > 10
  );

  // ✅ Main content after location fetched
  return (
    <div className="p-6 font-[Poppins]">
      {/* 🔍 Search Field */}
      <div className="mb-6">
        <Input
          placeholder="Search store name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 🟢 Stores Near You */}
      {nearbyStores.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">🟢 Stores Near You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {nearbyStores.map((branch) => {
              const distance = branchDistances[branch.id];
              const isFar = distance && distance > 10;

              return (
                <Card
                  key={branch.id}
                  className={`shadow-md p-2 transition ${
                    isFar ? "bg-red-50 border border-red-400" : ""
                  }`}
                >
                  <CardContent className="flex flex-col gap-3 p-4 text-gray-700">
                    <h2 className="text-md flex items-center gap-1">
                      <span className="font-bold">{branch?.stores?.name}</span>{" "}
                      ({branch.name})
                    </h2>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs">
                        <span className="">Address:</span> {branch.address}
                      </span>
                      <span className="text-xs">
                        <span className="">Contact:</span>{" "}
                        {branch.contact_number}
                      </span>
                      {distance && isFinite(distance) && (
                        <span
                          className={`text-xs font-semibold ${
                            isFar ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          Distance: {distance.toFixed(2)} km{" "}
                          {isFar && "(⚠️ Over 10km away)"}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => {
                          setSelectedBranch(branch);
                          setSelectedItems([]);
                          setDeliveryAddress("");
                          setOrderDialogOpen(true);
                          fetchInventory(branch.id);
                        }}
                      >
                        <TbShoppingCartPlus /> Order Now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedBranch(branch);
                          setMapOpen(true);
                        }}
                        disabled={!branch.latitude || !branch.longitude}
                      >
                        <IoLocationOutline /> Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* 🔴 Other Stores */}
      {otherStores.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">
            🔴 Other Stores (Delivery currently unavailable in your area)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherStores.map((branch) => {
              const distance = branchDistances[branch.id];
              const isFar = distance && distance > 10;

              return (
                <Card
                  key={branch.id}
                  className={`shadow-md p-2 transition ${
                    isFar ? "bg-red-50 border border-red-400" : ""
                  }`}
                >
                  <CardContent className="flex flex-col gap-3 p-4 text-gray-700">
                    <h2 className="text-md flex items-center gap-1">
                      <span className="font-bold">{branch?.stores?.name}</span>{" "}
                      ({branch.name})
                    </h2>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs">
                        <span className="">Address:</span> {branch.address}
                      </span>
                      <span className="text-xs">
                        <span className="">Contact:</span>{" "}
                        {branch.contact_number}
                      </span>
                      {distance && isFinite(distance) && (
                        <span
                          className={`text-xs font-semibold ${
                            isFar ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          Distance: {distance.toFixed(2)} km{" "}
                          {isFar && "(⚠️ Over 10km away)"}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => {
                          setSelectedBranch(branch);
                          setSelectedItems([]);
                          setDeliveryAddress("");
                          setOrderDialogOpen(true);
                          fetchInventory(branch.id);
                        }}
                      >
                        <TbShoppingCartPlus /> Order Now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedBranch(branch);
                          setMapOpen(true);
                        }}
                        disabled={!branch.latitude || !branch.longitude}
                      >
                        <IoLocationOutline /> Location
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* 🗺️ Map Dialog (with Directions) */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-2xl font-[Poppins]">
          {selectedBranch && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBranch.name} — Location</DialogTitle>
              </DialogHeader>
              {selectedBranch.latitude && selectedBranch.longitude ? (
                <>
                  {/* ✅ Added: show direction from user to store */}
                  {deliveryLat && deliveryLng ? (
                    <iframe
                      src={`https://www.google.com/maps/dir/?api=1&origin=${deliveryLat},${deliveryLng}&destination=${selectedBranch.latitude},${selectedBranch.longitude}&travelmode=driving`}
                      width="100%"
                      height="400"
                      loading="lazy"
                      className="rounded-md border"
                    />
                  ) : (
                    <iframe
                      src={`https://www.google.com/maps?q=${selectedBranch.latitude},${selectedBranch.longitude}&hl=en&z=15&output=embed`}
                      width="100%"
                      height="400"
                      loading="lazy"
                      className="rounded-md border"
                    />
                  )}
                </>
              ) : (
                <div className="text-center text-gray-600 p-6">
                  No location data available.
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setMapOpen(false)} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={orderDialogOpen} onOpenChange={handleCloseOrderDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden font-[Poppins] flex flex-col">
          {selectedBranch && (
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-lg sm:text-xl font-semibold">
                  {selectedBranch.name} — Order Items
                </DialogTitle>
              </DialogHeader>

              {itemsLoading ? (
                <div className="text-center text-gray-600 p-6 flex-1 flex items-center justify-center">
                  Loading items...
                </div>
              ) : (
                <>
                  {/* ✅ Scrollable Content Area */}
                  <div className="overflow-y-auto flex-1 pr-1">
                    {/* ✅ Item Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                      {inventoryItems.map((item) => {
                        const selected = selectedItems.some(
                          (i) => i.id === item.id
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

                    {/* ✅ Selected Items Section */}
                    {selectedItems.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3 text-base sm:text-lg">
                          Selected Items
                        </h3>

                        <div className="overflow-x-auto">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-sm sm:text-base">
                                  Item
                                </TableHead>
                                <TableHead className="text-sm sm:text-base">
                                  Price
                                </TableHead>
                                <TableHead className="text-sm sm:text-base">
                                  Quantity
                                </TableHead>
                                <TableHead className="text-sm sm:text-base">
                                  Subtotal
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-xs sm:text-sm">
                                    {item.item_name}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    ₱{item.price.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={item.stock}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateQuantity(
                                          item.id,
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
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ✅ Fixed Bottom Section */}
                  {selectedItems.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-4 border-t flex-shrink-0 bg-white">
                      <div className="text-right sm:text-left font-semibold text-base sm:text-lg">
                        Total: ₱{totalAmount.toFixed(2)}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Input
                          placeholder="Enter Contact Number"
                          value={userContactNumber}
                          onChange={(e) => setUserContactNumber(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Input
                          placeholder="Enter your delivery address..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Button
                          className="w-full sm:w-auto"
                          onClick={handleSubmitOrder}
                          disabled={selectedItems.length === 0}
                        >
                          Submit Order
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
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

export default Stores;
