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
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  // --- FETCH BUSINESS OWNERS ---
  const fetchOwners = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "business_owner")
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch error:", error);
    else setOwners(data || []);
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

    // Create Auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: "business_owner" },
      },
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    // Insert into public.users
    const { error: insertError } = await supabase.from("users").insert({
      auth_id: authData.user?.id,
      full_name,
      email,
      role: "business_owner",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      alert("Failed to save to users table.");
    } else {
      alert("Business owner added successfully!");
      setShowDialog(false);
      setFormData({ full_name: "", email: "", password: "" });
      fetchOwners();
    }
  };

  // --- HANDLE UPDATE OWNER ---
  const handleUpdateOwner = async (owner: any) => {
    const newName = prompt("Enter new full name:", owner.full_name);
    if (!newName || newName === owner.full_name) return;

    const { error } = await supabase
      .from("users")
      .update({ full_name: newName })
      .eq("id", owner.id);

    if (error) alert("Update failed!");
    else {
      alert("Owner updated!");
      fetchOwners();
    }
  };

  // --- HANDLE DELETE OWNER ---
  const handleDeleteOwner = async (owner: any) => {
    if (!confirm(`Remove ${owner.full_name}?`)) return;

    const { error } = await supabase.from("users").delete().eq("id", owner.id);

    if (error) alert("Delete failed!");
    else {
      alert("Owner removed!");
      fetchOwners();
    }
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
                            onClick={() => handleUpdateOwner(owner)}
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOwner}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateOwnersAccount;
