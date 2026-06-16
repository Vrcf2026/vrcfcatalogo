import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Plus, Search, ShieldCheck, Briefcase, User, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const ALL_ROLES = ["super_admin", "admin", "gestor"] as const;
type AppRole = typeof ALL_ROLES[number];

const ROLE_META: Record<AppRole, { label: string; color: string; icon: React.ElementType }> = {
  super_admin: { label: "Super Admin", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",    icon: ShieldCheck },
  admin:       { label: "Admin",       color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: ShieldCheck },
  gestor:      { label: "Gestor",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Briefcase },
};

export function UsersManager() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole | "">("");
  const [inviting, setInviting] = useState(false);
  const [addingRole, setAddingRole] = useState<{ userId: string; role: AppRole } | null>(null);

  // Lista de utilizadores via RPC
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_users_with_roles");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 30 * 1000,
  });

  const filtered = users.filter((u: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s);
  });

  // Atribuir role
  const handleAddRole = async (userId: string, role: AppRole) => {
    setAddingRole({ userId, role });
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    setAddingRole(null);
    if (error) {
      if (error.code === "23505") {
        toast.info("Utilizador já tem este role.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(`Role "${ROLE_META[role].label}" atribuído.`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  // Remover role
  const handleRemoveRole = async (userId: string, role: string) => {
    // Não permitir remover o próprio super_admin
    if (userId === currentUser?.id && role === "super_admin") {
      toast.error("Não podes remover o teu próprio role super_admin.");
      return;
    }
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removido.");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  // Criar novo utilizador
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || invitePassword.length < 8) {
      toast.error("Email válido e palavra-passe com mínimo 8 caracteres são obrigatórios.");
      return;
    }
    setInviting(true);
    try {
      // Criar utilizador via signUp (cria conta mas fica por confirmar)
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: invitePassword,
        options: {
          data: inviteFullName.trim() ? { full_name: inviteFullName.trim() } : undefined,
          // emailRedirectTo é necessário mas o admin pode confirmar manualmente via Supabase
          emailRedirectTo: `${window.location.origin}/conta`,
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Utilizador não criado.");

      // Atribuir role se selecionado
      if (inviteRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: inviteRole });
        if (roleError && roleError.code !== "23505") throw roleError;
      }

      toast.success(`Utilizador ${inviteEmail} criado.${inviteRole ? ` Role "${ROLE_META[inviteRole as AppRole].label}" atribuído.` : ""} Irá receber email de confirmação.`);
      setInviteOpen(false);
      setInviteEmail(""); setInvitePassword(""); setInviteFullName(""); setInviteRole("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar utilizador.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Utilizadores</h3>
          <p className="text-sm text-muted-foreground">
            {users.length} utilizador{users.length !== 1 ? "es" : ""} registado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Criar utilizador
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por email ou nome..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{search ? "Nenhum utilizador encontrado." : "Sem utilizadores registados."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: any) => {
            const isCurrentUser = u.id === currentUser?.id;
            return (
              <Card key={u.id} className={isCurrentUser ? "border-primary/40" : ""}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{u.email}</span>
                        {isCurrentUser && <Badge variant="outline" className="text-[10px]">Tu</Badge>}
                        {!u.confirmed && <Badge variant="outline" className="text-[10px] text-amber-600">Por confirmar</Badge>}
                      </div>
                      {u.full_name && <p className="text-xs text-muted-foreground ml-5">{u.full_name}</p>}
                      <p className="text-xs text-muted-foreground ml-5 mt-0.5">
                        Registo: {new Date(u.created_at).toLocaleDateString("pt-PT")}
                        {u.last_sign_in && ` · Último acesso: ${new Date(u.last_sign_in).toLocaleDateString("pt-PT")}`}
                      </p>
                    </div>
                  </div>

                  {/* Roles actuais */}
                  <div className="flex items-center gap-2 flex-wrap ml-5">
                    {(u.roles as string[]).length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Sem roles (cliente normal)</span>
                    ) : (
                      (u.roles as string[]).map((role) => {
                        const meta = ROLE_META[role as AppRole];
                        const Icon = meta?.icon ?? ShieldCheck;
                        return (
                          <span key={role} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta?.color ?? "bg-slate-100 text-slate-700"}`}>
                            <Icon className="h-3 w-3" />
                            {meta?.label ?? role}
                            {!(isCurrentUser && role === "super_admin") && (
                              <button
                                onClick={() => handleRemoveRole(u.id, role)}
                                className="ml-0.5 hover:opacity-70 transition-opacity"
                                title="Remover role"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </span>
                        );
                      })
                    )}

                    {/* Adicionar role */}
                    {ALL_ROLES.filter((r) => !(u.roles as string[]).includes(r)).map((role) => {
                      const meta = ROLE_META[role];
                      const isLoading = addingRole?.userId === u.id && addingRole?.role === role;
                      return (
                        <button
                          key={role}
                          onClick={() => handleAddRole(u.id, role)}
                          disabled={!!addingRole}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          title={`Atribuir role ${meta.label}`}
                        >
                          {isLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: criar utilizador */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!inviting) { setInviteOpen(o); }}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar novo utilizador</DialogTitle>
            <DialogDescription>
              Cria uma conta e opcionalmente atribui um role de acesso.
              O utilizador irá receber um email de confirmação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo (opcional)</Label>
              <Input
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                placeholder="Nome Apelido"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Palavra-passe (mín. 8 caracteres) *</Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role (opcional)</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem role especial (cliente)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem role (cliente normal)</SelectItem>
                  <SelectItem value="gestor">Gestor — acesso à área comercial</SelectItem>
                  <SelectItem value="admin">Admin — acesso ao catálogo e gestão</SelectItem>
                  <SelectItem value="super_admin">Super Admin — acesso total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={inviting}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar utilizador
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
