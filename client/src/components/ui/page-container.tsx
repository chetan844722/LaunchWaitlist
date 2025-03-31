import { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({ children, className = "", noPadding = false }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <Navbar />
      <main className={`pt-16 ${!noPadding ? 'px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto' : ''} ${className}`}>
        {children}
      </main>
    </div>
  );
}
