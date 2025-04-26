import React from 'react';
import ContactForm from '../components/ContactForm';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { colors } from "@/styles/colors";

const Contact = () => {
  const contactInfo = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Visit Us',
      details: ['123 Laundry Street', 'Mumbai, Maharashtra 400001']
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Call Us',
      details: ['+91 98765 43210', '+91 98765 43211']
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Us',
      details: ['info@washitek.com', 'support@washitek.com']
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Working Hours',
      details: ['Monday - Saturday: 8:00 AM - 8:00 PM', 'Sunday: 9:00 AM - 6:00 PM']
    }
  ];

  return (
    <div className="min-h-screen flex flex-col pt-32 pb-12" style={{ background: colors.background }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-brand-headline mb-4">
            Get in Touch
          </h1>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: colors.subHeadline }}>
            Have questions about our services? We're here to help! Reach out to us through any of the following channels.
          </p>
        </div>

        {/* Contact Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {contactInfo.map((info, index) => (
            <div
              key={index}
              style={{ background: colors.cardBackground, borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: `1px solid ${colors.stroke}` }}
              className="p-6 text-center"
            >
              <div style={{ background: colors.highlight, color: colors.headline }} className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4">
                {info.icon}
              </div>
              <h3 style={{ color: colors.cardHeading }} className="text-lg font-semibold mb-2">
                {info.title}
              </h3>
              <div className="space-y-1">
                {info.details.map((detail, idx) => (
                  <p key={idx} style={{ color: colors.cardParagraph }}>
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Form Section */}
        <div className="bg-brand-card rounded-2xl shadow-xl overflow-hidden border border-brand-stroke">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Map Section */}
            <div className="bg-brand-subheadline p-8 flex items-center justify-center">
              <div className="w-full h-full min-h-[400px] bg-brand-background rounded-lg">
                {/* Map placeholder - Replace with actual map component */}
                <div className="w-full h-full flex items-center justify-center text-brand-cardparagraph">
                  Map Component Here
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-8">
              <h2 className="text-2xl font-bold text-brand-cardheading mb-6">
                Send Us a Message
              </h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact; 