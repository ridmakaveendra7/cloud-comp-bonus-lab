import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUserListings } from "../../Services/userapi";
import type { Product } from "../../Services/productapi";

export default function MyListings() {
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      setError("");
      const currentUser = localStorage.getItem("currentUser");
      if (!currentUser) {
        throw new Error("User not logged in");
      }
      const listings = await fetchUserListings(JSON.parse(currentUser).user_id);
      setListings(listings);
      listings.map((product) => {
        console.log(product);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[#3A1078]">My Listings</h1>
      {error && <p className="text-center p-8 text-red-600">{error}</p>}
      {loading ? (
        <p className="text-center p-8 text-gray-600">Loading listings...</p>
      ) : listings.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-gray-600 mb-4">
            You have not listed any items yet
          </p>
          <button
            onClick={() => navigate("/add-product")}
            className="py-2 px-4 bg-[#3A1078] text-white rounded hover:bg-[#2c0a5e] cursor-pointer"
          >
            Add Product
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {listings &&
            listings.map((product) => {
              const imageUrls = (product as any).image_urls || [];
              const hasImages =
                Array.isArray(imageUrls) && imageUrls.length > 0;
              return (
                <div
                  key={product.product_id}
                  className="border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex gap-4">
                      {hasImages ? (
                        <img
                          src={imageUrls[0]}
                          alt={product.name}
                          className="w-20 h-20 rounded object-cover border"
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center bg-gray-100 text-gray-400 rounded border">
                          No Image
                        </div>
                      )}
                      <div className="flex flex-col justify-between flex-1">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex justify-end items-center mt-2">
                          <span className="font-bold text-[#3A1078]">
                            €{product.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => navigate(`/product/${product.product_id}`)}
                      className="w-full py-2 px-4 bg-[#3A1078] text-white rounded hover:bg-[#2c0a5e] cursor-pointer"
                    >
                      View Product Details
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/product/${product.product_id}/edit`)
                      }
                      className="w-full py-2 px-4 bg-[#3A1078] text-white rounded hover:bg-[#2c0a5e] cursor-pointer"
                    >
                      Edit Listing
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
