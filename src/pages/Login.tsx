import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Lock } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const { signIn, resetPassword, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");

  useEffect(() => {
    if (!authLoading && user) {
      if (redirect) navigate(redirect, { replace: true });
      else if (isAdmin) navigate("/admin", { replace: true });
      else navigate("/conta", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas");
    } else {
      toast.success("Sessão iniciada!");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Email de recuperação enviado.");
      setForgotOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <CardTitle className="font-heading text-xl">VRCF</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Iniciar sessão</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Entrar
            </Button>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => setForgotOpen(true)} className="text-primary hover:underline">
                Esqueci a palavra-passe
              </button>
              <Link to="/registo" className="text-primary hover:underline">Criar conta</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar palavra-passe</DialogTitle>
            <DialogDescription>Enviamos um link para o seu email.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-3">
            <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="email@exemplo.com" required />
            <Button type="submit" className="w-full" disabled={forgotLoading}>
              {forgotLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
