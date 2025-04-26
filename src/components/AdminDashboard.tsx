import React from 'react';
import { Download, AlertCircle, Clock } from 'lucide-react';
import { Button } from './ui/button';

const AdminDashboard = () => {
  const downloadTypes = [
    {
      title: "Daily Orders",
      description: "Track all daily orders with complete details",
      fields: [
        "Order ID (unique)",
        "Student ID (unique)",
        "Phone number",
        "Current year",
        "Branch",
        "College name",
        "User requirements (e.g., 5 kg clothes)"
      ],
      icon: Download
    },
    {
      title: "Payment Delays",
      description: "Track delayed payments",
      fields: [
        "Order ID (unique)",
        "Student ID (unique)",
        "Phone number",
        "Current year",
        "Branch",
        "College name"
      ],
      icon: AlertCircle
    },
    {
      title: "Inactive Users",
      description: "Track users inactive for 30/40/50 days",
      fields: [
        "Order ID (unique)",
        "Student ID (unique)",
        "Phone number",
        "Current year",
        "Branch",
        "College name"
      ],
      icon: Clock
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-8">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {downloadTypes.map((type, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <type.icon className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">{type.title}</h3>
            </div>
            <p className="text-gray-600 mb-4">{type.description}</p>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Included Fields:</h4>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                {type.fields.map((field, fieldIndex) => (
                  <li key={fieldIndex}>{field}</li>
                ))}
              </ul>
            </div>

            <Button 
              className="w-full flex items-center justify-center"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Excel
            </Button>
          </div>
        ))}
      </div>

      {/* Credit Pay Management */}
      <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Credit Pay Management</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Credit Limit</p>
              <p className="text-gray-600">Maximum limit of ₹500 per user</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Payment Rules</p>
              <p className="text-gray-600">Users can only clear full balance amounts</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Inactive Accounts</p>
              <p className="text-gray-600">Automatic notifications after one week of inactivity</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">Late Payment Charges</p>
              <p className="text-gray-600">₹10/day after grace period (1 month)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 