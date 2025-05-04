import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import UserSortOptions from '../components/UserSortOptions';
import { sortBookings, sortHistory, sortFeedback } from '../utils/sortUtils';

const UserDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingSortOrder, setBookingSortOrder] = useState('recent');
  const [historySortOrder, setHistorySortOrder] = useState('recent');
  const [feedbackSortOrder, setFeedbackSortOrder] = useState('recent');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('userId', '==', currentUser.uid)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(bookingsData);

        // Fetch messages
        const messagesQuery = query(
          collection(db, 'messages'),
          where('userId', '==', currentUser.uid)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messagesData);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, { read: true });
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setTab('bookings')}
            className={`px-4 py-2 rounded ${
              tab === 'bookings'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Current Bookings
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded ${
              tab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setTab('feedback')}
            className={`px-4 py-2 rounded ${
              tab === 'feedback'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Feedback & Support
          </button>
        </div>

        {tab === 'bookings' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-blue-700">Current Bookings</h2>
              <UserSortOptions
                tab={tab}
                sortOrder={bookingSortOrder}
                onSortChange={setBookingSortOrder}
              />
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {sortBookings(bookings.filter(b => b.status !== 'completed' && b.status !== 'rejected'), bookingSortOrder).map((booking) => (
                <div key={booking.id} className="p-4 border-b last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Booking #{booking.id.slice(0, 8)}</h3>
                      <p className="text-gray-600">Pickup: {new Date(booking.pickupDate).toLocaleDateString()}</p>
                      <p className="text-gray-600">Status: {booking.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${booking.amountDue?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(booking.createdAt?.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-blue-700">History</h2>
              <UserSortOptions
                tab={tab}
                sortOrder={historySortOrder}
                onSortChange={setHistorySortOrder}
              />
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {sortHistory(bookings, historySortOrder).map((booking) => (
                <div key={booking.id} className="p-4 border-b last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Booking #{booking.id.slice(0, 8)}</h3>
                      <p className="text-gray-600">
                        {booking.status === 'completed' ? 'Completed' : 'Rejected'}:{' '}
                        {new Date(booking.completedAt || booking.rejectedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${booking.amountDue?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(booking.createdAt?.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'feedback' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-blue-700">Feedback & Support</h2>
              <UserSortOptions
                tab={tab}
                sortOrder={feedbackSortOrder}
                onSortChange={setFeedbackSortOrder}
              />
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {sortFeedback(messages, feedbackSortOrder).map((message) => (
                <div
                  key={message.id}
                  className={`p-4 border-b last:border-b-0 ${
                    !message.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{message.subject}</h3>
                      <p className="text-gray-600">{message.message}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(message.createdAt?.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    {!message.read && (
                      <button
                        onClick={() => handleMarkAsRead(message.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard; 