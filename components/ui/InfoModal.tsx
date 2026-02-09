import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Card } from './Card';
import { Button } from './Button';
import { XIcon } from '../icons/XIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  isRotated?: boolean;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, message, isRotated = false }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const containerClass = isRotated
    ? `fixed top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] flex items-center justify-center z-[270] p-4 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`
    : `fixed inset-0 flex items-center justify-center z-[270] p-4 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`;

  return ReactDOM.createPortal(
    <div className={containerClass} onClick={handleClose}>
      <Card className={`w-full max-w-sm relative ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center text-center space-y-4">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500" />
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-gray-600">{message}</p>
          <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
            OK
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};