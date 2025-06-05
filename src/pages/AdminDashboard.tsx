import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, deleteDoc, updateDoc as updateContactDoc, onSnapshot, addDoc, getDoc, query, orderBy, where } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { colors } from '../styles/colors';
import { Textarea } from '../components/ui/textarea';
import { UserCircle, Users, TrendingUp, CreditCard, MessageCircle, ClipboardCopy, Pencil, Trash2, StickyNote, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Dialog, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog';
import { Timestamp } from 'firebase/firestore';
import { ChartContainer } from '../components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Modal } from '../components/ui/modal';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import TabSortOptions from '../components/TabSortOptions';
import { sortUsers, sortBookings, sortHistory, sortFeedback } from '../utils/sortUtils';
import { generateReceipt } from '../utils/generateReceipt';
import { loadImageAsBase64 } from '../utils/loadImageAsBase64';

// Lazy load tab components
const UsersTab = lazy(() => import('../components/dashboard/UsersTab'));
const BookingsTab = lazy(() => import('../components/dashboard/BookingsTab'));
const HistoryTab = lazy(() => import('../components/dashboard/HistoryTab'));
const FeedbackTab = lazy(() => import('../components/dashboard/FeedbackTab'));
const PlanRequestsTab = lazy(() => import('../components/dashboard/PlanRequestsTab'));
const AnalyticsTab = lazy(() => import('../components/dashboard/AnalyticsTab'));
const CreditsUsedTab = lazy(() => import('../components/dashboard/CreditsUsedTab'));

// List of admin emails (replace with your admin email(s))
const ADMIN_EMAILS = (process.env.REACT_APP_ADMIN_EMAILS || '').split(',');

// Add interface for plan request user
interface PlanRequestUser {
  id: string;
  name?: string;
  email?: string;
  planRequest: {
    plan: string;
    price: number;
    duration: string;
    type: string;
    conditioner?: string;
    kgLimit: number;
    paymentMethod: string;
    txnId?: string;
    status: string;
    requestedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectReason?: string;
  };
}

// Export the Booking interface
export interface Booking {
  id: string;
  customBookingId?: string;
  service?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  pickupDate?: string;
  pickupTime?: string;
  address?: string;
  status?: string;
  createdAt?: any;
  usage?: number;
  planName?: string;
  amountDue?: number;
  isNoPlanBooking?: boolean;
  paymentConfirmed?: boolean;
  creditAmountUsedInBooking?: number;
}

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  timestamp: any;
  reply?: string;
  adminNote?: string;
  status: 'pending' | 'resolved';
}

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [newPayment, setNewPayment] = useState({ date: '', amount: '', status: '' });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState('users'); // Default tab to users
  const [messages, setMessages] = useState<Message[]>([]); // State to hold all messages
  const navigate = useNavigate();
  const location = useLocation();

  // Pagination state
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Analytics
  const totalUsers = users.length;
  const activePlans = users.filter(u => u.planStatus === 'Active').length;
  const totalPayments = users.reduce((sum, u) => sum + ((u.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)), 0);
  const feedbackCount = messages.length;
  const unreadFeedback = messages.filter(m => !m.read).length;

  // Admin notes state
  const [userNote, setUserNote] = useState('');
  const [userNoteSaving, setUserNoteSaving] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState<Booking[]>([]); // State to hold all bookings

  // Real-time feedback notifications
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'contact_messages'), (snap) => {
      const updatedMessages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(updatedMessages);
    });
    return () => unsub();
  }, []);
  // Real-time payment notifications
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const before = change.oldIndex >= 0 ? snap.docs[change.oldIndex].data() : {};
          const after = change.doc.data();
          if (Array.isArray(after.payments) && (!Array.isArray(before.payments) || after.payments.length > before.payments?.length)) {
            const payment = after.payments[after.payments.length - 1];
            setNotifications(n => [...n, { type: 'payment', id: change.doc.id, name: after.name || after.email, amount: payment.amount }]);
          }
        }
      });
    });
    return () => unsub();
  }, []);
  // Real-time booking notifications
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (snap) => {
      snap.docChanges().forEach(change => {
        const booking = { id: change.doc.id, ...change.doc.data() } as Booking;
        // Handle added or modified bookings
        if (change.type === 'added' || change.type === 'modified') {
          setBookings(currentBookings => {
            const existingIndex = currentBookings.findIndex(b => b.id === booking.id);
            if (existingIndex > -1) {
              // Update existing booking
              return currentBookings.map((b, index) => index === existingIndex ? booking : b);
            } else {
              // Add new booking
        if (change.type === 'added') {
          setNotifications(n => [
            ...n,
                   { type: 'booking', id: booking.id, name: booking.name || booking.email, service: booking.service }
                 ]);
              }
              return [...currentBookings, booking];
            }
          });
        } else if (change.type === 'removed') {
          // Handle removed bookings
          setBookings(currentBookings => currentBookings.filter(b => b.id !== booking.id));
        }
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const state = location.state as { activeTab?: string; searchQuery?: string; highlightId?: string } | null;
    if (state?.activeTab) {
      // Set the active tab
      setTab(state.activeTab);
      
      // Set the appropriate search state based on the tab
      if (state.searchQuery) {
        switch (state.activeTab) {
          case 'feedback':
            // Assuming feedback search is handled within FeedbackTab
            break;
          case 'users':
            // Assuming user search is handled within UsersTab now
            break;
          case 'bookings': // This case might not be needed anymore if 'bookings' isn't a top-level tab
             // Assuming booking search is handled within HistoryTab/RequestsTab
            break;
          case 'requests':
             // Assuming requests search is handled within RequestsTab
            break;
          case 'history':
             // Assuming history search is handled within HistoryTab
            break;
          case 'creditsUsed': // Add case for the new tab
            // Assuming credit bookings search is handled within CreditsUsedTab
            break;
        }
      }
      
      // Clear the navigation state after applying it
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Ensure admin access and fetch initial data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !ADMIN_EMAILS.includes(firebaseUser.email)) {
        navigate('/dashboard'); // Redirect non-admins to regular dashboard
        return;
      }
      setUser(firebaseUser);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);

        const bookingsSnap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));
        const bookingsList = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(bookingsList);

        const messagesSnap = await getDocs(collection(db, 'contact_messages'));
        const messagesList = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(messagesList);

      } catch (err) {
        setError('Failed to load initial data.');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const exportCSV = () => {
    const header = ['User ID', 'Email', 'Plan', 'Price', 'Duration', 'Status', 'Payments'];
    const rows = users.map(u => [
      u.id,
      u.email || '',
      u.planName || '',
      u.planPrice || '',
      u.planDuration || '',
      u.planStatus || '',
      (u.payments || []).map(p => `${p.date}: ₹${p.amount} (${p.status})`).join(' | ')
    ]);
    const csv = [header, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        zip: user.address?.zip || '',
        country: user.address?.country || '',
      },
      planName: user.planName || '',
      planPrice: user.planPrice || '',
      planDuration: user.planDuration || '',
      planStatus: user.planStatus || '',
      usage: user.usage || '',
    });
    setNewPayment({ date: '', amount: '', status: '' });
    setModalMsg('');
    setModalOpen(true);
  };

  // Filter bookings for the Bookings tab (only active bookings: pending, awaiting finalization, or awaiting payment)
  const activeBookings = bookings.filter(b =>
    b?.status === 'pending' ||
    (b?.status === 'accepted' && (
      (!(b?.isNoPlanBooking) && typeof b?.usage === 'undefined') ||
      (b?.isNoPlanBooking && typeof b?.amountDue === 'undefined')
    )) ||
    ((b?.status === 'completed' && !(b?.isNoPlanBooking) && b?.paymentConfirmed === false) ||
      b?.status === 'cash_pending')
  );

  // Filter bookings for the History tab (only completed/paid)
  const bookingHistory = bookings.filter(b => b?.status === 'completed' || b?.status === 'paid');

  // Function to update bookings state from child components
  const handleBookingsChange = (updatedBookings: Booking[]) => {
    setBookings(updatedBookings);
  };

  // Function to update messages state from child components
  const handleMessagesChange = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-16 px-2 md:px-4 pt-24">
      <h1 className="text-4xl font-extrabold mb-6 text-blue-700 text-center tracking-tight drop-shadow">Admin Dashboard</h1>
      {/* Analytics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 rounded-xl p-4 shadow flex items-center">
          <Users className="text-blue-600 mr-4" size={28} />
          <div>
            <div className="text-lg font-bold text-blue-800">{totalUsers}</div>
            <div className="text-sm text-blue-600">Total Users</div>
        </div>
        </div>
        <div className="bg-green-100 rounded-xl p-4 shadow flex items-center">
          <TrendingUp className="text-green-600 mr-4" size={28} />
          <div>
            <div className="text-lg font-bold text-green-800">{activePlans}</div>
            <div className="text-sm text-green-600">Active Plans</div>
        </div>
        </div>
        <div className="bg-yellow-100 rounded-xl p-4 shadow flex items-center">
          <CreditCard className="text-yellow-600 mr-4" size={28} />
          <div>
            <div className="text-lg font-bold text-yellow-800">₹{totalPayments.toFixed(2)}</div>
            <div className="text-sm text-yellow-600">Total Payments</div>
        </div>
      </div>
        <div className="bg-purple-100 rounded-xl p-4 shadow flex items-center">
          <MessageCircle className="text-purple-600 mr-4" size={28} />
                          <div>
            <div className="text-lg font-bold text-purple-800">{feedbackCount}</div>
            <div className="text-sm text-purple-600">Feedback Received</div>
                          </div>
                        </div>
                              </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
        {/* Users Tab */}
        <Button
          variant="outline"
          className={tab === 'users' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('users')}
        >
          Users ({totalUsers})
                            </Button>
      {/* Bookings Tab */}
                          <Button 
          variant="outline"
          className={tab === 'bookings' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('bookings')}
        >
          Bookings ({activeBookings.length})
                          </Button>
        {/* Plan Requests Tab */}
         <Button
          variant="outline"
          className={tab === 'plans' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('plans')}
        >
          Plan Requests
                          </Button>
      {/* History Tab */}
        <Button
          variant="outline"
          className={tab === 'history' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('history')}
        >
          History ({bookingHistory.length})
        </Button>
      {/* Analytics Tab */}
         <Button
          variant="outline"
          className={tab === 'analytics' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('analytics')}
        >
          Analytics
        </Button>
        {/* Feedback & Support Tab */}
        <Button
          variant="outline"
          className={tab === 'feedback' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('feedback')}
        >
          Feedback & Support ({unreadFeedback} unread)
        </Button>
        {/* Credits Used Tab */}
        <Button
          variant="outline"
          className={tab === 'creditsUsed' ? 'bg-purple-600 text-white' : 'border border-gray-300 bg-white text-gray-800'}
          onClick={() => setTab('creditsUsed')}
        >
          Credits Used
        </Button>
          </div>

      {/* Tab Content */}
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          {tab === 'users' && (
            <UsersTab 
              users={users} 
              onUsersChange={setUsers}
            />
          )}
          {tab === 'bookings' && (
            <BookingsTab 
              bookings={bookings} 
              onBookingsChange={setBookings}
              users={users}
              generateReceipt={generateReceipt}
              loadImageAsBase64={loadImageAsBase64}
            />
          )}
          {tab === 'plans' && <PlanRequestsTab />}
          {tab === 'history' && <HistoryTab bookings={bookingHistory} onBookingsChange={handleBookingsChange} />}
          {tab === 'analytics' && (
             <AnalyticsTab
               totalUsers={totalUsers}
               activePlans={activePlans}
               totalPayments={totalPayments}
               feedbackCount={feedbackCount}
               unreadFeedback={unreadFeedback}
               bookings={bookings} // Pass bookings data for charting
             />
          )}
          {tab === 'feedback' && <FeedbackTab messages={messages} onMessagesChange={handleMessagesChange} />}
          {tab === 'creditsUsed' && <CreditsUsedTab />}
        </Suspense>
        </div>

    </div>
  );
};

export default AdminDashboard; 

// Helper to sort data (assuming these are defined elsewhere or will be moved)
/*
const sortUsers = (users, order) => { }; // Placeholder
const sortBookings = (bookings, order) => { }; // Placeholder
const sortHistory = (history, order) => { }; // Placeholder
const sortFeedback = (feedback, order) => { }; // Placeholder
*/