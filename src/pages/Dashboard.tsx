import React, { useEffect, useState } from 'react';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, Timestamp, onSnapshot, query, orderBy, updateDoc, setDoc, getDocs, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import MembershipPlan from '../components/MembershipPlan';
import { CheckCircle, CreditCard, UserCircle, RefreshCw, TrendingUp, Bell, ChevronDown, Moon, Sun } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { colors } from '@/styles/colors';
import { generateReceipt, loadImageAsBase64 } from '../utils/generateReceipt';
import { toast } from 'react-hot-toast';
import { openRazorpay } from '../utils/razorpay';

const availablePlans = [
  { name: 'Elite', price: 3000, duration: '3 Months' },
  { name: 'Elite Plus', price: 10000, duration: '1 Year' }
];

// Add notification type for TypeScript
interface UserNotification {
  id: string;
  title?: string;
  body?: string;
  type?: string;
  read?: boolean;
  createdAt?: any;
}

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState('Technical Issue');
  const [supportPriority, setSupportPriority] = useState('Normal');
  const [supportFile, setSupportFile] = useState(null);
  const [supportFileUrl, setSupportFileUrl] = useState('');
  const [supportError, setSupportError] = useState('');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.displayName || '', phone: '', address: { street: '', city: '', state: '', zip: '', country: '' } });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [bookings, setBookings] = useState([]);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState({ open: false, booking: null });
  const [payNowLoading, setPayNowLoading] = useState(false);
  const faqs = [
    {
      q: 'How do I renew or upgrade my plan?',
      a: 'Go to your dashboard and click the "Renew Plan" or "Upgrade" button in the Current Plan section.'
    },
    {
      q: 'How can I contact support?',
      a: 'Use the Feedback & Support button in your dashboard to send us a message. We will get back to you as soon as possible.'
    },
    {
      q: 'Where can I see my payment history?',
      a: 'Your payment history is shown in the Payment History section of your dashboard.'
    },
    {
      q: 'How do I download a payment receipt?',
      a: 'Click the "Download Receipt" button next to any payment in your Payment History.'
    },
    {
      q: 'Can I change my plan after purchase?',
      a: 'Currently, plans cannot be changed once selected. Please contact support for special requests.'
    },
    {
      q: 'How do I update my profile information?',
      a: 'Click the "Edit Profile" button at the top of your dashboard.'
    }
  ];
  const navigate = useNavigate();

  // Effect 1: Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/login');
        return;
      }
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Effect 2: Firestore User Data
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDashboard(docSnap.data());
      } else {
        setDashboard(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Fetch notifications in real-time
  useEffect(() => {
    if (!user) return;
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserNotification));
      setNotifications(notifs);
      setNotifUnread(notifs.filter(n => !n.read).length);
    });
    return () => unsub();
  }, [user]);

  // Fetch bookings in real-time
  useEffect(() => {
    if (!user) return;
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('email', '==', user.email), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      console.log('[User Dashboard] Real-time bookings update:', snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    notifications.filter(n => !n.read).forEach(async n => {
      await updateDoc(doc(notifRef, n.id), { read: true });
    });
  };

  // Find current plan index
  const currentPlanIndex = dashboard ? availablePlans.findIndex(p => p.name === dashboard.planName) : -1;
  const canUpgrade = currentPlanIndex !== -1 && currentPlanIndex < availablePlans.length - 1;
  const nextPlan = canUpgrade ? availablePlans[currentPlanIndex + 1] : null;

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (!user) return;
    // Fetch bookings for this user
    const fetchBookings = async () => {
      const q = query(collection(db, 'bookings'), where('email', '==', user.email), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBookings();
  }, [user]);

  useEffect(() => {
    if (user && dashboard) {
      console.log('[User Dashboard Debug]', {
        uid: user.uid,
        email: user.email,
        payments: dashboard.payments
      });
    }
  }, [user, dashboard]);

  console.log({ user, dashboard, loading, error });

  const handlePayNow = async (bookingId, method = 'online') => {
    // Simulate payment process (replace with real payment integration as needed)
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    const booking = bookingSnap.exists() ? bookingSnap.data() : null;
    if (!booking) return toast.error('Booking not found.');

    // Add payment record to user
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const prevPayments = userSnap.exists() ? (userSnap.data().payments || []) : [];
    const paymentRecord = {
      date: new Date().toLocaleString(),
      amount: booking.amountDue || booking.usage || 0,
      status: 'Success',
      method,
      bookingId,
    };
    await updateDoc(userRef, { payments: [...prevPayments, paymentRecord] });

    // Mark booking as completed
    await updateDoc(bookingRef, {
      status: 'completed',
      paidAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      paymentMethod: method,
    });
    setBookings(bks => bks.map(b => b.id === bookingId ? { ...b, status: 'completed', paidAt: new Date().toISOString(), completedAt: new Date().toISOString(), paymentMethod: method } : b));

    // Admin notification for payment received
    await addDoc(collection(db, 'admin_notifications'), {
      title: 'Payment Received',
      body: `Payment received and booking completed for booking ${bookingId}.`,
      type: 'payment',
      bookingId,
      read: false,
      createdAt: Timestamp.now(),
    });
    toast.success('Payment successful! Your booking is now completed.');

    // Find the newly added payment record for this booking
    const updatedUserSnap = await getDoc(doc(db, 'users', user.uid));
    const updatedDashboard = updatedUserSnap.exists() ? updatedUserSnap.data() : null;
    const latestPayment = updatedDashboard?.payments?.find(p => p.bookingId === booking.id);

    if (latestPayment && updatedDashboard) {
      loadImageAsBase64('/signn.png', (signatureBase64) => {
        generateReceipt(latestPayment, user, updatedDashboard, signatureBase64);
      });
    } else {
      console.error('[User Dashboard] Could not find latest payment or user data to generate receipt.');
    }
  };

  const handleUserNotifClick = async (notif: UserNotification) => {
    if (!user) return;
    // Mark as read in Firestore
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notif.id), { read: true });
    setNotifications(nots => nots.map(n => n.id === notif.id ? { ...n, read: true } : n));
    // Navigate to relevant section
    if (notif.type === 'booking') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); // or set a tab if you have one
    else if (notif.type === 'payment') window.scrollTo({ top: 0, behavior: 'smooth' }); // or set a tab if you have one
    else if (notif.type === 'feedback') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    // Add more types as needed
  };

  const handleOpenPayNowModal = (booking) => {
    console.log('[User Dashboard] Opening Pay Now modal for booking ID:', booking?.id);
    setShowPayNowModal({ open: true, booking });
  };

  const handlePayWithCredits = async () => {
    if (!showPayNowModal.booking) return;
    setPayNowLoading(true);
    // Deduct credits from user
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const prevCredits = userSnap.exists() ? (userSnap.data().credits || 0) : 0;
    const amountDue = showPayNowModal.booking.amountDue || showPayNowModal.booking.usage || 0;
    if (prevCredits < amountDue) {
      toast.error('Not enough credits.');
      setPayNowLoading(false);
      return;
    }
    await updateDoc(userRef, { credits: prevCredits - amountDue });
    await handlePayNow(showPayNowModal.booking.id, 'credits');
    setPayNowLoading(false);
    setShowPayNowModal({ open: false, booking: null });
  };

  const handlePayWithCash = async () => {
    if (!showPayNowModal.booking) return;
    setPayNowLoading(true);
    try {
      const bookingId = showPayNowModal.booking.id;
      const bookingRef = doc(db, 'bookings', bookingId);
      const userRef = doc(db, 'users', user.uid);
      
      // Add payment record with Pending status
      const userSnap = await getDoc(userRef);
      const prevPayments = userSnap.exists() ? (userSnap.data().payments || []) : [];
      const paymentRecord = {
        date: new Date().toLocaleString(),
        amount: showPayNowModal.booking.amountDue || showPayNowModal.booking.usage || 0,
        status: 'Pending',
        method: 'cash',
        bookingId,
      };
      await updateDoc(userRef, { payments: [...prevPayments, paymentRecord] });
      
      // Mark booking as cash_pending
      await updateDoc(bookingRef, {
        status: 'cash_pending',
        paymentMethod: 'cash',
      });
      
      // Update local state
      setBookings(bks => bks.map(b => b.id === bookingId ? { 
        ...b, 
        status: 'cash_pending',
        paymentMethod: 'cash'
      } : b));
      
      toast.success('Cash payment initiated! Please pay the admin.');
      setShowPayNowModal({ open: false, booking: null });
    } catch (error) {
      console.error('Error processing cash payment:', error);
      toast.error('Failed to process cash payment. Please try again.');
    } finally {
      setPayNowLoading(false);
    }
  };

  const handlePayWithOnline = async () => {
    if (!showPayNowModal.booking) return;
    setPayNowLoading(true);
    const booking = showPayNowModal.booking;
    const amount = booking.amountDue || booking.usage || 0;

    console.log('[User Dashboard] Attempting online payment for booking ID:', booking.id);

    // Use a promise wrapper to handle closing the modal after Razorpay interaction
    const razorpayPromise = new Promise<void>((resolve, reject) => {
      openRazorpay({
        amount,
        description: `Payment for booking ${booking.id}`,
        receipt: booking.id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
                userId: user.uid,
              })
            });
            console.log('[User Dashboard] Request body sent to /api/verify-payment:', JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id,
              userId: user.uid,
            }));
            console.log('[User Dashboard] Sending bookingId to /api/verify-payment:', booking.id);
            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              toast.success('Payment successful!');
              // Assuming booking status is updated on backend after verification
              // Call generateReceipt here after successful payment and status update
              // Find the newly added payment record for this booking
              const updatedUserSnap = await getDoc(doc(db, 'users', user.uid));
              const updatedDashboard = updatedUserSnap.exists() ? updatedUserSnap.data() : null;
              const latestPayment = updatedDashboard?.payments?.find(p => p.bookingId === booking.id);

              if (latestPayment && updatedDashboard) {
                loadImageAsBase64('/signn.png', (signatureBase64) => {
                  generateReceipt(latestPayment, user, updatedDashboard, signatureBase64);
                });
              } else {
                console.error('[User Dashboard] Could not find latest payment or user data to generate receipt.');
              }
              resolve(); // Resolve promise on success handler completion
            } else {
              toast.error(verifyData.message || 'Payment verification failed.');
              reject(new Error(verifyData.message || 'Payment verification failed')); // Reject promise on error
            }
            // Close modal and set loading to false after verification attempt
            setPayNowLoading(false);
            setShowPayNowModal({ open: false, booking: null });
          } catch (e) {
            console.error('Payment verification error on frontend:', e);
            toast.error('An error occurred during payment verification.');
            reject(e); // Reject promise on error
          }
        },
        onFailure: (errMsg) => {
          toast.error(errMsg || 'Payment failed or cancelled.');
          reject(new Error(errMsg || 'Payment failed or cancelled')); // Reject promise on failure
          // Close modal and set loading to false on failure
          setPayNowLoading(false);
          setShowPayNowModal({ open: false, booking: null });
        }
      });
    });

    try {
      await razorpayPromise; // Wait for the Razorpay interaction to complete
    } catch (e) {
      // Handle potential errors from the Razorpay process if needed
      console.error('Razorpay interaction failed:', e);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-600 text-center mt-8">{error}</div>;

  return (
    <div className={`max-w-3xl mx-auto py-12 px-2 md:px-4 space-y-8 pt-24 transition-colors duration-300 ${darkMode ? 'dark bg-brand-bg' : 'bg-brand-bg'}`}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-4xl font-extrabold text-blue-900 dark:text-brand-headline text-center tracking-tight dark:drop-shadow-lg">
          Welcome to Your Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full hover:bg-brand-main transition"
            onClick={() => setDarkMode(d => !d)}
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-6 h-6 text-brand-highlight" /> : <Moon className="w-6 h-6 text-blue-900 dark:text-brand-headline" />}
          </button>
        </div>
      </div>
      {/* Profile Section */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <UserCircle className="w-12 h-12 text-blue-400" />
          <div>
            <div className="text-xl font-bold text-gray-800 mb-1">Hello, {user?.displayName || user?.email}</div>
            <div className="text-gray-500 text-sm">Manage your membership, payments, and profile here.</div>
          </div>
        </div>
      </div>

      {/* Current Plan Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          <h2 className="text-2xl font-bold text-blue-700">Current Plan</h2>
        </div>
        {dashboard ? (
          <>
            {/* Pending or Rejected Plan Request Info */}
            {dashboard.planRequest?.status === 'pending' && (
              <div className="mb-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                <span>Your plan request is <b>pending</b> admin approval.</span>
              </div>
            )}
            {dashboard.planRequest?.status === 'rejected' && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-1.414 1.414M6.343 17.657l-1.414-1.414M6.343 6.343l1.414 1.414M17.657 17.657l1.414-1.414M12 8v4m0 4h.01" /></svg>
                <span>Your plan request was <b>rejected</b>. Please contact support or try again.</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <span className="text-lg font-bold text-blue-600">{dashboard.planName}</span>
              <span className="text-gray-500">₹{dashboard.planPrice} / {dashboard.planDuration}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 font-semibold text-xs"><CheckCircle className="w-4 h-4" />{dashboard.planStatus || 'Active'}</span>
            </div>
            {/* KG or Amount Usage Progress */}
            {(() => {
              console.log('[Debug Elite Plus Status Bar]', {
                planName: dashboard?.planName,
                planKG: dashboard?.planKG,
                usage: dashboard?.usage,
                isElitePlus: dashboard?.planName === 'Elite Plus',
                isPlanKGValid: typeof dashboard?.planKG === 'number' && dashboard?.planKG > 0
              });
              return dashboard?.planName === 'Elite Plus' && typeof dashboard?.planKG === 'number' && dashboard.planKG > 0 && (
                <div className="mb-2">
                  <div className="text-gray-600">KG Usage:</div>
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-3 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((dashboard.usage || 0) / dashboard.planKG) * 100))}%` }}></div>
                    </div>
                    <span className="font-semibold text-blue-700">{dashboard.usage || 0} / {dashboard.planKG} KG</span>
                  </div>
                </div>
              );
            })()}
            {/* Elite Amount Usage */}
            {dashboard?.planName === 'Elite' && typeof dashboard?.planPrice === 'number' && dashboard.planPrice > 0 && (
              <div className="mb-2">
                <div className="text-gray-600">Amount Usage:</div>
                <div className="flex items-center gap-2">
                  <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-3 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((dashboard.amountUsed || 0) / dashboard.planPrice) * 100))}%` }}></div>
                  </div>
                  <span className="font-semibold text-blue-700">₹{dashboard.amountUsed || 0} / ₹{dashboard.planPrice}</span>
                </div>
              </div>
            )}
            {/* Show Renew/Upgrade buttons only if plan is not active or expired */}
            {!dashboard?.planStatus || dashboard.planStatus !== 'Active' || (dashboard.planExpired && new Date(dashboard.planExpired) < new Date()) ? (
              <div className="mt-4 flex gap-4">
                <Button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-semibold transition"
                  onClick={() => { setUpgradePlan(nextPlan); setShowUpgradeModal(true); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="mr-2 h-4 w-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.75L3 8"/><path d="M3 3v5h5"/><path d="M21 12a9 9 0 0 0-9 9 9.75 9.75 0 0 0 6.74-2.75L21 16"/><path d="M16 16h5v5"/></svg>
                  Renew Plan
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-gray-500">No plan found. Please purchase a plan.</div>
        )}
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-2 relative">
          <CreditCard className="w-7 h-7 text-purple-500" />
          <h2 className="text-3xl font-extrabold mb-0 text-blue-700 border-l-4 border-purple-500 pl-4">Payment History</h2>
          <button
            className="absolute right-0 top-1 flex items-center gap-1 text-blue-700 hover:underline text-sm font-semibold"
            onClick={() => setShowAllPayments(true)}
            aria-label="View All Payments"
          >
            View All
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <hr className="mb-6 border-purple-200" />
        {dashboard && Array.isArray(dashboard.payments) && dashboard.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl shadow-md overflow-hidden">
              <thead>
                <tr className="bg-blue-100 dark:bg-blue-900">
                  <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Date</th>
                  <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Amount</th>
                  <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Status</th>
                  <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard.payments || []).slice(0, 2).map((p, i) => (
                  <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-blue-50 dark:hover:bg-blue-950 transition`}>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{p.date}</td>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">₹{p.amount}</td>
                    <td className="py-3 px-6 align-middle">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${p.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-6 align-middle">
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold transition"
                        onClick={() => {
                          loadImageAsBase64('/signn.png', (signatureBase64) => {
                            generateReceipt(p, user, dashboard, signatureBase64);
                          });
                        }}
                      >
                        Download Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">No payments found.</div>
        )}
      </div>
      {/* All Payments Modal */}
      {showAllPayments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowAllPayments(false)} aria-label="Close">×</button>
            <h2 className="text-2xl font-bold mb-4 text-blue-700">All Payments</h2>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full rounded-xl shadow-md overflow-hidden">
                <thead>
                  <tr className="bg-blue-100 dark:bg-blue-900">
                    <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Date</th>
                    <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Amount</th>
                    <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Status</th>
                    <th className="py-3 px-6 text-blue-900 dark:text-blue-100 text-base font-bold">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sort payments by date (most recent first) */}
                  {dashboard.payments
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((p, i) => (
                    <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-blue-50 dark:hover:bg-blue-950 transition`}>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{p.date}</td>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">₹{p.amount}</td>
                      <td className="py-3 px-6 align-middle">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${p.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-6 align-middle">
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold transition"
                          onClick={() => {
                            loadImageAsBase64('/signn.png', (signatureBase64) => {
                              generateReceipt(p, user, dashboard, signatureBase64);
                            });
                          }}
                        >
                          Download Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* My Bookings Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-2 relative">
          <CreditCard className="w-7 h-7 text-green-500" />
          <h2 className="text-3xl font-extrabold mb-0 text-green-700 border-l-4 border-green-500 pl-4">My Bookings</h2>
          <button
            className="absolute right-0 top-1 flex items-center gap-1 text-green-700 hover:underline text-sm font-semibold"
            onClick={() => setShowAllBookings(true)}
            aria-label="View All Bookings"
          >
            View All
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <hr className="mb-6 border-green-200" />
        {bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl shadow-md overflow-hidden">
              <thead>
                <tr className="bg-green-100 dark:bg-green-900">
                  <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Service</th>
                  <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Pickup Date</th>
                  <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Pickup Time</th>
                  <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Address</th>
                  <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Status</th>
                  <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 2).map((b, i) => (
                  <tr key={b.id || i} className={`border-t ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-green-50 dark:hover:bg-green-950 transition`}>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.service}</td>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.pickupDate}</td>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.pickupTime}</td>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.address}</td>
                    <td className="py-3 px-6 align-middle">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        b.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                        b.status === 'completed' && !b.paidAt ? 'bg-orange-100 text-orange-700' : 
                        b.status === 'completed' && b.paidAt ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {b.status === 'completed' && !b.paidAt ? 'Payment Pending' :
                         b.status === 'completed' && b.paidAt ? 'Paid' :
                         b.status || 'pending'}
                      </span>
                      {b.status === 'completed' && !b.paidAt && (
                        <Button className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => handleOpenPayNowModal(b)}>
                          Pay Now
                        </Button>
                      )}
                      {b.status === 'completed' && b.paidAt && (
                        <span className="ml-2 text-green-600 text-xs">Paid on {new Date(b.paidAt).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.createdAt?.toDate ? b.createdAt.toDate().toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">No bookings found.</div>
        )}
      </div>
      {/* All Bookings Modal */}
      {showAllBookings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowAllBookings(false)} aria-label="Close">×</button>
            <h2 className="text-2xl font-bold mb-4 text-green-700">All Bookings</h2>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full rounded-xl shadow-md overflow-hidden">
                <thead>
                  <tr className="bg-green-100 dark:bg-green-900">
                    <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Service</th>
                    <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Pickup Date</th>
                    <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Pickup Time</th>
                    <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Address</th>
                    <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Status</th>
                    <th className="py-3 px-6 text-green-900 dark:text-green-100 text-base font-bold">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => (
                    <tr key={b.id || i} className={`border-t ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} hover:bg-green-50 dark:hover:bg-green-950 transition`}>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.service}</td>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.pickupDate}</td>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.pickupTime}</td>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.address}</td>
                      <td className="py-3 px-6 align-middle">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                          b.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                          b.status === 'completed' && !b.paidAt ? 'bg-orange-100 text-orange-700' : 
                          b.status === 'completed' && b.paidAt ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {b.status === 'completed' && !b.paidAt ? 'Payment Pending' :
                           b.status === 'completed' && b.paidAt ? 'Paid' :
                           b.status || 'pending'}
                        </span>
                        {b.status === 'completed' && !b.paidAt && (
                          <Button className="ml-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => handleOpenPayNowModal(b)}>
                            Pay Now
                          </Button>
                        )}
                        {b.status === 'completed' && b.paidAt && (
                          <span className="ml-2 text-green-600 text-xs">Paid on {new Date(b.paidAt).toLocaleDateString()}</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-gray-800 dark:text-white align-middle">{b.createdAt?.toDate ? b.createdAt.toDate().toLocaleString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Support Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-purple-100">
        <div>
          <div className="text-lg font-semibold text-gray-700 mb-1">Feedback & Support</div>
          <div className="text-gray-500 text-sm">Share your experience or get help with your membership.</div>
        </div>
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium mt-4 md:mt-0 transition"
          onClick={() => setShowSupportModal(true)}
        >
          Feedback & Support
        </button>
      </div>

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowRenewModal(false)} aria-label="Close">×</button>
            <h2 className="text-xl font-bold mb-4 text-blue-700">Renew Your Plan</h2>
            <MembershipPlan preselectedPlan={availablePlans[currentPlanIndex]} onClose={() => setShowRenewModal(false)} />
          </div>
        </div>
      )}
      {/* Upgrade Modal */}
      {showUpgradeModal && upgradePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowUpgradeModal(false)} aria-label="Close">×</button>
            <h2 className="text-xl font-bold mb-4 text-green-700">Upgrade to {upgradePlan.name}</h2>
            <MembershipPlan preselectedPlan={upgradePlan} onClose={() => setShowUpgradeModal(false)} />
          </div>
        </div>
      )}
      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => { setShowSupportModal(false); setSupportMsg(''); setSupportSuccess(false); setSupportSubject(''); setSupportCategory('Technical Issue'); setSupportPriority('Normal'); setSupportFile(null); setSupportFileUrl(''); setSupportError(''); }} aria-label="Close">×</button>
            <h2 className="text-xl font-bold mb-4 text-purple-700">Feedback & Support</h2>
            {supportSuccess ? (
              <div className="text-green-700 font-semibold text-center py-8 flex flex-col gap-4">
                <span>Thank you for your feedback! Our team will get back to you soon.</span>
                <button className="mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium" onClick={() => { setShowSupportModal(false); setSupportMsg(''); setSupportSuccess(false); setSupportSubject(''); setSupportCategory('Technical Issue'); setSupportPriority('Normal'); setSupportFile(null); setSupportFileUrl(''); setSupportError(''); }}>Close</button>
              </div>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                setSupportError('');
                if (!supportSubject.trim() || !supportMsg.trim()) {
                  setSupportError('Subject and message are required.');
                  return;
                }
                setSupportLoading(true);
                let fileUrl = '';
                try {
                  if (supportFile) {
                    const fileRef = ref(storage, `support_attachments/${Date.now()}_${supportFile.name}`);
                    await uploadBytes(fileRef, supportFile);
                    fileUrl = await getDownloadURL(fileRef);
                  }
                  await addDoc(collection(db, 'contact_messages'), {
                    name: user?.displayName || '',
                    email: user?.email || '',
                    subject: supportSubject,
                    category: supportCategory,
                    priority: supportPriority,
                    message: supportMsg,
                    attachment: fileUrl,
                    createdAt: Timestamp.now(),
                    read: false,
                  });
                  setSupportSuccess(true);
                  setSupportMsg('');
                  setSupportSubject('');
                  setSupportCategory('Technical Issue');
                  setSupportPriority('Normal');
                  setSupportFile(null);
                  setSupportFileUrl('');
                } catch (err) {
                  setSupportError('Failed to send feedback. Please try again.');
                }
                setSupportLoading(false);
              }}>
                {supportError && <div className="mb-3 text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">{supportError}</div>}
                <label className="block mb-2 font-medium text-gray-700">Subject<span className="text-red-500">*</span></label>
                <input
                  className="w-full border rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Enter subject"
                  value={supportSubject}
                  onChange={e => setSupportSubject(e.target.value)}
                  required
                />
                <label className="block mb-2 font-medium text-gray-700">Category</label>
                <select
                  className="w-full border rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={supportCategory}
                  onChange={e => setSupportCategory(e.target.value)}
                >
                  <option>Technical Issue</option>
                  <option>Billing</option>
                  <option>Suggestion</option>
                  <option>Other</option>
                </select>
                <label className="block mb-2 font-medium text-gray-700">Priority</label>
                <select
                  className="w-full border rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={supportPriority}
                  onChange={e => setSupportPriority(e.target.value)}
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
                <label className="block mb-2 font-medium text-gray-700">Attachment (optional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="mb-4"
                  onChange={e => setSupportFile(e.target.files[0])}
                />
                <label className="block mb-2 font-medium text-gray-700">Message<span className="text-red-500">*</span></label>
                <textarea
                  className="w-full border rounded-lg p-3 mb-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Type your feedback or support request here..."
                  value={supportMsg}
                  onChange={e => setSupportMsg(e.target.value)}
                  required
                  maxLength={1000}
                />
                <div className="text-xs text-gray-500 mb-4 text-right">{supportMsg.length}/1000 characters</div>
                <button
                  type="submit"
                  className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition disabled:opacity-60"
                  disabled={supportLoading || !supportSubject.trim() || !supportMsg.trim()}
                >
                  {supportLoading ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            )}
            {!supportSuccess && (
              <button
                type="button"
                className="block mx-auto mt-4 text-xs text-purple-600 hover:underline"
                onClick={() => { setShowSupportModal(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); setFaqOpen(0); }}
              >
                View FAQ & Help Center
              </button>
            )}
          </div>
        </div>
      )}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl shadow p-6 mt-12 border border-yellow-200">
        <h2 className="text-2xl font-bold text-yellow-800 mb-4">FAQ & Help Center</h2>
        <div className="space-y-2">
          {faqs.map((item, i) => (
            <div key={i} className="border border-yellow-100 rounded-lg bg-white">
              <button
                className="w-full flex justify-between items-center px-4 py-3 text-left font-semibold text-yellow-900 focus:outline-none"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-5 h-5 ml-2 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
              </button>
              {faqOpen === i && (
                <div className="px-4 pb-4 text-yellow-800 text-sm animate-fade-in">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {showPayNowModal.open && showPayNowModal.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowPayNowModal({ open: false, booking: null })} aria-label="Close">×</button>
            <h2 className="text-xl font-bold mb-4 text-blue-700">Pay Now</h2>
            <div className="mb-4 text-lg">Amount Due: <span className="font-bold">₹{showPayNowModal.booking.amountDue || showPayNowModal.booking.usage || 0}</span></div>
            <div className="flex flex-col gap-3">
              <Button onClick={handlePayWithOnline} disabled={payNowLoading} className="bg-blue-600 text-white">Pay Online</Button>
              <Button onClick={handlePayWithCredits} disabled={payNowLoading || (dashboard?.credits || 0) < (showPayNowModal.booking.amountDue || showPayNowModal.booking.usage || 0)} className="bg-green-600 text-white">
                Pay with Credits ({dashboard?.credits || 0} available)
              </Button>
              <Button onClick={handlePayWithCash} disabled={payNowLoading} className="bg-yellow-600 text-white">Pay with Cash</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 