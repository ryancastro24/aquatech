import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Dummy purchase history data
const purchases = [
  {
    id: 1,
    store: "Aquatech Main Branch",
    item: "Water Purifier",
    date: "2025-09-21",
    price: "₱5,000",
  },
  {
    id: 2,
    store: "Aquatech Uptown",
    item: "UV Sterilizer",
    date: "2025-09-18",
    price: "₱3,200",
  },
  {
    id: 3,
    store: "Aquatech Downtown",
    item: "Mineral Water (Gallon)",
    date: "2025-09-15",
    price: "₱150",
  },
];

// Dummy recommendations
const recommendations = [
  "Spare Filter Cartridge",
  "Alkaline Machine",
  "Industrial Filter",
  "Purified Bottled Water",
];

const Purchases = () => {
  const [selected, setSelected] = useState<number[]>([]);
  const [repurchaseItem, setRepurchaseItem] = useState<any | null>(null);

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    console.log("Delete purchases with ids:", selected);
    setSelected([]);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">My Purchases</h1>

      {/* Purchases Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => {
            const isChecked = selected.includes(purchase.id);
            return (
              <TableRow
                key={purchase.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSelect(purchase.id)}
              >
                <TableCell
                  onClick={(e) => e.stopPropagation()} // Prevent row click from double toggling
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleSelect(purchase.id)}
                  />
                </TableCell>
                <TableCell>{purchase.store}</TableCell>
                <TableCell>{purchase.item}</TableCell>
                <TableCell>{purchase.date}</TableCell>
                <TableCell>{purchase.price}</TableCell>
                <TableCell
                  onClick={(e) => e.stopPropagation()} // Prevent triggering row selection
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRepurchaseItem(purchase)}
                  >
                    Purchase Again
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Delete Button */}
      {selected.length > 0 && (
        <div className="mt-4">
          <Button variant="destructive" onClick={deleteSelected}>
            Delete Selected
          </Button>
        </div>
      )}

      {/* Repurchase Dialog */}
      <Dialog
        open={!!repurchaseItem}
        onOpenChange={() => setRepurchaseItem(null)}
      >
        <DialogContent className="max-w-lg">
          {repurchaseItem && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Repurchase Item from {repurchaseItem.store}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 mt-2">
                <p>
                  <span className="font-medium">Item:</span>{" "}
                  {repurchaseItem.item}
                </p>
                <p>
                  <span className="font-medium">Price:</span>{" "}
                  {repurchaseItem.price}
                </p>
              </div>

              {/* Recommendations */}
              <div className="mt-4">
                <h2 className="font-medium mb-2">You might also like</h2>
                <div className="grid grid-cols-2 gap-3">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="border rounded p-3 text-sm text-center bg-gray-50"
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={() =>
                    console.log(`Repurchased ${repurchaseItem.item}`)
                  }
                >
                  Confirm Purchase
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
