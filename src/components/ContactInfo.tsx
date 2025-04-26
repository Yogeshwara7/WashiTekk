import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { colors } from "@/styles/colors";

const ContactInfo = () => {
  return (
    <div style={{ background: colors.cardBackground, borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} className="p-8">
      <h2 className="text-2xl font-bold mb-8" style={{ color: colors.cardHeading }}>Contact Information</h2>
      
      <div className="space-y-8">
        <div className="flex items-start">
          <div style={{ background: colors.subHeadline }} className="p-3 rounded-full mr-4">
            <MapPin className="h-6 w-6" style={{ color: colors.highlight }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.cardHeading }}>Visit Us</h3>
            <p className="mt-1" style={{ color: colors.subHeadline }}>123 Washitek Street, Tech City</p>
            <p style={{ color: colors.subHeadline }}>New York, NY 10001</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div style={{ background: colors.subHeadline }} className="p-3 rounded-full mr-4">
            <Phone className="h-6 w-6" style={{ color: colors.highlight }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.cardHeading }}>Call Us</h3>
            <p className="mt-1" style={{ color: colors.subHeadline }}>+ 01 234 567 89</p>
            <p style={{ color: colors.subHeadline }}>Available 24/7</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div style={{ background: colors.subHeadline }} className="p-3 rounded-full mr-4">
            <Mail className="h-6 w-6" style={{ color: colors.highlight }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.cardHeading }}>Email Us</h3>
            <p className="mt-1" style={{ color: colors.subHeadline }}>info@washitek.com</p>
            <p style={{ color: colors.subHeadline }}>We reply within 24 hours</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div style={{ background: colors.subHeadline }} className="p-3 rounded-full mr-4">
            <Clock className="h-6 w-6" style={{ color: colors.highlight }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.cardHeading }}>Working Hours</h3>
            <p className="mt-1" style={{ color: colors.subHeadline }}>Monday to Sunday</p>
            <p style={{ color: colors.subHeadline }}>24/7 Service Available</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
