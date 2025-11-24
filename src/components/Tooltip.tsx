import React, { useState, ReactNode, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = rect.top + scrollY - 10;
                    left = rect.left + scrollX + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + scrollY + 10;
                    left = rect.left + scrollX + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + scrollY + rect.height / 2;
                    left = rect.left + scrollX - 10;
                    break;
                case 'right':
                    top = rect.top + scrollY + rect.height / 2;
                    left = rect.right + scrollX + 10;
                    break;
            }

            setTooltipPosition({ top, left });
        }
    }, [isVisible, position]);

    if (!content) {
        return <>{children}</>;
    }

    const getTransformClass = () => {
        switch (position) {
            case 'top':
                return '-translate-x-1/2 -translate-y-full';
            case 'bottom':
                return '-translate-x-1/2';
            case 'left':
                return '-translate-x-full -translate-y-1/2';
            case 'right':
                return '-translate-y-1/2';
            default:
                return '';
        }
    };

    const getArrowClass = () => {
        switch (position) {
            case 'top':
                return 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b';
            case 'bottom':
                return 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t';
            case 'left':
                return 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r';
            case 'right':
                return 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l';
            default:
                return '';
        }
    };

    return (
        <>
            <div
                ref={triggerRef}
                className="relative inline-block"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    className={`fixed z-[9999] px-4 py-3 text-sm text-slate-200 bg-slate-800 border border-slate-600 rounded-lg shadow-xl whitespace-normal min-w-[400px] max-w-[600px] leading-relaxed ${getTransformClass()}`}
                    style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        pointerEvents: 'none'
                    }}
                >
                    <div className="relative">
                        {content}
                    </div>
                    {/* Arrow */}
                    <div
                        className={`absolute w-2 h-2 bg-slate-800 border-slate-600 transform rotate-45 ${getArrowClass()}`}
                    />
                </div>,
                document.body
            )}
        </>
    );
}
