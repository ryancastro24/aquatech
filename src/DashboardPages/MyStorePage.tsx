import React, { useEffect, useState } from "react";
import { FiPhone } from "react-icons/fi";
import { AiOutlineHome } from "react-icons/ai";
import supabase from "@/backend/config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

import { FaStoreSlash } from "react-icons/fa";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// ---------- Types ----------
interface Store {
  id: string;
  owner_id?: string;
  name: string;
  address?: string;
  contact_number?: string;
  logo_url?: string;
  latitude?: string;
  longitude?: string;
  created_at?: string;
  is_closed?: boolean; // ✅ added
}

interface Branch {
  id: string;
  store_id?: string;
  name: string;
  address?: string;
  contact_number?: string;
  latitude?: string;
  longitude?: string;
  created_at?: string;
  store_image?: string;
  is_closed?: boolean; // ✅ added
}

interface BranchData {
  name: string;
  address: string;
  contact_number: string;
  latitude: string;
  longitude: string;
  storeImageFile?: File | null;
}

const DEFAULT_LAT = 8.9475;
const DEFAULT_LNG = 125.5406;

const MyStorePage: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [search, setSearch] = useState("");
  const [showAddStore, setShowAddStore] = useState(false);
  const [showBranchesDialog, setShowBranchesDialog] = useState(false);
  const [showAddBranchDialog, setShowAddBranchDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact_number: "",
    logoFile: null as File | null,
    latitude: "",
    longitude: "",
  });

  const [branchData, setBranchData] = useState<BranchData>({
    name: "",
    address: "",
    contact_number: "",
    latitude: "",
    longitude: "",
    storeImageFile: null,
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [branchImagePreview, setBranchImagePreview] = useState<string | null>(
    null
  );
  const [userId, setUserId] = useState<string | null>(null);

  // --- Get logged-in user ---
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("Error getting user:", error?.message);
        alert("You must be logged in to access stores.");
        return;
      }
      setUserId(user.id);
    };
    fetchUser();
  }, []);

  // --- Fetch stores ---
  const fetchStores = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch stores error:", error);
      return;
    }
    setStores(data as Store[]);
  };

  console.log("Stores:", stores);
  useEffect(() => {
    if (userId) fetchStores();
  }, [userId]);

  // --- Upload logo ---
  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const filePath = `stores/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("stores_bucket")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("stores_bucket")
        .getPublicUrl(filePath);

      return (publicUrlData as any)?.publicUrl ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // ✅ --- Upload branch image ---
  const uploadBranchImage = async (file: File): Promise<string | null> => {
    try {
      const filePath = `stores/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("stores_bucket")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Branch image upload error:", uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("stores_bucket")
        .getPublicUrl(filePath);

      return (publicUrlData as any)?.publicUrl ?? null;
    } catch (err) {
      console.error("Branch image upload failed:", err);
      return null;
    }
  };

  // --- Add store ---
  const handleAddStore = async () => {
    const { name, address, contact_number, logoFile, latitude, longitude } =
      formData;
    if (!userId) {
      alert("User not found. Please log in again.");
      return;
    }
    if (!name || !address || !contact_number || !latitude || !longitude) {
      alert("Please fill in all required fields and select a location.");
      return;
    }

    let logo_url: string | null = null;
    if (logoFile) {
      logo_url = await uploadLogo(logoFile);
      if (!logo_url) {
        alert("Failed to upload logo.");
        return;
      }
    }

    const { error } = await supabase
      .from("stores")
      .insert({
        owner_id: userId,
        name,
        address,
        contact_number,
        logo_url,
        is_closed: false, // ✅ default open
      })
      .select()
      .single();

    if (error) {
      console.error("Insert store error:", error);
      alert("Failed to create store.");
      return;
    }

    alert("Store added successfully!");

    setFormData({
      name: "",
      address: "",
      contact_number: "",
      logoFile: null,
      latitude: "",
      longitude: "",
    });
    setPreview(null);
    setShowAddStore(false);
    fetchStores();
  };

  // --- Fetch branches ---
  const fetchBranches = async (storeId: string) => {
    const { data, error } = await supabase
      .from("store_branches")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch branches error:", error);
      return;
    }
    setBranches(data as Branch[]);
  };

  const openBranchesDialog = (store: Store) => {
    if (store.is_closed) return; // 🚫 prevent opening closed store
    setSelectedStore(store);
    setShowBranchesDialog(true);
    fetchBranches(store.id);
  };

  // --- Add branch ---
  const handleAddBranch = async () => {
    const {
      name,
      address,
      contact_number,
      latitude,
      longitude,
      storeImageFile,
    } = branchData;
    if (!selectedStore) {
      alert("No store selected.");
      return;
    }
    if (!name || !address || !contact_number || !latitude || !longitude) {
      alert("Please fill all fields and select location.");
      return;
    }

    let store_image_url: string | null = null;
    if (storeImageFile) {
      store_image_url = await uploadBranchImage(storeImageFile);
      if (!store_image_url) {
        alert("Failed to upload store image.");
        return;
      }
    }

    const { error } = await supabase.from("store_branches").insert({
      store_id: selectedStore.id,
      name,
      address,
      contact_number,
      latitude,
      longitude,
      store_image: store_image_url,
      is_closed: false, // ✅ default open
    });

    if (error) {
      console.error("Insert branch error:", error);
      alert("Failed to create branch.");
      return;
    }

    alert("Branch added successfully!");
    setShowAddBranchDialog(false);
    setBranchData({
      name: "",
      address: "",
      contact_number: "",
      latitude: "",
      longitude: "",
      storeImageFile: null,
    });
    setBranchImagePreview(null);
    fetchBranches(selectedStore.id);
  };

  // --- Get device location ---
  const getDeviceLocation = (setData: any) => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setData((prev: any) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => {
        alert("Failed to get location: " + err.message);
      }
    );
  };

  // ✅ --- Close / Open Store ---
  const toggleStoreStatus = async (store: Store) => {
    const newStatus = !store.is_closed;
    const { error: storeError } = await supabase
      .from("stores")
      .update({ is_closed: newStatus })
      .eq("id", store.id);

    if (storeError) {
      console.error("Error updating store status:", storeError);
      alert("Failed to update store status.");
      return;
    }

    // Update all branches too
    const { error: branchError } = await supabase
      .from("store_branches")
      .update({ is_closed: newStatus })
      .eq("store_id", store.id);

    if (branchError) {
      console.error("Error updating branch status:", branchError);
    }

    alert(
      newStatus
        ? "Store and all branches closed successfully."
        : "Store and branches reopened successfully."
    );

    fetchStores();
  };

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBranchStatus = async (branch: Branch) => {
    const newStatus = !branch.is_closed;

    const { error } = await supabase
      .from("store_branches")
      .update({ is_closed: newStatus })
      .eq("id", branch.id);

    if (error) {
      console.error("Error updating branch status:", error);
      alert("Failed to update branch status.");
      return;
    }

    alert(
      newStatus
        ? "Branch closed successfully."
        : "Branch reopened successfully."
    );

    // Refresh branches for that store
    if (selectedStore) await openBranchesDialog(selectedStore);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Stores</h1>
        <Button onClick={() => setShowAddStore(true)}>+ Add Store</Button>
      </div>

      <Input
        placeholder="Search stores..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm mb-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.length === 0 ? (
          <p className="text-gray-500">No stores found.</p>
        ) : (
          filteredStores.map((store) => (
            <Card key={store.id}>
              <CardContent className="flex items-center gap-5">
                <div className="flex items-center gap-3">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt="Logo"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      No Logo
                    </div>
                  )}
                </div>

                <div className="flex flex-col item-center">
                  <h2 className="text-lg mt-2 font-bold">
                    {store.name}{" "}
                    {store.is_closed && (
                      <span className="text-red-500 text-xs">(Closed)</span>
                    )}
                  </h2>
                  <p className="text-xs flex items-center gap-1">
                    <AiOutlineHome />
                    {store.address}
                  </p>
                  <p className="flex items-center gap-1 text-xs">
                    <FiPhone />
                    {store.contact_number}
                  </p>
                  {store.latitude && store.longitude && (
                    <p>
                      🌍 {store.latitude}, {store.longitude}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 justify-between items-center">
                <Button
                  disabled={store.is_closed}
                  onClick={() => openBranchesDialog(store)}
                >
                  View Branches
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger>
                    <Button
                      size="icon"
                      variant={store.is_closed ? "default" : "destructive"}
                    >
                      <FaStoreSlash />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure to close this store?
                      </AlertDialogTitle>

                      <AlertDialogDescription>
                        Warning: This action will also close all branches under
                        this store.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={`${
                          store.is_closed
                            ? "bg-blue-500 hover:bg-blue-700"
                            : "bg-red-500 hover:bg-red-700"
                        } cursor-pointer`}
                        onClick={() => toggleStoreStatus(store)}
                      >
                        {" "}
                        {store.is_closed ? "Reopen" : "Close"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Add store dialog */}
      <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Store</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* LEFT SIDE FORM */}
            <div className="space-y-3">
              <Label>Store Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
              <Label>Contact Number</Label>
              <Input
                value={formData.contact_number}
                onChange={(e) =>
                  setFormData({ ...formData, contact_number: e.target.value })
                }
              />
              <Label>Logo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setFormData({ ...formData, logoFile: file });
                  setPreview(file ? URL.createObjectURL(file) : null);
                }}
              />
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-24 h-24 rounded-md object-cover border"
                />
              )}

              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => getDeviceLocation(setFormData)}
                >
                  Use Device Location
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Latitude"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                />
                <Input
                  placeholder="Longitude"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                />
              </div>
            </div>

            {/* RIGHT SIDE MAP PICKER */}
            <div>
              <LeafletMapPicker
                branchData={formData}
                setBranchData={setFormData}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStore(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStore}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branches dialog */}
      <Dialog open={showBranchesDialog} onOpenChange={setShowBranchesDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Branches for {selectedStore?.name || "Store"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowAddBranchDialog(true)}>
              + Add Branch
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.length === 0 ? (
              <p className="text-gray-500">No branches found.</p>
            ) : (
              branches.map((b) => (
                <Card key={b.id}>
                  <CardHeader>
                    <CardTitle>{b.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {b.store_image && (
                      <img
                        src={b.store_image}
                        alt="Branch"
                        className="w-full h-40 object-cover rounded-md mb-2"
                      />
                    )}
                    <p>{b.address}</p>
                    <p>📞 {b.contact_number}</p>
                    <p>
                      🌍 {b.latitude}, {b.longitude}
                    </p>
                  </CardContent>

                  <CardFooter className="flex justify-between">
                    <Button
                      disabled={b.is_closed}
                      onClick={() =>
                        navigate(`/dashboard/storebranches/${b.id}`)
                      }
                    >
                      Manage Branch
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button
                          size="icon"
                          variant={b.is_closed ? "default" : "destructive"}
                        >
                          <FaStoreSlash />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you sure to close this branch?
                          </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className={`${
                              b.is_closed
                                ? "bg-blue-500 hover:bg-blue-700"
                                : "bg-red-500 hover:bg-red-700"
                            } cursor-pointer`}
                            onClick={() => toggleBranchStatus(b)}
                          >
                            {" "}
                            {b.is_closed ? "Reopen" : "Close"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add branch dialog */}
      <Dialog open={showAddBranchDialog} onOpenChange={setShowAddBranchDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* LEFT SIDE FORM */}
            <div className="space-y-3">
              <Label>Branch Name</Label>
              <Input
                value={branchData.name}
                onChange={(e) =>
                  setBranchData({ ...branchData, name: e.target.value })
                }
              />

              <Label>Address</Label>
              <Input
                value={branchData.address}
                onChange={(e) =>
                  setBranchData({ ...branchData, address: e.target.value })
                }
              />

              <Label>Contact Number</Label>
              <Input
                value={branchData.contact_number}
                onChange={(e) =>
                  setBranchData({
                    ...branchData,
                    contact_number: e.target.value,
                  })
                }
              />

              <Label>Branch Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setBranchData({ ...branchData, storeImageFile: file });
                  setBranchImagePreview(
                    file ? URL.createObjectURL(file) : null
                  );
                }}
              />
              {branchImagePreview && (
                <img
                  src={branchImagePreview}
                  alt="Branch Preview"
                  className="w-32 h-32 object-cover rounded-md border"
                />
              )}

              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => getDeviceLocation(setBranchData)}
                >
                  Use Device Location
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Latitude"
                  value={branchData.latitude}
                  onChange={(e) =>
                    setBranchData({ ...branchData, latitude: e.target.value })
                  }
                />
                <Input
                  placeholder="Longitude"
                  value={branchData.longitude}
                  onChange={(e) =>
                    setBranchData({ ...branchData, longitude: e.target.value })
                  }
                />
              </div>
            </div>

            {/* RIGHT SIDE MAP PICKER */}
            <div>
              <LeafletMapPicker
                branchData={branchData}
                setBranchData={setBranchData}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddBranchDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBranch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* -----------------------------
   LeafletMapPicker component
   ----------------------------- */
interface LocationData {
  latitude: string;
  longitude: string;
}

interface LeafletMapPickerProps<T extends LocationData> {
  branchData: T;
  setBranchData: React.Dispatch<React.SetStateAction<T>>;
}

const LeafletMapPicker = <T extends LocationData>({
  branchData,
  setBranchData,
}: LeafletMapPickerProps<T>) => {
  const lat = branchData.latitude
    ? parseFloat(branchData.latitude)
    : DEFAULT_LAT;
  const lng = branchData.longitude
    ? parseFloat(branchData.longitude)
    : DEFAULT_LNG;

  const ClickHandler: React.FC = () => {
    useMapEvents({
      click(e: any) {
        const { lat: newLat, lng: newLng } = e.latlng;
        setBranchData((prev) => ({
          ...prev,
          latitude: newLat.toFixed(6),
          longitude: newLng.toFixed(6),
        }));
      },
    });
    return null;
  };

  const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
      map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
  };

  return (
    <div className="mt-2">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: "320px", width: "100%", borderRadius: 8 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        <Recenter lat={lat} lng={lng} />
        {branchData.latitude && branchData.longitude && (
          <Marker position={[lat, lng]} />
        )}
      </MapContainer>
      <p className="text-xs text-gray-500 mt-1">
        Click the map to select location (lat/lng will fill automatically).
      </p>
    </div>
  );
};

export default MyStorePage;
