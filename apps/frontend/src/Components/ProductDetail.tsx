import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Heart, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Product {
  product_id: number;
  name: string;
  description: string;
  price: number;
  condition: string;
  image_urls: string[];
  location: string;
  category_name: string;
  seller_id?: number;
  created_at?: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [moderatorLoading, setModeratorLoading] = useState(false);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  // Accept popup state - similar to EditProfile.tsx
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);
  
  // Reject popup state - similar to accept popup
  const [showRejectSuccessPopup, setShowRejectSuccessPopup] = useState(false);
  
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const {showToast} = useToast();
  
  


  // Get user data from localStorage
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        if (userData && userData.user_id) {
          setUserId(userData.user_id);
          setUserType(userData.user_type);
        }
      } catch (err) {
        console.error('Error parsing currentUser:', err);
      }
    }
  }, []);

  const isLoggedIn = !!userId;
  const isModerator = userType === "moderator";
  // const isDeliveryAgent = userType === 'delivery_agent' ; //commenting to fix prod issue, uncomment when needed
  const isRegularUser = userType === "user";

  // Auto-hide accept popup after 3 seconds - similar to EditProfile.tsx
  useEffect(() => {
    if (showAcceptPopup) {
      const timer = setTimeout(() => {
        setShowAcceptPopup(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAcceptPopup]);

  // Auto-hide reject success popup after 3 seconds - similar to accept popup
  useEffect(() => {
    if (showRejectSuccessPopup) {
      const timer = setTimeout(() => {
        setShowRejectSuccessPopup(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showRejectSuccessPopup]);

  // Check if product is in favorites
  const checkFavoriteStatus = async () => {
    if (!userId || !id) return;
    
    try {
      const favRes = await fetch(`${API_BASE_URL}/users/favourites/${userId}`);
      if (favRes.ok) {
        const favoritesData = await favRes.json();
        console.log('Favorites data for checking:', favoritesData);
        
        // Handle the API response format: {user_id: x, products: [...]}
        let favoritesArray = [];
        if (Array.isArray(favoritesData)) {
          favoritesArray = favoritesData;
        } else if (favoritesData && Array.isArray(favoritesData.products)) {
          favoritesArray = favoritesData.products;
        }
        
        const isCurrentlyFavorite = favoritesArray.some((fav: any) => 
          fav.product_id === parseInt(id!)
        );
        
        console.log('Is favorite:', isCurrentlyFavorite);
        setIsFavorite(isCurrentlyFavorite);
      }
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch product data
        const res = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!res.ok) throw new Error('Failed to fetch product');
        const data = await res.json();
        setProduct(data);
        if (data.image_urls?.length) setSelectedImage(data.image_urls[0]);
        
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Check favorite status when userId is available
  useEffect(() => {
    if (userId && id) {
      checkFavoriteStatus();
    }
  }, [userId, id]);

  const toggleFavorite = async () => {
    if (!userId || !id) {
      navigate('/login');
      return;
    }
    
    const originalFavoriteState = isFavorite;
    setIsFavorite(!originalFavoriteState); 
    setFavoriteLoading(true);

    try {
      if (originalFavoriteState) {
        // Remove from favorites
        const res = await fetch(`${API_BASE_URL}/users/favourites/${userId}/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to remove favorite');
        showToast('Removed from favorites', 'success');
      } else {
        // Add to favorites
        const res = await fetch(`${API_BASE_URL}/users/favourites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            product_id:id
          })
        });
        if (!res.ok) throw new Error('Failed to add favorite');
        showToast('Added to favorites', 'success');
      }
    } catch (error) {
      console.error('Favorite action failed:', error);
      setIsFavorite(originalFavoriteState); // Revert on error
      alert(`Operation failed: ${(error as Error).message}`);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleMessageOwner = async () => {
    if (!userId || !product?.seller_id) {
      navigate('/login');
      return;
    }

    // Prevent messaging yourself
    if (userId === product.seller_id) {
      showToast("You cannot message yourself!", 'error');
      return;
    }

    setMessageLoading(true);

    try {
      // Create a unique room name based on product and users
      // Format: product_{product_id}_{smaller_user_id}_{larger_user_id}
      const sortedUserIds = [userId, product.seller_id].sort((a, b) => a - b);
      const roomName = `product_${id}_${sortedUserIds[0]}_${sortedUserIds[1]}`;
      
      console.log('Creating chat room:', roomName);
      
      // Navigate directly to the chat room
      // The chat component will handle the WebSocket connection
      navigate(`/chat/${roomName}`, {
        state: {
          productId: id,
          productName: product.name,
          sellerId: product.seller_id,
          buyerId: userId,
          isNewChat: true
        }
      });


    } catch (error) {
      console.error('Error creating chat:', error);
      showToast('Failed to start conversation. Please try again.', 'error');
    } finally {
      setMessageLoading(false);
    }
  }
  
  const handleReportProduct = async () => {
  if (!userId || !id) {
    navigate('/login');
    return;
  }

  if (product?.seller_id && userId === product.seller_id) {
    showToast("You cannot report your own product!", 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/reports/${id}?user_id=${userId}`, { 
      method: 'POST' 
    });
    if (!res.ok) throw new Error('Failed to report product');
    showToast('Product has been reported.', 'success');
  } catch (error) {
    console.error('Error reporting product:', error);
    showToast('Failed to report product. Please try again later.', 'error');
  }
  };

  const handleAcceptProduct = async () => {
    if (!id) return;
    
    setModeratorLoading(true);
    
    try {
      const res = await fetch(
        `${API_BASE_URL}/moderator/approve-listings/${id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moderator_id: userId,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to accept product");

      // Show custom popup instead of alert
      setShowAcceptPopup(true);
      
      // Navigate to homepage after a delay
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      console.error('Error accepting product:', error);
      showToast(`Failed to accept product: ${(error as Error).message}`, 'error');
    } finally {
      setModeratorLoading(false);
    }
  };

  const handleRejectProduct = async () => {
    if (!id || !rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    
    setModeratorLoading(true);
    
    try {
      const res = await fetch(
        `${API_BASE_URL}/moderator/reject-listings/${id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moderator_id: userId,
            reason: rejectReason.trim(),
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to reject product");

      // Close the reject reason popup
      setShowRejectPopup(false);
      setRejectReason("");
      
      // Show custom success popup instead of alert
      setShowRejectSuccessPopup(true);
      
      // Navigate to homepage after a delay
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      console.error("Error rejecting product:", error);
      showToast(`Failed to reject product: ${(error as Error).message}`, "error");
    } finally {
      setModeratorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return <p className="p-6 text-red-600 font-semibold">Product not found.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 relative">
      {/* Top Right Buttons */}
      <div className="absolute top-4 right-4 flex gap-3 z-10">
        {isRegularUser && (
        <button
          onClick={toggleFavorite}
          className={`p-2 rounded-full transition-all ${
            !isLoggedIn 
              ? 'opacity-50 cursor-not-allowed bg-gray-100' 
              : 'hover:bg-gray-100 hover:scale-110'
          }`}
          disabled={!isLoggedIn  || favoriteLoading || (product?.seller_id === userId)}
          title={!isLoggedIn ? 'Login to add favorites' : isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favoriteLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
          ) : (
            <Heart 
              className={`w-6 h-6 transition-colors ${
                isFavorite 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-600 hover:text-red-500'
              }`} 
            />
          )}
        </button>
        )}


        {isRegularUser && (
          <button
  onClick={handleReportProduct}
  disabled={!isLoggedIn || (product?.seller_id ? userId === product.seller_id : false)}
  className={`text-white px-3 py-1 rounded-lg text-sm transition ${
    !isLoggedIn || (product?.seller_id ? userId === product.seller_id : false)
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-gray-800 hover:bg-gray-700'
  }`}
  title={
    !isLoggedIn 
      ? 'Login to report product' 
      : (product?.seller_id ? userId === product.seller_id : false)
        ? 'You cannot report your own product'
        : 'Report this product'
  }
>
  Report
</button>
        )}
      </div>



      {/* Reject Reason Popup */}
      {showRejectPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reason for Rejection</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this product..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRejectProduct}
                disabled={moderatorLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {moderatorLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectPopup(false);
                  setRejectReason('');
                }}
                disabled={moderatorLoading}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Images */}
        <div>
          <div className="w-full h-96 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center mb-4">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="text-gray-400">No Image</div>
            )}
          </div>

          {product.image_urls && product.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.image_urls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => setSelectedImage(url)}
                  className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition ${
                    selectedImage === url ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details */}
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-700 mb-4">{product.description}</p>

            <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-6">
              <span className="bg-gray-100 px-3 py-1 rounded-full">Category: {product.category_name}</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full">Condition: {product.condition}</span>
              {product.created_at && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">
                  Date Posted: {new Date(product.created_at).toLocaleDateString()}
                </span>
              )}
              <span className="bg-gray-100 px-3 py-1 rounded-full">📍 {product.location}</span>
            </div>

            <p className="text-4xl font-bold text-orange-500 mb-4">{product.price} €</p>
          </div>

          {isRegularUser && product.seller_id && (
            <button
              onClick={handleMessageOwner}
              disabled={!isLoggedIn || messageLoading || userId === product.seller_id}
              className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 transition ${
                !isLoggedIn
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : userId === product.seller_id
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : messageLoading
                  ? 'bg-gray-400 text-gray-600'
                  : 'bg-[#3A1078] text-white hover:opacity-85'
              }`}
            >
              {messageLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
              {!isLoggedIn 
                ? 'Login to Message Seller' 
                : userId === product.seller_id
                ? 'This is Your Product'
                : messageLoading
                ? 'Starting Chat...'
                : 'Message the Seller'
              }
            </button>
          )}
        </div>
      </div>

      {/* Moderator Controls */}
      {isModerator && (
        <div className="mt-8 p-4 border border-indigo-200 rounded-lg" style={{ backgroundColor: '#E0E7FF' }}>
          <h3 className="font-semibold text-indigo-800 mb-3">Moderator Actions</h3>
          <div className="flex gap-3">
            <button
              onClick={handleAcceptProduct}
              disabled={moderatorLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {moderatorLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Accept
            </button>
            <button
              onClick={() => setShowRejectPopup(true)}
              disabled={moderatorLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Login/Register Prompt */}
      {!isLoggedIn && (
        <div className="mt-8 p-6 border border-blue-200 bg-blue-50 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700">Login or register to save favorites and message sellers.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="ml-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            Login / Register
          </button>
        </div>
      )}

      {/* Custom Accept Popup - Similar to EditProfile.tsx */}
      {showAcceptPopup && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✓</span>
            <span>Product accepted successfully! It will now appear on the homepage.</span>
          </div>
        </div>
      )}

      {/* Custom Reject Success Popup - Similar to Accept Popup */}
      {showRejectSuccessPopup && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✗</span>
            <span>Product rejected successfully! Redirecting to homepage...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;