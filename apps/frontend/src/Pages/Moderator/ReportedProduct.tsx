import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config";

interface Product {
  product_id: number;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  condition: string;
  image_urls?: string[];
  seller_id: number;
  location: string;
  created_at: string;
  category_name: string;
}

interface ProductReport {
  report_id: number;
  status: string;
  product?: Product;
  rejection_reason?: string;
  reported_by_id: number;
}

const ReportedProducts: React.FC = () => {
  const [reports, setReports] = useState<ProductReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/reports`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setReports(data);
      } catch (err) {
        setError("Error loading reports");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (reportId: number) => {
    try {
      await fetch(`${API_BASE_URL}/reports/${reportId}/delete`, {
        method: "POST",
      });
      setReports(reports.filter((r) => r.report_id !== reportId));
    } catch (err) {
      alert("Failed to delete product");
      console.error(err);
    }
  };

  const handleKeep = async (reportId: number) => {
    try {
      await fetch(`${API_BASE_URL}/reports/${reportId}/keep`, {
        method: "POST",
      });
      setReports(reports.filter((r) => r.report_id !== reportId));
    } catch (err) {
      alert("Failed to keep product");
      console.error(err);
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const approvedCount = reports.filter((r) => r.status === "approved").length;
  const rejectedCount = reports.filter((r) => r.status === "rejected").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Reported Products
          </h1>
          <p className="text-gray-600 max-w-3xl">
            Review and moderate reported listings. Take appropriate action to
            maintain marketplace quality.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <StatCard
            title="Pending Review"
            value={pendingCount}
            color="yellow"
          />
          <StatCard title="Approved" value={approvedCount} color="green" />
          <StatCard title="Rejected" value={rejectedCount} color="red" />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
            <p className="text-lg text-gray-700">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-red-50 rounded-lg">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-lg">No reported products found</p>
          </div>
        ) : (
          <div className="space-y-5">
            {reports.map((report) => (
              <div
                key={report.report_id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image Section */}
                  <div className="w-full md:w-48 h-48 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {report.product?.image_urls?.[0] ? (
                      <img
                        src={report.product.image_urls[0]}
                        alt={report.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">No Image</div>
                    )}
                  </div>

                  {/* Details Section */}
                  <div className="flex-1 p-5">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <Link
                            to={`/product/${report.product?.product_id}`}
                            className="group"
                          >
                            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {report.product?.name}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                report.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : report.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {report.status.charAt(0).toUpperCase() +
                                report.status.slice(1)}
                            </span>
                            <span className="text-xl font-bold text-gray-900">
                              {report.product?.price}€
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {report.product?.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <div className="text-sm text-gray-500">
                            Location: {report.product?.location}
                          </div>
                          <div className="text-sm text-gray-500">
                            Reported by User {report.reported_by_id}
                          </div>
                        </div>

                        {report.rejection_reason && (
                          <div className="mt-3 bg-amber-50 border border-amber-100 p-3 rounded-lg">
                            <p className="text-sm text-amber-800">
                              <strong className="font-medium">
                                Report Reason:
                              </strong>{" "}
                              {report.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <button
                          onClick={() => handleKeep(report.report_id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Reject Report
                        </button>
                        
                        <button
                          onClick={() => handleDelete(report.report_id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Approve Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified StatCard Component without icons
const StatCard = ({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) => {
  const colorClasses = {
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div
      className={`${
        colorClasses[color as keyof typeof colorClasses]
      } p-5 rounded-xl`}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};

export default ReportedProducts;
