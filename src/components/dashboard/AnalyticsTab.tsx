import React from 'react';
import { Users, TrendingUp, CreditCard, MessageCircle } from 'lucide-react';
import { Booking } from '../../pages/AdminDashboard'; // Import Booking interface if needed
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'; // Import chart components

interface AnalyticsTabProps {
  totalUsers: number;
  activePlans: number;
  totalPayments: number; // Assuming totalPayments can be a number
  feedbackCount: number;
  unreadFeedback: number;
  bookings: Booking[]; // Add bookings prop
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ totalUsers, activePlans, totalPayments, feedbackCount, unreadFeedback, bookings }) => {
  // You can now use these props to display data or create charts

  // Example: Displaying the basic counts (which were in the header bar)
  // We can add charting logic here later

  // Process booking data for status distribution chart
  const statusCounts = bookings.reduce((acc, booking) => {
    const status = booking.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.keys(statusCounts).map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize first letter
    value: statusCounts[status],
  }));

   const COLORS = ['#FFBB28', '#0088FE', '#00C49F', '#FF8042', '#A280F5', '#FF6B6B']; // Define colors for chart segments

  // Process booking data for bookings over time chart
  const bookingsOverTime = bookings.reduce((acc, booking) => {
    // Assuming booking.createdAt is a Firebase Timestamp or similar object
    // Convert to a consistent date string format (e.g., YYYY-MM-DD)
    const date = booking.createdAt ? new Date(booking.createdAt.seconds * 1000).toISOString().split('T')[0] : 'unknown';
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  // Convert the counts to an array of objects for Recharts
  const bookingsOverTimeData = Object.keys(bookingsOverTime)
    .sort() // Sort by date
    .map(date => ({
      date,
      count: bookingsOverTime[date],
    }));

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-green-100">
      {/* Removed duplicate Analytics Overview section */}
      
      {/* Booking Status Distribution Chart */}
      <div className="mt-8">
         <h3 className="text-xl font-bold mb-4 text-green-700">Booking Status Distribution</h3>
         {bookings.length > 0 ? (
           <ResponsiveContainer width="100%" height={300}>
             <PieChart>
               <Pie
                 data={statusData}
                 cx="50%"
                 cy="50%"
                 outerRadius={100}
                 fill="#8884d8"
                 dataKey="value"
                 label
               >
                 {statusData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip />
               <Legend />
             </PieChart>
           </ResponsiveContainer>
         ) : (
           <p>No booking data available to display status distribution.</p>
         )}
      </div>
       <div className="mt-8">
         <h3 className="text-xl font-bold mb-4 text-green-700">Bookings Over Time</h3>
          {bookingsOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={bookingsOverTimeData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <p>No booking data available to display trend over time.</p>
           )}
       </div>
    </div>
  );
};

export default AnalyticsTab; 