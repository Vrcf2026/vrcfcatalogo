import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Registo() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/conta", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Deve aceitar os Termos e Condições e a Política de Privacidade para continuar.");
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Conta criada! Verifique o seu email para confirmar.");
    navigate("/conta");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">Criar Conta</CardTitle>
          <CardDescription>Aceda ao histórico de orçamentos e RMAs</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe (mín. 6 caracteres)</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                Li e aceito os{" "}
                <a href="/termos-e-condicoes" target="_blank" className="text-primary hover:underline">
                  Termos e Condições
                </a>{" "}
                e a{" "}
                <a href="/politica-de-privacidade" target="_blank" className="text-primary hover:underline">
                  Política de Privacidade
                </a>.
              </label>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting || !acceptedTerms}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar Conta
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Já tem conta? <Link to="/login" className="text-primary hover:underline">Iniciar sessão</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
