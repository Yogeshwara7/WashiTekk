export const sortUsers = (users: any[], sortOrder: string) => {
  return [...users].sort((a, b) => {
    switch (sortOrder) {
      case 'recent':
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      case 'earliest':
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case 'name':
        return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      case 'plan':
        return (a.planName || '').localeCompare(b.planName || '');
      default:
        return 0;
    }
  });
};

export const sortBookings = (bookings: any[], sortOrder: string) => {
  return [...bookings].sort((a, b) => {
    switch (sortOrder) {
      case 'recent':
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      case 'earliest':
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case 'pickup':
        return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });
};

export const sortHistory = (bookings: any[], sortOrder: string) => {
  return [...bookings]
    .filter(b => b.status === 'completed' || b.status === 'rejected')
    .sort((a, b) => {
      switch (sortOrder) {
        case 'recent':
          return new Date(b.completedAt || b.rejectedAt).getTime() - new Date(a.completedAt || a.rejectedAt).getTime();
        case 'earliest':
          return new Date(a.completedAt || a.rejectedAt).getTime() - new Date(b.completedAt || b.rejectedAt).getTime();
        case 'amount':
          return (b.amountDue || 0) - (a.amountDue || 0);
        case 'amount_low':
          return (a.amountDue || 0) - (b.amountDue || 0);
        default:
          return 0;
      }
    });
};

export const sortFeedback = (messages: any[], sortOrder: string) => {
  return [...messages].sort((a, b) => {
    switch (sortOrder) {
      case 'recent':
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      case 'earliest':
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case 'unread':
        return (a.read ? 1 : 0) - (b.read ? 1 : 0);
      case 'read':
        return (b.read ? 1 : 0) - (a.read ? 1 : 0);
      default:
        return 0;
    }
  });
}; 