"use client";

import { useEffect, useState } from "react";
import supabase from "@/backend/config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

const CreateOwnersAccount = () => {
  const [owners, setOwners] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  // --- FETCH BUSINESS OWNERS ---
  const fetchOwners = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "business_owner")
      .eq("is_banned", false) // ✅ Only return NOT banned
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setOwners(data || []);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  // --- HANDLE ADD NEW OWNER ---
  const handleAddOwner = async () => {
    const { full_name, email, password } = formData;
    if (!full_name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create Auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, role: "business_owner" },
        },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("User ID not returned from Auth.");

      // 2️⃣ Small delay for DB trigger (if any)
      await new Promise((r) => setTimeout(r, 400));

      // 3️⃣ Ensure correct role in public.users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", userId)
        .maybeSingle();

      if (!existingUser) {
        await supabase.from("users").insert({
          auth_id: userId,
          full_name,
          email,
          role: "business_owner",
        });
      } else if (existingUser.role !== "business_owner") {
        await supabase
          .from("users")
          .update({ full_name, role: "business_owner" })
          .eq("auth_id", userId);
      }

      alert("✅ Business owner added successfully!");
      setShowDialog(false);
      setFormData({ full_name: "", email: "", password: "" });
      fetchOwners();
    } catch (err: any) {
      if (err.code === "23505") {
        alert("This email is already in use.");
      } else {
        alert("Error: " + err.message);
      }
      console.error("Add owner error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- OPEN EDIT DIALOG ---
  const openEditDialog = (owner: any) => {
    setSelectedOwner(owner);
    setEditFormData({
      full_name: owner.full_name,
      email: owner.email,
    });
    setShowEditDialog(true);
  };

  // --- HANDLE UPDATE OWNER ---
  const handleUpdateOwner = async () => {
    if (!selectedOwner) return;

    const { full_name, email } = editFormData;
    if (!full_name || !email) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("users")
      .update({ full_name, email })
      .eq("id", selectedOwner.id);

    if (error) {
      alert("Update failed!");
      console.error(error);
    } else {
      alert("✅ Owner updated successfully!");
      setShowEditDialog(false);
      fetchOwners();
    }
    setLoading(false);
  };

  // --- HANDLE DELETE OWNER ---
  const handleDeleteOwner = async (owner: any) => {
    if (!confirm(`Remove ${owner.full_name}?`)) return;

    const { error: deleteError } = await supabase
      .from("users")
      .update({ is_banned: true })
      .eq("id", owner.id);

    if (deleteError) {
      alert("Delete failed!");
      return;
    }

    // 2. Get all stores owned by the deleted owner
    const { data: stores, error: storeFetchError } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", owner.auth_id);

    if (storeFetchError) {
      alert("Failed to fetch stores for owner.");
      return;
    }

    // 3. Close all stores
    const { error: storeCloseError } = await supabase
      .from("stores")
      .update({ is_closed: true })
      .eq("owner_id", owner.auth_id);

    if (storeCloseError) {
      alert("Failed to mark stores as closed.");
      return;
    }

    console.log(stores.length);
    // 4. Close all branches for each store
    if (stores.length > 0) {
      const storeIds = stores.map((s: any) => s.id);

      console.log("store ids", storeIds);

      const { error: branchCloseError } = await supabase
        .from("store_branches")
        .update({ is_closed: true })
        .in("store_id", storeIds);

      if (branchCloseError) {
        alert("Failed to close store branches.");
        return;
      }
    }

    alert("Owner removed and all related stores and branches closed.");
    fetchOwners();
  };

  // --- FILTER OWNERS ---
  const filteredOwners = owners.filter(
    (o) =>
      o.full_name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Business Owners</CardTitle>
          <Button onClick={() => setShowDialog(true)}>+ Add Owner</Button>
        </CardHeader>

        <CardContent>
          <div className="flex justify-between mb-4">
            <Input
              placeholder="Search owners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No owners found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOwners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>{owner.full_name}</TableCell>
                    <TableCell>{owner.email}</TableCell>
                    <TableCell>
                      {new Date(owner.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(owner)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteOwner(owner)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- ADD OWNER DIALOG --- */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Business Owner</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="owner@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddOwner} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EDIT OWNER DIALOG --- */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Business Owner</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Full Name</Label>
              <Input
                value={editFormData.full_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    full_name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    email: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateOwner} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateOwnersAccount;
