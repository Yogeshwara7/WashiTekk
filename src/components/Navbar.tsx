import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User as UserIcon } from 'lucide-react';
import { Button } from './ui/button';
import ModernAuthForm from './ModernAuthForm';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signup' | 'login' }>({ open: false, mode: 'signup' });
  const [user, setUser] = useState<User | null>(null);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!profileDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-dropdown-parent')) {
        setProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileDropdown]);

  const scrollToTop = () => {
    if (location.pathname !== '/') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToServices = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const servicesSection = document.getElementById('services');
        if (servicesSection) {
          servicesSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const servicesSection = document.getElementById('services');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setServicesOpen(false); // Close the dropdown after clicking
  };

  const isHomePage = location.pathname === '/';
  const shouldBeTransparent = isHomePage && !scrolled;

  const navigation = [
    { name: 'Price List', href: '/price-list' },
  ];

  const laundryServices = [
    { name: 'Wash & Fold', href: '/services/wash-and-fold' },
    { name: 'Wash & Iron', href: '/services/wash-and-iron' },
    { name: 'Dry Cleaning', href: '/services/dry-cleaning' },
    { name: 'Steam Press', href: '/services/steam-press' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isServiceActive = (path: string) => location.pathname.startsWith('/services');

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        shouldBeTransparent ? 'bg-transparent py-4' : 'bg-white shadow-md py-2'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={scrollToTop}
                className="flex-shrink-0 flex items-center"
              >
                <span className={`text-2xl font-bold ${
                  shouldBeTransparent ? 'text-white' : 'text-blue-600'
                }`}>
                  Washitek
                </span>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {/* Home Link */}
              <button
                onClick={scrollToTop}
                className={`px-4 py-2 mx-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive('/')
                    ? 'text-blue-600 bg-blue-50'
                    : shouldBeTransparent
                      ? 'text-white hover:text-white hover:bg-white/20'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Home
              </button>

              {/* Services Button and Dropdown */}
              <div className="relative group mx-2">
                <button
                  onClick={scrollToServices}
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isServiceActive(location.pathname)
                      ? 'text-blue-600 bg-blue-50'
                      : shouldBeTransparent
                        ? 'text-white hover:text-white hover:bg-white/20'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Services
                  <ChevronDown className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${
                    servicesOpen ? 'rotate-180' : ''
                  }`} />
                </button>
                <div
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                  className={`absolute left-0 mt-2 w-56 bg-brand-card rounded-xl shadow-lg overflow-hidden z-50 transition-all duration-200 ${
                    servicesOpen
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-2'
                  }`}
                >
                  <div className="py-2">
                    {laundryServices.map((service) => (
                      <Link
                        key={service.name}
                        to={service.href}
                        className={`flex items-center px-6 py-3 text-sm transition-colors group ${
                          isActive(service.href)
                            ? 'text-brand-cardheading bg-brand-subheadline'
                            : 'text-brand-cardparagraph hover:bg-brand-highlight/10 hover:text-brand-highlight'
                        }`}
                        onClick={() => setServicesOpen(false)}
                      >
                        <span className="w-2 h-2 rounded-full bg-brand-highlight opacity-0 group-hover:opacity-100 transition-opacity mr-2"></span>
                        {service.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Other Navigation Items */}
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-4 py-2 mx-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : shouldBeTransparent
                        ? 'text-white hover:text-white hover:bg-white/20'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}

              {/* Auth Button or User Info */}
              {user ? (
                <div className="relative profile-dropdown-parent">
                  <button
                    className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      shouldBeTransparent
                        ? 'text-white hover:text-white hover:bg-white/20'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setProfileDropdown((v) => !v)}
                  >
                    <UserIcon className="w-5 h-5" />
                    {user.displayName || user.email}
                  </button>
                  {profileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-50 text-gray-700 overflow-hidden">
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => { navigate('/profile'); setProfileDropdown(false); }}>Profile</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => setProfileDropdown(false)}>Promos</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => { navigate('/help-support'); setProfileDropdown(false); }}>Help & Support</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => setProfileDropdown(false)}>Terms & Condition</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50 text-red-600" onClick={() => { signOut(auth); setProfileDropdown(false); }}>Logout</button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="ml-4 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                  onClick={() => setAuthModal({ open: true, mode: 'login' })}
                >
                  Login / Sign Up
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                  shouldBeTransparent
                    ? 'text-white hover:text-white hover:bg-white/20'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden absolute w-full bg-white/95 backdrop-blur-md shadow-lg">
            <div className="px-4 pt-4 pb-6 space-y-2">
              {/* Home Link */}
              <button
                onClick={() => {
                  scrollToTop();
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive('/')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Home
              </button>

              {/* Services Menu */}
              <div className="px-4 py-3">
                <button
                  onClick={() => {
                    scrollToServices();
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left mb-2 text-gray-800 font-medium hover:text-blue-600 transition-colors`}
                >
                  Services
                </button>
                <div className="space-y-2 pl-4">
                  {laundryServices.map((service) => (
                    <Link
                      key={service.name}
                      to={service.href}
                      className={`flex items-center py-2 text-sm transition-colors ${
                        isActive(service.href)
                          ? 'text-blue-600'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></span>
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Other Navigation Items */}
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {/* Auth Button or User Info for mobile */}
              {user ? (
                <div className="relative profile-dropdown-parent">
                  <button
                    className={`w-full mt-2 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      shouldBeTransparent
                        ? 'text-white hover:text-white hover:bg-white/20'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setProfileDropdown((v) => !v)}
                  >
                    <UserIcon className="w-5 h-5 mr-2" />
                    {user.displayName || user.email}
                  </button>
                  {profileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-50 text-gray-700 overflow-hidden">
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => { navigate('/profile'); setProfileDropdown(false); }}>Profile</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => setProfileDropdown(false)}>Promos</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => { navigate('/help-support'); setProfileDropdown(false); }}>Help & Support</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50" onClick={() => setProfileDropdown(false)}>Terms & Condition</button>
                      <button className="w-full text-left px-5 py-3 hover:bg-blue-50 text-red-600" onClick={() => { signOut(auth); setProfileDropdown(false); }}>Logout</button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="w-full mt-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                  onClick={() => { setAuthModal({ open: true, mode: 'login' }); setIsOpen(false); }}
                >
                  Login / Sign Up
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Auth Modal */}
      {authModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setAuthModal({ ...authModal, open: false })}
            >
              &times;
            </button>
            <ModernAuthForm
              mode={authModal.mode}
              onSuccess={() => setAuthModal({ ...authModal, open: false })}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
