import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-blue-700">{title}</h2>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}; 