#!/usr/bin/env python3
"""
Script de importação ALL.TO → Supabase (VRCF Catálogo)
Mundo: Economato

Requer:
  pip install requests python-slugify

Variáveis de ambiente:
  IMPORT_URL       → URL da edge function
  IMPORT_API_KEY   → chave secreta
  ALLTO_API_KEY    → chave API ALL.TO
"""

import os, json, time, requests, re
from slugify import slugify

# ─────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────
IMPORT_URL     = os.environ.get("IMPORT_URL", "https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/import-products")
IMPORT_API_KEY = os.environ.get("IMPORT_API_KEY", "")
ALLTO_API_KEY  = os.environ.get("ALLTO_API_KEY", "")

URL_API_BASE = "https://api.allto.pt/v2/"

# Tiers de preço
DESCONTO_TIER2 = 0.10   # 10% — clientes fidelizados
DESCONTO_TIER3 = 0.15   # 15% — preço especial

# Limiar de variação de preço
LIMIAR_VARIACAO = 0.05  # 5%

# Tabela DHL Portugal Continental (s/IVA)
DHL_TABELA = [
    (1,    3.65),
    (3,    3.78),
    (5,    3.78),
    (10,   4.37),
    (20,   4.88),
    (30,   5.20),
    (40,   6.22),
    (50,   7.59),
    (60,   9.08),
    (70,  10.59),
    (80,  12.11),
    (90,  13.62),
    (100, 15.13),
    (125, 18.51),
    (150, 22.22),
    (175, 25.92),
    (200, 29.62),
    (225, 33.33),
    (250, 37.03),
]

def calcular_porte_dhl(peso_kg: float) -> float | None:
    """Calcula porte DHL com base no peso em kg. None = calculado no orçamento."""
    if peso_kg <= 0:
        return DHL_TABELA[0][1]
    for limite, preco in DHL_TABELA:
        if peso_kg <= limite:
            return preco
    return None  # >250kg — calculado no orçamento

# ─────────────────────────────────────────────
# MAPEAMENTO DE CATEGORIAS (4 níveis)
# A ALL.TO já fornece uma hierarquia limpa e 100% preenchida:
#   Familia       → Nível 1 (Categoria)       — 11 valores
#   Linha_Produto → Nível 2 (Família)         — 93 valores
#   Tipo_Produto  → Nível 3 (Tipo/Subfamília) — 776 valores
#   Marca         → Marca
#
# Nota: alguns Tipo_Produto (ex: "Diversos", "Marcadores") repetem-se em
# Linha_Produto diferentes — isso é normal, o Nível 3 fica sempre associado
# ao par (categoria, família) através de family_id na BD, não é global.
# ─────────────────────────────────────────────

# Pequenas normalizações de nomes de categoria (opcional — Familia já vem
# limpa, mas isto permite ajustar nomes de exibição sem tocar no feed).
CATEGORIA_DISPLAY = {
    "Café e Chá": "Café e Chá",
}

def mapear_4_niveis(familia_allto: str, linha_produto: str, tipo_produto: str) -> tuple:
    """Retorna (categoria, familia, tipo) para o catálogo VRCF — mapeamento directo."""
    categoria = CATEGORIA_DISPLAY.get(familia_allto, familia_allto) or "Outros"
    familia = linha_produto or categoria
    tipo = tipo_produto or ""
    return (categoria, familia, tipo)

# ─────────────────────────────────────────────
# FUNÇÕES DE PREÇO
# ─────────────────────────────────────────────
def calcular_precos(pvr: float, primeiro_preco: float) -> dict | None:
    """Calcula os 3 tiers de preço."""
    if pvr <= 0 or primeiro_preco <= 0:
        return None
    return {
        "purchase_price":     round(primeiro_preco, 2),
        "price":              round(pvr, 2),
        "price_tier2":        round(pvr * (1 - DESCONTO_TIER2), 2),
        "price_tier3":        round(pvr * (1 - DESCONTO_TIER3), 2),
    }

def parse_float(val) -> float:
    """Converte valor para float de forma segura."""
    try:
        if val is None:
            return 0.0
        return float(str(val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return 0.0

# ─────────────────────────────────────────────
# EDGE FUNCTION
# ─────────────────────────────────────────────
def supabase_upsert(produtos: list, fornecedor: str = "allto"):
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    total = len(produtos)
    inseridos = 0
    for i in range(0, total, 100):
        batch = produtos[i:i+100]
        resp = requests.post(IMPORT_URL, headers=headers,
                             json={"fornecedor": fornecedor, "produtos": batch}, timeout=60)
        if resp.status_code == 200:
            inseridos += resp.json().get("count", len(batch))
            print(f"  ✅ Upsert {i+1}-{min(i+100, total)}/{total}")
        else:
            print(f"  ❌ Erro lote {i}: {resp.status_code} — {resp.text[:200]}")
        time.sleep(0.3)
    return inseridos


def registar_price_history(alteracoes: list):
    if not alteracoes:
        return
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    resp = requests.post(IMPORT_URL, headers=headers,
                         json={"action": "price_history", "alteracoes": alteracoes}, timeout=30)
    if resp.status_code == 200:
        print(f"  📊 {len(alteracoes)} variações de preço registadas")
    else:
        print(f"  ⚠ Erro ao registar price history: {resp.status_code}")


def marcar_inactivos(skus: list, fornecedor: str = "allto"):
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    resp = requests.post(IMPORT_URL, headers=headers,
                         json={"fornecedor": fornecedor, "skus_activos": skus, "action": "marcar_inactivos"},
                         timeout=30)
    if resp.status_code == 200:
        n = resp.json().get("inactivos", 0)
        print(f"  ⚠ {n} produtos desactivados" if n else "  ✅ Sem produtos a desactivar")
    else:
        print(f"  ⚠ Não foi possível verificar inactivos: {resp.status_code}")


def buscar_precos_actuais(fornecedor: str) -> dict:
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    try:
        resp = requests.post(IMPORT_URL, headers=headers,
                             json={"action": "get_prices", "fornecedor": fornecedor}, timeout=30)
        if resp.status_code == 200:
            data = resp.json().get("prices", [])
            return {p["sku"]: p for p in data}
    except:
        pass
    return {}

# ─────────────────────────────────────────────
# CARREGAR API
# ─────────────────────────────────────────────
def carregar_api() -> list:
    if not ALLTO_API_KEY:
        print("  ⚠ ALLTO_API_KEY não definida")
        return []
    url = f"{URL_API_BASE}?apikey={ALLTO_API_KEY}&fileformat=json&type=full"
    print(f"  A descarregar dados da API ALL.TO (type=full)...")
    print(f"  URL: {url[:60]}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-PT,pt;q=0.9",
    }
    resp = requests.get(url, headers=headers, timeout=180)
    resp.encoding = "utf-8"
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('Content-Type', 'unknown')}")
    print(f"  Primeiros 500 chars: {resp.text[:500]}")
    if not resp.text.strip():
        print("  ❌ Resposta vazia — verifica a chave API ALLTO_API_KEY")
        return []
    data = resp.json()
    # A API pode retornar lista directamente ou dentro de uma chave
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        # Tentar várias chaves possíveis
        for key in ["products", "produtos", "items", "data", "artigos"]:
            if key in data:
                rows = data[key]
                break
        else:
            rows = list(data.values())[0] if data else []
    else:
        rows = []
    print(f"  API ALL.TO: {len(rows)} produtos")
    return rows

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("VRCF — Importação ALL.TO (Economato)")
    print("=" * 60)

    # 1. Carregar dados
    print("\n📥 A carregar dados da API...")
    rows = carregar_api()
    if not rows:
        print("❌ Sem dados para importar")
        return

    # 2. Preços actuais para comparação
    print("\n💰 A buscar preços actuais...")
    precos_actuais = buscar_precos_actuais("allto") if IMPORT_API_KEY else {}
    print(f"  {len(precos_actuais)} produtos com preço actual no Supabase")

    # 3. Processar
    print("\n⚙️  A processar produtos...")
    produtos = []
    skus_activos = []
    alteracoes_preco = []
    stats = {
        "sem_preco": 0, "sem_stock": 0, "promo": 0,
        "preco_actualizado": 0, "preco_estavel": 0,
        "envio_especial": 0,
    }

    for row in rows:
        # SKU
        sku = str(row.get("Referencia") or row.get("PN") or "").strip()
        if not sku:
            continue

        # Preços
        pvr          = parse_float(row.get("PVR"))
        primeiro_preco = parse_float(row.get("Primeiro_Preco"))
        precos = calcular_precos(pvr, primeiro_preco)
        if precos is None:
            stats["sem_preco"] += 1
            continue

        # Verificar variação de preço
        preco_actual = precos_actuais.get(sku)
        if preco_actual and preco_actual.get("price"):
            preco_ant = float(preco_actual["price"])
            preco_nov = precos["price"]
            variacao = abs(preco_nov - preco_ant) / preco_ant if preco_ant > 0 else 0
            if variacao > LIMIAR_VARIACAO:
                alteracoes_preco.append({
                    "sku": sku, "fornecedor": "allto",
                    "purchase_price_old": float(preco_actual.get("purchase_price") or 0),
                    "purchase_price_new": precos["purchase_price"],
                    "price_old": preco_ant, "price_new": preco_nov,
                    "variacao_pct": round(variacao * 100, 1),
                })
                stats["preco_actualizado"] += 1
            else:
                precos["price"]       = preco_ant
                precos["price_tier2"] = round(preco_ant * (1 - DESCONTO_TIER2), 2)
                precos["price_tier3"] = round(preco_ant * (1 - DESCONTO_TIER3), 2)
                stats["preco_estavel"] += 1

        # Stock
        stock_qty = int(parse_float(row.get("Stock")))
        if stock_qty > 10:    stock_status = "high"
        elif stock_qty > 0:   stock_status = "low"
        else:                 stock_status = "on_request"
        sob_encomenda = stock_qty == 0
        if stock_qty == 0: stock_status = "on_request"
        if stock_qty == 0: stats["sem_stock"] += 1

        # Peso e portes
        peso = parse_float(row.get("Peso"))
        porte = calcular_porte_dhl(peso)
        taxa_transporte = parse_float(row.get("Taxa_Adicional_Transporte"))
        envio_especial = taxa_transporte > 0 or porte is None
        if envio_especial: stats["envio_especial"] += 1

        # Promoção
        em_promo = str(row.get("Promocao") or "").strip().lower() in ("sim", "yes", "true", "1", "s")
        if em_promo: stats["promo"] += 1

        # Categoria, família e tipo (3 níveis)
        familia_allto  = str(row.get("Familia") or "").strip()
        linha_produto  = str(row.get("Linha_Produto") or "").strip()
        tipo_produto   = str(row.get("Tipo_Produto") or "").strip()
        categoria, familia, tipo = mapear_4_niveis(familia_allto, linha_produto, tipo_produto)

        # Marca
        marca = str(row.get("Marca") or "").strip()

        # Descrição
        descricao_curta = str(row.get("Descricao") or "").strip()
        descricao_longa = str(row.get("Descricao_Longa") or "").strip()
        descricao_tecnica = str(row.get("Descricao_Tecnica") or "").strip()
        description = descricao_longa or descricao_tecnica or descricao_curta

        # Imagem
        imagem = str(row.get("Link_Imagem") or "").strip()

        # EAN
        ean = str(row.get("Codigo_Barras") or "").strip() or None

        # IVA
        taxa_iva = parse_float(row.get("Taxa_Iva") or 23)

        # Specs
        specs = {}
        if marca:           specs["marca"]          = marca
        if familia_allto:   specs["familia"]         = familia_allto
        if linha_produto:   specs["linha_produto"]   = linha_produto
        if tipo_produto:    specs["tipo_produto"]    = tipo_produto
        if peso > 0:        specs["peso"]            = f"{peso} kg"
        if taxa_iva:        specs["iva"]             = f"{int(taxa_iva)}%"
        unidade = str(row.get("Unidade") or "").strip()
        paking  = str(row.get("Paking") or "").strip()
        if unidade: specs["unidade_venda"]  = unidade
        if paking:  specs["pack"]           = paking

        # Destaques
        destaques = []
        if em_promo:
            data_fim = str(row.get("DataFim_Promocao") or "").strip()
            destaques.append(f"Promoção{f' até {data_fim}' if data_fim else ''}")
        if envio_especial:
            destaques.append("Este produto tem condições especiais de envio. O custo e prazo serão indicados no orçamento.")

        # Slug
        slug = slugify(f"{marca}-{sku}".lower() if marca else sku.lower(), separator="-")

        produto = {
            "sku":                sku,
            "slug":               slug,
            "name":               descricao_curta or sku,
            "short_description":  descricao_curta,
            "description":        description,
            "brand_id":           None,
            "brand":              marca,
            "category":           categoria,
            "family":             familia,
            "type":               tipo,
            "price":              precos["price"],
            "price_tier2":        precos["price_tier2"],
            "price_tier3":        precos["price_tier3"],
            "purchase_price":     precos["purchase_price"],
            "stock_status":       stock_status,
            "sob_encomenda":      sob_encomenda,
            "envio_especial":     envio_especial,
            "include_in_catalog": True,
            "featured":           False,
            "show_on_homepage":   False,
            "image_url":          imagem,
            "imagens_extra":      [],
            "relacionados":       [],
            "ean":                ean,
            "weight":             peso,
            "fornecedor":         "allto",
            "mundo":              "economato",
            "especificacoes":     specs,
            "destaques":          destaques,
        }

        produtos.append(produto)
        skus_activos.append(sku)

    # Relatório
    print(f"\n  Total processados:      {len(produtos)}")
    print(f"  Sem preço (excluídos):  {stats['sem_preco']}")
    print(f"  Sem stock:              {stats['sem_stock']}")
    print(f"  Em promoção:            {stats['promo']}")
    print(f"  Envio especial:         {stats['envio_especial']}")
    print(f"  Preço actualizado:      {stats['preco_actualizado']}")
    print(f"  Preço estável (<{int(LIMIAR_VARIACAO*100)}%): {stats['preco_estavel']}")

    if alteracoes_preco:
        print(f"\n  ⚠ Variações > {int(LIMIAR_VARIACAO*100)}%:")
        for a in sorted(alteracoes_preco, key=lambda x: abs(x['variacao_pct']), reverse=True)[:5]:
            sinal = "+" if a['price_new'] > a['price_old'] else ""
            print(f"    {a['sku']:30s} {a['price_old']:.2f}€ → {a['price_new']:.2f}€ ({sinal}{a['variacao_pct']}%)")
        if len(alteracoes_preco) > 5:
            print(f"    ... e mais {len(alteracoes_preco)-5} produtos")

    if not IMPORT_API_KEY:
        print("\n⚠️  IMPORT_API_KEY não definida — a guardar preview local")
        with open("allto_preview.json", "w", encoding="utf-8") as f:
            json.dump(produtos[:3], f, ensure_ascii=False, indent=2)
        print("  Ficheiro allto_preview.json criado")
        return

    # 4. Upsert
    print("\n📤 A fazer upsert no Supabase...")
    inseridos = supabase_upsert(produtos)

    # 5. Price history
    if alteracoes_preco:
        print("\n📊 A registar histórico de preços...")
        registar_price_history(alteracoes_preco)

    # 6. Marcar inactivos
    print("\n🗑️  A verificar produtos descontinuados...")
    marcar_inactivos(skus_activos)

    print(f"\n✅ Importação concluída — {inseridos} produtos actualizados")
    print("=" * 60)


if __name__ == "__main__":
    main()
