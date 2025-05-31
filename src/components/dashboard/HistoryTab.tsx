import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { doc, updateDoc, collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import TabSortOptions from '../TabSortOptions';
import { Modal } from '../ui/modal';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, Calendar, Package, CheckCircle, XCircle, Truck, Home, Download } from 'lucide-react';

interface Booking {
  id: string;
  customBookingId?: string;
  service?: string;
  username?: string;
  name?: string;
  email?: string;
  pickupDate?: string;
  pickupTime?: string;
  address?: string;
  status?: string;
  createdAt?: any;
  usage?: number;
  planName?: string;
  amountDue?: number;
  isNoPlanBooking?: boolean;
  accepted?: boolean;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  pickedUpAt?: any;
  deliveredAt?: any;
  paidAt?: any;
  finalizedAt?: any;
  paymentMethod?: string;
}

interface HistoryTabProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ bookings, onBookingsChange }) => {
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingSortOrder, setBookingSortOrder] = useState('recent');
  const [bookingActionLoading, setBookingActionLoading] = useState('');
  const [showRejectModal, setShowRejectModal] = useState({ open: false, booking: null });
  const [usageModal, setUsageModal] = useState({ open: false, user: null, value: '', bookingId: null });
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const rowsPerPage = 10;
  const location = useLocation();

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  useEffect(() => {
    const state = location.state as { bookingId?: string } | null;
    if (state?.bookingId) {
      setHighlightedBookingId(state.bookingId);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const filteredBookings = bookings.filter(b =>
    (!bookingSearch ||
      (b.customBookingId && b.customBookingId.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.name && b.name.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.email && b.email.toLowerCase().includes(bookingSearch.toLowerCase())))
  );

  const bookingHistory = filteredBookings.filter(b => b.status !== 'pending');

  const totalHistoryPages = Math.ceil(bookingHistory.length / rowsPerPage);
  const historyStartIndex = (currentHistoryPage - 1) * rowsPerPage;
  const historyEndIndex = historyStartIndex + rowsPerPage;
  const currentHistoryBookings = bookingHistory.slice(historyStartIndex, historyEndIndex);

  if (!bookings || bookings.length === 0) {
    return <div className="text-center py-8 text-gray-500">Loading booking history...</div>;
  }

  const handleHistoryPageChange = (newPage: number) => {
    setCurrentHistoryPage(newPage);
    const tableElement = document.querySelector('.history-table');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUpdateUsage = (booking: Booking) => {
    setUsageModal({ 
      open: true, 
      user: null,
      value: '',
      bookingId: booking.id
    });
  };

  const handleDeductUsage = async () => {
    if (!usageModal.bookingId) {
      toast.error('Booking not found for deduction!');
      return;
    }

    const bookingRef = doc(db, 'bookings', usageModal.bookingId);
    try {
      await updateDoc(bookingRef, {
        status: 'awaiting_payment',
        usage: Number(usageModal.value),
        amountDue: Number(usageModal.value),
        acceptedAt: new Date().toISOString(),
      });

      onBookingsChange(bookings.map(b => b.id === usageModal.bookingId ? {
        ...b,
        status: 'awaiting_payment',
        usage: Number(usageModal.value),
        amountDue: Number(usageModal.value),
        acceptedAt: new Date().toISOString(),
      } : b));

      toast.success('Usage updated successfully!');
      setUsageModal({ open: false, user: null, value: '', bookingId: null });
    } catch (error) {
      toast.error('Failed to update usage');
    }
  };

  const handleSetAmountDue = async () => {
    if (!usageModal.bookingId) {
      toast.error('Booking not found!');
      return;
    }

    const bookingRef = doc(db, 'bookings', usageModal.bookingId);
    try {
      await updateDoc(bookingRef, {
        status: 'awaiting_payment',
        amountDue: Number(usageModal.value),
        acceptedAt: new Date().toISOString(),
        isNoPlanBooking: true
      });
      
      onBookingsChange(bookings.map(b => b.id === usageModal.bookingId ? {
        ...b,
        status: 'awaiting_payment',
        amountDue: Number(usageModal.value),
        acceptedAt: new Date().toISOString(),
        isNoPlanBooking: true
      } : b));
      
      toast.success('Amount due set successfully!');
      setUsageModal({ open: false, user: null, value: '', bookingId: null });
    } catch (error) {
      toast.error('Failed to set amount due');
    }
  };

  const handleCompleteOrder = async (booking: Booking) => {
    setBookingActionLoading(booking.id);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      onBookingsChange(bookings.map(b => b.id === booking.id ? {
        ...b,
        status: 'completed',
        completedAt: new Date().toISOString()
      } : b));

      if (booking.email) {
        const notifRef = collection(db, 'users');
        const userSnap = await getDocs(notifRef);
        const userDoc = userSnap.docs.find(u => u.data().email === booking.email);
        if (userDoc) {
          await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
            title: 'Order Completed',
            message: `Your order for ${booking.service} has been completed!`,
            type: 'booking',
            priority: 'high',
            metadata: {
              bookingId: booking.id,
              service: booking.service,
              status: 'completed'
            },
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
      toast.success('Order marked as completed!');
    } catch (error) {
      toast.error('Failed to complete order');
    } finally {
      setBookingActionLoading('');
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBookingDetails(booking);
    setShowDetailsModal(true);
  };

  const generateActivityLog = (booking: Booking) => {
    const activities = [];
    if (booking.createdAt) {
      activities.push({ type: 'created', timestamp: booking.createdAt.toDate(), text: 'Booking created' });
    }
    if (booking.acceptedAt) {
      activities.push({ type: 'accepted', timestamp: new Date(booking.acceptedAt), text: 'Booking accepted' });
    }
    if (booking.pickedUpAt) {
      activities.push({ type: 'pickedUp', timestamp: booking.pickedUpAt.toDate ? booking.pickedUpAt.toDate() : new Date(booking.pickedUpAt), text: 'Laundry picked up' });
    }
    if (booking.status === 'in progress') {
      activities.push({ type: 'inProgress', timestamp: new Date(), text: 'Processing started' });
    }
    if (booking.deliveredAt) {
      activities.push({ type: 'delivered', timestamp: booking.deliveredAt.toDate ? booking.deliveredAt.toDate() : new Date(booking.deliveredAt), text: 'Laundry delivered' });
    }
    if (booking.paidAt) {
      activities.push({ type: 'paid', timestamp: new Date(booking.paidAt), text: `Payment confirmed${booking.amountDue !== undefined ? `: ₹${booking.amountDue}` : ''}` });
    }
    if (booking.finalizedAt) {
      activities.push({ type: 'finalized', timestamp: new Date(booking.finalizedAt), text: `Booking finalized${booking.usage !== undefined ? `: ${booking.usage} kg used` : ''}` });
    }
    if (booking.status === 'completed' && !booking.finalizedAt && !booking.paidAt) {
      activities.push({ type: 'completed', timestamp: booking.createdAt.toDate(), text: 'Booking marked as completed' });
    }
    if (booking.rejectedAt) {
      activities.push({ type: 'rejected', timestamp: new Date(booking.rejectedAt), text: `Booking rejected${booking.rejectReason ? `: ${booking.rejectReason}` : ''}` });
    }

    activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return activities;
  };

  const activityIcons: { [key: string]: React.ElementType } = {
    created: Calendar,
    accepted: CheckCircle,
    pickedUp: Truck,
    inProgress: Clock,
    delivered: Home,
    paid: CheckCircle,
    finalized: Package,
    rejected: XCircle,
    completed: CheckCircle,
  };

  const exportBookingsToCSV = (bookings: Booking[]) => {
    if (bookings.length === 0) {
      toast.info('No bookings to export.');
      return;
    }

    const headers = ['Booking ID', 'Service', 'Name', 'Email', 'Pickup Date', 'Mode of Payment', 'Address', 'Status', 'Plan', 'KG Used', 'Amount Due', 'Created At', 'Accepted At', 'Rejected At', 'Reject Reason', 'Picked Up At', 'Delivered At', 'Paid At', 'Finalized At'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const booking of bookings) {
      const row = [
        `"${booking?.customBookingId || booking?.id}"`,
        `"${booking?.service || ''}"`,
        `"${booking?.name || booking?.username || ''}"`,
        `"${booking?.email || ''}"`,
        `"${booking?.pickupDate || ''}"`,
        `"${(booking?.paymentMethod || '').replace(/_/g, ' ').toUpperCase()}"`,
        `"${booking?.address || ''}"`,
        `"${booking?.status || ''}"`,
        `"${booking?.planName || ''}"`,
        `"${booking?.usage !== undefined ? booking.usage : ''}"`,
        `"${booking?.amountDue !== undefined ? booking.amountDue : ''}"`,
        `"${booking?.createdAt ? format(booking.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${booking?.acceptedAt ? format(new Date(booking.acceptedAt), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${booking?.rejectedAt ? format(new Date(booking.rejectedAt), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${booking?.rejectReason || ''}"`,
        `"${booking?.pickedUpAt ? format(new Date(booking.pickedUpAt), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${booking?.deliveredAt ? format(new Date(booking.deliveredAt), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${booking?.paidAt ? format(new Date(booking.paidAt), 'yyyy-MM-dd HH:mm') : ''}"`,
        `"${booking?.finalizedAt ? format(new Date(booking.finalizedAt), 'yyyy-MM-dd HH:mm') : ''}"`,
      ];
      csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `bookings_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-purple-100">
      <h3 className="text-xl font-semibold mb-4 text-purple-700">Booking History ({bookingHistory.length})</h3>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <Input
          type="text"
          placeholder="Search by Booking ID, user name, or email"
          value={bookingSearch}
          onChange={e => setBookingSearch(e.target.value)}
          className="w-full md:w-64"
        />
        <TabSortOptions tab="bookings" sortOrder={bookingSortOrder} onSortChange={setBookingSortOrder} />
        <Button variant="outline" onClick={() => exportBookingsToCSV(bookingHistory)} className="flex items-center gap-1">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div>
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base history-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4">User</th>
                <th className="py-2 px-4">Service</th>
                <th className="py-2 px-4">Customer</th>
                <th className="py-2 px-4">Pickup Date</th>
                <th className="py-2 px-4">Mode of Payment</th>
                <th className="py-2 px-4">Address</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Created At</th>
                <th className="py-2 px-4">Usage</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentHistoryBookings.map((booking, i) => (
                <tr 
                  key={booking.id} 
                  className={`${
                    i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } hover:bg-gray-100 transition ${
                    highlightedBookingId === booking.id ? 'ring-2 ring-blue-500 ring-inset' : ''
                  }`}
                  ref={highlightedBookingId === booking.id ? (el) => {
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => setHighlightedBookingId(null), 2000);
                    }
                  } : null}
                >
                  <td className="py-2 px-4 align-middle">
                    <div>{booking.name || booking.username || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{booking.email}</div>
                  </td>
                  <td className="py-2 px-4 align-middle">{booking.service}</td>
                  <td className="py-2 px-4 align-middle">{booking.pickupDate}</td>
                  <td className="py-2 px-4 align-middle">{(booking.paymentMethod || 'N/A').replace(/_/g, ' ').toUpperCase()}</td>
                  <td className="py-2 px-4 align-middle">{booking.address}</td>
                  <td className="py-2 px-4 align-middle">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      booking.status === 'paid' || booking.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                    </span>
                  </td>
                  <td className="py-2 px-4 align-middle font-mono text-xs text-gray-700">
                    {booking.createdAt?.seconds ? format(new Date(booking.createdAt.seconds * 1000), 'PPp') : ''}
                  </td>
                  <td className="py-2 px-4 align-middle">
                    {booking.usage !== undefined ? `${booking.usage} kg` : '-'}
                  </td>
                  <td className="py-2 px-4 align-middle">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(booking)}>View Details</Button>
                  </td>
                </tr>
              ))}
              {currentHistoryBookings.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-4 text-gray-500">No booking history found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalHistoryPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => handleHistoryPageChange(currentHistoryPage - 1)}
              disabled={currentHistoryPage === 1}
              className="px-4 py-2"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentHistoryPage} of {totalHistoryPages}
            </span>
            <Button
              variant="outline"
              onClick={() => handleHistoryPageChange(currentHistoryPage + 1)}
              disabled={currentHistoryPage === totalHistoryPages}
              className="px-4 py-2"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Booking Details: {selectedBookingDetails?.customBookingId || selectedBookingDetails?.id}"
      >
        <div className="py-4 space-y-6">
          {selectedBookingDetails ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Booking Information</h4>
                <p><span className="font-medium">Service:</span> {selectedBookingDetails.service}</p>
                <p><span className="font-medium">Status:</span> {selectedBookingDetails.status}</p>
                {selectedBookingDetails.planName && <p><span className="font-medium">Plan:</span> {selectedBookingDetails.planName}</p>}
                {selectedBookingDetails.usage !== undefined && <p><span className="font-medium">KG Used:</span> {selectedBookingDetails.usage} kg</p>}
                {selectedBookingDetails.amountDue !== undefined && <p><span className="font-medium">Amount Due:</span> ₹{selectedBookingDetails.amountDue}</p>}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Customer Information</h4>
                <p><span className="font-medium">Name:</span> {selectedBookingDetails.name || selectedBookingDetails.username}</p>
                <p><span className="font-medium">Email:</span> {selectedBookingDetails.email}</p>
              </div>
              <div className="space-y-2 col-span-2">
                <h4 className="font-semibold">Pickup Information</h4>
                <p><span className="font-medium">Date:</span> {selectedBookingDetails.pickupDate} at {selectedBookingDetails.pickupTime}</p>
                <p><span className="font-medium">Address:</span> {selectedBookingDetails.address}</p>
              </div>
              <div className="space-y-4 col-span-2">
                <h4 className="font-semibold">Activity Log</h4>
                <div className="relative pl-2">
                  {generateActivityLog(selectedBookingDetails).map((activity, index) => (
                    <div key={index} className="mb-6 flex items-start">
                      <div className="z-10 w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white ring-4 ring-blue-100 shrink-0">
                        {React.createElement(activityIcons[activity.type] || Clock, { className: 'w-3 h-3' })}
                      </div>
                      <div className="flex-1 ml-4">
                        <p className="font-medium text-gray-800">{activity.text}</p>
                        <p className="text-xs text-gray-500">{format(activity.timestamp, 'PPp')}</p>
                      </div>
                    </div>
                  ))}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">No booking selected</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
        </div>
      </Modal>

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
              placeholder="Enter amount"
              className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setUsageModal({ open: false, user: null, value: '', bookingId: null })} variant="outline">Cancel</Button>
              <Button onClick={handleSetAmountDue} disabled={!usageModal.value}>Set Amount Due</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HistoryTab; 