"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: React.ReactNode;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: React.ReactNode, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: React.ReactNode, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };
    
    setToasts((currentToasts) => [...currentToasts, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center justify-between
              min-w-[300px] max-w-[400px]
              p-4 border-[2.5px] border-black
              shadow-[4px_4px_0px_#0d0d0d]
              animate-in slide-in-from-right duration-300
              ${toast.type === "error" ? "bg-[#ff6b47]" : toast.type === "success" ? "bg-[#4ae068]" : toast.type === "warning" ? "bg-[var(--yellow)]" : "bg-[#60a5fa]"}
            `}
          >
            <div className="ms-mono text-sm font-bold">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 p-1 hover:bg-black/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
