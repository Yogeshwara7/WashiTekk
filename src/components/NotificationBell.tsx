import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Bell, Check, Trash2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Admin emails constant
const ADMIN_EMAILS = (process.env.REACT_APP_ADMIN_EMAILS || '').split(',');

interface Notification {
  id: string;
  type: 'feedback' | 'payment' | 'booking' | 'plan';
  read: boolean;
  createdAt: Timestamp;
  title: string;
  message: string;
  icon?: string;
  priority: 'high' | 'medium' | 'low';
  metadata: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    amount?: number;
    service?: string;
    bookingId?: string;
    planName?: string;
    status?: string;
  };
}

interface NotificationBellProps {
  shouldBeTransparent: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ shouldBeTransparent }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle click outside dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Fetch notifications
  useEffect(() => {
    if (!auth.currentUser) return;
    const isAdmin = ADMIN_EMAILS.includes(auth.currentUser.email || '');

    let unsubscribes: (() => void)[] = [];

    if (isAdmin) {
      // Admin: fetch from admin_notifications
      const q = query(
        collection(db, 'admin_notifications'),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        const newNotifications = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
      });
      unsubscribes = [unsub];
    } else {
      // Normal user: fetch from users/{uid}/notifications
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'notifications'),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        const newNotifications = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
      });
      unsubscribes = [unsub];
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [auth.currentUser]);

  const markNotificationRead = async (notification: Notification) => {
    if (!auth.currentUser) return;
    
    try {
        if (ADMIN_EMAILS.includes(auth.currentUser.email || '')) {
        const notifRef = doc(db, 'admin_notifications', notification.id);
        await updateDoc(notifRef, { read: true });
        } else {
          const notifRef = doc(db, 'users', auth.currentUser.uid, 'notifications', notification.id);
          await updateDoc(notifRef, { read: true });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    setDropdownOpen(false);
    await markNotificationRead(notification);
    
    const isAdmin = auth.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email || '');
    
    if (isAdmin) {
      switch (notification.type) {
        case 'feedback':
          navigate('/admin', { 
            state: { 
              activeTab: 'feedback',
              searchQuery: notification.metadata.userName,
              highlightId: notification.id 
            } 
          });
          break;
        case 'payment':
          navigate('/admin', { 
            state: { 
              activeTab: 'users',
              searchQuery: notification.metadata.userName,
              highlightId: notification.id 
            } 
          });
          break;
        case 'booking':
          navigate('/admin', { 
            state: { 
              activeTab: 'bookings',
              searchQuery: notification.metadata.userName,
              highlightId: notification.id,
              bookingId: notification.metadata.bookingId
            } 
          });
          break;
        default:
          navigate('/admin');
      }
    } else {
      switch (notification.type) {
        case 'feedback':
          navigate('/dashboard', { 
            state: { 
              activeTab: 'feedback',
              highlightId: notification.id 
            } 
          });
          break;
        case 'payment':
          navigate('/dashboard', { 
            state: { 
              activeTab: 'payments',
              highlightId: notification.id 
            } 
          });
          break;
        case 'booking':
          navigate('/dashboard', { 
            state: { 
              activeTab: 'bookings',
              highlightId: notification.id,
              bookingId: notification.metadata.bookingId
            } 
          });
          break;
        case 'plan':
          navigate('/dashboard', { 
            state: { 
              activeTab: 'plans',
              highlightId: notification.id 
            } 
          });
          break;
        default:
          navigate('/dashboard');
      }
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'feedback':
        return '💬';
      case 'payment':
        return '💰';
      case 'booking':
        return '📅';
      case 'plan':
        return '📋';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="relative">
      <button 
        className="relative" 
        onClick={() => setDropdownOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell className={`w-7 h-7 ${shouldBeTransparent ? 'text-white' : 'text-blue-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </button>
      {dropdownOpen && (
        <div 
          ref={dropdownRef} 
          className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[480px] overflow-y-auto"
        >
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-sm text-gray-500">{unreadCount} unread</span>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => (
              <div 
                  key={n.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    n.read ? 'bg-gray-50/50' : 'bg-white'
                  }`}
                onClick={() => handleNotificationClick(n)}
              >
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl ${getNotificationColor(n.priority)}`}>
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {n.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                        </span>
                        {!n.read && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 