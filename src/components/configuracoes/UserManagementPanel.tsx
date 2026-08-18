import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSystemUsers, UserProfile } from '@/hooks/useUserPermissions';
import { CreateUserModal } from './CreateUserModal';
import { Users, UserPlus, Shield, UploadCloud, Edit3, CheckCircle2, XCircle, Mail, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UserManagementPanelProps {
  onViewUserLogs?: (email: string) => void;
}

export function UserManagementPanel({ onViewUserLogs }: UserManagementPanelProps) {
  const { data: users = [], isLoading } = useSystemUsers();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleTogglePermission = async (
    user: UserProfile,
    field: 'can_edit_data' | 'can_import'
  ) => {
    setUpdatingId(user.id);
    const newEdit = field === 'can_edit_data' ? !user.can_edit_data : user.can_edit_data;
    const newImport = field === 'can_import' ? !user.can_import : user.can_import;

    try {
      const { error } = await supabase.rpc('admin_update_user_permissions', {
        p_user_id: user.id,
        p_full_name: user.full_name,
        p_role: user.role,
        p_can_edit_data: newEdit,
        p_can_import: newImport
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['system-users'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(`Permissões de ${user.full_name} atualizadas!`);
    } catch (err: any) {
      console.error('Erro ao atualizar permissão:', err);
      toast.error('Erro ao atualizar: ' + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangeRole = async (user: UserProfile, newRole: 'admin' | 'operador' | 'visualizador') => {
    setUpdatingId(user.id);
    const newEdit = newRole === 'admin' ? true : newRole === 'visualizador' ? false : user.can_edit_data;
    const newImport = newRole === 'admin' ? true : newRole === 'visualizador' ? false : user.can_import;

    try {
      const { error } = await supabase.rpc('admin_update_user_permissions', {
        p_user_id: user.id,
        p_full_name: user.full_name,
        p_role: newRole,
        p_can_edit_data: newEdit,
        p_can_import: newImport
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['system-users'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(`Papel de ${user.full_name} alterado para ${newRole}!`);
    } catch (err: any) {
      console.error('Erro ao alterar papel:', err);
      toast.error('Erro ao alterar: ' + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              Gestão de Acessos & Permissões
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Crie usuários com email e senha e controle individualmente quem pode importar ou editar.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          <UserPlus size={16} />
          Criar Novo Acesso
        </Button>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
            Carregando usuários...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          users.map((u) => {
            const isUpdating = updatingId === u.id;
            const isAdmin = u.role === 'admin';
            const isViewer = u.role === 'visualizador';

            return (
              <Card
                key={u.id}
                className="p-4 sm:p-5 bg-zinc-900/40 border-zinc-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:border-zinc-700/80"
              >
                {/* Identificação do Usuário */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-bold text-sm shrink-0">
                    {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-zinc-100">{u.full_name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : isViewer
                            ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap font-mono">
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-zinc-500" />
                        {u.email}
                      </span>
                      {u.last_sign_in_at && (
                        <span className="flex items-center gap-1 text-zinc-500 text-[11px]">
                          <Clock size={11} />
                          Último login: {new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controles de Papel e Permissões */}
                <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800/60">
                  {/* Seletor de Papel */}
                  <select
                    value={u.role}
                    disabled={isUpdating}
                    onChange={(e) => handleChangeRole(u, e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 font-medium focus:outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="admin">Administrador (Total)</option>
                    <option value="operador">Operador (Custom)</option>
                    <option value="visualizador">Visualizador (Leitura)</option>
                  </select>

                  {/* Toggle Importar */}
                  <button
                    type="button"
                    disabled={isUpdating || isAdmin || isViewer}
                    onClick={() => handleTogglePermission(u, 'can_import')}
                    title={isAdmin ? 'Admins sempre podem importar' : 'Alternar permissão de importação'}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all select-none ${
                      u.can_import
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'
                    } ${isAdmin || isViewer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                  >
                    <UploadCloud size={13} />
                    <span>Importar: {u.can_import ? 'Sim' : 'Não'}</span>
                  </button>

                  {/* Toggle Editar */}
                  <button
                    type="button"
                    disabled={isUpdating || isAdmin || isViewer}
                    onClick={() => handleTogglePermission(u, 'can_edit_data')}
                    title={isAdmin ? 'Admins sempre podem editar' : 'Alternar permissão de edição'}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all select-none ${
                      u.can_edit_data
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'
                    } ${isAdmin || isViewer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                  >
                    <Edit3 size={13} />
                    <span>Editar: {u.can_edit_data ? 'Sim' : 'Não'}</span>
                  </button>

                  {/* Ver Logs do Usuário */}
                  {onViewUserLogs && (
                    <button
                      type="button"
                      onClick={() => onViewUserLogs(u.email)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition-all cursor-pointer"
                      title={`Ver histórico de ações de ${u.full_name}`}
                    >
                      <Clock size={13} className="text-zinc-500" />
                      <span>Ver Logs</span>
                    </button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['system-users'] })}
      />
    </div>
  );
}
