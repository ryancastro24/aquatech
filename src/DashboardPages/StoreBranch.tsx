import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import supabase from "@/backend/config";

interface InventoryItem {
  id: string;
  store_id: string;
  item_name: string;
  price: number;
  stock: number;
  description: string;
  image?: string; // ✅ Added image field
}

interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  price: number;
  inventory?: { item_name: string };
}

interface Order {
  id: string;
  customer_id: string;
  store_id: string;
  branch_id: string;
  total_amount: number;
  status: string;
  delivery_address: string;
  created_at: string;
  users?: { email: string };
  order_items?: OrderItem[];
}

interface DeliveryAgent {
  id: string;
  users: {
    full_name: string;
    email: string;
  };
  created_at: string;
}

const StoreBranch = () => {
  const { branchId } = useParams<{ branchId: string }>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [newItem, setNewItem] = useState({
    item_name: "",
    price: "",
    stock: "",
    description: "",
  });
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [editItemImage, setEditItemImage] = useState<File | null>(null);

  // Delivery management states
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [search, setSearch] = useState("");
  const [showAddAgentDialog, setShowAddAgentDialog] = useState(false);
  const [agentForm, setAgentForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "driver",
  });

  // ✅ Upload helper
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `item_images/${fileName}`;

    const { error } = await supabase.storage
      .from("item_bucket")
      .upload(filePath, file);

    if (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed!");
      return null;
    }

    const { data } = supabase.storage
      .from("item_bucket")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ✅ Fetch orders
  const fetchOrders = async () => {
    if (!branchId) return;
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
        users:customer_id (email),
        order_items:order_items (
          id,
          item_id,
          quantity,
          price,
          inventory:item_id (item_name)
        )
      `
      )
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching orders:", error);
    else setOrders(data as Order[] | []);
    setLoadingOrders(false);
  };

  // ✅ Fetch inventory
  const fetchInventory = async () => {
    if (!branchId) return;
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("store_id", branchId)
      .order("id", { ascending: true });

    if (error) console.error("Fetch inventory error:", error);
    else setInventory(data as InventoryItem[]);
  };

  // ✅ Fetch delivery agents
  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_team")
        .select(
          `
        *,
        users (
          full_name,
          email,
          created_at
        )
      `
        )
        .eq("store_id", branchId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAgents(data as DeliveryAgent[]);

      console.log(data);
    } catch (error) {
      console.error("Fetch agents error:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  useEffect(() => {
    if (inventoryDialogOpen) fetchInventory();
  }, [inventoryDialogOpen]);

  useEffect(() => {
    if (deliveryDialogOpen) fetchAgents();
  }, [deliveryDialogOpen]);

  // ✅ Add new item
  const addItem = async () => {
    if (!newItem.item_name || !newItem.price || !newItem.stock) {
      alert("All fields are required!");
      return;
    }

    let imageUrl = null;
    if (newItemImage) imageUrl = await uploadImage(newItemImage);

    const { data, error } = await supabase
      .from("inventory")
      .insert([
        {
          store_id: branchId,
          item_name: newItem.item_name,
          price: Number(newItem.price),
          stock: Number(newItem.stock),
          description: newItem.description,
          image: imageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Add item error:", error);
      alert("Failed to add item!");
      return;
    }

    setInventory((prev) => [...prev, data as InventoryItem]);
    setNewItem({ item_name: "", price: "", stock: "", description: "" });
    setNewItemImage(null);
    setAddDialogOpen(false);
  };

  // ✅ Save edit
  const saveItem = async (updatedItem: InventoryItem) => {
    let imageUrl = updatedItem.image;
    if (editItemImage) {
      const uploadedUrl = await uploadImage(editItemImage);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("inventory")
      .update({
        item_name: updatedItem.item_name,
        price: updatedItem.price,
        stock: updatedItem.stock,
        description: updatedItem.description,
        image: imageUrl,
      })
      .eq("id", updatedItem.id);

    if (error) {
      console.error("Update error:", error);
      alert("Failed to update item!");
      return;
    }

    setInventory((prev) =>
      prev.map((i) =>
        i.id === updatedItem.id ? { ...updatedItem, image: imageUrl } : i
      )
    );
    setEditingItem(null);
    setEditItemImage(null);
  };

  // ✅ Delete
  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      alert("Failed to delete item!");
      return;
    }
    setInventory((prev) => prev.filter((i) => i.id !== id));
  };

  // ✅ Add agent
  const handleAddAgent = async () => {
    const { full_name, email, password, role } = agentForm;
    if (!full_name || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    // Step 1️⃣ - Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role: "delivery" } },
    });

    if (authError) {
      console.error(authError);
      alert(authError.message);
      return;
    }

    const authId = authData.user?.id;

    // Step 2️⃣ - Upsert user into public.users (ensures role is correct)
    const { data: upsertedUser, error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          auth_id: authId,
          full_name,
          email,
          role: "delivery", // ✅ force correct role
        },
        { onConflict: "auth_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error(upsertError);
      alert("Failed to save user in public.users");
      return;
    }

    // Step 3️⃣ - Add to delivery_team table
    const { error: teamError } = await supabase.from("delivery_team").insert({
      store_id: branchId,
      user_id: upsertedUser.auth_id,
      role,
    });

    if (teamError) {
      console.error(teamError);
      alert("Failed to create delivery team entry.");
    } else {
      alert("Delivery agent added successfully!");
      setShowAddAgentDialog(false);
      setAgentForm({ full_name: "", email: "", password: "", role: "driver" });
      fetchAgents();
    }
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Customer Orders</h1>

        <div className="flex gap-2">
          {/* Inventory Button */}
          <Dialog
            open={inventoryDialogOpen}
            onOpenChange={setInventoryDialogOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={fetchInventory}>Inventory</Button>
            </DialogTrigger>

            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>Branch Inventory</DialogTitle>
              </DialogHeader>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Items List</h2>
                <Button onClick={() => setAddDialogOpen(true)}>
                  + Add Item
                </Button>
              </div>

              <div className="overflow-x-auto rounded border">
                {inventory.length === 0 ? (
                  <div className="p-4 text-gray-600 text-center">
                    No items found for this branch.
                  </div>
                ) : (
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.item_name}
                                className="h-12 w-12 object-cover rounded"
                              />
                            ) : (
                              "No image"
                            )}
                          </TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>₱{item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.stock}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.description}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditingItem(item)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteItem(item.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ✅ Add Item Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div>
                  <Label>Item Name</Label>
                  <Input
                    value={newItem.item_name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, item_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={newItem.stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, stock: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Upload Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNewItemImage(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={addItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Manage Delivery Button */}
          <Dialog
            open={deliveryDialogOpen}
            onOpenChange={setDeliveryDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>Manage Delivery</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Manage Delivery Agents</DialogTitle>
              </DialogHeader>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Delivery Agents</CardTitle>
                  <Button onClick={() => setShowAddAgentDialog(true)}>
                    + Add Delivery Agent
                  </Button>
                </CardHeader>

                <CardContent>
                  <Input
                    placeholder="Search agents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm mb-3"
                  />

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents
                        .filter(
                          (a) =>
                            a.users?.full_name
                              ?.toLowerCase()
                              .includes(search.toLowerCase()) ||
                            a.users?.email
                              ?.toLowerCase()
                              .includes(search.toLowerCase())
                        )
                        .map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell>{agent.users?.full_name}</TableCell>
                            <TableCell>{agent.users?.email}</TableCell>
                            <TableCell>
                              {new Date(agent.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Add Delivery Agent Dialog */}
              <Dialog
                open={showAddAgentDialog}
                onOpenChange={setShowAddAgentDialog}
              >
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add Delivery Agent</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={agentForm.full_name}
                        onChange={(e) =>
                          setAgentForm({
                            ...agentForm,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={agentForm.email}
                        onChange={(e) =>
                          setAgentForm({ ...agentForm, email: e.target.value })
                        }
                        placeholder="agent@example.com"
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={agentForm.password}
                        onChange={(e) =>
                          setAgentForm({
                            ...agentForm,
                            password: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <select
                        className="w-full border rounded p-2"
                        value={agentForm.role}
                        onChange={(e) =>
                          setAgentForm({ ...agentForm, role: e.target.value })
                        }
                      >
                        <option value="driver">Driver</option>
                        <option value="dispatcher">Dispatcher</option>
                      </select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddAgentDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddAgent}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Existing Orders Table */}
      {/* ... Keep your existing orders table and edit dialogs here ... */}

      {/* Orders Table */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.users?.email || "Unknown"}</TableCell>
                  <TableCell>
                    {order.order_items
                      ?.map(
                        (oi) => `${oi.inventory?.item_name} (x${oi.quantity})`
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-md">
          {editingItem && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={editingItem.item_name}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item_name: e.target.value,
                    })
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
                <Textarea
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      description: e.target.value,
                    })
                  }
                />
                <div>
                  <Label>Replace Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditItemImage(e.target.files?.[0] || null)
                    }
                  />
                  {editingItem.image && (
                    <img
                      src={editingItem.image}
                      alt="Preview"
                      className="h-16 w-16 object-cover mt-2 rounded"
                    />
                  )}
                </div>
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

export default StoreBranch;
