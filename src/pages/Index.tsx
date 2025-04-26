
import ContactForm from "@/components/ContactForm";
import ContactInfo from "@/components/ContactInfo";
import ContactHeader from "@/components/ContactHeader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <div className="flex-grow py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ContactHeader />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <ContactInfo />
            <ContactForm />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
