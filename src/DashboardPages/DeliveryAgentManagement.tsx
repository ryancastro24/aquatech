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
import supabase from "@/backend/config";

interface InventoryItem {
  id: string;
  store_id: string;
  item_name: string;
  price: number;
  stock: number;
  description: string;
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
  full_name: string;
  email: string;
  created_at: string;
}

const StoreBranch = () => {
  const { branchId } = useParams<{ branchId: string }>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [, setInventory] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  // const [, setAddDialogOpen] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  // const [newItem, setNewItem] = useState({
  //   item_name: "",
  //   price: "",
  //   stock: "",
  //   description: "",
  // });

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
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "delivery")
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch agents error:", error);
    else setAgents(data as DeliveryAgent[]);
  };

  // Fetch data on load
  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  useEffect(() => {
    if (inventoryDialogOpen) fetchInventory();
  }, [inventoryDialogOpen]);

  useEffect(() => {
    if (deliveryDialogOpen) fetchAgents();
  }, [deliveryDialogOpen]);

  // ✅ Add new inventory item
  // const addItem = async () => {
  //   if (
  //     !newItem.item_name ||
  //     !newItem.price ||
  //     !newItem.stock ||
  //     !newItem.description
  //   ) {
  //     alert("All fields are required!");
  //     return;
  //   }

  //   const { data, error } = await supabase
  //     .from("inventory")
  //     .insert([
  //       {
  //         store_id: branchId,
  //         item_name: newItem.item_name,
  //         price: Number(newItem.price),
  //         stock: Number(newItem.stock),
  //         description: newItem.description,
  //       },
  //     ])
  //     .select()
  //     .single();

  //   if (error) {
  //     console.error("Add item error:", error);
  //     alert("Failed to add item!");
  //     return;
  //   }

  //   setInventory((prev) => [...prev, data as InventoryItem]);
  //   setNewItem({ item_name: "", price: "", stock: "", description: "" });
  //   setAddDialogOpen(false);
  // };

  // ✅ Save edited item
  const saveItem = async (updatedItem: InventoryItem) => {
    const { error } = await supabase
      .from("inventory")
      .update({
        item_name: updatedItem.item_name,
        price: updatedItem.price,
        stock: updatedItem.stock,
        description: updatedItem.description,
      })
      .eq("id", updatedItem.id);

    if (error) {
      console.error("Update error:", error);
      alert("Failed to update item!");
      return;
    }

    setInventory((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    setEditingItem(null);
  };

  // // ✅ Delete item
  // const deleteItem = async (id: string) => {
  //   const { error } = await supabase.from("inventory").delete().eq("id", id);
  //   if (error) {
  //     console.error("Delete error:", error);
  //     alert("Failed to delete item!");
  //     return;
  //   }
  //   setInventory((prev) => prev.filter((i) => i.id !== id));
  // };

  // ✅ Add delivery agent
  const handleAddAgent = async () => {
    const { full_name, email, password, role } = agentForm;
    if (!full_name || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: "delivery" },
      },
    });
    if (authError) {
      alert(authError.message);
      return;
    }

    // Insert into public.users
    const { data: insertedUser, error: insertError } = await supabase
      .from("users")
      .insert({
        auth_id: authData.user?.id,
        full_name,
        email,
        role: "delivery",
      })
      .select()
      .single();

    if (insertError) {
      alert("Failed to save user in public.users");
      console.error(insertError);
      return;
    }

    // Also insert into delivery_team
    const { error: teamError } = await supabase.from("delivery_team").insert({
      store_id: branchId, // or store_id if available from context
      user_id: insertedUser.id,
      role,
    });

    if (teamError) {
      console.error("Delivery team insert error:", teamError);
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
            {/* ... existing Inventory Dialog content ... */}
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
                            a.full_name
                              ?.toLowerCase()
                              .includes(search.toLowerCase()) ||
                            a.email
                              ?.toLowerCase()
                              .includes(search.toLowerCase())
                        )
                        .map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell>{agent.full_name}</TableCell>
                            <TableCell>{agent.email}</TableCell>
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
