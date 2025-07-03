import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Define the type for delivery details
interface DeliveryDetails {
  pickup_location: string;
  dropoff_location: string;
  delivery_date: string;
  delivery_time: string;
}

// Define status type
type DeliveryStatus = 'out-for-delivery' | 'on-the-way' | 'delivered';

const DeliveryDetails = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus>('out-for-delivery');

  useEffect(() => {
    if (requestId) {
      fetchDeliveryDetails();
    } else {
      setError('No request ID found');
      setLoading(false);
    }
  }, [requestId]);

  const fetchDeliveryDetails = async () => {
    if (!requestId) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE_URL}/delivery-agent/accepted-delivery-details/${requestId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch delivery details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setDeliveryDetails(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching delivery details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery details');
      setLoading(false);
    }
  };

  const handleStatusChange = (status: DeliveryStatus) => {
    setSelectedStatus(status);
  };

  const handleUpdate = async () => {
    if (!requestId) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE_URL}/delivery-agent/update-status/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: selectedStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      alert(`Status updated to: ${selectedStatus.replace('-', ' ').toUpperCase()}`);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">Delivery Details</h1>
            </div>

            {/* Delivery Information */}
            {deliveryDetails ? (
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location
                  </label>
                  <span className="text-gray-800 text-lg">{deliveryDetails.pickup_location}</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drop-off Location
                  </label>
                  <span className="text-gray-800 text-lg">{deliveryDetails.dropoff_location}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date
                    </label>
                    <span className="text-gray-800 text-lg">{deliveryDetails.delivery_date}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Time
                    </label>
                    <span className="text-gray-800 text-lg">{deliveryDetails.delivery_time}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 mb-8 text-center py-8">No delivery details available</div>
            )}

            {/* Status Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Update Delivery Status
              </label>
              <div className="space-y-4">
                <div 
                  className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => handleStatusChange('out-for-delivery')}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    selectedStatus === 'out-for-delivery' 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedStatus === 'out-for-delivery' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-gray-800 font-medium">Out for Delivery</span>
                </div>

                <div 
                  className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => handleStatusChange('on-the-way')}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    selectedStatus === 'on-the-way' 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedStatus === 'on-the-way' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-gray-800 font-medium">On the way</span>
                </div>

                <div 
                  className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => handleStatusChange('delivered')}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    selectedStatus === 'delivered' 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedStatus === 'delivered' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-gray-800 font-medium">Delivered</span>
                </div>
              </div>
            </div>

            {/* Update Button */}
            <button 
              onClick={handleUpdate}
              className="w-full bg-[#3A1078] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#2d0a5e] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDetails;