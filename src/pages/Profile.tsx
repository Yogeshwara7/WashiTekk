import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Edit2, Trash2, Plus } from 'lucide-react';
import { colors } from "@/styles/colors";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

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
            <Button size="icon" variant="outline" className="rounded-full shadow transition" style={{ background: colors.cardBackground }}><Edit2 className="w-5 h-5" /></Button>
          </div>
          <div className="p-1 rounded-full mb-4 shadow-lg" style={{ background: colors.highlight }}>
            <Avatar className="w-28 h-28 border-4 shadow-xl" style={{ borderColor: colors.cardBackground }}>
              <AvatarFallback className="text-5xl" style={{ background: colors.cardBackground, color: colors.cardHeading }}>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1" style={{ color: colors.cardHeading }}>{user?.displayName || 'Yogeshwara'}</div>
            <div className="flex items-center justify-center gap-2 mb-2" style={{ color: colors.cardParagraph }}>
              <Phone className="w-4 h-4" />
              <span className="font-medium">{user?.phoneNumber || '+91 8197797230'}</span>
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
          <p className="mb-4" style={{ color: colors.cardParagraph }}>Select a saved address tag to view details and edit.</p>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="flex items-center gap-2 transition" style={{ color: colors.highlight, borderColor: colors.highlight, background: colors.cardBackground }}><Plus className="w-5 h-5" /> Add New Address</Button>
          </div>
        </div>
        {/* Delete User Section */}
        <div className="rounded-2xl shadow-lg p-6 text-center" style={{ background: colors.cardBackground, border: `1px solid ${colors.stroke}` }}>
          <p className="text-base mb-4 font-medium" style={{ color: colors.cardHeading }}>Wanna delete your account? Click on below button to delete your account</p>
          <Button variant="destructive" className="flex items-center gap-2 mx-auto" style={{ background: colors.tertiary, color: colors.headline }}><Trash2 className="w-5 h-5" /> Delete User</Button>
        </div>
      </div>
    </div>
  );
};

export default Profile; 