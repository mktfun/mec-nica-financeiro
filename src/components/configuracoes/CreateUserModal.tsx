import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { UserPlus, Lock, Mail, User, Shield, Check, UploadCloud, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operador' | 'visualizador'>('operador');
  const [canImport, setCanImport] = useState(true);
  const [canEditData, setCanEditData] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (newRole: 'admin' | 'operador' | 'visualizador') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setCanImport(true);
      setCanEditData(true);
    } else if (newRole === 'visualizador') {
      setCanImport(false);
      setCanEditData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: email,
        p_password: password,
        p_full_name: fullName,
        p_role: role,
        p_can_edit_data: canEditData,
        p_can_import: canImport
      });

      if (error) throw error;

      if (data && (data as any).success === false) {
        toast.error((data as any).error || 'Erro ao criar usuário.');
        return;
      }

      toast.success(`Usuário ${fullName} criado com sucesso!`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('operador');
      setCanImport(true);
      setCanEditData(true);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      toast.error('Erro ao cadastrar usuário: ' + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Novo Acesso" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <User size={13} className="text-zinc-500" />
            Nome Completo
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Mail size={13} className="text-zinc-500" />
            E-mail de Acesso
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@mecanica.com.br"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Lock size={13} className="text-zinc-500" />
            Senha Inicial
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Shield size={13} className="text-zinc-500" />
            Perfil de Acesso
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'admin', label: 'Admin', desc: 'Total' },
              { id: 'operador', label: 'Operador', desc: 'Customizado' },
              { id: 'visualizador', label: 'Leitor', desc: 'Somente ver' }
            ].map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => handleRoleChange(r.id as any)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  role === r.id
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                    : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="block font-semibold text-xs">{r.label}</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Permissões Específicas */}
        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3 pt-3">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Permissões Granulares
          </span>

          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <UploadCloud size={15} className="text-zinc-400" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Pode Importar Dados</span>
                <span className="text-[10px] text-zinc-500">Enviar extratos, relatórios e rodar o wizard</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={canImport}
              onChange={(e) => setCanImport(e.target.checked)}
              disabled={role === 'admin' || role === 'visualizador'}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-zinc-400" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Pode Editar Fechamento</span>
                <span className="text-[10px] text-zinc-500">Alterar valores manuais e salvar conciliação</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={canEditData}
              onChange={(e) => setCanEditData(e.target.checked)}
              disabled={role === 'admin' || role === 'visualizador'}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800/80">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
          >
            <UserPlus size={15} />
            {isLoading ? 'Cadastrando...' : 'Cadastrar Acesso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
