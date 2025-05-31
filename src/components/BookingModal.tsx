import React, { useState, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';

type UserExtraInfo = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

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
};

export default function BookingModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  // Autofill logic
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Try to get extra user info from Firestore (like phone, address, etc.)
        let extra: UserExtraInfo = {};
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            extra = userDoc.data() as UserExtraInfo;
          }
        } catch {}
        setForm(f => ({
          ...f,
          name: (typeof extra.name === 'string' && extra.name) || firebaseUser.displayName || '',
          email: (typeof extra.email === 'string' && extra.email) || firebaseUser.email || '',
          phone: (typeof extra.phone === 'string' && extra.phone) || firebaseUser.phoneNumber || '',
          address: typeof extra.address === 'object' && extra.address !== null
            ? Object.values(extra.address).join(', ')
            : (extra.address || ''),
        }));
      } else {
        setUser(null);
        setForm(initialForm);
      }
    });
    return () => unsub();
  }, [open]);

  const handleChange = (e) => {
    // Keep this generic handler for simple input fields
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // selectedServiceObj is no longer strictly needed if plans are removed from UI,
  // but keeping the services array definition might be useful later.
  // const selectedServiceObj = services.find(s => s.name === form.service);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check required fields (Plan is no longer required)
    if (!form.name || !form.phone || !form.address || !form.pickupDate || !form.service) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');
    try {
      // Generate a short, user-friendly booking ID
      const customBookingId = nanoid(8).toUpperCase(); // Generate an 8-character ID

      const bookingRef = await addDoc(collection(db, 'bookings'), {
        // Spread existing form data
        ...form,
        customBookingId: customBookingId, // Add the custom booking ID
        // Add created timestamp and initial status
        createdAt: Timestamp.now(),
        status: 'pending',
        // Explicitly include addOn
        addOn: form.addOn,
        // isNoPlanBooking flag might be determined elsewhere or removed if no plans means no plan booking
        // isNoPlanBooking: true, // Assuming no plan selection means it's a no-plan booking
      });

      // Admin notification for new booking
      let notificationMessage = `${form.name} has requested a booking for ${form.service}`;;
      if (form.addOn && form.addOn !== 'none') {
         notificationMessage += ` with ${form.addOn} add-on`;
      }

      await addDoc(collection(db, 'admin_notifications'), {
        title: 'New Booking Request',
        message: notificationMessage,
        type: 'booking',
        priority: 'high',
        read: false,
        createdAt: Timestamp.now(),
        metadata: {
          userName: form.name,
          userEmail: form.email,
          service: form.service,
          bookingId: customBookingId, // Use the custom ID in notifications
          status: 'pending',
          addOn: form.addOn, // Include addOn in metadata
        }
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit booking:', err);
      setError('Failed to submit booking. Please try again.');
    }
  };

  const handleOpenChange = (val) => {
    setOpen(val);
    if (!val) {
      setForm(initialForm);
      setSubmitted(false);
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-semibold">Book Now</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Laundry Pickup</DialogTitle>
          <DialogDescription>
            Fill in your details and we'll arrange a pickup at your convenience.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-lg font-semibold mb-2">Booking Confirmed!</div>
            <div className="text-gray-600">We've received your request. Our team will contact you soon.</div>
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
                <Select value={form.service} onValueChange={val => {
                  setForm(f => ({ ...f, service: val }));
                }}>
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
              <Button type="submit" className="w-full">Confirm Booking</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 