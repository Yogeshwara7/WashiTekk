import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, query, where, orderBy, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowUpDown, Filter, X, Clock, Calendar, CreditCard, Package, History, Mail, Phone } from 'lucide-react';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import firebase from 'firebase/app';
import 'firebase/firestore';

type SortOrder = 'asc' | 'desc';

interface PlanRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  plan: string;
  price: number;
  duration: string;
  type: string;
  conditioner?: string;
  kgLimit: number;
  paymentMethod: string;
  txnId?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any; // Firebase Timestamp
  approvedAt?: any;
  rejectedAt?: any;
  rejectReason?: string;
  notes?: string;
}

type SortField = 'requestedAt' | 'price' | 'plan' | 'name';

interface FilterState {
  planType: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
}

interface UserHistory {
  previousPlans: Array<{
    planName: string;
    startDate: any;
    endDate: any;
    status: string;
  }>;
  bookings: Array<{
    id: string;
    service: string;
    status: string;
    createdAt: any;
  }>;
  payments: Array<{
    amount: number;
    date: any;
    status: string;
  }>;
  phone?: string;
  createdAt: any;
}

interface BookingActivity {
  type: 'booking';
  id: string;
  service: string;
  status: string;
  createdAt: any;
}

interface PaymentActivity {
  type: 'payment';
  amount: number;
  date: any;
  status: string;
}

type Activity = BookingActivity | PaymentActivity;

const PlanRequestsTab: React.FC = () => {
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PlanRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<PlanRequest | null>(null);
  const [requestToReject, setRequestToReject] = useState<PlanRequest | null>(null);
  const [sortField, setSortField] = useState<SortField>('requestedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    planType: '',
    minPrice: 0,
    maxPrice: 10000,
    duration: ''
  });
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    planType: '',
    minPrice: 0,
    maxPrice: 10000,
    duration: ''
  });
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<PlanRequest | null>(null);
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [requestNotes, setRequestNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const isBookingActivity = (activity: Activity): activity is BookingActivity => {
    return activity.type === 'booking';
  };

  // Replace getDocs with onSnapshot for real-time updates
  useEffect(() => {
    let q = query(collection(db, 'plan_requests'));

    if (statusFilter !== 'all') {
      q = query(q, where('status', '==', statusFilter));
    }

    // Always order by requestedAt descending for consistency, unless a specific sort is applied later
    q = query(q, orderBy('requestedAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PlanRequest[];
        setPlanRequests(requests);
        setLoading(false);
      },
      (err) => {
        setError('Failed to fetch plan requests');
        console.error('Error fetching plan requests:', err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or status filter change
    return () => unsubscribe();
  }, [statusFilter]); // Add statusFilter to dependency array

  const handleApprove = (request: PlanRequest) => {
    setRequestToApprove(request);
    setShowApproveConfirm(true);
  };

  const handleReject = (request: PlanRequest) => {
    setRequestToReject(request);
    setShowRejectConfirm(true);
  };

  const confirmApprove = async () => {
    if (!requestToApprove) return;

    try {
      const requestRef = doc(db, 'plan_requests', requestToApprove.id);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedAt: Timestamp.fromDate(new Date())
      });

      // Update user's plan details
      const userRef = doc(db, 'users', requestToApprove.userId);
      try {
        await updateDoc(userRef, {
          planName: requestToApprove.plan,
          planPrice: requestToApprove.price,
          planDuration: requestToApprove.duration,
          planType: requestToApprove.type || '',
          conditioner: requestToApprove.conditioner,
          kgLimit: requestToApprove.kgLimit,
          planStatus: 'Active',
          planStartDate: Timestamp.fromDate(new Date()),
          usage: 0,
        });
        console.log('User document updated successfully with plan details.');
      } catch (userUpdateError) {
        console.error('Error updating user document with plan details:', userUpdateError);
        toast.error("Failed to update user's plan status.");
      }

      setPlanRequests(prev => prev.filter(r => r.id !== requestToApprove.id));
      toast.success('Plan request approved successfully');
      setShowApproveConfirm(false);
      setRequestToApprove(null);
    } catch (err) {
      console.error('Error approving plan request:', err);
      toast.error('Failed to approve plan request');
      setShowApproveConfirm(false);
      setRequestToApprove(null);
    }
  };

  const confirmReject = async () => {
    if (!requestToReject) return;

    try {
      const requestRef = doc(db, 'plan_requests', requestToReject.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: Timestamp.fromDate(new Date()),
        rejectReason
      });

      setPlanRequests(prev => prev.filter(r => r.id !== requestToReject.id));
      setShowRejectConfirm(false);
      setRejectReason('');
      setRequestToReject(null);
      toast.success('Plan request rejected');
    } catch (err) {
      console.error('Error rejecting plan request:', err);
      toast.error('Failed to reject plan request');
      setShowRejectConfirm(false);
      setRequestToReject(null);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setActiveFilters(filters);
    setShowFilterDialog(false);
  };

  const clearFilters = () => {
    setFilters({
      planType: '',
      minPrice: 0,
      maxPrice: 10000,
      duration: ''
    });
    setActiveFilters({
      planType: '',
      minPrice: 0,
      maxPrice: 10000,
      duration: ''
    });
  };

  const hasActiveFilters = Object.values(activeFilters).some(value => 
    value !== '' && value !== 0 && value !== 10000
  );

  // Sort the requests (use planRequests directly as status filtering is done by Firestore)
  const sortedAndFilteredRequests = React.useMemo(() => {
    return planRequests.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'requestedAt':
          // Safely access toDate and handle potential null/undefined
          const dateA = a.requestedAt?.toDate ? a.requestedAt.toDate() : new Date(0);
          const dateB = b.requestedAt?.toDate ? b.requestedAt.toDate() : new Date(0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'plan':
          comparison = a.plan.localeCompare(b.plan);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          // Fallback to requestedAt if sortField is somehow unset or invalid
          comparison = a.requestedAt.toDate() - b.requestedAt.toDate();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [planRequests, sortField, sortOrder]); // Use planRequests here

  const handleViewDetails = async (request: PlanRequest) => {
    setSelectedRequestDetails(request);
    setShowDetailsDialog(true);
    setLoadingHistory(true);
    setRequestNotes(request.notes || '');

    try {
      // Fetch user's history
      const userRef = doc(db, 'users', request.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserHistory({
          previousPlans: userData.previousPlans || [],
          bookings: userData.bookings || [],
          payments: userData.payments || [],
          phone: userData.phone,
          createdAt: userData.createdAt // Capture registration date
        });
      }
    } catch (err) {
      console.error('Error fetching user history:', err);
      toast.error('Failed to load user history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedRequestDetails) return;

    try {
      const requestRef = doc(db, 'plan_requests', selectedRequestDetails.id);
      await updateDoc(requestRef, {
        notes: requestNotes,
      });
      toast.success('Notes saved successfully');
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error('Failed to save notes');
    }
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-center py-4 text-red-600">{error}</div>;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-green-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-700">Plan Requests ({statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)})</h2>
        <div className="flex gap-4 items-center">
          {/* Status Filter Select */}
          <Select value={statusFilter} onValueChange={(value: 'pending' | 'approved' | 'rejected' | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select
              value={sortField}
              onValueChange={(value: SortField) => setSortField(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requestedAt">Request Date</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilterDialog(true)}
            className={`flex items-center gap-2 ${hasActiveFilters ? 'border-blue-500 text-blue-500' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {Object.values(activeFilters).filter(v => v !== '' && v !== 0 && v !== 10000).length}
              </span>
            )}
          </Button>
          <Input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Requests</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Plan Type</Label>
              <Select
                value={filters.planType}
                onValueChange={(value) => handleFilterChange('planType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Price Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
                  className="w-24"
                />
                <span>to</span>
                <Input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', Number(e.target.value))}
                  className="w-24"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Duration</Label>
              <Select
                value={filters.duration}
                onValueChange={(value) => handleFilterChange('duration', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Durations</SelectItem>
                  <SelectItem value="1 month">1 Month</SelectItem>
                  <SelectItem value="3 months">3 Months</SelectItem>
                  <SelectItem value="6 months">6 Months</SelectItem>
                  <SelectItem value="12 months">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sortedAndFilteredRequests.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No pending plan requests</p>
      ) : (
        <div className="space-y-4">
          {sortedAndFilteredRequests.map(request => (
            <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{request.name}</h3>
                  <p className="text-gray-600">{request.email}</p>
                  <div className="mt-2 space-y-1">
                    <p><span className="font-medium">Plan:</span> {request.plan}</p>
                    <p><span className="font-medium">Price:</span> ₹{request.price}</p>
                    <p><span className="font-medium">Duration:</span> {request.duration}</p>
                    <p><span className="font-medium">Type:</span> {request.type}</p>
                    {request.conditioner && (
                      <p><span className="font-medium">Conditioner:</span> {request.conditioner}</p>
                    )}
                    <p><span className="font-medium">KG Limit:</span> {request.kgLimit}kg</p>
                    <p><span className="font-medium">Payment Method:</span> {request.paymentMethod}</p>
                    {request.txnId && (
                      <p><span className="font-medium">Transaction ID:</span> {request.txnId}</p>
                    )}
                    {request.approvedAt && (
                       <p><span className="font-medium">Approved:</span> {request.approvedAt?.toDate ? format(request.approvedAt.toDate(), 'PPp') : 'N/A'}</p>
                    )}
                     {request.rejectedAt && (
                       <p><span className="font-medium">Rejected:</span> {request.rejectedAt?.toDate ? format(request.rejectedAt.toDate(), 'PPp') : 'N/A'}</p>
                    )}
                    {request.rejectReason && (
                      <p><span className="font-medium">Reason:</span> {request.rejectReason}</p>
                   )}
                    <p><span className="font-medium">Requested:</span> {request.requestedAt?.toDate ? format(request.requestedAt.toDate(), 'PPp') : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleViewDetails(request)}
                  >
                    View Details
                  </Button>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        onClick={() => handleApprove(request)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(request)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve the plan request for {requestToApprove?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveConfirm(false)}>Cancel</Button>
            <Button variant="default" onClick={confirmApprove} className="bg-green-600 hover:bg-green-700">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the plan request for {requestToReject?.name}? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Plan Request Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about the plan request and user history
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequestDetails && (
            <Tabs defaultValue="request" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="request">Request Details</TabsTrigger>
                <TabsTrigger value="history">User History</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">User Information</h4>
                    <p><span className="font-medium">Name:</span> {selectedRequestDetails.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedRequestDetails.email}</p>
                    {userHistory?.createdAt && (
                       <p><span className="font-medium">Registered:</span> {userHistory.createdAt?.toDate ? format(userHistory.createdAt.toDate(), 'PPp') : 'N/A'}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <a href={`mailto:${selectedRequestDetails.email}`}>
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-2" /> Email User
                        </Button>
                      </a>
                      {userHistory?.phone && (
                         <a href={`tel:${userHistory.phone}`}>
                            <Button variant="outline" size="sm">
                              <Phone className="h-4 w-4 mr-2" /> Call User
                            </Button>
                         </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Plan Details</h4>
                    <p><span className="font-medium">Plan:</span> {selectedRequestDetails.plan}</p>
                    <p><span className="font-medium">Type:</span> {selectedRequestDetails.type}</p>
                    <p><span className="font-medium">Duration:</span> {selectedRequestDetails.duration}</p>
                    <p><span className="font-medium">Price:</span> ₹{selectedRequestDetails.price}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Additional Information</h4>
                  <p><span className="font-medium">KG Limit:</span> {selectedRequestDetails.kgLimit}kg</p>
                  {selectedRequestDetails.conditioner && (
                    <p><span className="font-medium">Conditioner:</span> {selectedRequestDetails.conditioner}</p>
                  )}
                  <p><span className="font-medium">Payment Method:</span> {selectedRequestDetails.paymentMethod}</p>
                  {selectedRequestDetails.txnId && (
                    <p><span className="font-medium">Transaction ID:</span> {selectedRequestDetails.txnId}</p>
                  )}
                  <p><span className="font-medium">Requested:</span> {selectedRequestDetails.requestedAt?.toDate ? format(selectedRequestDetails.requestedAt.toDate(), 'PPp') : 'N/A'}</p>
                </div>

                {/* Notes Section */}
                <div className="space-y-2 border-t pt-4 mt-4">
                  <h4 className="font-semibold">Admin Notes</h4>
                  <Textarea
                    placeholder="Add internal notes about this request..."
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleSaveNotes} className="self-end">Save Notes</Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {loadingHistory ? (
                  <div className="text-center py-4">Loading user history...</div>
                ) : userHistory ? (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-semibold">Previous Plans</h4>
                      {userHistory.previousPlans.length > 0 ? (
                        <div className="space-y-2">
                          {userHistory.previousPlans.map((plan, index) => (
                            <div key={index} className="border rounded p-2">
                              <p><span className="font-medium">Plan:</span> {plan.planName}</p>
                              <p><span className="font-medium">Period:</span> {plan.startDate?.toDate ? format(plan.startDate.toDate(), 'PP') : 'N/A'} - {plan.endDate?.toDate ? format(plan.endDate.toDate(), 'PP') : 'N/A'}</p>
                              <p><span className="font-medium">Status:</span> {plan.status}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No previous plans</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Recent Bookings</h4>
                      {userHistory.bookings.length > 0 ? (
                        <div className="space-y-2">
                          {userHistory.bookings.slice(0, 5).map(booking => (
                            <div key={booking.id} className="border rounded p-2">
                              <p><span className="font-medium">Service:</span> {booking.service}</p>
                              <p><span className="font-medium">Status:</span> {booking.status}</p>
                              <p><span className="font-medium">Date:</span> {booking.createdAt?.toDate ? format(booking.createdAt.toDate(), 'PPp') : 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No recent bookings</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Payment History</h4>
                      {userHistory.payments.length > 0 ? (
                        <div className="space-y-2">
                          {userHistory.payments.slice(0, 5).map((payment, index) => (
                            <div key={index} className="border rounded p-2">
                              <p><span className="font-medium">Amount:</span> ₹{payment.amount}</p>
                              <p><span className="font-medium">Date:</span> {payment.date?.toDate ? format(payment.date.toDate(), 'PPp') : 'N/A'}</p>
                              <p><span className="font-medium">Status:</span> {payment.status}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No payment history</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500">No user history available</p>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Recent Activity</h4>
                  {userHistory ? (
                    <div className="space-y-2">
                      {[...userHistory.bookings.map(b => ({ ...b, type: 'booking' as const })), 
                        ...userHistory.payments.map(p => ({ ...p, type: 'payment' as const }))]
                        .sort((a, b) => {
                          const dateA = isBookingActivity(a) ? a.createdAt : a.date;
                          const dateB = isBookingActivity(b) ? b.createdAt : b.date;
                          return dateB.toDate() - dateA.toDate();
                        })
                        .slice(0, 10)
                        .map((activity, index) => (
                          <div key={index} className="border rounded p-2">
                            <p className="font-medium">
                              {isBookingActivity(activity) ? 'Booking' : 'Payment'}
                            </p>
                            <p>
                              {isBookingActivity(activity)
                                ? `Service: ${activity.service}`
                                : `Amount: ₹${activity.amount}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(
                                (isBookingActivity(activity) ? activity.createdAt : activity.date).toDate(),
                                'PPp'
                              )}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No recent activity</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanRequestsTab;