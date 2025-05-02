import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Admin emails constant
const ADMIN_EMAILS = ['yogeshwara49@gmail.com'];

// Add prop type
interface NotificationBellProps {
  shouldBeTransparent: boolean;
}

// Update function signature
const NotificationBell: React.FC<NotificationBellProps> = ({ shouldBeTransparent }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    // Feedback notifications
    const unsub1 = onSnapshot(collection(db, 'contact_messages'), (snap) => {
      const feedbackNotifs = snap.docs.map(doc => ({
        type: 'feedback',
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(current => {
        const others = current.filter(n => n.type !== 'feedback');
        const merged = [...others, ...feedbackNotifs];
        const unique = Array.from(new Map(merged.map(n => [n.type + n.id, n])).values());
        return unique;
      });
    });
    // Payment notifications
    const unsub2 = onSnapshot(collection(db, 'users'), (snap) => {
      let paymentNotifs: any[] = [];
      snap.docs.forEach(docSnap => {
        const after = docSnap.data();
        if (Array.isArray(after.payments)) {
          after.payments.forEach((payment, idx) => {
            paymentNotifs.push({
              type: 'payment',
              id: docSnap.id + '_' + idx,
              name: after.name || after.email,
              amount: payment.amount
            });
          });
        }
      });
      setNotifications(current => {
        const others = current.filter(n => n.type !== 'payment');
        const merged = [...others, ...paymentNotifs];
        const unique = Array.from(new Map(merged.map(n => [n.type + n.id, n])).values());
        return unique;
      });
    });
    // Booking notifications
    const unsub3 = onSnapshot(collection(db, 'bookings'), (snap) => {
      const bookingNotifs = snap.docs.map(doc => {
        const booking = doc.data();
        return {
          type: 'booking',
          id: doc.id,
          name: booking.name || booking.email,
          service: booking.service
        };
      });
      setNotifications(current => {
        const others = current.filter(n => n.type !== 'booking');
        const merged = [...others, ...bookingNotifs];
        const unique = Array.from(new Map(merged.map(n => [n.type + n.id, n])).values());
        return unique;
      });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Mark all notifications as read when dropdown is opened
  useEffect(() => {
    if (dropdownOpen && notifications.some(n => !n.read)) {
      const markAllRead = async () => {
        if (auth.currentUser) {
          if (ADMIN_EMAILS.includes(auth.currentUser.email || "")) {
            // Admin: just update local state
            setNotifications(current => current.map(n => ({ ...n, read: true })));
          } else {
            // Normal user: update Firestore and local state
            const batch = notifications
              .filter(n => !n.read)
              .map(async n => {
                const notifRef = doc(db, "users", auth.currentUser!.uid, "notifications", n.id);
                await updateDoc(notifRef, { read: true });
              });
            await Promise.all(batch);
            setNotifications(current => current.map(n => ({ ...n, read: true })));
          }
        }
      };
      markAllRead();
    }
  }, [dropdownOpen]);

  const markNotificationRead = async (notification: any) => {
    // Update Firestore and local state
    try {
      if (auth.currentUser) {
        if (ADMIN_EMAILS.includes(auth.currentUser.email || '')) {
          // Admin notifications are not stored in a collection, so just update local state
          setNotifications(current => current.map(n => n.id === notification.id ? { ...n, read: true } : n));
        } else {
          // Normal user: update Firestore and local state
          const notifRef = doc(db, 'users', auth.currentUser.uid, 'notifications', notification.id);
          await updateDoc(notifRef, { read: true });
          setNotifications(current => current.map(n => n.id === notification.id ? { ...n, read: true } : n));
        }
      }
    } catch (err) {
      // Fallback: update local state anyway
      setNotifications(current => current.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }
  };

  const handleNotificationClick = async (notification: any) => {
    setDropdownOpen(false);
    await markNotificationRead(notification);
    
    // Check if user is admin
    const isAdmin = auth.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email || '');
    
    if (isAdmin) {
      // Admin navigation - always go to admin dashboard
      switch (notification.type) {
        case 'feedback':
          navigate('/admin', { 
            state: { 
              activeTab: 'feedback',
              searchQuery: notification.name,
              highlightId: notification.id 
            } 
          });
          break;
        case 'payment':
          navigate('/admin', { 
            state: { 
              activeTab: 'users',
              searchQuery: notification.name,
              highlightId: notification.id 
            } 
          });
          break;
        case 'booking':
          navigate('/admin', { 
            state: { 
              activeTab: 'bookings',
              searchQuery: notification.customBookingId || notification.name,
              highlightId: notification.id 
            } 
          });
          break;
      }
    } else {
      // Normal user navigation to dashboard sections
      switch (notification.type) {
        case 'feedback':
          navigate('/dashboard#feedback');
          break;
        case 'payment':
          navigate('/dashboard#payments');
          break;
        case 'booking':
          navigate('/dashboard#bookings');
          break;
      }
    }
  };

  return (
    <div className="relative">
      <button className="relative" onClick={() => setDropdownOpen(o => !o)}>
        <Bell className={`w-7 h-7 ${shouldBeTransparent ? 'text-white' : 'text-blue-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">{unreadCount}</span>
        )}
      </button>
      {dropdownOpen && (
        <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-blue-100 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b font-bold text-blue-700">Notifications</div>
          {notifications.length === 0 ? (
            <div className="p-4 text-gray-500">No notifications</div>
          ) : (
            notifications.map((n, i) => (
              <div 
                key={n.type + n.id} 
                className={`px-4 py-3 border-b last:border-b-0 flex items-center gap-2 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${n.read ? 'opacity-60' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                {n.type === 'feedback' ? (
                  <span>New feedback from <b>{n.name}</b>: <i>{n.subject}</i></span>
                ) : n.type === 'payment' ? (
                  <span>New payment from <b>{n.name}</b>: ₹{n.amount}</span>
                ) : n.type === 'booking' ? (
                  <span>New booking from <b>{n.name}</b>: <i>{n.service}</i></span>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 