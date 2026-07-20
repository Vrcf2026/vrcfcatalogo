import { lazy, Suspense, useState } from "react";
import { ManageFamiliesDialog } from "@/components/ManageFamiliesDialog";
import { ManageCategoriesDialog } from "@/components/ManageCategoriesDialog";
import { ManageBrandsDialog } from "@/components/ManageBrandsDialog";
import { ManageTypesDialog } from "@/components/ManageTypesDialog";
import HomepageHighlightsDialog from "@/components/HomepageHighlightsDialog";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, LogOut, Loader2, Package, Image, Truck, Users, HeartPulse, ArrowLeft } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useAdminLookups } from "@/hooks/useAdminLookups";
import { useNavigate } from "react-router-dom";
import { EditProductSheet } from "@/components/EditProductSheet";

// Tabs carregados sob demanda — não pesam no bundle até o admin abrir o separador.
const AdminProductsTab = lazy(() => import("@/components/admin/AdminProductsTab"));
const AdminHealthTab   = lazy(() => import("@/components/admin/AdminHealthTab"));
const BannersManager = lazy(() => import("@/components/BannersManager").then(m => ({ default: m.BannersManager })));
const ShippingConfig = lazy(() => import("@/components/ShippingConfig").then(m => ({ default: m.ShippingConfig })));
const UsersManager = lazy(() => import("@/components/UsersManager").then(m => ({ default: m.UsersManager })));

const TabFallback = () => (
  <div className="flex justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Admin = () => {
  const [activeTab, setActiveTab] = useState("produtos");
  const [healthEditProduct, setHealthEditProduct] = useState<any>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Todas as listas partilhadas num único hook — React Query dedupa com
  // qualquer sub-componente que use as mesmas queryKeys.
  const { families, dbCategories, brands, types, categoryNames, totalAll } = useAdminLookups();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };


  return (
    <>
      {/* Bloqueio mobile */}
      <div className="sm:hidden min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center bg-background">
        <ShieldCheck className="h-14 w-14 text-primary/40" />
        <div>
          <h1 className="font-heading text-xl font-bold mb-2">Área de Administração</h1>
          <p className="text-muted-foreground text-sm">
            Esta área requer um ecrã maior.<br />
            Acede através de um computador ou tablet.
          </p>
        </div>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </button>
      </div>

      {/* Conteúdo normal — visível apenas em sm+ */}
      <div className="hidden sm:block min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-heading text-lg font-bold leading-tight">VRCF Admin</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Informática & Segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <AdminDashboard />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="produtos" className="gap-1.5">
              <Package className="h-4 w-4" /> Produtos ({totalAll})
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-1.5">
              <Image className="h-4 w-4" /> Banners
            </TabsTrigger>
            <TabsTrigger value="portes" className="gap-1.5">
              <Truck className="h-4 w-4" /> Portes
            </TabsTrigger>
            <TabsTrigger value="utilizadores" className="gap-1.5">
              <Users className="h-4 w-4" /> Utilizadores
            </TabsTrigger>
            <TabsTrigger value="saude" className="gap-1.5">
              <HeartPulse className="h-4 w-4" /> Saúde
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="flex flex-wrap gap-1.5">
                <ManageCategoriesDialog categories={dbCategories} />
                <ManageFamiliesDialog families={families} categories={categoryNames} />
                <ManageBrandsDialog brands={brands} />
                <ManageTypesDialog types={types} families={families as any} />
                <HomepageHighlightsDialog brands={brands} categories={categoryNames} />
              </div>
              <div className="ml-auto">
                <AddProductDialog families={families} types={types} categories={categoryNames} brands={brands} />
              </div>
            </div>
            <Suspense fallback={<TabFallback />}>
              <AdminProductsTab
                families={families}
                dbCategories={dbCategories}
                brands={brands}
                types={types}
                categoryNames={categoryNames}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="banners" className="mt-4">
            <Suspense fallback={<TabFallback />}><BannersManager /></Suspense>
          </TabsContent>

          <TabsContent value="portes" className="mt-4">
            <Suspense fallback={<TabFallback />}><ShippingConfig /></Suspense>
          </TabsContent>

          <TabsContent value="utilizadores" className="mt-4">
            <Suspense fallback={<TabFallback />}><UsersManager /></Suspense>
          </TabsContent>

          <TabsContent value="saude" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <AdminHealthTab onEditProduct={(p) => setHealthEditProduct(p)} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* Editor de produto — aberto a partir do painel de saúde */}
      {healthEditProduct && (
        <EditProductSheet
          open={!!healthEditProduct}
          onOpenChange={(open) => !open && setHealthEditProduct(null)}
          product={healthEditProduct}
          families={families}
          types={types}
          categories={categoryNames}
          brands={brands}
        />
      )}
    </div>
  </>);
};

export default Admin;
