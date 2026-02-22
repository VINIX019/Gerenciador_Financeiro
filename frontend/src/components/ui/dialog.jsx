import React from 'react';

export function Dialog({ open, onOpenChange, children }) {
    if (!open) return null;

    return (
        // 'fixed inset-0' tira o componente do fluxo da página e o coloca sobre a tela
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {/* Overlay: fecha ao clicar fora do conteúdo branco */}
            <div className="absolute inset-0" onClick={() => onOpenChange(false)} />

            {/* O modal propriamente dito */}
            <div className="relative w-full max-w-3xl pointer-events-auto">
                {children}
            </div>
        </div>
    );
}

export function DialogContent({ children, className = "" }) {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden ${className}`}
        >
            {children}
        </div>
    );
}

// Os outros (Header e Title) podem continuar como você já tem
export function DialogHeader({ children, className = "" }) {
    return <div className={`p-6 border-b bg-slate-50 ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = "" }) {
    return <h2 className={`text-xl font-bold text-slate-800 ${className}`}>{children}</h2>;
}