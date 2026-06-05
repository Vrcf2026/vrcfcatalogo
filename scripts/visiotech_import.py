#!/usr/bin/env python3
"""
Script de importação Visiotech → Supabase (VRCF Catálogo)
Corre manualmente ou via GitHub Actions

Requer:
  pip install requests python-slugify

Variáveis de ambiente necessárias:
  IMPORT_URL        → URL da edge function
  IMPORT_API_KEY    → chave secreta definida no Lovable
"""

import csv
import re
import os
import json
import time
import requests
from io import StringIO
from slugify import slugify

# ─────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────

IMPORT_URL = os.environ.get("IMPORT_URL", "https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/import-products")
IMPORT_API_KEY = os.environ.get("IMPORT_API_KEY", "")

# Link Visiotech (credenciais VRCF)
URL_CSV_VISIOTECH = "https://www.visiotechsecurity.com/?option=com_csvgeneration&task=generate.generateCSV&token=4ac478b94365bdda557f071779349874&username=VT5771STW"

# Preço a usar: "venda_sugerida" ou "pvp_desconto" (PVP × 0.75 — usado para Reyee)
MARCAS_PVP_DESCONTO = {"REYEE", "REYEE NETWORKS"}
FATOR_PVP_DESCONTO = 0.75

# Stock mínimo para considerar "high"
STOCK_HIGH_THRESHOLD = 5  # visiotech usa high/medium/low/none directamente

# ─────────────────────────────────────────────
# MAPEAMENTO DE SPECS
# ─────────────────────────────────────────────

# Campos do JSON params → chaves do especificacoes no Supabase
SPECS_MAP = {
    "tipo":                  "tipo",
    "resolucion-maxima":     "resolucao",
    "tipo-de-iluminacion":   "iluminacao",
    "tipo-iluminacion":      "iluminacao",
    "proteccion-ip":         "protecao_ip",
    "proteccion-ik":         "protecao_ik",
    "proteccion":            "protecao",
    "uso":                   "instalacao",
    "poe":                   "poe",
    "wifi":                  "wifi",
    "audio":                 "audio",
    "lente":                 "lente",
    "alcance-iluminacion":   "alcance_iluminacao",
    "alcance-de-iluminacion":"alcance_iluminacao",
    "almacenamiento_interno":"armazenamento",
    "almacenamiento-interno":"armazenamento",
    "comunicacion":          "comunicacao",
    "alimentacion":          "alimentacao",
    "gama":                  "gama",
    "colorvu":               "colorvu",
    "acusense":              "acusense",
    "lpr":                   "lpr",
    "face-detection":        "detecao_facial",
    "alarmas":               "alarmes",
    "tipo-de-dispositivo":   "tipo_dispositivo",
    "color":                 "cor",
    "wdr":                   "wdr",
}

# Valores de instalação ES → PT
INSTALACAO_MAP = {
    "Interior":   "Interior",
    "Exterior":   "Exterior",
    "Int/Ext":    "Interior/Exterior",
    "interior":   "Interior",
    "exterior":   "Exterior",
}

# ─────────────────────────────────────────────
# FUNÇÕES
# ─────────────────────────────────────────────

def calcular_preco(row: dict) -> float:
    """
    Calcula preço de venda:
    - Reyee e similares: PVP × 0.75
    - Resto: precio_venta_cliente_final
    """
    brand = row.get("brand", "").strip().upper()
    try:
        venda_sug = float(row.get("precio_venta_cliente_final", 0) or 0)
        pvp = float(row.get("PVP", 0) or 0)
        compra = float(row.get("precio_neto_compra", 0) or 0)
    except (ValueError, TypeError):
        return None

    if compra <= 0:
        return None

    if brand in MARCAS_PVP_DESCONTO and pvp > 0:
        preco = round(pvp * FATOR_PVP_DESCONTO, 2)
    elif venda_sug > 0:
        preco = round(venda_sug, 2)
    else:
        # fallback: compra × 1.35
        preco = round(compra * 1.35, 2)

    return preco


def mapear_stock(stock_str: str, on_request: str) -> tuple:
    """Retorna (stock_status, sob_encomenda)"""
    sob_encomenda = str(on_request).strip() == "1"
    s = stock_str.strip().lower()
    if s == "high":
        return "high", sob_encomenda
    elif s in ("medium", "low"):
        return "low", sob_encomenda
    else:
        return "out", True  # none = sem stock = sob encomenda


def extrair_specs(params_json: str, category: str, category_parent: str) -> dict:
    """Extrai especificações do campo params JSON."""
    specs = {}

    try:
        params = json.loads(params_json) if params_json.strip() else {}
    except (json.JSONDecodeError, AttributeError):
        params = {}

    for param_key, spec_key in SPECS_MAP.items():
        val = params.get(param_key, "").strip()
        if val and val.lower() not in ("", "n/a", "não", "no", "-"):
            # Normalizar instalação
            if spec_key == "instalacao":
                val = INSTALACAO_MAP.get(val, val)
            # Normalizar booleanos
            if val.lower() in ("sim", "yes", "sí", "si", "true", "1"):
                val = "Sim"
            elif val.lower() in ("não", "no", "false", "0"):
                continue  # não guardar "Não" nas specs — polui os filtros
            specs[spec_key] = val

    # Adicionar categoria como contexto se não houver tipo
    if "tipo" not in specs and category:
        specs["categoria"] = category

    return specs


def gerar_destaques(short_description: str) -> list:
    """Converte short_description em lista de bullet points."""
    if not short_description:
        return []
    # Limpar HTML
    text = re.sub(r"<[^>]+>", " ", short_description)
    text = re.sub(r"\s+", " ", text).strip()
    # Dividir por - ou · ou newline
    items = re.split(r"\s*[-·]\s+", text)
    items = [i.strip() for i in items if len(i.strip()) > 3]
    return items[:6]  # máximo 6 destaques


def carregar_csv(filepath_ou_url: str) -> list:
    """Carrega o CSV Visiotech."""
    if filepath_ou_url.startswith("http"):
        print("  A descarregar CSV Visiotech...")
        resp = requests.get(filepath_ou_url, timeout=120)
        resp.encoding = "latin1"
        content = resp.text
        reader = csv.DictReader(StringIO(content), delimiter=";")
    else:
        f = open(filepath_ou_url, encoding="latin1")
        reader = csv.DictReader(f, delimiter=";")

    rows = [r for r in reader if r.get("name") and r.get("published", "0").strip() == "1"]
    print(f"  CSV Visiotech: {len(rows)} produtos publicados")
    return rows


def supabase_upsert(produtos: list, fornecedor: str = "visiotech"):
    """Envia produtos para a edge function que faz upsert no Supabase."""
    headers = {
        "x-import-key": IMPORT_API_KEY,
        "Content-Type": "application/json",
    }

    batch_size = 100
    total = len(produtos)
    inseridos = 0

    for i in range(0, total, batch_size):
        batch = produtos[i:i + batch_size]
        resp = requests.post(
            IMPORT_URL,
            headers=headers,
            json={"fornecedor": fornecedor, "produtos": batch},
            timeout=60,
        )
        if resp.status_code == 200:
            result = resp.json()
            inseridos += result.get("count", len(batch))
            print(f"  ✅ Upsert {i + 1}-{min(i + batch_size, total)}/{total}")
        else:
            print(f"  ❌ Erro lote {i}: {resp.status_code} — {resp.text[:200]}")
        time.sleep(0.3)

    return inseridos


def marcar_inactivos(skus_activos: list, fornecedor: str = "visiotech"):
    """Envia lista de SKUs activos para a edge function marcar inactivos."""
    headers = {
        "x-import-key": IMPORT_API_KEY,
        "Content-Type": "application/json",
    }
    resp = requests.post(
        IMPORT_URL,
        headers=headers,
        json={"fornecedor": fornecedor, "skus_activos": skus_activos, "action": "marcar_inactivos"},
        timeout=30,
    )
    if resp.status_code == 200:
        result = resp.json()
        inactivos = result.get("inactivos", 0)
        if inactivos:
            print(f"  ⚠ {inactivos} produtos desactivados")
        else:
            print("  ✅ Sem produtos a desactivar")
    else:
        print(f"  ⚠ Não foi possível verificar inactivos: {resp.status_code}")


# ─────────────────────────────────────────────
# PROCESSO PRINCIPAL
# ─────────────────────────────────────────────

def main(usar_ficheiro_local=False):
    print("=" * 60)
    print("VRCF — Importação Visiotech")
    print("=" * 60)

    # 1. Carregar CSV
    print("\n📥 A carregar CSV...")
    if usar_ficheiro_local:
        rows = carregar_csv("visiotech_connect__1_.csv")
    else:
        rows = carregar_csv(URL_CSV_VISIOTECH)

    # 2. Processar produtos
    print("\n⚙️  A processar produtos...")
    produtos = []
    skus_activos = []
    sem_preco = 0
    sob_encomenda_total = 0

    for row in rows:
        sku = row.get("name", "").strip()
        if not sku:
            continue

        # Preço
        preco = calcular_preco(row)
        if preco is None:
            sem_preco += 1
            continue

        # Stock
        stock_status, sob_encomenda = mapear_stock(
            row.get("stock", "none"),
            row.get("on_request", "0")
        )
        if sob_encomenda:
            sob_encomenda_total += 1

        # Specs
        specs = extrair_specs(
            row.get("params", "{}"),
            row.get("category", ""),
            row.get("category_parent", "")
        )

        # Destaques
        destaques = gerar_destaques(row.get("short_description", ""))

        # Descrição — já está em português no CSV
        description = row.get("description", "").strip()
        short_desc = row.get("short_description", "").strip()
        # Limpar HTML da short_description para texto simples
        short_desc_clean = re.sub(r"<[^>]+>", " ", short_desc)
        short_desc_clean = re.sub(r"\s+", " ", short_desc_clean).strip()[:300]

        # Slug
        brand = row.get("brand", "").strip()
        slug_base = slugify(f"{brand}-{sku}".lower(), separator="-")

        # Imagem
        image_url = row.get("image_path", "").strip()

        # Categoria e família
        category = row.get("category", "").strip()
        category_parent = row.get("category_parent", "").strip()

        produto = {
            "sku": sku,
            "slug": slug_base,
            "name": short_desc_clean or sku,
            "short_description": short_desc_clean,
            "description": description,
            "brand_id": None,
            "price": preco,
            "stock_status": stock_status,
            "sob_encomenda": sob_encomenda,
            "include_in_catalog": True,
            "featured": False,
            "show_on_homepage": False,
            "image_url": image_url,
            "fornecedor": "visiotech",
            "mundo": "seguranca",
            "category": category,
            "especificacoes": specs,
            "destaques": destaques,
        }

        produtos.append(produto)
        skus_activos.append(sku)

    print(f"\n  Total processados: {len(produtos)}")
    print(f"  Sem preço (excluídos): {sem_preco}")
    print(f"  Sob encomenda: {sob_encomenda_total}")
    print(f"  Com stock: {sum(1 for p in produtos if p['stock_status'] == 'high')}")

    # 3. Upsert no Supabase
    if not SUPABASE_KEY:
        print("\n⚠️  SUPABASE_SERVICE_ROLE_KEY não definida — a guardar preview local")
        with open("visiotech_produtos_preview.json", "w", encoding="utf-8") as f:
            json.dump(produtos[:5], f, ensure_ascii=False, indent=2)
        print("  Ficheiro visiotech_produtos_preview.json criado com 5 exemplos")
        return

    print("\n📤 A fazer upsert no Supabase...")
    inseridos = supabase_upsert(produtos)

    # 4. Marcar inactivos
    print("\n🗑️  A verificar produtos descontinuados...")
    marcar_inactivos(skus_activos)

    print(f"\n✅ Importação concluída — {inseridos} produtos actualizados")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    usar_local = len(sys.argv) > 1 and sys.argv[1] == "local"
    main(usar_ficheiro_local=usar_local)
