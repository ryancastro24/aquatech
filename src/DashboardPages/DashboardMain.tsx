import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import supabase from "@/backend/config";
import { useNavigate } from "react-router-dom";

const DashboardMain = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [topStores, setTopStores] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]); // 🆕 for all items
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [ads, setAds] = useState<any[]>([]);
  console.log("Top Stores:", topStores);
  console.log("Top Items:", topItems);

  // 🪧 Fetch ads for dynamic slideshow
  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select(
        "id, cover_image, promo1, promo2, promo3, prize, expiry_date, store_id, store_branches(name)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ads:", error);
      return;
    }

    // Format ads data to match your slide display
    const formatted = data.map((ad: any) => ({
      id: ad.id,
      title: ad.promo1 || "Promotion",
      subtitle: ad.promo2 || "",
      image:
        ad.cover_image || "https://via.placeholder.com/1200x600?text=No+Image",
      buttonText: ad.promo3 || "Shop Now",
      prize: ad.prize,
      expiry_date: ad.expiry_date,
      store_name: ad.store_branches?.name || "AgriHub Store",
      store_id: ad.store_id,
    }));

    setAds(formatted);
  };

  // 🕒 Auto slide
  useEffect(() => {
    if (paused || ads.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [ads.length, paused]);

  const prevSlide = () =>
    setCurrentSlide((prev) => (prev === 0 ? ads.length - 1 : prev - 1));
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % ads.length);

  // 📱 Swipe gesture
  const handleTouchStart = (e: React.TouchEvent) =>
    (touchStartX.current = e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) =>
    (touchEndX.current = e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 🧠 Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: storeData, error: storeError } = await supabase
        .from("sales")
        .select(
          `
      id,
      store_id,
      store_branches!inner (
        id,
        name,
        store_image,
        address,
        is_closed
      )
    `
        )
        .eq("store_branches.is_closed", false); // filter open branches only

      console.log(storeData);
      if (storeError) {
        console.error("Error fetching stores:", storeError);
      } else {
        const storeCountMap = new Map();

        storeData?.forEach((sale: any) => {
          const branch = sale.store_branches;

          // skip closed branches (double safety)
          if (branch?.is_closed) return;

          const id = branch?.id || sale.store_id;
          const name = branch?.name || "Unknown Store";
          const store_image = branch?.store_image || "";
          const address = branch?.address || "";

          if (!storeCountMap.has(id)) {
            storeCountMap.set(id, { id, name, count: 1, store_image, address });
          } else {
            storeCountMap.get(id).count += 1;
          }
        });

        const topStoresList = Array.from(storeCountMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setTopStores(topStoresList);
      }

      // 🛒 Fetch top 3 best-selling items
      const { data: orderData, error: orderError } = await supabase
        .from("order_items")
        .select(
          `
        id,
        quantity,
        inventory (
          id,
          item_name,
          price,
          image
        ),
        orders(branch_id)
      `
        )
        .order("quantity", { ascending: false })
        .limit(3);

      setTopItems(orderData || []);

      // 📦 Fetch all items from inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, item_name, price, description, store_id, image");

      if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError);
      } else {
        setAllItems(inventoryData || []);
      }

      if (storeError || orderError) {
        console.error("Error fetching data:", storeError || orderError);
      }

      setLoading(false);
    };

    fetchData();
    fetchAds(); // 🆕 fetch dynamic ads for slideshow
  }, []);

  const filteredProducts = topItems.filter((item) =>
    item.inventory?.item_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAllItems = allItems.filter((item) =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8 space-y-10">
      {/* 🧭 Hero Slider */}
      <div
        className="relative group w-full h-56 sm:h-64 md:h-80 rounded overflow-hidden shadow-lg"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {ads.length > 0 ? (
            ads.map((ad) => (
              <div
                key={ad.id}
                className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] flex-shrink-0 overflow-hidden"
              >
                {/* Background Image */}
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable="false"
                />

                {/* Overlay */}
                <div className="absolute bg-blue-500 right-0 rounded-bl-lg  flex flex-col items-center justify-center text-white text-center p-4 sm:p-6 z-30">
                  <h1 className="text-xl  md:text-2xl font-bold mb-2 leading-tight">
                    {ad.store_name || "Default Promo Title"}
                  </h1>
                  <p className="text-xs sm:text-xs md:text-sm text-gray-200 max-w-sm sm:max-w-xl">
                    {ad.title || "Default Promo Description"}
                  </p>
                  <Button
                    onClick={() => navigate(`/dashboard/store/${ad.store_id}`)}
                    className="mt-3 sm:mt-4 bg-blue-600 cursor-pointer hover:bg-blue-700 text-white text-xs sm:text-sm md:text-base px-4 py-2"
                  >
                    Avail Promo
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No ads available
            </div>
          )}
        </div>

        {/* Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition duration-300 hidden sm:flex"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition duration-300 hidden sm:flex"
        >
          <ChevronRight size={24} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "bg-blue-500 scale-110"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            ></button>
          ))}
        </div>
      </div>

      {/* 🏪 Featured Stores */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-800 text-center md:text-left">
            Featured Stores
          </h2>

          <Button
            onClick={() => navigate("/dashboard/stores")}
            className="bg-blue-500"
          >
            View all stores
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading stores...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
            {topStores.map((store) => (
              <Card
                key={store.id}
                className="hover:shadow-xl  transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/dashboard/store/${store.id}`)}
              >
                <CardHeader className="flex flex-col items-center text-center">
                  <div>
                    <img
                      src={store.store_image}
                      alt={store.name}
                      className="w-full h-full object-cover"
                      draggable="false"
                    />
                  </div>

                  <CardTitle className="text-sm sm:text-lg text-left font-semibold">
                    {store.name}
                  </CardTitle>

                  <CardDescription className="text-left text-xs">
                    {store.address}{" "}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 🔍 Popular Items */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 text-center sm:text-left">
            Popular Items
          </h2>
          <div className="flex justify-center sm:justify-end">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading items...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-20 sm:h-40 md:h-48 overflow-hidden">
                  <img
                    src={product.inventory?.image}
                    alt="water image"
                    className="w-full h-full object-contain"
                  />
                </div>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <h3 className="text-xs sm:text-base font-semibold text-gray-800 line-clamp-1">
                    {product.inventory?.item_name}
                  </h3>
                  <p className="text-blue-700 font-bold text-xs sm:text-base">
                    ₱{product.inventory?.price.toLocaleString()}
                  </p>
                  <Button
                    onClick={() =>
                      navigate(`/dashboard/store/${product.orders.branch_id}`)
                    }
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                  >
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 🆕 All Items Section */}
      <section>
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-800 text-center sm:text-left">
          All Items
        </h2>
        {loading ? (
          <p className="text-center text-gray-500">Loading items...</p>
        ) : filteredAllItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6">
            {filteredAllItems.map((item) => (
              <Card
                key={item.id}
                className="group overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="relative h-20  sm:h-40 md:h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt="water image"
                    className="w-full h-full object-contain"
                  />
                </div>
                <CardContent className="p-2 sm:p-4 space-y-2">
                  <h3 className="text-xs sm:text-base font-semibold text-gray-800 line-clamp-1">
                    {item.item_name}
                  </h3>
                  <p className="text-gray-500 text-xs line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-blue-700 font-bold text-xs sm:text-base">
                    ₱{item.price?.toLocaleString()}
                  </p>
                  <Button
                    onClick={() =>
                      navigate(`/dashboard/store/${item.store_id}`)
                    }
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No items found.</p>
        )}
      </section>
    </div>
  );
};

export default DashboardMain;
