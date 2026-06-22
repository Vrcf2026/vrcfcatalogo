// Cálculo de portes por fornecedor — partilhado entre CartDrawer (preview
// ao cliente), CheckoutDialog (gravado no orçamento ao submeter) e
// Gestão/Orcamentos (sugestão editável ao finalizar). Manter UMA só lógica
// aqui evita os três sítios divergirem ao longo do tempo.

export interface ShippingConfigRow {
  fornecedor: string;
  ativo: boolean;
  preco_primeira_unidade: number | null;
  preco_unidade_adicional: number | null;
}

export interface PorteCalculado {
  fornecedor: string;
  portesSemIva: number;
  portesComIva: number;
  descricao: string;
  isDHL?: boolean;
}

export interface ItemParaPortes {
  fornecedor?: string | null;
  quantity: number;
  weight?: number | null;
}

// Tabela DHL Portugal Continental (s/IVA) — custo real cobrado pela DHL
const DHL_TABELA: [number, number][] = [
  [1, 3.65], [3, 3.78], [5, 3.78], [10, 4.37], [20, 4.88],
  [30, 5.20], [40, 6.22], [50, 7.59], [60, 9.08], [70, 10.59],
  [80, 12.11], [90, 13.62], [100, 15.13], [125, 18.51], [150, 22.22],
  [175, 25.92], [200, 29.62], [225, 33.33], [250, 37.03],
];

const MARGEM_PORTES = 0.15;

export function calcularPorteDHL(pesoKg: number): number | null {
  let custoBase: number | null = null;
  for (const [limite, preco] of DHL_TABELA) {
    if (pesoKg <= limite) { custoBase = preco; break; }
  }
  if (pesoKg <= 0) custoBase = DHL_TABELA[0][1];
  if (custoBase === null) return null;
  return Math.round(custoBase * (1 + MARGEM_PORTES) * 100) / 100;
}

/**
 * Calcula os portes agrupados por fornecedor para uma lista de itens.
 * `shippingConfigs` é o conteúdo (já filtrado a ativo=true, idealmente)
 * da tabela `shipping_config`.
 */
export function calcularPortesPorFornecedor(
  items: ItemParaPortes[],
  shippingConfigs: ShippingConfigRow[],
): PorteCalculado[] {
  const itensPorFornecedor = items.reduce((acc: Record<string, ItemParaPortes[]>, item) => {
    const f = item.fornecedor || "manual";
    if (!acc[f]) acc[f] = [];
    acc[f].push(item);
    return acc;
  }, {});

  const resultado: PorteCalculado[] = [];

  for (const [fornecedor, itensF] of Object.entries(itensPorFornecedor)) {
    if (fornecedor === "allto") {
      const pesoAllto = itensF.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0);
      if (pesoAllto > 0) {
        const porte = calcularPorteDHL(pesoAllto);
        if (porte !== null) {
          resultado.push({
            fornecedor: "allto",
            portesSemIva: porte,
            portesComIva: porte * 1.23,
            descricao: `${pesoAllto.toFixed(2)}kg · DHL`,
            isDHL: true,
          });
        } else {
          resultado.push({
            fornecedor: "allto",
            portesSemIva: 0,
            portesComIva: 0,
            descricao: "Peso >250kg — confirmar manualmente",
          });
        }
      }
    } else {
      const config = shippingConfigs.find((c) => c.fornecedor === fornecedor && c.ativo);
      if (config) {
        const totalItens = itensF.reduce((sum, i) => sum + i.quantity, 0);
        const primeira = config.preco_primeira_unidade ?? 0;
        const adicional = config.preco_unidade_adicional ?? 0;
        const portesSemIva = totalItens > 0
          ? primeira + Math.max(0, totalItens - 1) * adicional
          : primeira;
        resultado.push({
          fornecedor,
          portesSemIva,
          portesComIva: portesSemIva * 1.23,
          descricao: `${totalItens} artigo${totalItens !== 1 ? "s" : ""}`,
        });
      }
    }
  }

  return resultado;
}

export function totalPortesComIva(portes: PorteCalculado[]): number {
  return portes.reduce((s, p) => s + p.portesComIva, 0);
}
