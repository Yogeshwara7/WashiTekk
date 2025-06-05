import React, { useState, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { nanoid } from 'nanoid';

// 1. Define services and their plans (Keep services for now, plans are removed from form)
const services = [
  {
    name: "Wash & Fold",
    plans: [
      { name: "Basic", price: 100, description: "Up to 5kg" },
      { name: "Premium", price: 180, description: "Up to 10kg" }
    ]
  },
  {
    name: "Wash & Iron",
    plans: [
      { name: "Standard", price: 150, description: "Up to 5kg" },
      { name: "Deluxe", price: 250, description: "Up to 10kg" }
    ]
  },
  {
    name: "Dry Cleaning",
    plans: [
      { name: "Regular", price: 200, description: "Per item" },
      { name: "Express", price: 350, description: "Faster delivery" }
    ]
  },
  {
    name: "Steam Press",
    plans: [
      { name: "Normal", price: 80, description: "Up to 5kg" },
      { name: "Bulk", price: 140, description: "Up to 10kg" }
    ]
  }
];

// Define Add-on options
const addOns = [
  { name: "None", value: "none" },
  { name: "Comfort", value: "comfort" },
  // Add more add-ons here if needed
];

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  pickupDate: '',
  pickupTime: '',
  service: '',
  // Removed plan: '',
  instructions: '',
  addOn: 'none', // Add addOn field with a default value
  customBookingId: '', // Add customBookingId field
};

// Re-add userData state and a state for controlling content
interface UserExtraInfo {
  creditUsed?: number;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

type ModalContentState = 'form' | 'refillPrompt';

// Define the props accepted by BookingModal
interface BookingModalProps {
  isBookingDisabled?: boolean; // Optional prop to disable the booking button
}

export default function BookingModal({ isBookingDisabled }: BookingModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState<UserExtraInfo | null>(null);
  const [modalContent, setModalContent] = useState<ModalContentState>('form'); // State to control modal content

  // Autofill logic and fetch user credit data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Try to get extra user info from Firestore (like phone, address, credit, plan status)
        let extra: UserExtraInfo = {}; // Use the defined interface
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            extra = userDoc.data() as UserExtraInfo; // Use the defined interface
            setUserData(extra);
          }
        } catch (e) { console.error("Error fetching user data for booking modal:", e); }
        setForm(f => ({
          ...f,
          name: (typeof extra.name === 'string' && extra.name) || firebaseUser.displayName || '',
          email: (typeof extra.email === 'string' && extra.email) || firebaseUser.email || '',
          phone: (typeof extra.phone === 'string' && extra.phone) || firebaseUser.phoneNumber || '',
          address: (() => {
            if (typeof extra.address === 'object' && extra.address !== null) {
              const addressObj = extra.address as { [key: string]: string }; // Type assertion for safety
              return `${addressObj.street || ''}, ${addressObj.city || ''}, ${addressObj.state || ''} ${addressObj.zip || ''}, ${addressObj.country || ''}`;
            } else {
              return '';
            }
          })().replace(/,?\s*,/g, ', ').replace(/^\s*/, '').replace(/\s*$/, ''),
        }));
      } else {
        setUser(null);
        setUserData(null);
        setForm(initialForm);
      }
    });
    return () => unsub();
  }, [open]); // Depend on open state to refetch user data when modal opens

  const handleChange = (e) => {
    // Keep this generic handler for simple input fields
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle service selection specifically to reset credit option
  const handleServiceChange = (value: string) => {
    setForm({ ...form, service: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check required fields
    if (!form.name || !form.phone || !form.address || !form.pickupDate || !form.service) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');

    try {
      // Generate a short, user-friendly booking ID
      const customBookingId = nanoid(8).toUpperCase(); // Generate an 8-character ID

      const bookingData: any = {
        ...form,
        customBookingId: customBookingId,
        createdAt: Timestamp.now(),
        // Set status and payment method based on whether credit is used
        status: 'pending', // Always 'pending' initially now
        paymentMethod: '', // Payment method is determined later
        amountDue: null, // Amount due is set by admin later
        userId: user.uid, // Store user ID for easier lookup
      };

      // Always handle as non-credit booking submission now
       const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
       console.log('Booking added with ID: ', bookingRef.id);
       setForm(prev => ({ ...prev, customBookingId: customBookingId }));
       setSubmitted(true);
       setError('');

      // Admin notification for new booking
      let notificationMessage = `${form.name} has requested a booking for ${form.service}`;
      if (form.addOn && form.addOn !== 'none') {
        notificationMessage += ` with ${form.addOn} add-on`;
      }

      await addDoc(collection(db, 'admin_notifications'), {
        title: 'New Booking Request',
        message: notificationMessage,
        type: 'booking',
        priority: 'normal', // Priority is normal now, not based on credit
        read: false,
        createdAt: Timestamp.now(),
        metadata: {
          userName: form.name,
          userEmail: form.email,
          service: form.service,
          bookingId: customBookingId,
          status: 'pending', // Always pending initially
          addOn: form.addOn,
        }
      });
    } catch (err) {
      console.error('Failed to submit booking:', err);
      setError('Failed to submit booking. Please try again.');
    }
  };

  const handleOpenChange = (val) => {
    setOpen(val);
    if (val) { // When modal opens, check user credit
      if (userData && (userData.creditUsed || 0) > 0) {
        setModalContent('refillPrompt');
      } else {
        setModalContent('form');
      }
    } else { // When modal closes, reset state
      setForm(initialForm);
      setSubmitted(false);
      setError('');
      setModalContent('form'); // Reset to show form next time
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-semibold" disabled={isBookingDisabled}>Book Now</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Laundry Pickup</DialogTitle>
          <DialogDescription>
            Fill in your details and we'll arrange a pickup at your convenience.
          </DialogDescription>
        </DialogHeader>
        {modalContent === 'refillPrompt' ? (
          <div className="text-center py-8">
            <div className="text-orange-600 text-lg font-semibold mb-2">Refill Credit Required</div>
            <div className="text-gray-600">You have used credit on a previous booking. Please refill your credit to book a new order.</div>
            <DialogClose asChild>
              <Button className="mt-6 w-full">Close</Button>
            </DialogClose>
          </div>
        ) : (
          submitted ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-lg font-semibold mb-2">Thank You for Your Booking!</div>
              <div className="text-gray-600 mb-4">Your booking request has been successfully submitted. We will review your request and contact you shortly to confirm the details and arrange pickup.</div>
              <div className="text-sm text-gray-500 mb-6">
                <p>Booking ID: {form.customBookingId}</p>
                <p>Service: {form.service}</p>
                <p>Pickup Date: {form.pickupDate}</p>
              </div>
              <DialogClose asChild>
                <Button className="mt-6 w-full">Close</Button>
              </DialogClose>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Name *</label>
                  <Input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Phone *</label>
                  <Input name="phone" value={form.phone} onChange={handleChange} required type="tel" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Email</label>
                  <Input name="email" value={form.email} onChange={handleChange} type="email" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Pickup Date *</label>
                  <Input name="pickupDate" value={form.pickupDate} onChange={handleChange} required type="date" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Service Type *</label>
                  <Select value={form.service} onValueChange={handleServiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.name} value={service.name}>{service.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Add-on selection dropdown */}
                <div>
                  <label className="block mb-1 font-medium">Add-on</label>
                  <Select value={form.addOn} onValueChange={val => setForm(f => ({ ...f, addOn: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Add-on" />
                    </SelectTrigger>
                    <SelectContent>
                      {addOns.map(addOn => (
                        <SelectItem key={addOn.value} value={addOn.value}>
                          {addOn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Pickup Address *</label>
                <Textarea name="address" value={form.address} onChange={handleChange} required rows={2} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Special Instructions</label>
                <Textarea name="instructions" value={form.instructions} onChange={handleChange} rows={2} />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <DialogFooter>
                <Button type="submit" className="w-full">Submit Booking</Button>
              </DialogFooter>
            </form>
          )
        )}
      </DialogContent>
    </Dialog>
  );
} 