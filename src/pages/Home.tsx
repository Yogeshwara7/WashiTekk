import React from 'react';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import Services from '../components/Services';
import MembershipPlan from '../components/MembershipPlan';
import ContactForm from '../components/ContactForm';
import ContactHeader from '../components/ContactHeader';
import ContactInfo from '../components/ContactInfo';
import Footer from '../components/Footer';
import { colors } from "@/styles/colors";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.background }}>
      <Hero />
      <div className="pt-0 pb-12 flex flex-col flex-grow">
        <main className="flex-grow">
          <HowItWorks />
          <Services />
          <MembershipPlan />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
            <div className="mb-12">
              <ContactHeader />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
              <div className="bg-brand-card rounded-2xl shadow-lg p-8 border border-brand-stroke">
                <ContactInfo />
              </div>
              <div className="bg-brand-card rounded-2xl shadow-lg p-8 border border-brand-stroke">
                <ContactForm />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home; 