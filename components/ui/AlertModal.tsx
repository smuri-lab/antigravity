import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    buttonText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    buttonText = 'OK'
}) => {
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

    if (!isOpen && !isClosing) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-[300] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`}
            onClick={handleClose}
        >
            <Card
                className={`w-full max-w-sm shadow-2xl border-2 border-gray-100 ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
                        <div className="w-12 h-1 bg-blue-500 mx-auto rounded-full mb-4"></div>
                        <p className="text-gray-600 leading-relaxed">{message}</p>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="button"
                            onClick={handleClose}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-lg shadow-blue-200"
                        >
                            {buttonText}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
