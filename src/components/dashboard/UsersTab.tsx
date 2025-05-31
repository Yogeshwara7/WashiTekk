import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { doc, updateDoc, deleteDoc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import TabSortOptions from '../TabSortOptions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { format } from 'date-fns';
import { Mail, Phone, Clock, Calendar, CreditCard, Package, History } from 'lucide-react';

interface User {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  planName?: string;
  planPrice?: number;
  planDuration?: string;
  planStatus?: string;
  planPaymentMethod?: string;
  createdAt?: any;
  phone?: string;
  previousPlans?: Array<{
    planName: string;
    startDate: any;
    endDate: any;
    status: string;
  }>;
}

interface UsersTabProps {
  users: User[];
  onUsersChange: (users: User[]) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, onUsersChange }) => {
  const [search, setSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userSortOrder, setUserSortOrder] = useState('recent');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  const USERS_PER_PAGE = 10;

  // Filter users based on search
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (!search ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(search.toLowerCase())));
    return matchesSearch;
  });

  // Generate short IDs based on name
  const nameCounts: { [key: string]: number } = {};
  const usersWithShortId = filteredUsers.map(user => {
    const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U'; // Capitalize the first letter
    nameCounts[firstLetter] = (nameCounts[firstLetter] || 0) + 1;
    const shortId = `WT-${firstLetter}${nameCounts[firstLetter]}`; // Add WT- prefix and use capitalized letter
    return { ...user, shortId };
  });

  // Paginated users
  const paginatedUsers = usersWithShortId.slice((userPage-1)*USERS_PER_PAGE, userPage*USERS_PER_PAGE);

  // Handle user selection
  const handleUserSelect = (id: string) => {
    setSelectedUserIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  const handleUserSelectAll = () => {
    const ids = paginatedUsers.map(u => u.id);
    setSelectedUserIds(selectedUserIds.length === ids.length && ids.length > 0 ? [] : ids);
  };

  // Handle bulk delete
  const handleBulkDeleteUsers = async () => {
    if (!window.confirm('Delete selected users?')) return;
    for (const id of selectedUserIds) {
      try {
        await deleteDoc(doc(db, 'users', id));
        toast.success(`User ${id} deleted.`);
      } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        toast.error(`Failed to delete user ${id}.`);
      }
    }
    onUsersChange(users.filter(u => !selectedUserIds.includes(u.id)));
    setSelectedUserIds([]);
  };

  const handleViewUserDetails = async (user: User) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
    setLoadingUserDetails(true);

    try {
      // Removed fetching bookings and payments for user details modal
      // const bookingsQuery = query(
      //   collection(db, 'bookings'),
      //   where('userId', '==', user.id),
      //   orderBy('createdAt', 'desc')
      // );
      // const bookingDocs = await getDocs(bookingsQuery);
      // const bookings = bookingDocs.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data()
      // })) as BookingActivity[];
      // setSelectedUserBookings(bookings);

      // const payments = (user.payments || []).map(p => ({
      //   type: 'payment' as const,
      //   amount: p.amount,
      //   date: new Date(p.date),
      //   status: p.status
      // })) as PaymentActivity[];
      // setSelectedUserPayments(payments);

    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details.');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-blue-100">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">All Users</h2>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <Input
          type="text"
          placeholder="Search by User ID, name, or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-64"
        />
      </div>
      {selectedUserIds.length > 0 && (
        <Button 
          variant="destructive" 
          onClick={handleBulkDeleteUsers}
          className="mb-4"
        >
          Delete Selected Users ({selectedUserIds.length})
        </Button>
      )}
      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-[900px] md:min-w-full bg-white rounded-lg shadow text-xs md:text-base">
          <thead className="bg-blue-50">
            <tr>
              <th className="py-2 px-6">
                <input 
                  type="checkbox" 
                  checked={selectedUserIds.length === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={handleUserSelectAll}
                />
              </th>
              <th className="py-2 px-6 whitespace-nowrap">User ID</th>
              <th className="py-2 px-6 flex items-center">User</th>
              <th className="py-2 px-6">Plan</th>
              <th className="py-2 px-6">Price</th>
              <th className="py-2 px-6">Duration</th>
              <th className="py-2 px-6">Status</th>
              <th className="py-2 px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100 transition' : 'hover:bg-gray-100 transition'}>
                <td className="py-2 px-6">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => handleUserSelect(u.id)}
                  />
                </td>
                <td className="py-2 px-6 whitespace-nowrap">{u.shortId || u.id}</td>
                <td className="py-2 px-6 flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>{u.name ? u.name.charAt(0) : 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{u.name || 'N/A'}</div>
                    <div className="text-gray-500 text-xs">{u.email || 'N/A'}</div>
                  </div>
                </td>
                <td className="py-2 px-6">{u.planName || 'No Plan'}</td>
                <td className="py-2 px-6">{u.planPrice ? `₹${u.planPrice.toFixed(2)}` : 'N/A'}</td>
                <td className="py-2 px-6">{u.planDuration || 'N/A'}</td>
                <td className="py-2 px-6">
                  <span className={
                    `px-2 py-1 rounded-full text-xs ${u.planStatus === 'Active' ? 'bg-green-100 text-green-800' : u.planStatus === 'Expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`
                  }>
                    {u.planStatus || 'No Plan'}
                  </span>
                </td>
                <td className="py-2 px-6 flex gap-2">
                   <Button variant="outline" size="sm" onClick={() => handleViewUserDetails(u)}>
                     Details
                   </Button>
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

      <Dialog open={showUserDetailsModal} onOpenChange={setShowUserDetailsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.name || selectedUser?.email}</DialogTitle>
          </DialogHeader>

          {loadingUserDetails ? (
            <div className="text-center py-4">Loading user details...</div>
          ) : selectedUser ? (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="plans">Plans</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <h4 className="font-semibold">Basic Information</h4>
                    <p><span className="font-medium">Name:</span> {selectedUser.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                     {selectedUser.username && <p><span className="font-medium">Username:</span> {selectedUser.username}</p>}
                     {selectedUser.createdAt && (
                       <p><span className="font-medium">Registered:</span> {format(selectedUser.createdAt.toDate(), 'PPp')}</p>
                    )}
                     {selectedUser.phone && (
                        <p><span className="font-medium">Phone:</span> {selectedUser.phone}</p>
                     )}
                  </div>
                  <div className="space-y-2">
                     <h4 className="font-semibold">Current Plan</h4>
                     {selectedUser.planName ? (
                       <>
                          <p><span className="font-medium">Plan:</span> {selectedUser.planName}</p>
                          <p><span className="font-medium">Duration:</span> {selectedUser.planDuration}</p>
                          <p><span className="font-medium">Price:</span> ₹{selectedUser.planPrice}</p>
                           <p><span className="font-medium">Status:</span> {selectedUser.planStatus}</p>
                       </>
                     ) : (
                       <p className="text-gray-500">No active plan</p>
                     )}
                  </div>
                </div>
                <div className="space-y-2 border-t pt-4 mt-4">
                   <h4 className="font-semibold">Contact</h4>
                    <div className="flex gap-2">
                       {selectedUser.email && (
                          <a href={`mailto:${selectedUser.email}`}>
                             <Button variant="outline" size="sm">
                               <Mail className="h-4 w-4 mr-2" /> Email User
                             </Button>
                           </a>
                        )}
                       {selectedUser.phone && (
                          <a href={`tel:${selectedUser.phone}`}>
                             <Button variant="outline" size="sm">
                               <Phone className="h-4 w-4 mr-2" /> Call User
                             </Button>
                          </a>
                       )}
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="plans" className="space-y-4">
                 <h4 className="font-semibold">Previous Plans</h4>
                 {(selectedUser.previousPlans || []).length > 0 ? (
                    <div className="space-y-2">
                       {(selectedUser.previousPlans || []).map((plan, index) => (
                         <div key={index} className="border rounded p-2">
                           <p><span className="font-medium">Plan:</span> {plan.planName}</p>
                           <p><span className="font-medium">Period:</span> {format(plan.startDate.toDate(), 'PP')} - {format(plan.endDate.toDate(), 'PP')}</p>
                           <p><span className="font-medium">Status:</span> {plan.status}</p>
                         </div>
                       ))}
                    </div>
                 ) : (
                   <p className="text-gray-500">No previous plans</p>
                 )}
              </TabsContent>
            </Tabs>
          ) : (
             <p className="text-center text-gray-500">No user selected</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTab; 