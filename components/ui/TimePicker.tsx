import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TimePickerProps {
    label: string;
    value: string; // Format: "HH:MM"
    onChange: (value: string) => void;
    required?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange, required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState('08');
    const [minutes, setMinutes] = useState('00');
    const containerRef = useRef<HTMLDivElement>(null);
    const hoursScrollRef = useRef<HTMLDivElement>(null);
    const minutesScrollRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            setHours(h.padStart(2, '0'));
            setMinutes(m.padStart(2, '0'));
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Scroll to selected time when opening
    useEffect(() => {
        if (isOpen && hoursScrollRef.current && minutesScrollRef.current) {
            const hourIndex = parseInt(hours);
            const minuteIndex = parseInt(minutes);

            // Each item is 40px (h-10), scroll to center it
            // Add a small delay to ensure the DOM is rendered and scrollable
            setTimeout(() => {
                if (hoursScrollRef.current) {
                    hoursScrollRef.current.scrollTop = hourIndex * 40;
                }
                if (minutesScrollRef.current) {
                    minutesScrollRef.current.scrollTop = minuteIndex * 40;
                }
            }, 50);
        }
    }, [isOpen]);

    const handleScroll = useCallback((type: 'hours' | 'minutes', scrollTop: number) => {
        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce the scroll event - only update after scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
            const itemHeight = 40;
            const index = Math.round(scrollTop / itemHeight);

            // Snap to the center of the selected item
            const targetScrollTop = index * itemHeight;
            const scrollRef = type === 'hours' ? hoursScrollRef : minutesScrollRef;

            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }

            if (type === 'hours') {
                const newHour = Math.max(0, Math.min(23, index)).toString().padStart(2, '0');
                if (newHour !== hours) {
                    setHours(newHour);
                    onChange(`${newHour}:${minutes}`);
                }
            } else {
                const newMinute = Math.max(0, Math.min(59, index)).toString().padStart(2, '0');
                if (newMinute !== minutes) {
                    setMinutes(newMinute);
                    onChange(`${hours}:${newMinute}`);
                }
            }
        }, 150); // Wait 150ms after scrolling stops
    }, [hours, minutes, onChange]);

    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
                <span className="text-lg font-mono">{hours}:{minutes}</span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-64">
                    <div className="flex gap-4 justify-center">
                        {/* Hours Picker */}
                        <div className="flex flex-col items-center">
                            <div className="text-xs font-medium text-gray-600 mb-2">Stunden</div>
                            <div className="relative h-48 w-16 overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
                                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 border-y-2 border-blue-500 bg-blue-50/30"></div>
                                </div>
                                <div
                                    ref={hoursScrollRef}
                                    className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
                                    style={{ scrollbarWidth: 'none' }}
                                    onScroll={(e) => handleScroll('hours', e.currentTarget.scrollTop)}
                                >
                                    <div className="h-20"></div>
                                    {hourOptions.map((hour) => (
                                        <div
                                            key={hour}
                                            className={`w-full h-10 flex items-center justify-center text-lg font-mono snap-center transition-all ${hour === hours ? 'text-blue-600 font-bold scale-110' : 'text-gray-600'
                                                }`}
                                        >
                                            {hour}
                                        </div>
                                    ))}
                                    <div className="h-20"></div>
                                </div>
                            </div>
                        </div>

                        <div className="text-2xl font-bold text-gray-400 self-center pt-6">:</div>

                        {/* Minutes Picker */}
                        <div className="flex flex-col items-center">
                            <div className="text-xs font-medium text-gray-600 mb-2">Minuten</div>
                            <div className="relative h-48 w-16 overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
                                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 border-y-2 border-blue-500 bg-blue-50/30"></div>
                                </div>
                                <div
                                    ref={minutesScrollRef}
                                    className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
                                    style={{ scrollbarWidth: 'none' }}
                                    onScroll={(e) => handleScroll('minutes', e.currentTarget.scrollTop)}
                                >
                                    <div className="h-20"></div>
                                    {minuteOptions.map((minute) => (
                                        <div
                                            key={minute}
                                            className={`w-full h-10 flex items-center justify-center text-lg font-mono snap-center transition-all ${minute === minutes ? 'text-blue-600 font-bold scale-110' : 'text-gray-600'
                                                }`}
                                        >
                                            {minute}
                                        </div>
                                    ))}
                                    <div className="h-20"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Fertig
                    </button>
                </div>
            )}

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};
