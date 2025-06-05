import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User, updateProfile, sendEmailVerification } from 'firebase/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Edit2, Trash2, Plus } from 'lucide-react';
import { colors } from "@/styles/colors";
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import ModernAuthForm from '../components/ModernAuthForm';
import { toast } from 'react-hot-toast';
import PhoneOTPComponent from '../components/PhoneOTPComponent';

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
  const [phoneVerificationOpen, setPhoneVerificationOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      console.log('Auth state changed. Firebase User:', firebaseUser);
      if (firebaseUser) {
        // Fetch profile data from Firestore
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log('Profile data from Firestore:', docSnap.data());
          const userData = docSnap.data();
          setProfileData(userData);
          setForm({
            name: userData.name || firebaseUser.displayName || '',
            phone: userData.phone || firebaseUser.phoneNumber || '',
            address: {
              street: userData.address?.street || '',
              city: userData.address?.city || '',
              state: userData.address?.state || '',
              zip: userData.address?.zip || '',
              country: userData.address?.country || '',
            },
          });

          // --- NEW: Check and grant initial credit for existing users with verified phone ---
          // Note: Firebase Auth's firebaseUser.phoneNumber is populated if the user signed up with phone/OTP
          // or if it was explicitly linked via linkWithPhoneNumber. profileData.phoneVerified
          // is a custom flag in Firestore set by our PhoneOTPComponent.
          // We grant credit if firebaseUser has a phone AND initialCreditGranted is not set in Firestore.
          if (firebaseUser.phoneNumber && !userData?.initialCreditGranted) {
             try {
                await updateDoc(docRef, {
                   creditUsed: 0, // Assuming 500 is the limit, 0 used means 500 available
                   initialCreditGranted: true,
                });
                console.log('Initial 500 credit granted for existing phone user:', firebaseUser.uid);
                // Note: We don't show a toast here to avoid spamming existing users on every profile load
                // A one-time notification might be better handled elsewhere or by the admin.
             } catch (error) {
                console.error('Error granting initial credit on profile load:', error);
             }
          }
          // --- END NEW ---

        } else {
          console.log('No profile data in Firestore for user:', firebaseUser.uid);
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
  const handleNewEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewEmail(e.target.value);
  };
  const handleSaveNewEmail = async () => {
    if (!user || !newEmail) return;
    setSaving(true);
    setMessage('');
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        ...profileData,
        email: newEmail,
        emailVerified: false,
      }, { merge: true });
      setMessage('Email added successfully!');
      setIsAddingEmail(false);
      setNewEmail('');
      setProfileData(prev => ({ ...prev, email: newEmail, emailVerified: false }));
    } catch (err) {
      setMessage('Failed to add email.');
    }
    setSaving(false);
  };
  const handleCancelAddEmail = () => {
    setIsAddingEmail(false);
    setNewEmail('');
    setMessage('');
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

  const handleResendVerificationEmail = async () => {
    if (user && user.email && !user.emailVerified) {
      setResendingEmail(true);
      try {
        await sendEmailVerification(user);
        toast.success('Verification email sent. Please check your inbox.');
      } catch (err: any) {
        console.error('Error resending verification email:', err);
        toast.error('Failed to resend verification email.');
      }
      setResendingEmail(false);
    }
  };

  const handlePhoneLinked = async () => {
    // Handle phone linked event
    console.log('Phone linked successfully!');
    // Update the state to reflect the verified phone number and close the modal

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check if initial credit has already been granted
          if (!userData?.initialCreditGranted) {
            // Grant initial 500 credit (set creditUsed to 0) and mark as granted
            await updateDoc(userRef, {
              creditUsed: 0, // Assuming 500 is the limit, 0 used means 500 available
              initialCreditGranted: true,
            });
            console.log('Initial 500 credit granted for user:', user.uid);
            toast.success('Phone verified! 500 credits have been added to your account.');
          } else {
            console.log('Initial credit already granted for user:', user.uid);
          }
        } else {
          console.warn('User document not found when trying to grant initial credit:', user.uid);
        }
      } catch (error) {
        console.error('Error granting initial credit on phone link:', error);
        toast.error('Failed to grant initial credit.');
      }
    }

    setProfileData(prev => ({
      ...prev,
      phoneVerified: true,
      // Optionally update the phone number in state if PhoneOTPComponent provides it,
      // otherwise rely on the phone number already in the form state
      phone: form.phone // Assuming form.phone holds the verified number
    }));
    setForm(prev => ({ ...prev, phone: form.phone })); // Ensure form state is also updated
    setPhoneVerificationOpen(false); // Close the modal
    toast.success('Phone number linked successfully!'); // Show a success toast
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
              {profileData?.phoneVerified ? (
                <span className="text-green-500 text-sm">✓ Verified</span>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => setPhoneVerificationOpen(true)}
                >
                  Verify Phone
                </Button>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2" style={{ color: colors.cardParagraph }}>
              <Mail className="w-4 h-4" />
              {profileData?.email ? (
                <span className="font-medium" style={{ color: colors.highlight }}>{profileData.email} </span>
              ) : (
                isAddingEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={newEmail}
                      onChange={handleNewEmailChange}
                      className="h-8 text-sm"
                    />
                    <Button onClick={handleSaveNewEmail} disabled={saving} size="sm">
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelAddEmail} size="sm">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <a href="#" className="underline" style={{ color: colors.highlight }} onClick={() => { setIsAddingEmail(true); setMessage(''); }}>Add Email</a>
                )
              )}
            </div>
          </div>
        </div>
        {/* Phone Verification Modal */}
        {phoneVerificationOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Verify Phone Number</h2>
              <PhoneOTPComponent 
                user={user!} 
                onPhoneLinked={handlePhoneLinked}
                initialPhoneNumber={form.phone}
              />
              <button
                onClick={() => setPhoneVerificationOpen(false)}
                className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {/* Edit Modal */}
        {editOpen && (
          <form
            onSubmit={handleSave}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={handleClose}
                type="button"
                aria-label="Close"
              >×</button>
              <h2 className="text-xl font-bold mb-4 text-blue-700">Edit Profile</h2>
              <label className="block mb-2 font-medium text-gray-700">Name</label>
              <input
                className="w-full border rounded-lg p-2 mb-4"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <label className="block mb-2 font-medium text-gray-700">Phone</label>
              <input
                className="w-full border rounded-lg p-2 mb-4"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
              <label className="block mb-2 font-medium text-gray-700">Street</label>
              <input
                className="w-full border rounded-lg p-2 mb-2"
                name="address.street"
                value={form.address.street}
                onChange={handleChange}
              />
              <label className="block mb-2 font-medium text-gray-700">City</label>
              <input
                className="w-full border rounded-lg p-2 mb-2"
                name="address.city"
                value={form.address.city}
                onChange={handleChange}
              />
              <label className="block mb-2 font-medium text-gray-700">State</label>
              <input
                className="w-full border rounded-lg p-2 mb-2"
                name="address.state"
                value={form.address.state}
                onChange={handleChange}
              />
              <label className="block mb-2 font-medium text-gray-700">Zip</label>
              <input
                className="w-full border rounded-lg p-2 mb-2"
                name="address.zip"
                value={form.address.zip}
                onChange={handleChange}
              />
              <label className="block mb-2 font-medium text-gray-700">Country</label>
              <input
                className="w-full border rounded-lg p-2 mb-4"
                name="address.country"
                value={form.address.country}
                onChange={handleChange}
              />
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {message && <div className="mt-3 text-green-600">{message}</div>}
            </div>
          </form>
        )}
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

        {/* Persistent reCAPTCHA container for phone verification */}
        <div id="recaptcha-container"></div>

      </div>
    </div>
  );
};

export default Profile;