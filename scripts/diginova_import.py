#!/usr/bin/env python3
"""
Script de importação Diginova → Supabase (VRCF Catálogo)
Corre manualmente ou via GitHub Actions (agendado diariamente)

Requer:
  pip install requests supabase python-slugify
  
Variáveis de ambiente necessárias:
  IMPORT_URL        → URL da edge function
  IMPORT_API_KEY    → chave secreta definida no Lovable
  ANTHROPIC_API_KEY → para tradução via Claude (opcional)
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
# CONFIGURAÇÃO — ajustar aqui
# ─────────────────────────────────────────────

IMPORT_URL = os.environ.get("IMPORT_URL", "https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/import-products")
IMPORT_API_KEY = os.environ.get("IMPORT_API_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Links Diginova (credenciais Spacedata)
URL_CSV_PRESTA = "https://www.diginova.es/csv_presta.php?c=14489&u=spacedata25&p=C16BA86B32F5E58EB92DBE7D2B2F421F"
URL_CSV_SIMPLES = "https://www.diginova.es/csv.php?c=14489&u=spacedata25&p=C16BA86B32F5E58EB92DBE7D2B2F421F"

# Margens e mínimos
IVA_ES = 1.21
DESCONTO_DIGINOVA = 0.0   # % desconto negociado (ex: 0.05 = 5%) — ajustar quando negociado
MARGEM = 0.15             # 15%

# Margem mínima em euros por grupo de família
MARGEM_MINIMA = {
    "equipamentos": 50.0,   # portáteis, desktops, AIO, servidores
    "monitores":    20.0,   # monitores, periféricos, impressoras, tablets
    "componentes":   0.0,   # sem mínimo
}

# Mapeamento família → grupo
FAMILIA_GRUPO = {
    # Equipamentos
    "Portátiles I3":          "equipamentos",
    "Portátiles I5":          "equipamentos",
    "Portátiles I7":          "equipamentos",
    "Portátiles AMD":         "equipamentos",
    "Portátiles Workstation": "equipamentos",
    "Otros Portátiles":       "equipamentos",
    "Sobremesas SFF":         "equipamentos",
    "Mini pc/Tiny":           "equipamentos",
    "Torres":                 "equipamentos",
    "All in One":             "equipamentos",
    "Servidores":             "equipamentos",
    "Apple":                  "equipamentos",
    "TPV":                    "equipamentos",
    "Informática Premium":    "equipamentos",
    # Monitores e periféricos
    'Monitores 22"':          "monitores",
    'Monitores 23"':          "monitores",
    'Monitores 24"':          "monitores",
    "Impresoras / Escáneres": "monitores",
    "Tablets":                "monitores",
    # Componentes (sem mínimo)
    "Otros":                  "componentes",
}

# ─────────────────────────────────────────────
# DICIONÁRIO DE TRADUÇÃO ES → PT
# ─────────────────────────────────────────────

TRADUCOES = {
    # Tipos de equipamento
    "Ordenador":          "Computador",
    "Ordenadores":        "Computadores",
    "Portátil":           "Portátil",
    "Portátiles":         "Portáteis",
    "Sobremesa":          "Secretária",
    "Sobremesas":         "Secretária",
    "Todo en Uno":        "Tudo-em-Um",
    "Todo En Uno":        "Tudo-em-Um",
    "Mini pc":            "Mini PC",
    "Tiny":               "Tiny",
    "Torre":              "Torre",
    "Torres":             "Torres",
    "Servidor":           "Servidor",
    "Servidores":         "Servidores",
    # Hardware
    "Procesador":         "Processador",
    "Disco Duro":         "Disco Rígido",
    "Disco duro":         "Disco Rígido",
    "Memorias":           "Memória",
    "Memoria":            "Memória",
    "Gráfica":            "Placa Gráfica",
    "Pantalla":           "Ecrã",
    "Teclado":            "Teclado",
    "Batería":            "Bateria",
    "Cargador":           "Carregador",
    "Lector":             "Leitor",
    "Grabador":           "Gravador",
    "Lector/Grabador":    "Leitor/Gravador",
    "Conexiones":         "Ligações",
    "Conectividad":       "Conectividade",
    "Wifi":               "Wi-Fi",
    "Núcleos":            "Núcleos",
    "núcleos":            "núcleos",
    "Turbo":              "Turbo",
    "turbo":              "turbo",
    # Armazenamento
    "SSD-NVMe":           "SSD NVMe",
    "SSD-SATA":           "SSD SATA",
    "Disco Duro SSD":     "SSD",
    "Disco Duro HDD":     "HDD",
    # Sistema operativo
    "Preinstalado":       "Pré-instalado",
    "preinstalado":       "pré-instalado",
    "Sin sistema":        "Sem sistema operativo",
    "Sin Sistema":        "Sem sistema operativo",
    # Grau
    "GRADO A":            "GRAU A",
    "GRADO B":            "GRAU B",
    "Grado A":            "Grau A",
    "Grado B":            "Grau B",
    "grado":              "grau",
    "Grado":              "Grau",
    # Outros
    "con teclado":        "com teclado",
    "Con teclado":        "Com teclado",
    "SFF":                "SFF",
    "Reacondicionado":    "Recondicionado",
    "reacondicionado":    "recondicionado",
    "Varias marcas":      "Várias marcas",
    "según disponibilidad": "conforme disponibilidade",
    "zócalos":            "slots",
    "núcleos":            "núcleos",
    "Equipos comprobados y testeados completamente": "Equipamento testado e verificado completamente",
    "Pueden tener signos de desgaste o arañazos en su carcasa, pero son completamente funcionales":
        "Pode apresentar sinais de desgaste ou riscos na carcaça, mas é completamente funcional",
    "Estos equipos incluyen licencia de":  "Este equipamento inclui licença de",
    "Estos equipos incluyen licencia":     "Este equipamento inclui licença de",
    "Este equipamento inclui licença Windows": "Este equipamento inclui licença de Windows",
    "Ordenador de sobremesa":              "Computador de secretária",
    "Computador sobremesa":                "Computador de secretária",
    "Panel":                               "Painel",
    "frontales":                           "frontais",
    "SI":                                  "SIM",
    "NO":                                  "NÃO",
    "Especificaciones:":  "Especificações:",
}

def traduzir_texto(texto: str) -> str:
    """Aplica o dicionário de tradução ao texto."""
    for es, pt in TRADUCOES.items():
        texto = texto.replace(es, pt)
    return texto

def traduzir_com_claude(nome_es: str, descricao_es: str) -> dict:
    """
    Usa a Claude API para traduzir nome e descrição quando o dicionário não chega.
    Retorna {"nome_pt": ..., "descricao_pt": ...}
    """
    if not ANTHROPIC_KEY:
        return {"nome_pt": traduzir_texto(nome_es), "descricao_pt": traduzir_texto(descricao_es)}

    prompt = f"""Traduz do espanhol para português europeu (PT-PT) os seguintes textos de um produto informático recondicionado.

NOME: {nome_es}

DESCRIÇÃO (HTML): {descricao_es[:2000]}

Responde APENAS em JSON com este formato exacto, sem mais nada:
{{"nome_pt": "...", "descricao_pt": "..."}}

Regras:
- Mantém termos técnicos em inglês (SSD, NVMe, DDR4, Wi-Fi, USB, etc.)
- Usa português europeu (não brasileiro)
- Mantém a estrutura HTML da descrição
- Grau A / Grau B (não Grado)
- Tudo-em-Um (não All-in-One)
"""

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        data = resp.json()
        text = data["content"][0]["text"].strip()
        # limpar possíveis backticks
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"  ⚠ Claude API erro: {e} — usando dicionário")
        return {"nome_pt": traduzir_texto(nome_es), "descricao_pt": traduzir_texto(descricao_es)}

# ─────────────────────────────────────────────
# EXTRACÇÃO DE ESPECIFICAÇÕES
# ─────────────────────────────────────────────

def extrair_specs(nome: str, descricao: str, familia: str) -> dict:
    """Extrai especificações técnicas do nome e descrição."""
    specs = {}
    texto = f"{nome} {descricao}"

    # Tipo de equipamento — usar familia original (pode estar em ES ou PT)
    familia_lower = familia.lower()
    if any(x in familia_lower for x in ["all in one", "tudo-em-um", "todo en uno", "aio"]):
        specs["tipo"] = "Tudo-em-Um"
    elif any(x in familia_lower for x in ["portátil", "portatil", "portátiles", "portatiles"]):
        specs["tipo"] = "Portátil"
    elif any(x in familia_lower for x in ["servidor", "servidores"]):
        specs["tipo"] = "Servidor"
    elif any(x in familia_lower for x in ["sff", "sobremesa", "secretária", "torre", "mini pc", "tiny", "micro"]):
        specs["tipo"] = "Desktop"

    # Processador
    proc_match = re.search(
        r"Intel Core (i\d[-\s]?\d{4,5}[A-Z]*|Ultra \d+)|AMD (Ryzen \d \d{4}[A-Z]*|EPYC|Athlon \w+)|Intel Celeron \w+|Intel Pentium \w+|Intel Xeon \w+",
        texto, re.IGNORECASE
    )
    if proc_match:
        specs["processador"] = proc_match.group(0).strip()

    # Geração (Intel)
    gen_match = re.search(r"(?:i\d[-\s]?)(\d{1,2})\d{3}", texto)
    if gen_match:
        specs["geracao"] = gen_match.group(1) + "ª Gen"

    # RAM
    ram_match = re.search(r"(\d+)\s*GB\s*DDR(\d)", texto, re.IGNORECASE)
    if ram_match:
        specs["ram_gb"] = ram_match.group(1)
        specs["ram_tipo"] = f"DDR{ram_match.group(2)}"

    # Armazenamento
    ssd_match = re.search(r"(\d+)\s*(?:GB|TB)\s*SSD[-\s]?(NVMe|SATA)?", texto, re.IGNORECASE)
    hdd_match = re.search(r"(\d+)\s*(?:GB|TB)\s*HDD", texto, re.IGNORECASE)
    if ssd_match:
        val = ssd_match.group(1)
        tipo = ssd_match.group(2) or "SATA"
        specs["armazenamento_gb"] = val
        specs["armazenamento_tipo"] = f"SSD {tipo.upper()}"
    elif hdd_match:
        specs["armazenamento_gb"] = hdd_match.group(1)
        specs["armazenamento_tipo"] = "HDD"

    # Ecrã (portáteis)
    ecra_match = re.search(r'(\d+(?:\.\d+)?)"', texto)
    if ecra_match and specs.get("tipo") == "Portátil":
        specs["ecra_polegadas"] = ecra_match.group(1)

    # Resolução ecrã — só para portáteis e AIO (desktops não têm ecrã)
    if specs.get("tipo") in ("Portátil", "Tudo-em-Um"):
        if "Full HD" in texto or "1920x1080" in texto or "FHD" in texto:
            specs["resolucao"] = "Full HD"
        elif "HD+" in texto or "1600x900" in texto:
            specs["resolucao"] = "HD+"
        elif re.search(r"\b4K\b", texto):
            specs["resolucao"] = "4K"

    # Sistema operativo
    if "Windows 11 Pro" in texto:
        specs["sistema_operativo"] = "Windows 11 Pro"
    elif "Windows 11" in texto:
        specs["sistema_operativo"] = "Windows 11"
    elif "Windows 10 Pro" in texto:
        specs["sistema_operativo"] = "Windows 10 Pro"
    elif "Windows 10" in texto:
        specs["sistema_operativo"] = "Windows 10"
    elif re.search(r"[Ss]em sistema|[Ss]in sistema|[Ff]reeDOS", texto):
        specs["sistema_operativo"] = "Sem sistema operativo"

    # Grau
    if re.search(r"[Gg]r[ao][du][oa]\s*A|GRAU A|GRADO A", texto):
        specs["grau"] = "A"
    elif re.search(r"[Gg]r[ao][du][oa]\s*B|GRAU B|GRADO B", texto):
        specs["grau"] = "B"

    # Teclado PT (vem do CSV simples cruzado)
    return specs

# ─────────────────────────────────────────────
# CÁLCULO DE PREÇO
# ─────────────────────────────────────────────

def calcular_preco(precio_es: str, familia: str) -> float:
    """
    Calcula preço de venda (sem IVA PT).
    precio_es = PVP espanhol com IVA 21%
    """
    try:
        pvp_es = float(precio_es)
    except (ValueError, TypeError):
        return None

    custo = (pvp_es / IVA_ES) * (1 - DESCONTO_DIGINOVA)
    margem_euros = custo * MARGEM

    # Margem mínima por grupo
    grupo = FAMILIA_GRUPO.get(familia.strip(), "componentes")
    minimo = MARGEM_MINIMA[grupo]
    margem_euros = max(margem_euros, minimo)

    return round(custo + margem_euros, 2)

# ─────────────────────────────────────────────
# CARREGAR CSVs
# ─────────────────────────────────────────────

def carregar_csv_presta(filepath_ou_url: str) -> list:
    """Carrega o CSV PrestaShop da Diginova."""
    if filepath_ou_url.startswith("http"):
        resp = requests.get(filepath_ou_url, timeout=60)
        resp.encoding = "latin1"
        content = resp.text
        reader = csv.DictReader(StringIO(content), delimiter="|")
    else:
        f = open(filepath_ou_url, encoding="latin1")
        reader = csv.DictReader(f, delimiter="|")

    rows = [r for r in reader if r.get("REFERENCIA")]
    print(f"  CSV Presta: {len(rows)} produtos")
    return rows

def carregar_csv_simples(filepath_ou_url: str) -> dict:
    """Carrega o CSV simples e retorna dict {referencia: row}."""
    if filepath_ou_url.startswith("http"):
        resp = requests.get(filepath_ou_url, timeout=60)
        resp.encoding = "latin1"
        content = resp.text
        reader = csv.DictReader(StringIO(content), delimiter=";")
    else:
        f = open(filepath_ou_url, encoding="latin1")
        reader = csv.DictReader(f, delimiter=";")

    rows = {r.get("Referencia", "").strip(): r for r in reader if r.get("Referencia")}
    print(f"  CSV Simples: {len(rows)} produtos")
    return rows

# ─────────────────────────────────────────────
# SUPABASE
# ─────────────────────────────────────────────

def supabase_upsert(produtos: list, fornecedor: str = "diginova"):
    """Envia produtos para a edge function que faz upsert no Supabase."""
    headers = {
        "x-import-key": IMPORT_API_KEY,
        "Content-Type": "application/json",
    }

    batch_size = 100
    total = len(produtos)
    inseridos = 0

    for i in range(0, total, batch_size):
        batch = produtos[i:i+batch_size]
        resp = requests.post(
            IMPORT_URL,
            headers=headers,
            json={"fornecedor": fornecedor, "produtos": batch},
            timeout=60,
        )
        if resp.status_code == 200:
            result = resp.json()
            inseridos += result.get("count", len(batch))
            print(f"  ✅ Upsert {i+1}-{min(i+batch_size, total)}/{total}")
        else:
            print(f"  ❌ Erro lote {i}: {resp.status_code} — {resp.text[:200]}")
        time.sleep(0.3)

    return inseridos

def marcar_inactivos(referencias_activas: list, fornecedor: str = "diginova"):
    """Envia lista de SKUs activos para a edge function marcar inactivos."""
    headers = {
        "x-import-key": IMPORT_API_KEY,
        "Content-Type": "application/json",
    }
    resp = requests.post(
        IMPORT_URL,
        headers=headers,
        json={"fornecedor": fornecedor, "skus_activos": referencias_activas, "action": "marcar_inactivos"},
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

def main(usar_ficheiros_locais=False):
    print("=" * 60)
    print("VRCF — Importação Diginova")
    print("=" * 60)

    # 1. Carregar CSVs
    print("\n📥 A carregar CSVs...")
    if usar_ficheiros_locais:
        rows_presta = carregar_csv_presta("diginova_presta_50181.csv")
        rows_simples = carregar_csv_simples("diginova_59931.csv")
    else:
        rows_presta = carregar_csv_presta(URL_CSV_PRESTA)
        rows_simples = carregar_csv_simples(URL_CSV_SIMPLES)

    # 2. Processar produtos
    print("\n⚙️  A processar produtos...")
    produtos = []
    referencias_activas = []
    traduzidos_claude = 0

    for row in rows_presta:
        ref = row.get("REFERENCIA", "").strip()
        if not ref:
            continue

        nome_es = row.get("NOMBREARTICULO", "").strip()
        desc_es = row.get("DESCRIPCION", "").strip()
        marca = row.get("MARCA", "").strip()
        familia = row.get("FAMILIA", "").strip()
        categoria = row.get("CATEGORIA", "").strip()
        precio = row.get("PRECIO", "0").strip()
        stock_raw = row.get("STOCK", "0").strip()
        imagem = row.get("IMAGEN", "").strip()

        # Preço
        preco = calcular_preco(precio, familia)
        if preco is None:
            print(f"  ⚠ Preço inválido: {ref}")
            continue

        # Stock
        try:
            stock_qty = int(stock_raw)
        except ValueError:
            stock_qty = 0

        if stock_qty >= 5:
            stock_status = "high"
        elif stock_qty > 0:
            stock_status = "low"
        else:
            stock_status = "out"

        sob_encomenda = stock_qty == 0

        # Teclado PT (do CSV simples)
        simples = rows_simples.get(ref, {})
        teclado = simples.get("Teclado personalizable", "").strip().upper()
        tem_teclado_pt = teclado == "PT"

        # Tradução — primeiro dicionário
        nome_pt_dict = traduzir_texto(nome_es)
        # Se o resultado ainda tem muitas palavras espanholas, usa Claude
        palavras_es = ["Ordenador", "Portátiles", "Sobremesa", "Disco Duro", "Memorias", "Procesador"]
        precisa_claude = any(p in nome_pt_dict for p in palavras_es)

        if precisa_claude and ANTHROPIC_KEY:
            resultado = traduzir_com_claude(nome_es, desc_es)
            nome_pt = resultado.get("nome_pt", nome_pt_dict)
            desc_pt = resultado.get("descricao_pt", traduzir_texto(desc_es))
            traduzidos_claude += 1
            time.sleep(0.3)  # rate limit
        else:
            nome_pt = nome_pt_dict
            desc_pt = traduzir_texto(desc_es)

        # Adicionar info teclado ao nome se PT
        if tem_teclado_pt and "teclado PT" not in nome_pt.lower():
            nome_pt = nome_pt.rstrip() + " (Teclado PT)"

        # Especificações
        specs = extrair_specs(nome_es, desc_es, familia)
        if tem_teclado_pt:
            specs["teclado"] = "PT"

        # Slug único
        slug_base = slugify(f"{marca}-{ref}", separator="-")

        # Traduzir família e categoria
        familia_pt = traduzir_texto(familia)
        categoria_pt = traduzir_texto(categoria) if categoria else "Computadores"

        produto = {
            "sku": ref,
            "slug": slug_base,
            "name": nome_pt,
            "short_description": nome_pt,
            "description": desc_pt,
            "brand_id": None,           # será mapeado pelo admin depois
            "price": preco,
            "stock_status": stock_status,
            "sob_encomenda": sob_encomenda,
            "include_in_catalog": True,
            "featured": False,
            "show_on_homepage": False,
            "image_url": imagem,
            "fornecedor": "diginova",
            "mundo": "escritorio",
            "category": categoria_pt,
            "especificacoes": specs,
            "destaques": [],
        }

        produtos.append(produto)
        referencias_activas.append(ref)

    print(f"\n  Total processados: {len(produtos)}")
    print(f"  Traduzidos via Claude: {traduzidos_claude}")
    print(f"  Com teclado PT: {sum(1 for p in produtos if p['especificacoes'].get('teclado') == 'PT')}")
    print(f"  Sem stock: {sum(1 for p in produtos if p['stock_status'] == 'out')}")

    # 3. Upsert no Supabase
   if not IMPORT_API_KEY:
        print("\n⚠️  IMPORT_API_KEY não definida — a guardar em ficheiro local para teste")
        with open("diginova_produtos_preview.json", "w", encoding="utf-8") as f:
            json.dump(produtos[:5], f, ensure_ascii=False, indent=2)
        print("  Ficheiro diginova_produtos_preview.json criado com 5 exemplos")
        return

    print("\n📤 A fazer upsert no Supabase...")
    inseridos = supabase_upsert(produtos)

    # 4. Marcar inactivos
    print("\n🗑️  A verificar produtos descontinuados...")
    marcar_inactivos(referencias_activas)

    print(f"\n✅ Importação concluída — {inseridos} produtos actualizados")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    # Passar argumento "local" para usar ficheiros locais em vez de download
    usar_local = len(sys.argv) > 1 and sys.argv[1] == "local"
    main(usar_ficheiros_locais=usar_local)
