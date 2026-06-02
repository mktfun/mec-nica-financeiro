import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/hooks/useAuth";
import { useRouter } from "@tanstack/react-router";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    // session === undefined → loading
    // session === null     → não autenticado → redireciona
    if (session === null) {
      router.navigate({ to: '/login' });
    }
  }, [session, router]);

  // Loading: aguardando verificação de sessão
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <LoadingSpinner text="Verificando sessão..." />
      </div>
    );
  }

  // Não autenticado — redirect em andamento, não renderiza nada
  if (session === null) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-body selection:bg-[var(--color-primary)] selection:text-white flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[280px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] z-10">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 pt-6 px-4 md:px-8">
          <div className="max-w-[1200px] mx-auto w-full h-full">
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
