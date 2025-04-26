import { colors } from "@/styles/colors";

const ContactHeader = () => {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      <h1 className="text-4xl md:text-5xl font-bold text-washitek-700 mb-6" style={{ color: colors.subHeadline }}>Get in Touch</h1>
      <p className="text-lg md:text-xl" style={{ color: colors.subHeadline }}>
        Have questions about our services? We're here to help you 24/7
      </p>
      <div className="mt-8 w-24 h-1 bg-washitek-300 mx-auto rounded-full"></div>
    </div>
  );
};

export default ContactHeader;
