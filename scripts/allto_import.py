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

import os, json, time, requests, re, csv, io
from slugify import slugify

# ─────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────
IMPORT_URL     = os.environ.get("IMPORT_URL", "https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/import-products")
IMPORT_API_KEY = os.environ.get("IMPORT_API_KEY", "")
ALLTO_API_KEY  = os.environ.get("ALLTO_API_KEY", "")

URL_API_V1   = "https://api.allto.pt/v1/"

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
# ─────────────────────────────────────────────
# PARSER "DESCRIÇÃO TÉCNICA"
# Formato: segmentos separados por "¶", cada um "Label: Valor" (specs)
# ou texto livre (prosa, vai para a descrição).
# ─────────────────────────────────────────────
def parsear_descricao_tecnica(texto: str) -> tuple[dict, list[str]]:
    """Devolve (specs_extra, paragrafos_prosa) a partir de Descricao_Tecnica."""
    specs_extra: dict = {}
    prosa: list[str] = []
    if not texto:
        return specs_extra, prosa

    for seg in texto.split("¶"):
        seg = seg.strip().strip("\t").strip()
        if not seg:
            continue
        if ":" in seg:
            label, _, valor = seg.partition(":")
            label = label.strip()
            valor = valor.strip()
            primeira_palavra = label.split(" ", 1)[0].lower() if label else ""
            # Rejeitar frases de marketing tipo "Acreditamos na beleza útil: ..."
            # (1ª pessoa do plural: -amos/-emos/-imos), que não são specs reais.
            is_frase_marketing = re.search(r"(amos|emos|imos)$", primeira_palavra)
            # "Label: Valor" só se o label for curto e o valor não vazio
            if valor and 0 < len(label) <= 40 and label.count(" ") <= 5 and not is_frase_marketing:
                key = slugify(label, separator="_")
                if key and key not in specs_extra:
                    specs_extra[key] = valor[:120]
                continue
        # Caso contrário, é texto livre/prosa
        prosa.append(seg)

    return specs_extra, prosa


# Gramagem de papel ("075gr", "80g", "130g") frequentemente só aparece no
# nome do produto, não na Descrição Técnica. Cobre 145/146 produtos da
# linha "Papel Fotocópia" (testado sobre catálogo real), contra 28/146 só
# com o parser da Descrição Técnica.
_RE_GRAMAGEM_NOME = re.compile(r"(?<!\d)(\d{2,3})\s?gr?(?=[^a-zA-Z]|$)", re.IGNORECASE)

def extrair_gramagem_do_nome(nome: str) -> str | None:
    """Devolve 'NN g/m²' se encontrar um padrão de gramagem no nome, senão None."""
    if not nome:
        return None
    m = _RE_GRAMAGEM_NOME.search(nome)
    if not m:
        return None
    return f"{int(m.group(1))} g/m²"


# Cor de tinteiros/toners ("...BTD180BK Preto 7500 Pág.") — testado sobre
# catálogo real: 88.4% de cobertura em Tinteiros + Toners e Drums (5.999
# produtos), que hoje têm apenas 1-6% de specs extraídas da Descrição
# Técnica. Lista fechada de cores PT comuns nestes produtos.
_CORES_TINTEIRO = ["Preto", "Negro", "Azul", "Cyan", "Ciano", "Magenta",
                   "Amarelo", "Tricolor", "Cores", "Colorido"]
_RE_COR_TINTEIRO = re.compile(r"\b(" + "|".join(_CORES_TINTEIRO) + r")\b", re.IGNORECASE)

def extrair_cor_tinteiro(nome: str) -> str | None:
    """Devolve a cor capitalizada se encontrar uma palavra de cor conhecida no nome."""
    if not nome:
        return None
    m = _RE_COR_TINTEIRO.search(nome)
    if not m:
        return None
    return m.group(1).capitalize()


def extrair_rendimento_paginas(ncopias_raw) -> str | None:
    """Converte o campo NCopias em 'NNNN páginas' — é o rendimento real do
    tinteiro/toner (confirmado contra o nome do produto, ex: NCopias=7500.00
    para um produto chamado "...7500 Pág."). 90.4% de cobertura testada."""
    val = parse_float(ncopias_raw)
    if not val or val <= 0:
        return None
    return f"{int(val)} páginas"


# ─────────────────────────────────────────────
# CONFIGURAÇÃO DE MARGENS (Preco_Venda_Cliente)
# Portado de margin-config.json / pricing.ts — calcula o PVP a partir
# do PVR (custo sem IVA), por família/tipo/marca, com ajuste por escalão
# de preço. Ver margin-config.json para a explicação de cada regra.
# ─────────────────────────────────────────────
MARGEM_BASE_FAMILIA: dict[str, float] = {
    "Papelaria": 0.40,
    "Alimentar": 0.35,
    "Manutenção": 0.32,
    "Limpeza": 0.32,
    "Informática": 0.25,
    "Higiene e Beleza": 0.38,
    "Mobiliário": 0.25,
    "Embalagem": 0.30,
    "Eletrónica": 0.25,
    "Café e Chá": 0.35,
}
MARGEM_DEFAULT = 0.30

# Regra própria para "Impressão" (Originais vs Compatíveis)
IMPRESSAO_MARGEM_ORIGINAIS = 0.25
IMPRESSAO_MARGEM_COMPATIVEIS = 0.35
MARCAS_COMPATIVEIS = {
    "EVERGREEN", "PERPETUAL", "NEUTRAL", "COMPATIVEL", "COMPATÍVEL",
    "OUTRAS", "G&G", "ARMOR", "MICROTECH",
}

MARGEM_MINIMA = 0.08


def _margem_base(categoria: str, tipo_produto: str | None, marca: str | None) -> float:
    """Margem base (fração) antes do ajuste por escalão de PVR."""
    cat = (categoria or "").strip()
    marca_u = (marca or "").strip().upper()
    tipo_u = (tipo_produto or "").strip().upper()

    if cat == "Impressão":
        if marca_u in MARCAS_COMPATIVEIS or "COMPAT" in tipo_u:
            return IMPRESSAO_MARGEM_COMPATIVEIS
        return IMPRESSAO_MARGEM_ORIGINAIS

    return MARGEM_BASE_FAMILIA.get(cat, MARGEM_DEFAULT)


def _ajuste_escalao_pvr(pvr: float) -> float:
    """Ajuste (pp, fração) ao custo (PVR sem IVA)."""
    if pvr < 2:   return 0.15
    if pvr < 10:  return 0.05
    if pvr < 50:  return 0.0
    if pvr < 150: return -0.04
    return -0.08


def calcular_pvp(pvr: float, categoria: str, tipo_produto: str | None, marca: str | None, iva: float = 0.23) -> dict:
    """Calcula o Preco_Venda_Cliente a partir do PVR (custo sem IVA)."""
    if not pvr or pvr <= 0:
        return {"margem": 0.0, "pvp_sem_iva": 0.0, "pvp_com_iva": 0.0}

    base = _margem_base(categoria, tipo_produto, marca)
    ajuste = _ajuste_escalao_pvr(pvr)
    margem = max(MARGEM_MINIMA, base + ajuste)

    pvp_sem_iva = round(pvr * (1 + margem), 2)
    pvp_com_iva = round(pvp_sem_iva * (1 + iva), 2)
    return {"margem": margem, "pvp_sem_iva": pvp_sem_iva, "pvp_com_iva": pvp_com_iva}


def calcular_precos(pvr: float, primeiro_preco: float, categoria: str = "",
                     tipo_produto: str | None = None, marca: str | None = None,
                     taxa_iva: float = 23) -> dict | None:
    """Calcula os 3 tiers de preço, com PVP baseado em margem (não no custo)."""
    if pvr <= 0:
        return None
    pvp = calcular_pvp(pvr, categoria, tipo_produto, marca, (taxa_iva or 23) / 100)
    preco_venda = pvp["pvp_sem_iva"]   # s/IVA — o site aplica ×1.23 ao mostrar
    return {
        "purchase_price":     round(primeiro_preco if primeiro_preco > 0 else pvr, 2),
        "price":              preco_venda,
        "price_tier2":        round(preco_venda * (1 - DESCONTO_TIER2), 2),
        "price_tier3":        round(preco_venda * (1 - DESCONTO_TIER3), 2),
    }

def parse_float(val) -> float:
    """Converte valor para float de forma segura."""
    try:
        if val is None:
            return 0.0
        return float(str(val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return 0.0


def parse_stock_allto(val, sku: str = "") -> int:
    """
    Converte o campo Stock da ALL.TO para inteiro.
    Formatos: "0", "1-10", "11-100", "101-1000", ">1000", "1.000", "2.969"

    NOTA (bug corrigido): valores com vírgula como separador de milhar
    (ex. "2,969" em vez de "2.969") ou com espaços invisíveis (NBSP) caíam
    no except e silenciosamente viravam stock 0 — produto aparecia como
    "sem stock" quando na verdade tinha. Agora normaliza vírgula+ponto
    como separadores de milhar antes de converter, e quando mesmo assim
    falha, regista o valor em vez de o engolir silenciosamente.
    """
    if not val:
        return 0
    s = str(val).strip().replace("\xa0", "").replace(" ", "")
    if not s:
        return 0
    if s.startswith(">"):
        try: return int(s[1:].replace(".", "").replace(",", "")) + 1
        except: return 1001
    if "-" in s:
        try: return int(s.split("-")[0].replace(".", "").replace(",", ""))
        except: pass
    else:
        try: return int(s.replace(".", "").replace(",", ""))
        except: pass

    print(f"  ⚠ Stock ALL.TO ilegível{f' (SKU {sku})' if sku else ''}: {val!r} — assumido sem stock, confirmar formato.")
    return 0

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
    """Carrega o catálogo ALL.TO via API v1 (CSV) — único pedido HTTP.

    A v1 tem todos os campos necessários (incluindo os que a v2 'type=full'
    não devolve: Link Imagem, Descricao Tecnica, Descricao Longa, Peso,
    Taxa Iva), por isso não é necessário combinar v1+v2 — 2 pedidos
    seguidos à API arriscavam acionar a proteção anti-bot (Imunify360).

    Os nomes das colunas (com espaços) são normalizados para o formato
    com underscore usado no resto do script (ex: 'Linha Produto' →
    'Linha_Produto', 'MIN Venda' → 'MIN_Venda').
    """
    if not ALLTO_API_KEY:
        print("  ⚠ ALLTO_API_KEY não definida")
        return []
    url = f"{URL_API_V1}?apikey={ALLTO_API_KEY}"
    print(f"  A descarregar dados da API ALL.TO v1 (CSV)...")
    print(f"  URL: {url[:50]}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/csv, text/plain, */*",
        "Accept-Language": "pt-PT,pt;q=0.9",
    }
    resp = requests.get(url, headers=headers, timeout=180)
    resp.encoding = "latin1"
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('Content-Type', 'unknown')}")
    texto = resp.text.strip()
    print(f"  Primeiros 300 chars: {texto[:300]}")

    if not texto:
        print("  ❌ Resposta vazia — verifica a chave API ALLTO_API_KEY")
        return []

    # Resposta de erro (ex: bloqueio Imunify360) vem como JSON com "message",
    # não como CSV. Detectar antes de passar ao csv.DictReader.
    if texto.startswith("{"):
        try:
            data = json.loads(texto)
            msg = data.get("message", texto[:200])
        except Exception:
            msg = texto[:200]
        print(f"  ❌ API ALL.TO devolveu erro: {msg}")
        if "Imunify360" in str(msg) or "bot-protection" in str(msg):
            print("  ⚠ O IP usado pelo GitHub Actions está a ser bloqueado pela ALL.TO.")
            print("  ⚠ É necessário contactar a ALL.TO para fazer whitelisting do(s) IP(s)")
            print("  ⚠ usado(s) pelos runners do GitHub Actions (ou usar um IP fixo/proxy).")
        return []

    # Página HTML (ex: challenge anti-bot "a verificar o seu browser...",
    # com setTimeout + reload) em vez do CSV esperado.
    content_type = resp.headers.get("Content-Type", "")
    if texto.lstrip().startswith(("<!DOCTYPE", "<html")) or "text/html" in content_type:
        print("  ❌ API ALL.TO devolveu uma página HTML em vez de CSV "
              "(provável challenge anti-bot/Imunify360).")
        print("  ⚠ O IP usado pelo GitHub Actions está provavelmente a ser bloqueado pela ALL.TO.")
        print("  ⚠ É necessário contactar a ALL.TO para fazer whitelisting do(s) IP(s)")
        print("  ⚠ usado(s) pelos runners do GitHub Actions (ou usar um IP fixo/proxy).")
        return []

    reader = csv.DictReader(io.StringIO(resp.text), delimiter=";")
    # Mapeamento de colunas v1 (com espaços) → nomes com underscore usados
    # no resto do script.
    RENAME = {
        "Linha Produto":     "Linha_Produto",
        "Tipo Produto":      "Tipo_Produto",
        "Descricao Longa":   "Descricao_Longa",
        "Descricao Tecnica": "Descricao_Tecnica",
        "MIN Venda":         "MIN_Venda",
        "Primeira Qty":      "Primeira_Qty",
        "Primeiro Preco":    "Primeiro_Preco",
        "Segunda Qty":       "Segunda_Qty",
        "Segundo Preco":     "Segundo_Preco",
        "Data Entrega":      "DataEntrega",
        "Codigo Barras":     "Codigo_Barras",
        "Link Imagem":       "Link_Imagem",
        "Taxa Adicional Transporte(Esc.1)": "Taxa_Adicional_Transporte",
        "Taxa Iva":          "Taxa_Iva",
        "Promoção":          "Promocao",
    }
    rows = []
    for row in reader:
        normalized = {RENAME.get(k, k): v for k, v in row.items() if k is not None}
        rows.append(normalized)

    if not rows:
        print("  ❌ CSV vazio ou em formato inesperado")
        return []

    # Salvaguarda: confirmar que as colunas esperadas existem (Referencia,
    # PVR) — se não, a resposta não é o CSV real da ALL.TO (ex: HTML/erro
    # mal detectado acima por algum motivo).
    if "Referencia" not in rows[0] or "PVR" not in rows[0]:
        print(f"  ❌ Resposta não tem o formato esperado do CSV ALL.TO "
              f"(colunas: {list(rows[0].keys())[:5]}...)")
        return []

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
        "envio_especial": 0, "sem_imagem": 0, "sem_descricao_tecnica": 0,
    }

    for row in rows:
        # SKU
        sku = str(row.get("Referencia") or row.get("PN") or "").strip()
        if not sku:
            continue

        # Categoria, família e tipo (3 níveis) — calculados primeiro porque
        # a margem de preço depende da categoria/tipo/marca
        familia_allto  = str(row.get("Familia") or "").strip()
        linha_produto  = str(row.get("Linha_Produto") or "").strip()
        tipo_produto   = str(row.get("Tipo_Produto") or "").strip()
        categoria, familia, tipo = mapear_4_niveis(familia_allto, linha_produto, tipo_produto)

        # Marca
        marca = str(row.get("Marca") or "").strip()

        # IVA
        taxa_iva = parse_float(row.get("Taxa_Iva") or 23)

        # Preços — PVP calculado por margem (ver calcular_pvp), não ao custo
        pvr          = parse_float(row.get("PVR"))
        primeiro_preco = parse_float(row.get("Primeiro_Preco"))

        # Quantidade mínima de venda (embalagem mínima — ex: caixa de 100)
        min_sale_qty = int(parse_float(row.get("MIN_Venda")) or 1)
        if min_sale_qty < 1:
            min_sale_qty = 1
        precos = calcular_precos(pvr, primeiro_preco, categoria, tipo_produto, marca, taxa_iva)
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

        # Stock — campo pode ser número ou intervalo ("101-1000", "1.000", ">1000", etc.)
        stock_qty = parse_stock_allto(row.get("Stock"), sku)
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

        # Descrição
        descricao_curta = str(row.get("Descricao") or "").strip()
        descricao_longa = str(row.get("Descricao_Longa") or "").strip()
        descricao_tecnica = str(row.get("Descricao_Tecnica") or "").strip()
        if not descricao_tecnica: stats["sem_descricao_tecnica"] += 1

        specs_tecnica, prosa_tecnica = parsear_descricao_tecnica(descricao_tecnica)

        description = descricao_longa or descricao_curta
        # Enriquecer com a prosa da "Descrição Técnica" (frases que não são specs
        # "Label: Valor"), evitando repetir texto já presente na descrição.
        for linha in prosa_tecnica:
            if linha and linha.lower() not in description.lower():
                description = f"{description}\n{linha}" if description else linha

        # Imagem
        imagem = str(row.get("Link_Imagem") or "").strip()
        if not imagem: stats["sem_imagem"] += 1

        # EAN
        ean = str(row.get("Codigo_Barras") or "").strip() or None

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
        if min_sale_qty > 1: specs["quantidade_minima"] = f"{min_sale_qty} unidades"

        # Specs extraídas da "Descrição Técnica" (Cor, Formato, Dimensões, etc.)
        for k, v in specs_tecnica.items():
            if k not in specs:
                specs[k] = v

        # Fallback: gramagem de papel frequentemente só vem no nome, não na
        # Descrição Técnica (ex: "Papel 080gr Fotocópia A4...").
        if "gramagem" not in specs:
            gramagem_nome = extrair_gramagem_do_nome(descricao_curta)
            if gramagem_nome:
                specs["gramagem"] = gramagem_nome

        # Tinteiros/Toners: cor (do nome) e rendimento em páginas (de NCopias)
        # — a Descrição Técnica destes produtos é só "modelos compatíveis",
        # nunca tem "Label: Valor" para cor/rendimento.
        if linha_produto in ("Tinteiros", "Toners e Drums"):
            if "cor" not in specs:
                cor = extrair_cor_tinteiro(descricao_curta)
                if cor:
                    specs["cor"] = cor
            if "rendimento" not in specs:
                rendimento = extrair_rendimento_paginas(row.get("NCopias"))
                if rendimento:
                    specs["rendimento"] = rendimento

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
            "min_sale_qty":       min_sale_qty,
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
    print(f"  Sem imagem:             {stats['sem_imagem']}")
    print(f"  Sem Descrição Técnica:  {stats['sem_descricao_tecnica']}")
    if stats["sem_imagem"] > 0:
        print("  ⚠ 'Link_Imagem' vazio em produtos — confirmar se a API "
              "(type=full) devolve este campo; ver nota em allto_import.py")

    if alteracoes_preco:
        print(f"\n  ⚠ Variações > {int(LIMIAR_VARIACAO*100)}% ({len(alteracoes_preco)} produtos):")
        for a in sorted(alteracoes_preco, key=lambda x: abs(x['variacao_pct']), reverse=True):
            sinal = "+" if a['price_new'] > a['price_old'] else ""
            print(f"    {a['sku']:30s} {a['price_old']:.2f}€ → {a['price_new']:.2f}€ ({sinal}{a['variacao_pct']}%)")

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
