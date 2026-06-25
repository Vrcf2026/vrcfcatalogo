import { Link } from "react-router-dom";
import { LogIn, User, LogOut, LayoutDashboard, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function UserMenuButton() {
  const { user, isAdmin, isGestor, signOut } = useAuth();

  if (!user) {
    return (
      <Link to="/login">
        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Entrar</span>
        </Button>
      </Link>
    );
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Conta";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline text-sm max-w-[8rem] truncate">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/conta" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            A Minha Conta
          </Link>
        </DropdownMenuItem>
        {isGestor && !isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/gestao" className="cursor-pointer">
              <Briefcase className="mr-2 h-4 w-4" />
              Gestão Comercial
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/gestao" className="cursor-pointer">
                <Briefcase className="mr-2 h-4 w-4" />
                Gestão Comercial
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
