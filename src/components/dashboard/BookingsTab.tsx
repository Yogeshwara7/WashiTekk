import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { doc, updateDoc, collection, addDoc, Timestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import TabSortOptions from '../TabSortOptions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
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
  userId?: string;
  paymentConfirmed?: boolean;
  paymentMethod?: string;
}

interface BookingsTabProps {
  bookings: Booking[];
  onBookingsChange: (bookings: Booking[]) => void;
  users: any[];
  generateReceipt: (payment: any, user: any, dashboard: any, signatureBase64: string) => void;
  loadImageAsBase64: (path: string, callback: (base64: string) => void) => void;
}

const BookingsTab = ({ bookings, onBookingsChange, users, generateReceipt, loadImageAsBase64 }: BookingsTabProps): JSX.Element => {
  const [bookingSearch, setBookingSearch] = useState('');
  const [acceptedSearch, setAcceptedSearch] = useState('');
  const [bookingActionLoading, setBookingActionLoading] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState({ open: false, booking: null });

  // Separate pagination state for Pending Requests
  const [currentPendingPage, setCurrentPendingPage] = useState(1);
  const rowsPerPage = 10;

  // Separate pagination state for Awaiting Initial Finalization
  const [currentAwaitingInitialPage, setCurrentAwaitingInitialPage] = useState(1);

  // Separate pagination state for Awaiting Payment
  const [currentAwaitingPaymentPage, setCurrentAwaitingPaymentPage] = useState(1);

  // State for handling post-acceptance actions
  const [showFinalizeModal, setShowFinalizeModal] = useState<{ open: boolean, booking: Booking | null }>({ open: false, booking: null });
  const [kgUsed, setKgUsed] = useState<number | ''>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [amountPaidModal, setAmountPaidModal] = useState<number | ''>(''); // Use a separate state for modal input

  // State for View Details modal and Activity Log
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  // Filter bookings into pending, awaiting initial finalization, and awaiting payment
  const pendingBookingsList = bookings.filter(b => b?.status === 'pending');

  const awaitingInitialFinalizationList = bookings.filter(b =>
    b?.status === 'accepted' && (
      (!(b?.isNoPlanBooking) && typeof b?.usage === 'undefined') ||
      (b?.isNoPlanBooking && typeof b?.amountDue === 'undefined')
    )
  );

  const awaitingPaymentBookingsList = bookings.filter(b =>
    (b?.status === 'completed' && !(b?.isNoPlanBooking) && b?.paymentConfirmed === false) ||
    (b?.status === 'cash_pending')
  );

  // Filter pending bookings based on search
  const filteredPendingBookings = pendingBookingsList.filter(b =>
    (!bookingSearch ||
      (b?.customBookingId && b.customBookingId.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b?.name && b.name.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b?.email && b.email.toLowerCase().includes(bookingSearch.toLowerCase())))
  );

  // Filter awaiting initial finalization and awaiting payment bookings based on search
  const filteredAwaitingInitialFinalization = awaitingInitialFinalizationList.filter(b =>
    (!acceptedSearch ||
      (b?.customBookingId && b.customBookingId.toLowerCase().includes(acceptedSearch.toLowerCase())) ||
      (b?.name && b.name.toLowerCase().includes(acceptedSearch.toLowerCase())) ||
      (b?.email && b.email.toLowerCase().includes(acceptedSearch.toLowerCase())))
  );

  const filteredAwaitingPaymentBookings = awaitingPaymentBookingsList.filter(b =>
    (!acceptedSearch ||
      (b?.customBookingId && b.customBookingId.toLowerCase().includes(acceptedSearch.toLowerCase())) ||
      (b?.name && b.name.toLowerCase().includes(acceptedSearch.toLowerCase())) ||
      (b?.email && b.email.toLowerCase().includes(acceptedSearch.toLowerCase())))
  );

  // Calculate pagination for pending requests
  const totalPendingPages = Math.ceil(filteredPendingBookings.length / rowsPerPage);
  const pendingStartIndex = (currentPendingPage - 1) * rowsPerPage;
  const pendingEndIndex = pendingStartIndex + rowsPerPage;
  const currentPending = filteredPendingBookings.slice(pendingStartIndex, pendingEndIndex);

  // Calculate pagination for awaiting initial finalization
  const totalAwaitingInitialPages = Math.ceil(filteredAwaitingInitialFinalization.length / rowsPerPage);
  const awaitingInitialStartIndex = (currentAwaitingInitialPage - 1) * rowsPerPage;
  const awaitingInitialEndIndex = awaitingInitialStartIndex + rowsPerPage;
  const currentAwaitingInitial = filteredAwaitingInitialFinalization.slice(awaitingInitialStartIndex, awaitingInitialEndIndex);

  // Calculate pagination for awaiting payment
  const totalAwaitingPaymentPages = Math.ceil(filteredAwaitingPaymentBookings.length / rowsPerPage);
  const awaitingPaymentStartIndex = (currentAwaitingPaymentPage - 1) * rowsPerPage;
  const awaitingPaymentEndIndex = awaitingPaymentStartIndex + rowsPerPage;
  const currentAwaitingPayment = filteredAwaitingPaymentBookings.slice(awaitingPaymentStartIndex, awaitingPaymentEndIndex);

  // Handle page changes for Pending Requests
  const handlePendingPageChange = (newPage: number) => {
    setCurrentPendingPage(newPage);
    const tableElement = document.querySelector('.pending-requests-table');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle page changes for Awaiting Initial Finalization
  const handleAwaitingInitialPageChange = (newPage: number) => {
    setCurrentAwaitingInitialPage(newPage);
    const tableElement = document.querySelector('.awaiting-initial-finalization-table');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle page changes for Awaiting Payment
  const handleAwaitingPaymentPageChange = (newPage: number) => {
    setCurrentAwaitingPaymentPage(newPage);
    const tableElement = document.querySelector('.awaiting-payment-table');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Accept booking
  const handleAcceptBooking = async (booking: Booking) => {
    setBookingActionLoading(booking.id);
    try {
      const updateData: any = {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'bookings', booking.id), updateData);
      
      // Log booking state after acceptance for debugging
      console.log('Booking state after accept:', { 
        id: booking.id,
        status: updateData.status,
        isNoPlanBooking: booking.isNoPlanBooking,
        usage: booking.usage,
        amountDue: booking.amountDue
      });

      // onBookingsChange will update the main bookings state in AdminDashboard,
      // which will then cause this component to re-render with the updated list.
      // The filtering logic above will place the booking in the correct list.
      // No need to manually update state here like before.
      // onBookingsChange(bookings.map(b => b.id === booking.id ? { ...b, ...updateData } : b));

      // Add notification to user
      if (booking.email) {
        const usersRef = collection(db, 'users');
        const userSnap = await getDocs(usersRef);
        const userDoc = userSnap.docs.find(u => u.data().email === booking.email);
        if (userDoc) {
          await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
            title: 'Booking Accepted',
            message: `Your booking for ${booking.service} has been accepted! Please provide the details after service completion.`,
            type: 'booking',
            priority: 'high',
            metadata: {
              bookingId: booking.id,
              service: booking.service,
              status: 'accepted'
            },
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
      toast.success('Booking accepted successfully!');
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error('Failed to accept booking');
    }
    setBookingActionLoading('');
  };

  // Reject booking
  const handleRejectBooking = async (booking: Booking) => {
    if (!showRejectModal.booking) return;
    const bookingToReject = showRejectModal.booking;

    setBookingActionLoading(bookingToReject.id);
    try {
      const updateData: any = {
        status: 'rejected', 
        rejectReason: rejectReason,
        rejectedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'bookings', bookingToReject.id), updateData);
      
      // onBookingsChange will update the main bookings state in AdminDashboard
      // onBookingsChange(bookings.map(b => b.id === bookingToReject.id ? { ...b, ...updateData } : b));

      // Add notification to user
      if (bookingToReject.email) {
        const usersRef = collection(db, 'users');
        const userSnap = await getDocs(usersRef);
        const userDoc = userSnap.docs.find(u => u.data().email === bookingToReject.email);
        if (userDoc) {
          await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
            title: 'Booking Rejected',
            message: `Your booking for ${bookingToReject.service} was rejected.${rejectReason ? ' Reason: ' + rejectReason : ''}`,
            type: 'booking',
            priority: 'high',
            metadata: {
              bookingId: bookingToReject.id,
              service: bookingToReject.service,
              status: 'rejected',
              rejectReason: rejectReason
            },
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
      toast.success('Booking rejected successfully!');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Failed to reject booking');
    }
    setBookingActionLoading('');
    setShowRejectModal({ open: false, booking: null });
    setRejectReason('');
  };

  // Handle confirming payment for a completed plan booking
  const handleConfirmPayment = async (booking: Booking) => {
    setBookingActionLoading(booking.id);
    try {
      const updateData: any = {
        status: 'paid',
        paymentConfirmed: true,
        paidAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'bookings', booking.id), updateData);

      // Find the user document
      const userDoc = users.find(u => u.email === booking.email);
      if (userDoc) {
        const userRef = doc(db, 'users', userDoc.id);
        const userSnapshot = await getDoc(userRef);
        const userData = userSnapshot.data();
        const prevPayments = userData?.payments || [];

        const paymentRecord = {
          date: new Date().toLocaleString(),
          amount: booking.amountDue || booking.usage || 0,
          status: 'Success',
          method: booking.paymentMethod || 'N/A',
          bookingId: booking.id,
        };

        await updateDoc(userRef, {
          payments: [...prevPayments, paymentRecord],
        });

        // Generate receipt after payment is confirmed
        loadImageAsBase64('/signn.png', (signatureBase64) => {
          generateReceipt(paymentRecord, userDoc, userData, signatureBase64);
        });

        // Add notification to user about payment confirmation
        if (booking.email) {
          const notificationMessage = `Payment of ₹${booking.amountDue || booking.usage || 0} confirmed for your booking ${booking.customBookingId || booking.id}.`;

          await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
            title: 'Payment Confirmed',
            message: notificationMessage,
            type: 'payment',
            priority: 'high',
            metadata: {
              bookingId: booking.id,
              amountPaid: booking.amountDue || booking.usage || 0,
            },
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
      toast.success('Payment confirmed successfully!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment');
    } finally {
      setBookingActionLoading('');
    }
  };

  // Handle finalization (entering KG or confirming payment) - This is for the initial step after 'accepted'
  const handleFinalizeBooking = async () => {
    if (!showFinalizeModal.booking) return;
    const booking = showFinalizeModal.booking;
    setBookingActionLoading(booking.id);

    try {
      let updateData: any = {};

      if (booking.isNoPlanBooking) {
        // No-plan booking: confirm payment (This button should only appear in the Awaiting Initial section)
        // If called from here, it means the user confirmed payment immediately after accepting
        updateData.status = 'paid';
        updateData.amountDue = typeof amountPaidModal === 'string' ? parseFloat(amountPaidModal) : amountPaidModal;
        updateData.paidAt = new Date().toISOString();
         // For no-plan bookings, payment is confirmed immediately, so paymentConfirmed is true
        updateData.paymentConfirmed = true; // Add this for consistency

      } else {
        // Plan booking: enter KG used (This button should only appear in the Awaiting Initial section)
        updateData.status = 'completed'; // Status is completed after KG entry
        updateData.usage = typeof kgUsed === 'string' ? parseFloat(kgUsed) : kgUsed;
        // Calculate amount due based on KG used (1 KG = ₹40)
        if (updateData.usage !== undefined && !isNaN(updateData.usage as number)) {
          updateData.amountDue = (updateData.usage as number) * 40;
        }
        // Mark payment as not confirmed yet for plan bookings
        updateData.paymentConfirmed = false;
        updateData.finalizedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'bookings', booking.id), updateData);

      // onBookingsChange will update the main bookings state in AdminDashboard,
      // which will then cause this component to re-render with the updated list.
      // The filtering logic above will place the booking in the correct list.
      // No need to manually update state here like before.
      // onBookingsChange(bookings.map(b => b.id === booking.id ? { ...b, ...updateData } : b));

      // Add notification to user about completion/payment confirmation
      if (booking.email) {
         const usersRef = collection(db, 'users');
         const userSnap = await getDocs(usersRef);
         const userDoc = userSnap.docs.find(u => u.data().email === booking.email);

         if (userDoc) {
           let notificationMessage = `Your booking for ${booking.service} is completed.`;
           if (booking.isNoPlanBooking && updateData.status === 'paid') {
             notificationMessage = `Payment of ₹${updateData.amountDue} confirmed for your ${booking.service} booking.`;
           } else if (updateData.status === 'completed' && updateData.usage !== undefined) {
             notificationMessage = `Booking completed. Usage: ${updateData.usage} kg.${updateData.amountDue !== undefined ? ` Amount: ₹${updateData.amountDue}` : ''}`;
           }

           await addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
             title: booking.isNoPlanBooking ? 'Payment Confirmed' : 'Booking Completed',
             message: notificationMessage,
             type: 'booking',
             priority: 'high',
             metadata: {
               bookingId: booking.id,
               service: booking.service,
               status: updateData.status,
               usage: updateData.usage,
               amountPaid: updateData.amountDue,
             },
             read: false,
             createdAt: Timestamp.now(),
           });
         }
      }

      toast.success(booking.isNoPlanBooking ? 'Payment confirmed!' : 'Booking finalized!');

    } catch (error) {
      console.error('Error finalizing booking:', error);
      toast.error('Failed to finalize booking');
    }
    setBookingActionLoading('');
    setShowFinalizeModal({ open: false, booking: null });
    setKgUsed('');
    setAmountPaid('');
  };

  // Function to open the details modal
  const handleViewDetails = (booking: Booking) => {
    setSelectedBookingDetails(booking);
    setShowDetailsModal(true);
  };

  // Function to generate activity log
  const generateActivityLog = (booking: Booking) => {
    const activities = [];
    // Helper to safely get timestamp as Date object
    const getValidDate = (timestamp: any): Date | null => {
       if (!timestamp) return null;
       let date: Date;
       if (typeof timestamp.toDate === 'function') { // Firebase Timestamp
         date = timestamp.toDate();
       } else if (typeof timestamp === 'string' || typeof timestamp === 'number') { // String or number timestamp
         date = new Date(timestamp);
       } else {
         return null; // Unknown timestamp type
       }
       return isNaN(date.getTime()) ? null : date;
    };

    const createdAt = getValidDate(booking.createdAt);
    if (createdAt) {
      activities.push({ type: 'created', timestamp: createdAt, text: 'Booking created' });
    }

    const acceptedAt = getValidDate(booking.acceptedAt);
    if (acceptedAt) {
      activities.push({ type: 'accepted', timestamp: acceptedAt, text: 'Booking accepted' });
    }

    const pickedUpAt = getValidDate(booking.pickedUpAt);
    if (pickedUpAt) {
      activities.push({ type: 'pickedUp', timestamp: pickedUpAt, text: 'Laundry picked up' });
    }

    // if (booking.status === 'in progress') { /* ... */ }

    const deliveredAt = getValidDate(booking.deliveredAt);
    if (deliveredAt) {
      activities.push({ type: 'delivered', timestamp: deliveredAt, text: 'Laundry delivered' });
    }

    const paidAt = getValidDate(booking.paidAt);
    if (paidAt) {
      activities.push({ type: 'paid', timestamp: paidAt, text: `Payment confirmed${booking.amountDue !== undefined ? `: ₹${booking.amountDue}` : ''}` });
    }

    const finalizedAt = getValidDate(booking.finalizedAt);
    if (finalizedAt) {
       activities.push({ type: 'finalized', timestamp: finalizedAt, text: `Booking finalized${booking.usage !== undefined ? `: ${booking.usage} kg used` : ''}` });
    }

    // Fallback for older completed bookings
    if (booking.status === 'completed' && !finalizedAt && !paidAt) {
      if (createdAt) {
         activities.push({ type: 'completed', timestamp: createdAt, text: 'Booking marked as completed (based on creation date)' });
      }
    }

    const rejectedAt = getValidDate(booking.rejectedAt);
    if (rejectedAt) {
      activities.push({ type: 'rejected', timestamp: rejectedAt, text: `Booking rejected${booking.rejectReason ? `: ${booking.rejectReason}` : ''}` });
    }

    // Sort activities by timestamp
    activities.sort((a, b) => {
       const timeA = a.timestamp ? a.timestamp.getTime() : 0;
       const timeB = b.timestamp ? b.timestamp.getTime() : 0;
       return timeA - timeB;
    });

    return activities;
  };

  // Icon mapping for activity types (example)
  const activityIcons: { [key: string]: React.ElementType } = {
    created: Calendar,
    accepted: CheckCircle,
    pickedUp: Truck,
    inProgress: Clock,
    delivered: Home,
    paid: CheckCircle,
    finalized: Package,
    rejected: XCircle,
    completed: CheckCircle, // Can use the same icon as accepted or a different one
  };

  // Function to export data to CSV
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
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-green-100">
      {/* Pending Requests Section */}
      <h3 className="text-xl font-semibold mb-4 text-blue-700">Pending Requests ({filteredPendingBookings.length})</h3>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <Input
          type="text"
          placeholder="Search by Booking ID, user name, or email"
          value={bookingSearch}
          onChange={e => setBookingSearch(e.target.value)}
          className="w-full md:w-64"
        />
        {/* Export Button */}
        <Button variant="outline" onClick={() => exportBookingsToCSV(filteredPendingBookings)} className="flex items-center gap-1">
            <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg mb-8">
        <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base pending-requests-table">
          <thead className="bg-blue-50">
            <tr>
              <th className="py-2 px-4">User</th>
              <th className="py-2 px-4">Service</th>
              <th className="py-2 px-4">Customer</th>
              <th className="py-2 px-4">Pickup Date</th>
              <th className="py-2 px-4">Address</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Details</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPending.map((booking, i) => (
              <tr key={booking?.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                <td className="py-2 px-4 align-middle">
                  <div>{booking?.name || booking?.username || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{booking?.email}</div>
                </td>
                <td className="py-2 px-4 align-middle">{booking?.service}</td>
                <td className="py-2 px-4 align-middle">{booking?.pickupDate}</td>
                <td className="py-2 px-4 align-middle">{booking?.address}</td>
                <td className="py-2 px-4 align-middle">
                  <span className={
                    `inline-block px-2 py-1 rounded text-xs font-bold ${booking?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`
                  }>
                    {booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}
                  </span>
                </td>
                <td className="py-2 px-4 align-middle">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(booking!)}>View Details</Button>
                </td>
                <td className="py-2 px-4 align-middle">
                  {booking?.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAcceptBooking(booking!)} 
                        disabled={bookingActionLoading === booking?.id}
                      >
                        {bookingActionLoading === booking?.id ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setShowRejectModal({ open: true, booking: booking! })} 
                        disabled={bookingActionLoading === booking?.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {currentPending.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">No pending requests</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filteredPendingBookings.length > rowsPerPage && (
        <div className="flex justify-between items-center mt-4">
          <Button onClick={() => handlePendingPageChange(currentPendingPage - 1)} disabled={currentPendingPage === 1}>Prev</Button>
          <span>Page {currentPendingPage} of {totalPendingPages}</span>
          <Button onClick={() => handlePendingPageChange(currentPendingPage + 1)} disabled={currentPendingPage === totalPendingPages}>Next</Button>
        </div>
      )}

      {/* Awaiting Initial Finalization Section */}
      {filteredAwaitingInitialFinalization.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Awaiting Finalization ({filteredAwaitingInitialFinalization.length})</h3>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
             <Input
               type="text"
               placeholder="Search by Booking ID, user name, or email"
               value={acceptedSearch} // Reuse acceptedSearch for this section
               onChange={e => setAcceptedSearch(e.target.value)}
               className="w-full md:w-64"
             />
             {/* Export Button */}
             <Button variant="outline" onClick={() => exportBookingsToCSV(filteredAwaitingInitialFinalization)} className="flex items-center gap-1">
                 <Download className="h-4 w-4" /> Export CSV
             </Button>
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base awaiting-initial-finalization-table"> {/* Specific class name */}
               <thead className="bg-blue-50">
                 <tr>
                   <th className="py-2 px-4">User</th>
                   <th className="py-2 px-4">Service</th>
                   <th className="py-2 px-4">Customer</th>
                   <th className="py-2 px-4">Pickup Date</th>
                   <th className="py-2 px-4">Address</th>
                   <th className="py-2 px-4">Status</th>
                   <th className="py-2 px-4">Details</th>
                   <th className="py-2 px-4">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {currentAwaitingInitial.map((booking, i) => (
                   <tr key={booking?.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                     <td className="py-2 px-4 align-middle">
                       <div>{booking?.name || booking?.username || 'N/A'}</div>
                       <div className="text-xs text-gray-500">{booking?.email}</div>
                     </td>
                     <td className="py-2 px-4 align-middle">{booking?.service}</td>
                     <td className="py-2 px-4 align-middle">{booking?.pickupDate}</td>
                     <td className="py-2 px-4 align-middle">{booking?.address}</td>
                     <td className="py-2 px-4 align-middle">
                       <span className={
                          `inline-block px-2 py-1 rounded text-xs font-bold ${booking?.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`
                        }>
                         {/* Display Accepted status if it's this section */}
                          {booking?.status === 'accepted' ? 'Accepted' : booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}
                        </span>
                     </td>
                     <td className="py-2 px-4 align-middle">
                       <Button variant="outline" size="sm" onClick={() => handleViewDetails(booking!)}>View Details</Button>
                     </td>
                     <td className="py-2 px-4 align-middle">
                       {/* Finalize buttons for accepted bookings */}
                        {(booking?.status === 'accepted' && !(booking?.isNoPlanBooking) && typeof booking?.usage === 'undefined') && (
                          <Button
                            size="sm"
                            onClick={() => setShowFinalizeModal({ open: true, booking: booking! })} 
                            disabled={bookingActionLoading === booking?.id}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {bookingActionLoading === booking?.id ? 'Finalizing...' : 'Enter KG & Finalize'}
                          </Button>
                        )}
                        {(booking?.status === 'accepted' && booking?.isNoPlanBooking && typeof booking?.amountDue === 'undefined') && (
                          <Button
                            size="sm"
                            onClick={() => setShowFinalizeModal({ open: true, booking: booking! })} 
                            disabled={bookingActionLoading === booking?.id}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {bookingActionLoading === booking?.id ? 'Confirming...' : 'Confirm Payment'}
                          </Button>
                        )}
                     </td>
                   </tr>
                 ))}
                 {currentAwaitingInitial.length === 0 && ( // Corrected check
                   <tr>
                     <td colSpan={7} className="text-center py-4 text-gray-500">No accepted bookings needing finalization</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
           {filteredAwaitingInitialFinalization.length > rowsPerPage && (
             <div className="flex justify-between items-center mt-4">
               <Button onClick={() => handleAwaitingInitialPageChange(currentAwaitingInitialPage - 1)} disabled={currentAwaitingInitialPage === 1}>Prev</Button> {/* Corrected handler */}
               <span>Page {currentAwaitingInitialPage} of {totalAwaitingInitialPages || 1}</span> {/* Corrected total pages */}
               <Button onClick={() => handleAwaitingInitialPageChange(currentAwaitingInitialPage + 1)} disabled={currentAwaitingInitialPage * rowsPerPage >= filteredAwaitingInitialFinalization.length}>Next</Button> {/* Corrected handler and check */}
             </div>
           )}
         </div>
       )}

       {/* Awaiting Payment Section (for completed plan bookings) */}
       {filteredAwaitingPaymentBookings.length > 0 && (
         <div className="mt-8">
           <h3 className="text-xl font-semibold mb-4 text-blue-700">Awaiting Payment ({filteredAwaitingPaymentBookings.length})</h3>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
              <Input
                type="text"
                placeholder="Search by Booking ID, user name, or email"
                value={acceptedSearch} // Reuse acceptedSearch for this section
                onChange={e => setAcceptedSearch(e.target.value)}
                className="w-full md:w-64"
              />
              {/* Export Button */}
              <Button variant="outline" onClick={() => exportBookingsToCSV(filteredAwaitingPaymentBookings)} className="flex items-center gap-1">
                  <Download className="h-4 w-4" /> Export CSV
              </Button>
           </div>
           <div className="overflow-x-auto rounded-lg">
             <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base awaiting-payment-table">
               <thead className="bg-blue-50">
                 <tr>
                   <th className="py-2 px-4">User</th>
                   <th className="py-2 px-4">Service</th>
                   <th className="py-2 px-4">Customer</th>
                   <th className="py-2 px-4">Pickup Date</th>
                   <th className="py-2 px-4">Address</th>
                   <th className="py-2 px-4">Status</th>
                   <th className="py-2 px-4">Details</th>
                   <th className="py-2 px-4">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {currentAwaitingPayment.map((booking, i) => (
                   <tr key={booking?.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                     <td className="py-2 px-4 align-middle">
                       <div>{booking?.name || booking?.username || 'N/A'}</div>
                       <div className="text-xs text-gray-500">{booking?.email}</div>
                     </td>
                     <td className="py-2 px-4 align-middle">{booking?.service}</td>
                     <td className="py-2 px-4 align-middle">{booking?.pickupDate}</td>
                     <td className="py-2 px-4 align-middle">{booking?.address}</td>
                     <td className="py-2 px-4 align-middle">
                       <span className={
                          `inline-block px-2 py-1 rounded text-xs font-bold ${
                            (booking?.status === 'completed' && booking?.paymentConfirmed === false) || booking?.status === 'cash_pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                           {(booking?.status === 'completed' && booking?.paymentConfirmed === false) || booking?.status === 'cash_pending' ? 'Payment Pending' : booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}
                         </span>
                      </td>
                     <td className="py-2 px-4 align-middle">
                       <Button variant="outline" size="sm" onClick={() => handleViewDetails(booking!)}>View Details</Button>
                     </td>
                     <td className="py-2 px-4 align-middle">
                       {/* Confirm Cash Payment button for cash_pending bookings */}
                        {booking?.status === 'cash_pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmPayment(booking!)}
                            disabled={bookingActionLoading === booking?.id}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            {bookingActionLoading === booking?.id ? 'Confirming Cash...' : 'Confirm Cash Received'}
                          </Button>
                        )}
                     </td>
                   </tr>
                 ))}
                  {currentAwaitingPayment.length === 0 && (
                   <tr>
                     <td colSpan={7} className="text-center py-4 text-gray-500">No completed bookings awaiting payment</td>{/* Update message */}
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
           {filteredAwaitingPaymentBookings.length > rowsPerPage && (
             <div className="flex justify-between items-center mt-4">
               <Button onClick={() => handleAwaitingPaymentPageChange(currentAwaitingPaymentPage - 1)} disabled={currentAwaitingPaymentPage === 1}>Prev</Button> {/* Corrected handler */}
               <span>Page {currentAwaitingPaymentPage} of {totalAwaitingPaymentPages || 1}</span> {/* Corrected total pages */}
               <Button onClick={() => handleAwaitingPaymentPageChange(currentAwaitingPaymentPage + 1)} disabled={currentAwaitingPaymentPage * rowsPerPage >= filteredAwaitingPaymentBookings.length}>Next</Button> {/* Corrected handler and check */}
             </div>
           )}
         </div>
       )}

      {/* Reject Booking Modal */}
      <Dialog
        open={showRejectModal.open}
        onOpenChange={(newOpenState) => setShowRejectModal({ open: newOpenState, booking: null })}
      >
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="mb-4">Reason for rejecting booking {showRejectModal.booking?.customBookingId || showRejectModal.booking?.id}:</p>
            <Textarea 
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRejectModal({ open: false, booking: null })}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={() => handleRejectBooking(showRejectModal.booking!)}
                disabled={!rejectReason.trim() || bookingActionLoading === showRejectModal.booking?.id}
              >
                {bookingActionLoading === showRejectModal.booking?.id ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize Booking Modal (Enter KG / Confirm Payment) */}
      <Dialog
        open={showFinalizeModal.open}
        onOpenChange={(newOpenState) => setShowFinalizeModal({ open: newOpenState, booking: null })}
      >
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{showFinalizeModal.booking?.isNoPlanBooking ? 'Confirm Payment' : 'Finalize Booking'}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {showFinalizeModal.booking?.isNoPlanBooking ? (
              <div className="space-y-4">
                <p>Confirm payment received for booking {showFinalizeModal.booking?.customBookingId || showFinalizeModal.booking?.id}.</p>
                 <div>
                    <label htmlFor="amountPaidModal" className="block text-sm font-medium text-gray-700">Amount Paid (₹)</label> {/* Corrected htmlFor */}
                     <Input
                        id="amountPaidModal"
                        type="number"
                        value={amountPaidModal}
                        onChange={(e) => setAmountPaidModal(parseFloat(e.target.value))}
                        placeholder="Enter amount paid"
                        className="mt-1"
                     />
                  </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <p>Enter KG used for booking {showFinalizeModal.booking?.customBookingId || showFinalizeModal.booking?.id}.</p>
                 <div>
                    <label htmlFor="kgUsed" className="block text-sm font-medium text-gray-700">KG Used</label>
                     <Input
                        id="kgUsed"
                        type="number"
                        value={kgUsed}
                        onChange={(e) => setKgUsed(parseFloat(e.target.value))}
                        placeholder="Enter KG used"
                        className="mt-1"
                     />
                  </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeModal({ open: false, booking: null })}>Cancel</Button>
            <Button 
              onClick={handleFinalizeBooking}
              disabled={bookingActionLoading === showFinalizeModal.booking?.id || (showFinalizeModal.booking?.isNoPlanBooking ? amountPaidModal === '' || isNaN(amountPaidModal as number) : kgUsed === '' || isNaN(kgUsed as number))}
            > {/* Corrected check */}
              {bookingActionLoading === showFinalizeModal.booking?.id ? 'Saving...' : (showFinalizeModal.booking?.isNoPlanBooking ? 'Confirm Payment' : 'Finalize Booking')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Booking Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Booking Details: {selectedBookingDetails?.customBookingId || selectedBookingDetails?.id}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {selectedBookingDetails ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Booking Information</h4>
                  <p><span className="font-medium">Service:</span> {selectedBookingDetails?.service || 'N/A'}</p>
                  <p><span className="font-medium">Status:</span> {selectedBookingDetails?.status || 'N/A'}</p>
                  {selectedBookingDetails?.planName && <p><span className="font-medium">Plan:</span> {selectedBookingDetails.planName}</p>}
                  {selectedBookingDetails?.usage !== undefined && <p><span className="font-medium">KG Used:</span> {selectedBookingDetails.usage} kg</p>}
                  {selectedBookingDetails?.amountDue !== undefined && <p><span className="font-medium">Amount Due:</span> ₹{selectedBookingDetails.amountDue}</p>}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Customer Information</h4>
                   <p><span className="font-medium">Name:</span> {selectedBookingDetails?.name || selectedBookingDetails?.username || 'N/A'}</p>
                   <p><span className="font-medium">Email:</span> {selectedBookingDetails?.email || 'N/A'}</p>
                </div>
                 <div className="space-y-2 col-span-2">
                    <h4 className="font-semibold">Pickup Information</h4>
                     <p><span className="font-medium">Date:</span> {selectedBookingDetails?.pickupDate || 'N/A'}</p>
                     <p><span className="font-medium">Address:</span> {selectedBookingDetails?.address || 'N/A'}</p>
                 </div>
                 {/* Activity Log */}
                 <div className="space-y-4 col-span-2">
                    <h4 className="font-semibold">Activity Log</h4>
                     <div className="relative pl-2">
                       {selectedBookingDetails && generateActivityLog(selectedBookingDetails).map((activity, index) => (
                         <div key={index} className="mb-6 flex items-start">
                            <div className="z-10 w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white ring-4 ring-blue-100 shrink-0">
                                {React.createElement(activityIcons[activity.type] || Clock, { className: 'w-3 h-3' })}
                            </div>
                             <div className="flex-1 ml-4">
                                <p className="font-medium text-gray-800">{activity.text}</p>
                                 <p className="text-xs text-gray-500">{activity.timestamp ? format(activity.timestamp, 'PPp') : 'N/A'}</p>
                             </div>
                         </div>
                       ))}
                        {/* Vertical Line */}
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                     </div>
                 </div>
              </div>
            ) : (
               <p className="text-center text-gray-500">No booking selected</p>
            )}
          </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingsTab; 