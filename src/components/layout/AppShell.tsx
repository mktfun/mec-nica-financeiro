import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/hooks/useAuth";
import { Navigate } from "@tanstack/react-router";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();

  // Loading: aguardando verificação de sessão
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <LoadingSpinner text="Verificando sessão..." />
      </div>
    );
  }

  // Não autenticado — redireciona imediatamente para o login
  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-body selection:bg-[var(--color-primary)] selection:text-white flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[280px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] z-10">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-32 md:pb-24 pt-6">
          <div className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto w-full px-4 md:px-6 2xl:px-8 min-h-[calc(100vh-140px)] pb-16">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
}
