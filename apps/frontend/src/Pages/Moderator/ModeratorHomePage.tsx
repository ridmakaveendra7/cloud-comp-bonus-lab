import React, { useState, useEffect } from 'react';
import { Search, Image as ImageIcon } from 'lucide-react';

// Mock data for listings - replace with actual API calls
const mockListings = [
  {
    id: 1,
    title: 'Electric Bicycle',
    price: 30,
    currency: '€',
    availability: '13-04-2025 to 01-11-2025',
    image: null,
    status: 'pending'
  },
  {
    id: 2,
    title: 'Cupboard',
    price: 100,
    currency: '€',
    availability: '13-04-2025 to 01-11-2025',
    image: null,
    status: 'pending'
  },
  {
    id: 3,
    title: 'Netzwerk-Neu B1 German Book',
    price: 25,
    currency: '€',
    availability: '13-04-2025 to 01-11-2025',
    image: null,
    status: 'pending'
  }
];

const ModeratorHomepage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState(mockListings);
  const [filteredListings, setFilteredListings] = useState(mockListings);

  // Filter listings based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredListings(listings);
    } else {
      const filtered = listings.filter(listing =>
        listing.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredListings(filtered);
    }
  }, [searchQuery, listings]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleApprove = (listingId: number) => {
    setListings(prev => prev.map(listing => 
      listing.id === listingId 
        ? { ...listing, status: 'approved' }
        : listing
    ));
    // Here you would typically make an API call to approve the listing
    console.log(`Approved listing ${listingId}`);
  };

  const handleReject = (listingId: number) => {
    setListings(prev => prev.map(listing => 
      listing.id === listingId 
        ? { ...listing, status: 'rejected' }
        : listing
    ));
    // Here you would typically make an API call to reject the listing
    console.log(`Rejected listing ${listingId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Moderator Dashboard</h1>
          <p className="text-gray-600">Review and manage user listings</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search product"
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#3A1078] focus:border-[#3A1078]"
            />
          </div>
        </div>

        {/* Listings Grid */}
        <div className="space-y-4">
          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No listings found</p>
              {searchQuery && (
                <p className="text-gray-400 mt-2">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center p-6">
                  {/* Product Image Placeholder */}
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mr-6 flex-shrink-0">
                    {listing.image ? (
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {listing.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-1">
                      <span className="font-medium">Availability:</span> {listing.availability}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          listing.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : listing.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {listing.status === 'pending' ? 'Pending Review' : 
                         listing.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right mr-6">
                    <div className="text-2xl font-bold text-gray-900">
                      {listing.price}{listing.currency}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {listing.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApprove(listing.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(listing.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {listing.status !== 'pending' && (
                    <div className="flex flex-col gap-2">
                      <button
                        className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed font-medium text-sm"
                        disabled
                      >
                        {listing.status === 'approved' ? 'Approved' : 'Rejected'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Search className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.filter(l => l.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Search className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.filter(l => l.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Search className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.filter(l => l.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="text-lg font-medium text-gray-900 mb-1">View Reports</div>
              <div className="text-sm text-gray-600">Review user reports and complaints</div>
            </button>
            
            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="text-lg font-medium text-gray-900 mb-1">Manage Users</div>
              <div className="text-sm text-gray-600">View and manage user accounts</div>
            </button>
            
            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="text-lg font-medium text-gray-900 mb-1">Agent Approvals</div>
              <div className="text-sm text-gray-600">Review and approve delivery agents</div>
            </button>
            
            <button className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="text-lg font-medium text-gray-900 mb-1">System Settings</div>
              <div className="text-sm text-gray-600">Configure platform settings</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorHomepage;