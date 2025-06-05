import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Booking } from '../../pages/AdminDashboard'; // Import the Booking interface

const CreditsUsedTab = () => {
  const [creditBookings, setCreditBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch bookings paid with credit
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('paymentMethod', '==', 'credit'),
      where('status', '==', 'credit_used_pending_refill'),
      orderBy('createdAt', 'desc') // Or orderBy a 'paidAt' timestamp if you add one on credit payment
    );

    const unsub = onSnapshot(q, 
      (snapshot) => {
        const bookingsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Booking // Cast data to Booking interface
        }));
        setCreditBookings(bookingsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching credit bookings:', err);
        setError('Failed to load credit bookings.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  if (loading) return <div>Loading credit bookings...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Credits Used Bookings</h2>
      {creditBookings.length === 0 ? (
        <p>No bookings found that used credit.</p>
      ) : (
        <ul>
          {/* Basic list display - you'll want to format this nicely */};
          {creditBookings.map(booking => (
            <li key={booking.id} className="border-b py-2">
              Booking ID: {booking.customBookingId || booking.id}<br/>
              User Email: {booking.email}<br/>
              User Phone: {booking.phone || 'N/A'}<br/>
              Service: {booking.service}<br/>
              Amount Used: ₹{booking.creditAmountUsedInBooking || booking.amountDue || booking.usage}<br/> {/* Display the stored credit amount, fallback to amountDue or usage */}
              Status: {booking.status}<br/>
              Created At: {booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleString() : 'N/A'}
              {/* Add more details as needed */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CreditsUsedTab; 