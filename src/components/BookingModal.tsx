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

type UserExtraInfo = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  pickupDate: '',
  pickupTime: '',
  service: '',
  instructions: '',
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simple validation
    if (!form.name || !form.phone || !form.address || !form.pickupDate || !form.service) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');
    try {
      await addDoc(collection(db, 'bookings'), {
        ...form,
        createdAt: Timestamp.now(),
        status: 'pending',
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit booking. Please try again.');
    }
    // Here you can send the form data to your backend or Firestore
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
                <Select value={form.service} onValueChange={val => handleChange({ target: { name: 'service', value: val } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wash & Fold">Wash & Fold</SelectItem>
                    <SelectItem value="Wash & Iron">Wash & Iron</SelectItem>
                    <SelectItem value="Dry Cleaning">Dry Cleaning</SelectItem>
                    <SelectItem value="Steam Press">Steam Press</SelectItem>
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