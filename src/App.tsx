import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Services from './components/Services';
import ContactForm from './components/ContactForm';
import PriceList from './pages/PriceList';
import MembershipPlan from './components/MembershipPlan';
import HowItWorks from './components/HowItWorks';
import Home from './pages/Home';
import Contact from './pages/Contact';
import WashAndFold from './pages/services/WashAndFold';
import WashAndIron from './pages/services/WashAndIron';
import DryCleaning from './pages/services/DryCleaning';
import SteamPress from './pages/services/SteamPress';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-grow">
          <Routes>
            {/* Main Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/price-list" element={<PriceList />} />
            <Route path="/help-support" element={<Contact />} />
            
            {/* Service Routes */}
            <Route path="/services/wash-and-fold" element={<WashAndFold />} />
            <Route path="/services/wash-and-iron" element={<WashAndIron />} />
            <Route path="/services/dry-cleaning" element={<DryCleaning />} />
            <Route path="/services/steam-press" element={<SteamPress />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
