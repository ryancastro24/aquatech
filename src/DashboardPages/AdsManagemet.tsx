"use client";

import { useState, useEffect } from "react";
import supabase from "@/backend/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, PlusCircle, Edit, Trash } from "lucide-react";

type Ad = {
  id: number;
  created_at: string;
  cover_image: string | null;
  promo1: string | null;
  promo2: string | null;
  promo3: string | null;
  store_id: string | null;
  prize: number | null;
  expiry_date: string | null;
  store_branches: { name: string };
};

type Store = {
  id: string;
  name: string;
};

const AdsManagement = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState<any>({
    promo1: "",
    promo2: "",
    promo3: "",
    prize: "",
    expiry_date: "",
    store_id: "",
    cover_image: "",
  });
  const [uploading, setUploading] = useState(false);

  console.log("formData:", formData);
  // Fetch all ads
  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*,store_branches(*)")
      .order("id", { ascending: false });
    if (error) {
      toast.error("Failed to fetch ads");
      return;
    }
    setAds(data || []);
  };

  // Fetch store branches
  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("store_branches")
      .select("id, name");
    if (error) {
      toast.error("Failed to fetch stores");
      return;
    }
    setStores(data || []);
  };

  useEffect(() => {
    fetchAds();
    fetchStores();
  }, []);

  // Upload cover image to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("ads_bucket")
        .upload(`cover_image/${fileName}`, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("ads_bucket")
        .getPublicUrl(`cover_image/${fileName}`);

      setFormData({ ...formData, cover_image: urlData.publicUrl });
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Create or update ad
  const handleSave = async () => {
    if (!formData.store_id || !formData.promo1) {
      toast.error("Please fill all required fields");
      return;
    }

    // Remove store_branches before sending to supabase
    const { store_branches, ...cleanData } = formData;

    console.log("Submitting formData:", cleanData);

    if (editingAd) {
      // Update
      const { error } = await supabase
        .from("ads")
        .update(cleanData)
        .eq("id", editingAd.id);

      if (error) {
        toast.error("Failed to update ad");
        return;
      }
      toast.success("Ad updated successfully!");
    } else {
      // Create
      const { error } = await supabase.from("ads").insert([cleanData]);
      if (error) {
        toast.error("Failed to create ad");
        return;
      }
      toast.success("Ad created successfully!");
    }

    setOpenDialog(false);
    setEditingAd(null);
    setFormData({
      promo1: "",
      promo2: "",
      promo3: "",
      prize: "",
      expiry_date: "",
      store_id: "",
      cover_image: "",
    });

    fetchAds();
  };

  // Delete ad
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete ad");
      return;
    }
    toast.success("Ad deleted");
    fetchAds();
  };

  const openEditDialog = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({ ...ad });
    setOpenDialog(true);
  };

  return (
    <div className="p-5">
      <Card className="shadow-md">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">
            Ads Management
          </CardTitle>
          <Button
            onClick={() => setOpenDialog(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle size={16} /> Add New Ad
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cover</TableHead>
                <TableHead>Store Name</TableHead>
                <TableHead>Promo 1</TableHead>
                <TableHead>Promo 2</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length > 0 ? (
                ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      {ad.cover_image ? (
                        <img
                          src={ad.cover_image}
                          alt="cover"
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        "No Image"
                      )}
                    </TableCell>
                    <TableCell>{ad.store_branches.name}</TableCell>
                    <TableCell>{ad.promo1}</TableCell>
                    <TableCell>{ad.promo2}</TableCell>
                    <TableCell>{ad.prize}</TableCell>
                    <TableCell>{ad.expiry_date}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditDialog(ad)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(ad.id)}
                      >
                        <Trash size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No ads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Ad" : "Add New Ad"}</DialogTitle>
            <DialogDescription>
              Fill out the ad information below.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex flex-col gap-2">
              <Label>Store</Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, store_id: value })
                }
                value={formData.store_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label>Promo 1</Label>
                <Input
                  value={formData.promo1}
                  onChange={(e) =>
                    setFormData({ ...formData, promo1: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Promo 2</Label>
                <Input
                  value={formData.promo2}
                  onChange={(e) =>
                    setFormData({ ...formData, promo2: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label>Prize</Label>
                <Input
                  type="number"
                  value={formData.prize}
                  onChange={(e) =>
                    setFormData({ ...formData, prize: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiry_date || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Cover Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {formData.cover_image && (
                <img
                  src={formData.cover_image}
                  alt="preview"
                  className="w-24 h-24 object-cover rounded-md mt-2"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? "Uploading..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdsManagement;
