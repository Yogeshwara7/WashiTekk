import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, deleteDoc, updateDoc as updateContactDoc, onSnapshot, addDoc } from 'firebase/firestore';
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

// List of admin emails (replace with your admin email(s))
const ADMIN_EMAILS = ['yogeshwara49@gmail.com'];

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
  const [tab, setTab] = useState('users');
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const [replyInputs, setReplyInputs] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  // Pagination state
  const [userPage, setUserPage] = useState(1);
  const [msgPage, setMsgPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const MSGS_PER_PAGE = 10;

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);

  // Analytics
  const totalUsers = users.length;
  const activePlans = users.filter(u => u.planStatus === 'Active').length;
  const totalPayments = users.reduce((sum, u) => sum + ((u.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)), 0);
  const feedbackCount = messages.length;
  const unreadFeedback = messages.filter(m => !m.read).length;

  // Admin notes state
  const [userNote, setUserNote] = useState('');
  const [userNoteSaving, setUserNoteSaving] = useState(false);
  const [msgNotes, setMsgNotes] = useState({});
  const [msgNoteSaving, setMsgNoteSaving] = useState({});

  const [notifications, setNotifications] = useState([]);

  // Add state for expanded reply/note rows
  const [expandedReply, setExpandedReply] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);

  // Modal state for feedback actions
  const [modalType, setModalType] = useState(null); // 'reply' or 'note'
  const [modalMsgId, setModalMsgId] = useState(null);

  // Real-time feedback notifications
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'contact_messages'), (snap) => {
      const newMsgs = snap.docChanges().filter(change => change.type === 'added').map(change => ({ id: change.doc.id, ...change.doc.data() })) as any[];
      if (newMsgs.length > 0) {
        setNotifications(n => [...n, ...newMsgs.map(m => ({ type: 'feedback', id: m.id, name: m.name, subject: m.subject }))]);
      }
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
    const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const booking = change.doc.data();
          setNotifications(n => [
            ...n,
            { type: 'booking', id: change.doc.id, name: booking.name || booking.email, service: booking.service }
          ]);
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
            setMsgSearch(state.searchQuery);
            break;
          case 'users':
            setUserSearch(state.searchQuery);
            break;
          case 'bookings':
            setBookingSearch(state.searchQuery);
            break;
        }
      }
      
      // Clear the navigation state after applying it
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Ensure admin access
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
      } catch (err) {
        setError('Failed to load users.');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch feedback/support messages
  useEffect(() => {
    if (tab !== 'feedback') return;
    setMsgLoading(true);
    getDocs(collection(db, 'contact_messages')).then(snap => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMsgLoading(false);
    });
  }, [tab]);

  // Load user note when modal opens
  useEffect(() => {
    if (selectedUser && selectedUser.adminNote !== undefined) setUserNote(selectedUser.adminNote);
    else setUserNote('');
  }, [selectedUser]);

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

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setEditForm(f => ({ ...f, address: { ...f.address, [key]: value } }));
    } else {
      setEditForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSave = async () => {
    setModalLoading(true);
    setModalMsg('');
    try {
      const docRef = doc(db, 'users', selectedUser.id);
      await updateDoc(docRef, {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        planName: editForm.planName,
        planPrice: editForm.planPrice,
        planDuration: editForm.planDuration,
        planStatus: editForm.planStatus,
        usage: editForm.usage,
      });
      setModalMsg('Profile updated!');
      setUsers(users => users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u));
    } catch (err) {
      setModalMsg('Failed to update profile.');
    }
    setModalLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setModalLoading(true);
    setModalMsg('');
    try {
      await deleteDoc(doc(db, 'users', selectedUser.id));
      setUsers(users => users.filter(u => u.id !== selectedUser.id));
      setModalOpen(false);
    } catch (err) {
      setModalMsg('Failed to delete user.');
    }
    setModalLoading(false);
  };

  const handleAddPayment = async () => {
    if (!newPayment.date || !newPayment.amount || !newPayment.status) return;
    setModalLoading(true);
    setModalMsg('');
    try {
      const docRef = doc(db, 'users', selectedUser.id);
      const updatedPayments = [ ...(selectedUser.payments || []), { ...newPayment } ];
      await updateDoc(docRef, { payments: updatedPayments });
      setUsers(users => users.map(u => u.id === selectedUser.id ? { ...u, payments: updatedPayments } : u));
      setSelectedUser(u => ({ ...u, payments: updatedPayments }));
      setNewPayment({ date: '', amount: '', status: '' });
      setModalMsg('Payment added!');
    } catch (err) {
      setModalMsg('Failed to add payment.');
    }
    setModalLoading(false);
  };

  const handleRemovePayment = async (idx) => {
    setModalLoading(true);
    setModalMsg('');
    try {
      const updatedPayments = (selectedUser.payments || []).filter((_, i) => i !== idx);
      const docRef = doc(db, 'users', selectedUser.id);
      await updateDoc(docRef, { payments: updatedPayments });
      setUsers(users => users.map(u => u.id === selectedUser.id ? { ...u, payments: updatedPayments } : u));
      setSelectedUser(u => ({ ...u, payments: updatedPayments }));
      setModalMsg('Payment removed!');
    } catch (err) {
      setModalMsg('Failed to remove payment.');
    }
    setModalLoading(false);
  };

  const handleMarkRead = async (id, read) => {
    await updateContactDoc(doc(db, 'contact_messages', id), { read });
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, read } : m));
  };
  const handleDeleteMsg = async (id) => {
    await deleteDoc(doc(db, 'contact_messages', id));
    setMessages(msgs => msgs.filter(m => m.id !== id));
  };

  const handleReplyChange = (id, value) => {
    setReplyInputs(inputs => ({ ...inputs, [id]: value }));
  };
  const handleSendReply = async (msg) => {
    const reply = replyInputs[msg.id]?.trim();
    if (!reply) return;
    const docRef = doc(db, 'contact_messages', msg.id);
    const newReply = {
      text: reply,
      admin: user?.email || 'admin',
      date: new Date().toISOString(),
    };
    const prevReplies = msg.replies || [];
    await updateContactDoc(docRef, { replies: [...prevReplies, newReply] });
    setMessages(msgs => msgs.map(m => m.id === msg.id ? { ...m, replies: [...prevReplies, newReply] } : m));
    setReplyInputs(inputs => ({ ...inputs, [msg.id]: '' }));
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (!search ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())));
    const matchesPlan = !planFilter || u.planName === planFilter;
    const matchesStatus = !statusFilter || u.planStatus === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Paginated users/messages
  const paginatedUsers = filteredUsers.slice((userPage-1)*USERS_PER_PAGE, userPage*USERS_PER_PAGE);

  const filteredMessages = messages.filter(m =>
    (!msgSearch ||
      m.email?.toLowerCase().includes(msgSearch.toLowerCase()) ||
      m.name?.toLowerCase().includes(msgSearch.toLowerCase()) ||
      m.subject?.toLowerCase().includes(msgSearch.toLowerCase()) ||
      m.message?.toLowerCase().includes(msgSearch.toLowerCase()))
  );

  // Paginated messages
  const paginatedMessages = filteredMessages.slice((msgPage-1)*MSGS_PER_PAGE, msgPage*MSGS_PER_PAGE);

  // Reset page on filter/search change
  useEffect(() => { setUserPage(1); }, [search, planFilter, statusFilter]);
  useEffect(() => { setMsgPage(1); }, [msgSearch]);

  const exportFeedbackCSV = () => {
    const header = ['Name', 'Email', 'Subject', 'Message', 'Date', 'Status', 'Replies'];
    const rows = paginatedMessages.map(m => [
      m.name || '',
      m.email || '',
      m.subject || '',
      m.message || '',
      m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : '',
      m.read ? 'Read' : 'Unread',
      (m.replies || []).map(r => `${r.admin} (${r.date}): ${r.text}`).join(' | ')
    ]);
    const csv = [header, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_messages.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk user actions
  const handleUserSelect = (id) => {
    setSelectedUserIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };
  const handleUserSelectAll = () => {
    const ids = paginatedUsers.map(u => u.id);
    setSelectedUserIds(selectedUserIds.length === ids.length ? [] : ids);
  };
  const handleBulkDeleteUsers = async () => {
    if (!window.confirm('Delete selected users?')) return;
    for (const id of selectedUserIds) {
      await deleteDoc(doc(db, 'users', id));
    }
    setUsers(users => users.filter(u => !selectedUserIds.includes(u.id)));
    setSelectedUserIds([]);
  };
  // Bulk message actions
  const handleMsgSelect = (id) => {
    setSelectedMsgIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };
  const handleMsgSelectAll = () => {
    const ids = paginatedMessages.map(m => m.id);
    setSelectedMsgIds(selectedMsgIds.length === ids.length ? [] : ids);
  };
  const handleBulkDeleteMsgs = async () => {
    if (!window.confirm('Delete selected messages?')) return;
    for (const id of selectedMsgIds) {
      await deleteDoc(doc(db, 'contact_messages', id));
    }
    setMessages(msgs => msgs.filter(m => !selectedMsgIds.includes(m.id)));
    setSelectedMsgIds([]);
  };
  const handleBulkMarkRead = async (read) => {
    for (const id of selectedMsgIds) {
      await updateContactDoc(doc(db, 'contact_messages', id), { read });
    }
    setMessages(msgs => msgs.map(m => selectedMsgIds.includes(m.id) ? { ...m, read } : m));
    setSelectedMsgIds([]);
  };
  const handleBulkExportMsgs = () => {
    const header = ['Name', 'Email', 'Subject', 'Message', 'Date', 'Status', 'Replies'];
    const rows = paginatedMessages.filter(m => selectedMsgIds.includes(m.id)).map(m => [
      m.name || '',
      m.email || '',
      m.subject || '',
      m.message || '',
      m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : '',
      m.read ? 'Read' : 'Unread',
      (m.replies || []).map(r => `${r.admin} (${r.date}): ${r.text}`).join(' | ')
    ]);
    const csv = [header, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_feedback_messages.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveUserNote = async () => {
    setUserNoteSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), { adminNote: userNote });
      setUsers(users => users.map(u => u.id === selectedUser.id ? { ...u, adminNote: userNote } : u));
    } finally {
      setUserNoteSaving(false);
    }
  };
  // Feedback message notes
  const handleMsgNoteChange = (id, value) => {
    setMsgNotes(notes => ({ ...notes, [id]: value }));
  };
  const handleSaveMsgNote = async (msg) => {
    setMsgNoteSaving(s => ({ ...s, [msg.id]: true }));
    await updateContactDoc(doc(db, 'contact_messages', msg.id), { adminNote: msgNotes[msg.id] });
    setMessages(msgs => msgs.map(m => m.id === msg.id ? { ...m, adminNote: msgNotes[msg.id] } : m));
    setMsgNoteSaving(s => ({ ...s, [msg.id]: false }));
  };

  // User impersonation
  const handleImpersonate = (userId) => {
    window.open(`/dashboard?impersonate=${userId}`, '_blank');
  };

  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const [showAllUserPayments, setShowAllUserPayments] = useState({ open: false, user: null });

  const [bookings, setBookings] = useState([]);
  const [bookingActionLoading, setBookingActionLoading] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState({ open: false, booking: null });

  // Fetch bookings
  useEffect(() => {
    if (tab !== 'bookings') return;
    getDocs(collection(db, 'bookings')).then(snap => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [tab]);

  // Accept booking
  const handleAcceptBooking = async (booking) => {
    setBookingActionLoading(booking.id);
    await updateDoc(doc(db, 'bookings', booking.id), { 
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    setBookings(bks => bks.map(b => b.id === booking.id ? { 
      ...b, 
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    } : b));

    // Add notification to user
    if (booking.email) {
      const notifRef = collection(db, 'users');
      const userSnap = await getDocs(notifRef);
      const userDoc = userSnap.docs.find(u => u.data().email === booking.email);
      if (userDoc) {
        await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
          title: 'Booking Accepted',
          body: `Your booking for ${booking.service} has been accepted! We'll update the usage after processing.`,
          type: 'booking',
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    }
    setBookingActionLoading('');
  };

  // Add new function to update usage after weighing
  const handleUpdateUsage = (booking) => {
    setUsageModal({ 
      open: true, 
      user: { 
        id: booking.userId,
        planName: booking.planName,
        planKG: booking.planKG,
        planBalance: booking.planBalance,
        email: booking.email
      }, 
      value: '',
      bookingId: booking.id
    });
  };

  // Reject booking
  const handleRejectBooking = async (booking, reason) => {
    setBookingActionLoading(booking.id);
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'rejected', rejectReason: reason });
    setBookings(bks => bks.map(b => b.id === booking.id ? { ...b, status: 'rejected', rejectReason: reason } : b));
    // Add notification to user
    if (booking.email) {
      const notifRef = collection(db, 'users');
      const userSnap = await getDocs(notifRef);
      const userDoc = userSnap.docs.find(u => u.data().email === booking.email);
      if (userDoc) {
        await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
          title: 'Booking Rejected',
          body: `Your booking for ${booking.service} was rejected.${reason ? ' Reason: ' + reason : ''}`,
          type: 'booking',
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    }
    setBookingActionLoading('');
    setShowRejectModal({ open: false, booking: null });
    setRejectReason('');
  };

  const [analyticsTab, setAnalyticsTab] = useState('bookings');
  const [analyticsData, setAnalyticsData] = useState({ bookings: [], payments: [], topServices: [], topUsers: [] });

  // Fetch analytics data
  useEffect(() => {
    if (tab !== 'analytics') return;
    // Bookings over time
    getDocs(collection(db, 'bookings')).then(snap => {
      const bookings = snap.docs.map(doc => doc.data());
      // Group by date
      const bookingsByDate = {};
      bookings.forEach(b => {
        const date = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown';
        bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
      });
      const bookingsOverTime = Object.entries(bookingsByDate).map(([date, count]) => ({ date, count }));
      // Top services
      const serviceCounts = {};
      bookings.forEach(b => {
        if (b.service) serviceCounts[b.service] = (serviceCounts[b.service] || 0) + 1;
      });
      const topServices = Object.entries(serviceCounts).map(([service, count]) => ({ service, count }));
      // Top users
      const userCounts = {};
      bookings.forEach(b => {
        if (b.email) userCounts[b.email] = (userCounts[b.email] || 0) + 1;
      });
      const topUsers = Object.entries(userCounts).map(([email, count]) => ({ email, count }));
      // Payments over time
      getDocs(collection(db, 'users')).then(userSnap => {
        let payments = [];
        userSnap.docs.forEach(u => {
          (u.data().payments || []).forEach(p => {
            payments.push(p);
          });
        });
        const paymentsByDate = {};
        payments.forEach(p => {
          const date = p.date ? new Date(p.date).toLocaleDateString() : 'Unknown';
          paymentsByDate[date] = (paymentsByDate[date] || 0) + 1;
        });
        const paymentsOverTime = Object.entries(paymentsByDate).map(([date, count]) => ({ date, count }));
        setAnalyticsData({ bookings: bookingsOverTime, payments: paymentsOverTime, topServices, topUsers });
      });
    });
  }, [tab]);

  const [planRequests, setPlanRequests] = useState<PlanRequestUser[]>([]);
  const [planReqTabLoading, setPlanReqTabLoading] = useState(false);
  const [planRequestStatusFilter, setPlanRequestStatusFilter] = useState('');
  const [planRequestSearch, setPlanRequestSearch] = useState('');
  const [rejectModal, setRejectModal] = useState({ open: false, user: null, reason: '' });

  // Fetch all plan requests (not just pending)
  useEffect(() => {
    if (tab !== 'requests') return;
    setPlanReqTabLoading(true);
    getDocs(collection(db, 'users')).then(snap => {
      const reqs = snap.docs
        .map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        .filter(u => u.planRequest)
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          planRequest: u.planRequest
        })) as PlanRequestUser[];
      setPlanRequests(reqs);
      setPlanReqTabLoading(false);
    });
  }, [tab]);

  const handleApproveRequest = async (user) => {
    const userRef = doc(db, 'users', user.id);
    // Update user plan fields
    await updateDoc(userRef, {
      planName: user.planRequest.plan,
      planPrice: user.planRequest.price,
      planDuration: user.planRequest.duration,
      planStatus: 'Active',
      planKG: user.planRequest.kgLimit,
      planConditioner: user.planRequest.conditioner || '',
      planPaymentMethod: user.planRequest.paymentMethod,
      planTxnId: user.planRequest.txnId || '',
      planActivatedAt: new Date().toISOString(),
      planRequest: { ...user.planRequest, status: 'approved', approvedAt: new Date().toISOString() }
    });
    // Add to bookings collection
    await addDoc(collection(db, 'bookings'), {
      userId: user.id,
      name: user.name,
      username: user.username || '',
      email: user.email,
      planName: user.planRequest.plan,
      planPrice: user.planRequest.price,
      planDuration: user.planRequest.duration,
      planKG: user.planRequest.kgLimit,
      planConditioner: user.planRequest.conditioner || '',
      planPaymentMethod: user.planRequest.paymentMethod,
      planTxnId: user.planRequest.txnId || '',
      status: 'accepted',
      createdAt: new Date(),
      customBookingId: nanoid(8), // Secure, short custom ID for display/search
      // ...add other fields as needed
    });
    // Add notification
    await addDoc(collection(db, 'users', user.id, 'notifications'), {
      title: 'Request Approved',
      body: `Your ${user.planRequest.plan} request has been approved and moved to bookings!`,
      type: 'plan',
      read: false,
      createdAt: Timestamp.now(),
    });
    setPlanRequests(reqs => reqs.map(u2 => u2.id === user.id ? { ...u2, planRequest: { ...u2.planRequest, status: 'approved', approvedAt: new Date().toISOString() } } : u2));
  };
  const handleRejectPlanRequest = async (user, reason) => {
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      planRequest: { ...user.planRequest, status: 'rejected', rejectedAt: new Date().toISOString(), rejectReason: reason }
    });
    await addDoc(collection(db, 'users', user.id, 'notifications'), {
      title: 'Plan Request Rejected',
      body: `Your ${user.planRequest.plan} plan request was rejected.${reason ? ' Reason: ' + reason : ''}`,
      type: 'plan',
      read: false,
      createdAt: Timestamp.now(),
    });
    setPlanRequests(reqs => reqs.map(u2 => u2.id === user.id ? { ...u2, planRequest: { ...u2.planRequest, status: 'rejected', rejectedAt: new Date().toISOString(), rejectReason: reason } } : u2));
    setRejectModal({ open: false, user: null, reason: '' });
  };

  const filteredPlanRequests = planRequests.filter(u => {
    const matchesStatus = !planRequestStatusFilter || u.planRequest.status === planRequestStatusFilter;
    const matchesSearch = !planRequestSearch || (u.name?.toLowerCase().includes(planRequestSearch.toLowerCase()) || u.email?.toLowerCase().includes(planRequestSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Add state for usage modal
  const [usageModal, setUsageModal] = useState({ open: false, user: null, value: '', bookingId: null });

  // Add button in user row to open usage modal
  const handleUsageModal = (user) => {
    setUsageModal({ open: true, user, value: '', bookingId: null });
  };

  // Add deduction logic
  const handleDeductUsage = async () => {
    if (!usageModal.user || !usageModal.user.id) {
      alert('User not found for deduction!');
      return;
    }
    if (!usageModal.bookingId) {
      alert('Booking not found for deduction!');
      return;
    }
    const userRef = doc(db, 'users', usageModal.user.id);
    const bookingRef = doc(db, 'bookings', usageModal.bookingId);

    try {
      // Update user's remaining balance
      if (usageModal.user.planName === 'Elite Plus') {
        const newKG = (usageModal.user.planKG || 0) - Number(usageModal.value);
        await updateDoc(userRef, { planKG: newKG });
      } else {
        const newBalance = (usageModal.user.planBalance || 0) - Number(usageModal.value);
        await updateDoc(userRef, { planBalance: newBalance });
      }

      // Update booking status and add usage
      await updateDoc(bookingRef, {
        status: 'accepted',
        usage: Number(usageModal.value),
        acceptedAt: new Date().toISOString()
      });

      // Update local state
      setBookings(bks => bks.map(b => b.id === usageModal.bookingId ? {
        ...b,
        status: 'accepted',
        usage: Number(usageModal.value),
        acceptedAt: new Date().toISOString()
      } : b));

      // Add notification to user
      if (usageModal.user.email) {
        const notifRef = collection(db, 'users');
        const userSnap = await getDocs(notifRef);
        const userDoc = userSnap.docs.find(u => u.data().email === usageModal.user.email);
        if (userDoc) {
          await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
            title: 'Booking Usage Updated',
            body: `Your booking usage has been updated: ${usageModal.value} ${usageModal.user.planName === 'Elite Plus' ? 'KG' : '₹'} has been deducted from your balance.`,
            type: 'booking',
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }

      setUsageModal({ open: false, user: null, value: '', bookingId: null });
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Error updating booking usage. Please try again.');
    }
  };

  // Add new state for history tab
  const [historyTab, setHistoryTab] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // 1. Filter requests: Only show pending in Requests tab
  const filteredRequests = planRequests.filter(u => u.planRequest.status === 'pending' && (!planRequestSearch || (u.name?.toLowerCase().includes(planRequestSearch.toLowerCase()) || u.email?.toLowerCase().includes(planRequestSearch.toLowerCase()))));

  // 2. In History tab, show both completed and rejected requests
  const historyRequests = planRequests.filter(u => u.planRequest.status === 'rejected' || u.planRequest.status === 'completed');

  // Add state for notification dropdown
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mark all notifications as read when dropdown is opened
  useEffect(() => {
    if (notifDropdownOpen) {
      setNotifications(n => n.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } else {
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifDropdownOpen, notifications]);

  const handleCompleteOrder = (booking) => {
    // TODO: Implement order completion logic
    alert(`Order for ${booking.name || booking.email} marked as complete!`);
  };

  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifDropdownOpen]);

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-600 text-center mt-8">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto py-16 px-2 md:px-4 pt-24">
      <h1 className="text-4xl font-extrabold mb-6 text-blue-700 text-center tracking-tight drop-shadow">Admin Dashboard</h1>
      {/* Analytics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
        <div className="bg-blue-50 rounded-xl p-2 md:p-4 text-center flex flex-col items-center shadow">
          <Users className="w-6 h-6 text-blue-400 mb-1" />
          <div className="text-xl md:text-2xl font-bold text-blue-700">{totalUsers}</div>
          <div className="text-xs text-gray-600">Total Users</div>
        </div>
        <div className="bg-green-50 rounded-xl p-2 md:p-4 text-center flex flex-col items-center shadow">
          <TrendingUp className="w-6 h-6 text-green-400 mb-1" />
          <div className="text-xl md:text-2xl font-bold text-green-700">{activePlans}</div>
          <div className="text-xs text-gray-600">Active Plans</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-2 md:p-4 text-center flex flex-col items-center shadow">
          <CreditCard className="w-6 h-6 text-yellow-400 mb-1" />
          <div className="text-xl md:text-2xl font-bold text-yellow-700">₹{totalPayments}</div>
          <div className="text-xs text-gray-600">Total Payments</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-2 md:p-4 text-center flex flex-col items-center shadow">
          <MessageCircle className="w-6 h-6 text-purple-400 mb-1" />
          <div className="text-xl md:text-2xl font-bold text-purple-700">{feedbackCount}</div>
          <div className="text-xs text-gray-600">Feedback</div>
        </div>
        <div className="bg-red-50 rounded-xl p-2 md:p-4 text-center flex flex-col items-center shadow">
          <UserCircle className="w-6 h-6 text-red-400 mb-1" />
          <div className="text-xl md:text-2xl font-bold text-red-700">{unreadFeedback}</div>
          <div className="text-xs text-gray-600">Unread Feedback</div>
        </div>
      </div>
      <div className="mb-8 border-b border-blue-100"></div>
      {/* Tab Buttons */}
      <div className="flex gap-4 mb-8 justify-center">
        <Button onClick={() => setTab('users')} variant={tab === 'users' ? 'default' : 'outline'} className="rounded-full px-6 py-2 text-base shadow-sm">Users</Button>
        <Button onClick={() => setTab('bookings')} variant={tab === 'bookings' ? 'default' : 'outline'} className="rounded-full px-6 py-2 text-base shadow-sm">Bookings</Button>
        <Button onClick={() => setTab('history')} variant={tab === 'history' ? 'default' : 'outline'} className="rounded-full px-6 py-2 text-base shadow-sm">History</Button>
        <Button onClick={() => setTab('requests')} variant={tab === 'requests' ? 'default' : 'outline'} className="rounded-full px-6 py-2 text-base shadow-sm">Requests</Button>
        <Button onClick={() => setTab('analytics')} variant={tab === 'analytics' ? 'default' : 'outline'} className="rounded-full px-6 py-2 text-base shadow-sm">Analytics</Button>
        <Button onClick={() => setTab('feedback')} variant={tab === 'feedback' ? 'default' : 'outline'} className="rounded-full px-6 py-2 text-base shadow-sm">Feedback & Support</Button>
      </div>
      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-blue-100">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">All Users</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <Input
              type="text"
              placeholder="Search by User ID, name, or email"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base">
              <thead className="bg-blue-50">
                <tr>
                  <th className="py-2 px-4">User ID</th>
                  <th className="py-2 px-4">User</th>
                  <th className="py-2 px-4">Plan</th>
                  <th className="py-2 px-4">Price</th>
                  <th className="py-2 px-4">Duration</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Payments</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u =>
                    !userSearch ||
                    (u.id && u.id.toLowerCase().includes(userSearch.toLowerCase())) ||
                    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
                    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
                  )
                  .map((u, i) => (
                    <tr key={u.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-blue-700 font-bold">{u.username || u.id}</td>
                      <td className="py-2 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 text-base">
                            <AvatarFallback>{(u.name || u.email || 'U')[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            {u.name && <div className="font-bold text-base text-gray-900">{u.name}</div>}
                            <div className="font-mono text-xs text-gray-700 flex items-center gap-1">
                              <span title={u.id}>{u.id.slice(0, 6)}...{u.id.slice(-4)}</span>
                              <button
                                className="p-1 rounded hover:bg-gray-200"
                                title="Copy User ID"
                                onClick={e => { e.stopPropagation(); copyToClipboard(u.id); }}
                              >
                                <ClipboardCopy className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 align-middle font-semibold text-blue-900">{u.planName}</td>
                      <td className="py-2 px-4 align-middle">₹{u.planPrice}</td>
                      <td className="py-2 px-4 align-middle">{u.planDuration}</td>
                      <td className="py-2 px-4 align-middle">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${u.planStatus === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>{u.planStatus}</span>
                      </td>
                      <td className="py-2 px-4 align-middle">
                        <div className="flex flex-col gap-2">
                          {(u.payments || []).length === 0 && <span className="text-gray-400 text-xs">No payments</span>}
                          {(u.payments || []).slice(0, 2).map((p, j) => (
                            <div key={j} className="border border-gray-200 rounded p-2 bg-white flex flex-col gap-0.5 text-xs min-w-[140px]">
                              <div className="text-gray-700 font-mono">{p.date}</div>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">₹{p.amount}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${p.status === 'Success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>{p.status}</span>
                              </div>
                            </div>
                          ))}
                          {(u.payments || []).length > 2 && (
                            <button
                              className="mt-1 flex items-center gap-1 text-blue-700 hover:underline text-xs font-semibold"
                              onClick={e => { e.stopPropagation(); setShowAllUserPayments({ open: true, user: u }); }}
                              aria-label="View All Payments"
                            >
                              View All
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 align-middle">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleUsageModal(u); 
                            }}
                            className="bg-blue-600 text-white"
                          >
                            Enter Used {u.planName === 'Elite Plus' ? 'KG' : 'Amount'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button onClick={() => setUserPage(p => Math.max(1, p-1))} disabled={userPage === 1}>Prev</Button>
            <span>Page {userPage} of {Math.ceil(filteredUsers.length/USERS_PER_PAGE) || 1}</span>
            <Button onClick={() => setUserPage(p => p+1)} disabled={userPage*USERS_PER_PAGE >= filteredUsers.length}>Next</Button>
          </div>
        </div>
      )}
      {/* Bookings Tab */}
      {tab === 'bookings' && (
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-green-100">
          <h2 className="text-2xl font-bold mb-4 text-green-700">All Bookings</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <Input
              type="text"
              placeholder="Search by Booking ID, user name, or email"
              value={bookingSearch}
              onChange={e => setBookingSearch(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base">
              <thead className="bg-green-50">
                <tr>
                  <th className="py-2 px-4">Booking ID</th>
                  <th className="py-2 px-4">Service</th>
                  <th className="py-2 px-4">User</th>
                  <th className="py-2 px-4">Pickup Date</th>
                  <th className="py-2 px-4">Pickup Time</th>
                  <th className="py-2 px-4">Address</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Created At</th>
                  <th className="py-2 px-4">Usage</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings
                  .filter(b =>
                    !bookingSearch ||
                    (b.customBookingId && b.customBookingId.toLowerCase().includes(bookingSearch.toLowerCase())) ||
                    (b.name && b.name.toLowerCase().includes(bookingSearch.toLowerCase())) ||
                    (b.email && b.email.toLowerCase().includes(bookingSearch.toLowerCase()))
                  )
                  .map((b, i) => (
                    <tr key={b.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-blue-700 font-bold">{b.customBookingId || '-'}</td>
                      <td className="py-2 px-4 align-middle">{b.service}</td>
                      <td className="py-2 px-4 align-middle">{b.username || b.name || b.email}</td>
                      <td className="py-2 px-4 align-middle">{b.pickupDate}</td>
                      <td className="py-2 px-4 align-middle">{b.pickupTime}</td>
                      <td className="py-2 px-4 align-middle">{b.address}</td>
                      <td className="py-2 px-4 align-middle">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${b.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : b.status === 'accepted' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{b.status}</span>
                        {b.status === 'rejected' && b.rejectReason && <div className="text-xs text-red-500 mt-1">Reason: {b.rejectReason}</div>}
                        {b.status === 'accepted' && b.usage && (
                          <div className="text-xs text-green-600 mt-1">
                            Used: {b.usage} {b.planName === 'Elite Plus' ? 'KG' : '₹'}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">{b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleString() : ''}</td>
                      <td className="py-2 px-4 align-middle">
                        <span className="font-semibold">{b.usage} {b.planName === 'Elite Plus' ? 'KG' : '₹'}</span>
                      </td>
                      <td className="py-2 px-4 align-middle">
                        {b.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" disabled={bookingActionLoading === b.id} onClick={() => handleAcceptBooking(b)} className="bg-green-600 text-white">Accept</Button>
                            <Button size="sm" disabled={bookingActionLoading === b.id} onClick={() => setShowRejectModal({ open: true, booking: b })} className="bg-red-600 text-white">Reject</Button>
                          </div>
                        )}
                        {b.status === 'accepted' && !b.usage && (
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateUsage(b)} 
                            className="bg-blue-600 text-white"
                          >
                            Update Usage
                          </Button>
                        )}
                        {b.status === 'accepted' && b.usage && (
                          <Button size="sm" className="bg-purple-600 text-white" onClick={() => handleCompleteOrder(b)}>
                            Complete Order
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* History Tab */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-blue-100">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">History</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <Input
              type="text"
              placeholder="Search by user name or email"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base">
              <thead className="bg-blue-50">
                <tr>
                  <th className="py-2 px-4">User</th>
                  <th className="py-2 px-4">Plan/Service</th>
                  <th className="py-2 px-4">Type</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Requested At</th>
                  <th className="py-2 px-4">Completed/Rejected At</th>
                  <th className="py-2 px-4">Rejection Reason</th>
                </tr>
              </thead>
              <tbody>
                {historyRequests
                  .filter(h =>
                    !historySearch ||
                    (h.name && h.name.toLowerCase().includes(historySearch.toLowerCase())) ||
                    (h.email && h.email.toLowerCase().includes(historySearch.toLowerCase()))
                  )
                  .map((h, i) => (
                    <tr key={h.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                      <td className="py-2 px-4 align-middle">{h.name || h.email}</td>
                      <td className="py-2 px-4 align-middle">{h.planRequest.plan}</td>
                      <td className="py-2 px-4 align-middle">{h.planRequest.type}</td>
                      <td className="py-2 px-4 align-middle font-semibold capitalize">{h.planRequest.status}</td>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">{h.planRequest.requestedAt ? new Date(h.planRequest.requestedAt).toLocaleString() : ''}</td>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">{
                        h.planRequest.rejectedAt
                          ? new Date(h.planRequest.rejectedAt).toLocaleString()
                          : h.planRequest.approvedAt
                            ? new Date(h.planRequest.approvedAt).toLocaleString()
                            : ''
                      }</td>
                      <td className="py-2 px-4 align-middle text-red-700">{h.planRequest.rejectReason || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-blue-100">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Bookings Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analyticsData.bookings} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Payments Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.payments} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Top Services</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={analyticsData.topServices} dataKey="count" nameKey="service" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Most Active Users</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.topUsers} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="email" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      {/* Feedback Tab */}
      {tab === 'feedback' && (
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-purple-100">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <Input
              type="text"
              placeholder="Search messages by name, email, subject, or content"
              value={msgSearch}
              onChange={e => setMsgSearch(e.target.value)}
              className="mb-4 w-full md:w-96"
            />
            <div className="flex gap-2 mb-2">
              <Button onClick={handleBulkDeleteMsgs} disabled={selectedMsgIds.length === 0} variant="destructive">Delete Selected</Button>
              <Button onClick={() => handleBulkMarkRead(true)} disabled={selectedMsgIds.length === 0}>Mark Read</Button>
              <Button onClick={() => handleBulkMarkRead(false)} disabled={selectedMsgIds.length === 0}>Mark Unread</Button>
              <Button onClick={handleBulkExportMsgs} disabled={selectedMsgIds.length === 0}>Export Selected</Button>
            </div>
          </div>
          <div className="flex justify-end mb-4">
            <Button onClick={exportFeedbackCSV} className="bg-blue-600 text-white">Export CSV</Button>
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-[900px] md:min-w-full text-left text-xs md:text-base">
              <thead className="bg-purple-50">
                <tr>
                  <th className="py-2 px-4"><input type="checkbox" checked={selectedMsgIds.length === paginatedMessages.length && paginatedMessages.length > 0} onChange={handleMsgSelectAll} /></th>
                  <th className="py-2 px-4"><UserCircle className="inline w-5 h-5 mr-1 text-purple-400" />User</th>
                  <th className="py-2 px-4">Subject</th>
                  <th className="py-2 px-4">Message</th>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Admin Note</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.map((m, i) => (
                  <tr key={m.id} className={`transition ${i % 2 === 0 ? 'bg-purple-50/40' : 'bg-white'} hover:bg-purple-100/60 border-b border-purple-100`}>
                    <td className="py-3 px-4 align-middle"><input type="checkbox" checked={selectedMsgIds.includes(m.id)} onChange={() => handleMsgSelect(m.id)} /></td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 text-base bg-purple-200 text-purple-700">
                          <AvatarFallback>{(m.name || m.email || 'U')[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-base text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-gray-700">{m.subject || <span className="text-gray-400">NA</span>}</td>
                    <td className="py-3 px-4 align-middle text-gray-700">{m.message || <span className="text-gray-400">NA</span>}</td>
                    <td className="py-3 px-4 align-middle font-mono text-xs text-gray-700">{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : ''}</td>
                    <td className="py-3 px-4 align-middle">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${m.read ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>{m.read ? 'Read' : 'Unread'}</span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold shadow-sm transition"
                        onClick={() => { setModalType('note'); setModalMsgId(m.id); }}
                      >
                        <StickyNote className="w-4 h-4" /> {m.adminNote ? 'Edit Note' : 'Add Note'}
                      </button>
                    </td>
                    <td className="py-3 px-4 align-middle flex gap-2">
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold shadow-sm transition"
                        onClick={() => { setModalType('reply'); setModalMsgId(m.id); }}
                      >
                        <MessageCircle className="w-4 h-4" /> Reply
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 hover:bg-gray-200 text-gray-700 text-xs font-semibold shadow-sm border border-gray-200 transition"
                        onClick={() => handleMarkRead(m.id, !m.read)}
                      >
                        <Pencil className="w-4 h-4" /> {m.read ? 'Mark Unread' : 'Mark Read'}
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold shadow-sm border border-red-200 transition"
                        onClick={() => handleDeleteMsg(m.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button onClick={() => setMsgPage(p => Math.max(1, p-1))} disabled={msgPage === 1}>Prev</Button>
            <span>Page {msgPage} of {Math.ceil(filteredMessages.length/MSGS_PER_PAGE) || 1}</span>
            <Button onClick={() => setMsgPage(p => p+1)} disabled={msgPage*MSGS_PER_PAGE >= filteredMessages.length}>Next</Button>
          </div>
        </div>
      )}
      {/* Plan Requests Tab */}
      {tab === 'requests' && (
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-yellow-100">
          <h2 className="text-2xl font-bold mb-4 text-yellow-700">Requests</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <input
              type="text"
              placeholder="Search by name or email"
              value={planRequestSearch}
              onChange={e => setPlanRequestSearch(e.target.value)}
              className="w-full md:w-64 border rounded px-3 py-2 text-base"
            />
            <select
              className="border rounded px-3 py-2 text-base w-full md:w-48"
              value={planRequestStatusFilter}
              onChange={e => setPlanRequestStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {planReqTabLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredPlanRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No plan requests found.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="py-2 px-4">User</th>
                    <th className="py-2 px-4">Plan</th>
                    <th className="py-2 px-4">Service Type</th>
                    <th className="py-2 px-4">KG Limit</th>
                    <th className="py-2 px-4">Conditioner</th>
                    <th className="py-2 px-4">Payment</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Requested At</th>
                    <th className="py-2 px-4">Approved At</th>
                    <th className="py-2 px-4">Rejected At</th>
                    <th className="py-2 px-4">Rejection Reason</th>
                    <th className="py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlanRequests.map((u, i) => (
                    <tr key={u.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                      <td className="py-2 px-4 align-middle">{u.name || u.email}</td>
                      <td className="py-2 px-4 align-middle">{u.planRequest.plan}</td>
                      <td className="py-2 px-4 align-middle">{u.planRequest.type === 'with' ? 'With Fabric Conditioner' : 'Without Fabric Conditioner'}</td>
                      <td className="py-2 px-4 align-middle">{u.planRequest.kgLimit}</td>
                      <td className="py-2 px-4 align-middle">{u.planRequest.conditioner || '-'}</td>
                      <td className="py-2 px-4 align-middle">{u.planRequest.paymentMethod === 'cash' ? 'Hard Cash' : `Online (Txn ID: ${u.planRequest.txnId})`}</td>
                      <td className="py-2 px-4 align-middle font-semibold capitalize">{u.planRequest.status}</td>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">{u.planRequest.requestedAt ? new Date(u.planRequest.requestedAt).toLocaleString() : ''}</td>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">{u.planRequest.approvedAt ? new Date(u.planRequest.approvedAt).toLocaleString() : ''}</td>
                      <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">{u.planRequest.rejectedAt ? new Date(u.planRequest.rejectedAt).toLocaleString() : ''}</td>
                      <td className="py-2 px-4 align-middle text-red-700">{u.planRequest.rejectReason || '-'}</td>
                      <td className="py-2 px-4 align-middle">
                        {u.planRequest.status === 'pending' && (
                          <>
                            <Button size="sm" className="bg-green-600 text-white mr-2" onClick={() => handleApproveRequest(u)}>Approve</Button>
                            <Button size="sm" className="bg-red-600 text-white" onClick={() => setRejectModal({ open: true, user: u, reason: '' })}>Reject</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Reject Modal */}
          {rejectModal.open && rejectModal.user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setRejectModal({ open: false, user: null, reason: '' })} aria-label="Close">×</button>
                <h2 className="text-xl font-bold mb-4 text-red-700">Reject Plan Request</h2>
                <label className="block mb-2 font-medium text-gray-700">Reason for rejection (optional)</label>
                <textarea
                  className="w-full border rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Enter reason (optional)"
                  value={rejectModal.reason}
                  onChange={e => setRejectModal(r => ({ ...r, reason: e.target.value }))}
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setRejectModal({ open: false, user: null, reason: '' })} variant="outline">Cancel</Button>
                  <Button className="bg-red-600 text-white" onClick={() => handleRejectPlanRequest(rejectModal.user, rejectModal.reason)} disabled={!rejectModal.user}>Reject</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Toasts */}
      {/* Feedback Modal */}
      {modalType && (
        <Dialog open={!!modalType} onOpenChange={open => { if (!open) { setModalType(null); setModalMsgId(null); } }}>
          <DialogTitle>{modalType === 'reply' ? 'Send Reply' : 'Admin Note'}</DialogTitle>
          <DialogContent>
            <Textarea
              rows={4}
              placeholder={modalType === 'reply' ? 'Type your reply...' : 'Add a private note...'}
              value={modalType === 'reply' ? (replyInputs[modalMsgId] || '') : (msgNotes[modalMsgId] !== undefined ? msgNotes[modalMsgId] : (paginatedMessages.find(m => m.id === modalMsgId)?.adminNote || ''))}
              onChange={e => {
                if (modalType === 'reply') handleReplyChange(modalMsgId, e.target.value);
                else handleMsgNoteChange(modalMsgId, e.target.value);
              }}
              className="mb-2"
            />
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => { setModalType(null); setModalMsgId(null); }} variant="outline">Cancel</Button>
            {modalType === 'reply' ? (
              <Button onClick={() => { handleSendReply(paginatedMessages.find(m => m.id === modalMsgId)); setModalType(null); setModalMsgId(null); }} disabled={!replyInputs[modalMsgId] || msgLoading}>Send Reply</Button>
            ) : (
              <Button onClick={() => { handleSaveMsgNote(paginatedMessages.find(m => m.id === modalMsgId)); setModalType(null); setModalMsgId(null); }} disabled={msgNoteSaving[modalMsgId]}>{msgNoteSaving[modalMsgId] ? 'Saving...' : 'Save Note'}</Button>
            )}
          </DialogFooter>
        </Dialog>
      )}
      {showAllUserPayments.open && showAllUserPayments.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowAllUserPayments({ open: false, user: null })} aria-label="Close">×</button>
            <h2 className="text-2xl font-bold mb-4 text-blue-700">All Payments for {showAllUserPayments.user.name || showAllUserPayments.user.email}</h2>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full rounded-xl shadow-md overflow-hidden">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="py-3 px-6 text-blue-900 text-base font-bold">Date</th>
                    <th className="py-3 px-6 text-blue-900 text-base font-bold">Amount</th>
                    <th className="py-3 px-6 text-blue-900 text-base font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {showAllUserPayments.user.payments.map((p, i) => (
                    <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition`}>
                      <td className="py-3 px-6 text-gray-800 align-middle">{p.date}</td>
                      <td className="py-3 px-6 text-gray-800 align-middle">₹{p.amount}</td>
                      <td className="py-3 px-6 align-middle">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${p.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Usage Modal */}
      {usageModal.open && (
        <Modal
          isOpen={usageModal.open}
          onClose={() => setUsageModal({ open: false, user: null, value: '', bookingId: null })}
          title="Enter Used KG/Amount"
        >
          <div className="space-y-4">
            <input
              type="number"
              value={usageModal.value}
              onChange={e => setUsageModal(m => ({ ...m, value: e.target.value }))}
              placeholder={usageModal.user.planName === 'Elite Plus' ? 'KG used' : 'Amount used'}
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setUsageModal({ open: false, user: null, value: '', bookingId: null })} variant="outline">Cancel</Button>
              <Button onClick={handleDeductUsage}>Deduct</Button>
            </div>
          </div>
        </Modal>
      )}
      {notifDropdownOpen && (
        <div ref={notifDropdownRef} className="absolute ...">
          ...dropdown content...
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 