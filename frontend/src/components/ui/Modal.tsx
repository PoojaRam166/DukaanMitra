import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-lg' 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: ReactNode, 
  children: ReactNode, 
  maxWidth?: string 
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className={`bg-white rounded-2xl w-full ${maxWidth} shadow-xl fade-in max-h-[90vh] flex flex-col`}>
        <div className="p-6 border-b border-[#E4E7EC] flex items-center justify-between flex-shrink-0">
          <h2 className="font-display font-extrabold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
