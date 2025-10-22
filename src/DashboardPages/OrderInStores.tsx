import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const store = {
  id: 1,
  name: "Aquatech Main Branch",
  address: "123 Waterway St, Butuan City",
  contact: "+63 912 345 6789",
  logo: "https://via.placeholder.com/100x100.png?text=Store",
};

const items = [
  {
    id: 1,
    name: "5 Gallon Refill",
    price: 50,
    stock: 100,
    image: "https://via.placeholder.com/80x80.png?text=5G",
  },
  {
    id: 2,
    name: "Mineral Water Bottle (1L)",
    price: 25,
    stock: 50,
    image: "https://via.placeholder.com/80x80.png?text=1L",
  },
  {
    id: 3,
    name: "Purified Water Bottle (500ml)",
    price: 15,
    stock: 200,
    image: "https://via.placeholder.com/80x80.png?text=500ml",
  },
];

const promo = {
  code: "DISCOUNT10",
  discountPercent: 10,
};

const OrderInStores = () => {
  const [open, setOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<{ id: number; qty: number }[]>(
    []
  );
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const handleQuantityChange = (itemId: number, qty: number) => {
    setOrderItems((prev) => {
      const exists = prev.find((i) => i.id === itemId);
      if (exists) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, qty: Math.max(0, qty) } : i
        );
      }
      return [...prev, { id: itemId, qty }];
    });
  };

  const getTotal = () => {
    const subtotal = orderItems.reduce((sum, oi) => {
      const item = items.find((it) => it.id === oi.id);
      return sum + (item ? item.price * oi.qty : 0);
    }, 0);

    const discount = promo ? (subtotal * promo.discountPercent) / 100 : 0;
    return { subtotal, discount, total: subtotal - discount };
  };

  const totals = getTotal();

  // Detect current location
  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      });
    }
  };

  return (
    <div className="p-6">
      {/* Store Header */}
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div className="flex items-center gap-4">
          <img
            src={store.logo}
            alt={`${store.name} logo`}
            className="w-16 h-16 rounded"
          />
          <div>
            <h2 className="text-xl font-semibold">{store.name}</h2>
            <p className="text-sm text-gray-600">{store.address}</p>
            <p className="text-sm text-gray-600">{store.contact}</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>Add Order</Button>
      </div>

      {/* Store Items List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id} className="shadow-md">
            <CardContent className="p-4 flex flex-col gap-2">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover mx-auto"
              />
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-600">₱{item.price}</p>
              <p className="text-xs text-gray-500">
                Stocks Available: {item.stock}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Place Your Order</DialogTitle>
          </DialogHeader>

          {/* Items Selection */}
          <div className="space-y-4">
            {items.map((item) => {
              const selected = orderItems.find((oi) => oi.id === item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border p-2 rounded"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">₱{item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-${item.id}`} className="text-xs">
                      Qty
                    </Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      className="w-16"
                      min={0}
                      max={item.stock}
                      value={selected?.qty || ""}
                      onChange={(e) =>
                        handleQuantityChange(item.id, parseInt(e.target.value))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-4 p-3 border rounded bg-gray-50">
            <p className="text-sm">
              Subtotal: <span className="font-medium">₱{totals.subtotal}</span>
            </p>
            {promo && (
              <p className="text-sm text-green-600">
                Promo ({promo.code}): -₱{totals.discount}
              </p>
            )}
            <p className="text-lg font-bold">
              Total: ₱{totals.total.toFixed(2)}
            </p>
          </div>

          {/* Delivery Address + Map */}
          <div className="mt-4 space-y-2">
            <Label>Delivery Address</Label>
            <Input
              placeholder="Enter your delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={detectLocation}>
                Use My Current Location
              </Button>
            </div>

            {location && (
              <iframe
                title="map"
                className="w-full h-60 rounded mt-2"
                src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
              ></iframe>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                console.log("Final Order:", {
                  orderItems,
                  totals,
                  address,
                  location,
                });
                setOpen(false);
              }}
            >
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderInStores;
