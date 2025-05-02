import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Edit2, Trash2, Plus } from 'lucide-react';
import { colors } from "@/styles/colors";
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch profile data from Firestore
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
          setForm({
            name: docSnap.data().name || firebaseUser.displayName || '',
            phone: docSnap.data().phone || firebaseUser.phoneNumber || '',
            address: {
              street: docSnap.data().address?.street || '',
              city: docSnap.data().address?.city || '',
              state: docSnap.data().address?.state || '',
              zip: docSnap.data().address?.zip || '',
              country: docSnap.data().address?.country || '',
            },
          });
        } else {
          setProfileData(null);
          setForm({
            name: firebaseUser.displayName || '',
            phone: firebaseUser.phoneNumber || '',
            address: { street: '', city: '', state: '', zip: '', country: '' },
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = () => setEditOpen(true);
  const handleClose = () => { setEditOpen(false); setMessage(''); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(f => ({ ...f, address: { ...f.address, [key]: value } }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        ...profileData,
        name: form.name,
        phone: form.phone,
        address: form.address,
        email: user.email,
      }, { merge: true });
      // Update Firebase Auth displayName
      await updateProfile(user, { displayName: form.name });
      setMessage('Profile updated successfully!');
      setEditOpen(false);
      setProfileData(prev => ({ ...prev, name: form.name, phone: form.phone, address: form.address }));
    } catch (err) {
      setMessage('Failed to update profile.');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-white">Loading...</div>;

  return (
    <div
      className="min-h-screen pt-32 pb-12"
      style={{ background: colors.background }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight" style={{ color: colors.cardHeading }}>My profile: It's me-time</h1>
          <p className="text-lg" style={{ color: colors.subHeadline }}>Your details are here for us to serve you better. You can update, modify, change. It's your space.</p>
        </div>
        {/* Profile Card */}
        <div className="relative rounded-3xl shadow-2xl p-8 flex flex-col items-center mb-10" style={{ background: colors.cardBackground, border: `1px solid ${colors.stroke}` }}>
          <div className="absolute top-6 right-6">
            <Button size="icon" variant="outline" className="rounded-full shadow transition" style={{ background: colors.cardBackground }} onClick={handleEdit}><Edit2 className="w-5 h-5" /></Button>
          </div>
          <div className="p-1 rounded-full mb-4 shadow-lg" style={{ background: colors.highlight }}>
            <Avatar className="w-28 h-28 border-4 shadow-xl" style={{ borderColor: colors.cardBackground }}>
              <AvatarFallback className="text-5xl" style={{ background: colors.cardBackground, color: colors.cardHeading }}>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: colors.cardHeading }}>{form.name || user?.displayName || 'User'}</div>
            <div className="flex items-center justify-center gap-2 mb-2" style={{ color: colors.cardParagraph }}>
              <Phone className="w-4 h-4" />
              <span className="font-medium">{form.phone || user?.phoneNumber || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2" style={{ color: colors.cardParagraph }}>
              <Mail className="w-4 h-4" />
              {user?.email ? (
                <span className="font-medium" style={{ color: colors.highlight }}>{user.email} <span className="text-xs ml-2" style={{ color: colors.cardParagraph }}>Verified</span></span>
              ) : (
                <a href="#" className="underline" style={{ color: colors.highlight }}>Add Email</a>
              )}
            </div>
          </div>
        </div>
        {/* Saved Address Section */}
        <div className="rounded-2xl shadow-lg p-6 mb-10" style={{ background: colors.cardBackground, border: `1px solid ${colors.stroke}` }}>
          <h2 className="text-xl font-bold mb-3 tracking-tight" style={{ color: colors.cardHeading }}>Saved Address</h2>
          <div className="mb-2 text-base" style={{ color: colors.cardParagraph }}>
            <div><b>Street:</b> {form.address.street}</div>
            <div><b>City:</b> {form.address.city}</div>
            <div><b>State:</b> {form.address.state}</div>
            <div><b>Zip:</b> {form.address.zip}</div>
            <div><b>Country:</b> {form.address.country}</div>
          </div>
        </div>
        {/* Delete User Section */}
        <div className="rounded-2xl shadow-lg p-6 text-center" style={{ background: colors.cardBackground, border: `1px solid ${colors.stroke}` }}>
          {/* Delete user section content */}
        </div>
      </div>
    </div>
  );
};

export default Profile;