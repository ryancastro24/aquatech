import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

// Dummy inventory data
const initialInventory = [
  {
    id: 1,
    name: "Water Purifier",
    price: 5000,
    stock: 10,
  },
  {
    id: 2,
    name: "UV Sterilizer",
    price: 3200,
    stock: 3, // Low stock example
  },
  {
    id: 3,
    name: "Mineral Water (Gallon)",
    price: 150,
    stock: 50,
  },
];

const Inventory = () => {
  const [inventory, setInventory] = useState(initialInventory);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [newItem, setNewItem] = useState({ name: "", price: "", stock: "" });
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Handle update item
  const saveItem = (updatedItem: any) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setEditingItem(null);
  };

  // Handle delete
  const deleteItem = (id: number) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  // Handle add
  const addItem = () => {
    if (!newItem.name || !newItem.price || !newItem.stock) return;
    const newEntry = {
      id: Date.now(),
      name: newItem.name,
      price: Number(newItem.price),
      stock: Number(newItem.stock),
    };
    setInventory((prev) => [...prev, newEntry]);
    setNewItem({ name: "", price: "", stock: "" });
    setAddDialogOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Inventory Management</h1>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Stock"
                value={newItem.stock}
                onChange={(e) =>
                  setNewItem({ ...newItem, stock: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button onClick={addItem}>Add Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto rounded border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Item</TableHead>
              <TableHead className="w-1/6">Price</TableHead>
              <TableHead className="w-1/6">Stock</TableHead>
              <TableHead className="w-1/4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow
                key={item.id}
                className={item.stock <= 5 ? "bg-red-50" : ""}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell>₱{item.price.toLocaleString()}</TableCell>
                <TableCell>
                  {item.stock}{" "}
                  {item.stock <= 5 && (
                    <span className="text-red-500 text-xs">(Low Stock)</span>
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-md">
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                />
                <Input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price: Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  value={editingItem.stock}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      stock: Number(e.target.value),
                    })
                  }
                />
              </div>
              <DialogFooter>
                <Button onClick={() => saveItem(editingItem)}>
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
