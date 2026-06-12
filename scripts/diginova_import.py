#!/usr/bin/env python3
"""
Script de importação Diginova → Supabase (VRCF Catálogo)
Versão 2 — extracção máxima de dados

Requer:
  pip install requests python-slugify

Variáveis de ambiente:
  IMPORT_URL        → URL da edge function
  IMPORT_API_KEY    → chave secreta definida no Lovable
  ANTHROPIC_API_KEY → para tradução via Claude (opcional)
"""

import csv, re, os, json, time, requests
from io import StringIO
from slugify import slugify

# ─────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────
IMPORT_URL     = os.environ.get("IMPORT_URL", "https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/import-products")
IMPORT_API_KEY = os.environ.get("IMPORT_API_KEY", "")
ANTHROPIC_KEY  = os.environ.get("ANTHROPIC_API_KEY", "")

URL_CSV_PRESTA  = "https://www.diginova.es/csv_presta.php?c=14489&u=spacedata25&p=C16BA86B32F5E58EB92DBE7D2B2F421F"
URL_CSV_SIMPLES = "https://www.diginova.es/csv.php?c=14489&u=spacedata25&p=C16BA86B32F5E58EB92DBE7D2B2F421F"

IVA_ES             = 1.21
DESCONTO_DIGINOVA  = 0.0
MARGEM             = 0.15

MARGEM_MINIMA = {
    "equipamentos": 50.0,
    "monitores":    20.0,
    "componentes":   0.0,
}

FAMILIA_GRUPO = {
    "Portátiles I3": "equipamentos", "Portátiles I5": "equipamentos",
    "Portátiles I7": "equipamentos", "Portátiles AMD": "equipamentos",
    "Portátiles Workstation": "equipamentos", "Otros Portátiles": "equipamentos",
    "Sobremesas SFF": "equipamentos", "Mini pc/Tiny": "equipamentos",
    "Torres": "equipamentos", "All in One": "equipamentos",
    "Servidores": "equipamentos", "Apple": "equipamentos",
    "TPV": "equipamentos", "Informática Premium": "equipamentos",
    'Monitores 22"': "monitores", 'Monitores 23"': "monitores",
    'Monitores 24"': "monitores", "Impresoras / Escáneres": "monitores",
    "Tablets": "monitores", "Otros": "componentes",
}

# Categoria → Família (estrutura final PT)
CATEGORIA_MAP = {
    "Portátiles I3":          ("Portáteis",   "Portáteis Intel i3"),
    "Portátiles I5":          ("Portáteis",   "Portáteis Intel i5"),
    "Portátiles I7":          ("Portáteis",   "Portáteis Intel i7"),
    "Portátiles AMD":         ("Portáteis",   "Portáteis AMD"),
    "Portátiles Workstation": ("Portáteis",   "Portáteis Workstation"),
    "Otros Portátiles":       ("Portáteis",   "Outros Portáteis"),
    "Sobremesas SFF":         ("Desktops",    "Desktops SFF"),
    "Mini pc/Tiny":           ("Desktops",    "Mini PC / Tiny"),
    "Torres":                 ("Desktops",    "Desktops Torre"),
    "All in One":             ("Tudo-em-Um",  "Tudo-em-Um"),
    "Servidores":             ("Servidores",  "Servidores"),
    'Monitores 22"':          ("Monitores",   'Monitores 22"'),
    'Monitores 23"':          ("Monitores",   'Monitores 23"'),
    'Monitores 24"':          ("Monitores",   'Monitores 24"'),
    "Apple":                  ("Apple",       "Apple"),
    "Impresoras / Escáneres": ("Impressoras", "Impressoras / Scanners"),
    "Tablets":                ("Tablets",     "Tablets"),
    "TPV":                    ("TPV",         "TPV"),
    "Informática Premium":    ("Informática Premium", "Informática Premium"),
    "Otros":                  ("Outros",      "Outros"),
}

LINK_ACESSORIOS_PT = "/escritorio?categoria=acessorios&familia=acessorios-portateis"

# ─────────────────────────────────────────────
# TRADUÇÕES
# ─────────────────────────────────────────────
TRADUCOES = {
    "Ordenador": "Computador", "Ordenadores": "Computadores",
    "Portátil": "Portátil", "Portátiles": "Portáteis",
    "Sobremesa": "Secretária", "Sobremesas": "Secretária",
    "Todo en Uno": "Tudo-em-Um", "Todo En Uno": "Tudo-em-Um",
    "Mini pc": "Mini PC", "Torre": "Torre", "Torres": "Torres",
    "Servidor": "Servidor", "Servidores": "Servidores",
    "Procesador": "Processador", "Disco Duro": "Disco Rígido",
    "Disco duro": "Disco Rígido", "Memorias": "Memória",
    "Memoria": "Memória", "Gráfica": "Placa Gráfica",
    "Pantalla": "Ecrã", "Batería": "Bateria",
    "Lector": "Leitor", "Grabador": "Gravador",
    "Lector/Grabador": "Leitor/Gravador",
    "Conexiones": "Ligações", "Conectividad": "Conectividade",
    "Wifi": "Wi-Fi", "Núcleos": "Núcleos", "núcleos": "núcleos",
    "SSD-NVMe": "SSD NVMe", "SSD-SATA": "SSD SATA",
    "Preinstalado": "Pré-instalado", "preinstalado": "pré-instalado",
    "Sin sistema": "Sem sistema operativo", "Sin Sistema": "Sem sistema operativo",
    "GRADO A": "GRAU A", "GRADO B": "GRAU B",
    "Grado A": "Grau A", "Grado B": "Grau B",
    "grado": "grau", "Grado": "Grau",
    "con teclado": "com teclado", "Con teclado": "Com teclado",
    "Reacondicionado": "Recondicionado", "reacondicionado": "recondicionado",
    "Varias marcas": "Várias marcas",
    "según disponibilidad": "conforme disponibilidade",
    "zócalos": "slots", "zócalo": "slot",
    "Equipos comprobados y testeados completamente": "Equipamento testado e verificado completamente",
    "Pueden tener signos de desgaste o arañazos en su carcasa, o pantalla, pero son completamente funcionales":
        "Pode apresentar sinais de desgaste ou riscos na carcaça ou ecrã, mas é completamente funcional",
    "Pueden tener signos de desgaste o arañazos en su carcasa, pero son completamente funcionales":
        "Pode apresentar sinais de desgaste ou riscos na carcaça, mas é completamente funcional",
    "signos de desgaste": "sinais de desgaste",
    "arañazos": "riscos", "carcasa": "carcaça",
    "pero son completamente funcionales": "mas são completamente funcionais",
    "Pueden tener": "Pode apresentar", "pueden tener": "pode apresentar",
    "Estos equipos NÃO incluyen licencia de Windows": "Este equipamento NÃO inclui licença de Windows",
    "Estos equipos NO incluyen licencia de Windows": "Este equipamento NÃO inclui licença de Windows",
    "Estos equipos no incluyen licencia de Windows": "Este equipamento não inclui licença de Windows",
    "Estos equipos incluyen licencia de": "Este equipamento inclui licença de",
    "Estos equipos incluyen licencia": "Este equipamento inclui licença de",
    "incluyen licencia": "inclui licença",
    "Estos equipos": "Este equipamento", "estos equipos": "este equipamento",
    "no ampliable": "não ampliável", "No ampliable": "Não ampliável",
    "zocalos": "slots", "zocalo": "slot",
    "Webcam": "Webcam", "Bluetooth": "Bluetooth",
    "Ranuras": "Ranhuras", "ranuras": "ranhuras",
    "unidad óptica": "unidade óptica",
    "lector de tarjetas": "leitor de cartões",
    "huella dactilar": "impressão digital",
    "puertos": "portas", "puerto": "porta",
    "Puertos": "Portas", "Puerto": "Porta",
    "velocidad": "velocidade", "frecuencia": "frequência",
    "caché": "cache", "rendimiento": "desempenho",
    "subprocesos": "threads",
    "Ordenador de sobremesa": "Computador de secretária",
    "Panel": "Painel", "frontales": "frontais",
    "Especificaciones:": "Especificações:",
    "Pulgadas": "Polegadas", "pulgadas": "polegadas",
    "Táctil": "Táctil", "táctil": "táctil",
    "con teclado Portugués": "com teclado Português",
    "con teclado Portugues": "com teclado Português",
    "con teclado castellano": "com teclado castelhano",
    "kit portugués integrado": "kit português integrado",
    "kit castellano integrado": "kit castelhano integrado",
    "tecl. num. portugués": "tecl. num. português",
    "tecl. num. castellano": "tecl. num. castelhano",
    "tecl. portugués": "tecl. português",
    "Teclado en Portugués": "Teclado em Português",
    "teclado internacional": "teclado internacional",
    "Especificaciones": "Especificações",
    "Marca": "Marca", "Procesador": "Processador",
    "Negro": "Preto", "Plata": "Prateado",
    "SI": "SIM", "No.": "Não",
    "Pulgadas LED": "Polegadas LED",
}

def traduzir_texto(texto: str) -> str:
    for es, pt in TRADUCOES.items():
        texto = texto.replace(es, pt)
    return texto

def limpar_html(html: str) -> str:
    text = re.sub(r'<br[^>]*>', ' ', html)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'  +', ' ', text)
    return text.strip()

# ─────────────────────────────────────────────
# EXTRACÇÃO DE SPECS — MÁXIMO
# ─────────────────────────────────────────────
def extrair_specs(nome_es: str, desc_es: str, familia: str, teclado_personalizavel: bool) -> tuple:
    """
    Extrai todas as specs possíveis.
    Retorna (specs_dict, teclado_valor, teclado_nota)
    """
    specs = {}
    texto = f"{nome_es} {desc_es}".lower()
    texto_orig = f"{nome_es} {desc_es}"

    # ── TIPO ──
    fl = familia.lower()
    nl = nome_es.lower()
    if any(x in fl for x in ["all in one", "todo en uno"]) or "todo en uno" in nl or "tudo-em-um" in nl:
        specs["tipo"] = "Tudo-em-Um"
    elif any(x in fl for x in ["portátiles", "portatiles"]):
        specs["tipo"] = "Portátil"
    elif "servidor" in fl:
        specs["tipo"] = "Servidor"
    elif any(x in fl for x in ["sff", "sobremesa", "torre", "mini pc", "tiny"]):
        specs["tipo"] = "Desktop"

    # ── PROCESSADOR ──
    proc = re.search(
        r"(Intel Core (?:i\d[-\s]?\d{4,5}[A-Z]*|Ultra \d+)|AMD Ryzen \d \d{4}[A-Z]*|Intel Celeron \w+|Intel Pentium \w+|Intel Xeon \w+|AMD EPYC \w+|AMD Athlon \w+)",
        texto_orig, re.IGNORECASE)
    if proc:
        specs["processador"] = proc.group(1).strip()

    # ── GERAÇÃO ──
    gen = re.search(r"i\d[-\s]?(\d{1,2})\d{3}", texto_orig, re.IGNORECASE)
    if gen:
        specs["geracao"] = gen.group(1) + "ª Gen"

    # ── PLACA GRÁFICA ──
    graf = re.search(r"Gr[áa]fica\s{2,}(.+?)(?:<br|·|\n|$)", texto_orig, re.IGNORECASE)
    if not graf:
        graf = re.search(r"(NVIDIA\s+\w[\w\s]+?\d+GB|Intel\s+(?:UHD|HD|Iris\s+\w+)\s+\w+|AMD\s+Radeon\s+\w+)", texto_orig, re.IGNORECASE)
    if graf:
        val = graf.group(1).strip().rstrip('<').strip()
        if val:
            specs["grafica"] = val[:60]

    # ── RAM ──
    ram = re.search(r"(\d+)\s*GB\s+(DDR\d|LPDDR\d|SDRAM)", texto_orig, re.IGNORECASE)
    if ram:
        specs["ram_gb"] = ram.group(1)
        specs["ram_tipo"] = ram.group(2).upper()

    # Slots RAM
    slots = re.search(r"\((\d+)\s*(?:z[oó]calos|slots|slot)\)", texto, re.IGNORECASE)
    if slots:
        specs["ram_slots"] = slots.group(1)
        specs["ram_ampliavel"] = "Sim"
    slot_livre = re.search(r"\((\d+)\s*(?:z[oó]calo|slot)\s+libre\)", texto, re.IGNORECASE)
    if slot_livre:
        specs["ram_slot_livre"] = slot_livre.group(1)
        specs["ram_ampliavel"] = "Sim"
    if re.search(r"no ampliable|não ampliável", texto, re.IGNORECASE):
        specs["ram_ampliavel"] = "Não"

    # ── ARMAZENAMENTO ──
    ssd = re.search(r"(\d+)\s*(?:GB|TB)\s+SSD[-\s]?(NVMe|SATA)?", texto_orig, re.IGNORECASE)
    hdd = re.search(r"(\d+)\s*(?:GB|TB)\s+HDD", texto_orig, re.IGNORECASE)
    if ssd:
        specs["armazenamento_gb"] = ssd.group(1)
        specs["armazenamento_tipo"] = f"SSD {(ssd.group(2) or 'SATA').upper()}"
    elif hdd:
        specs["armazenamento_gb"] = hdd.group(1)
        specs["armazenamento_tipo"] = "HDD"

    # ── ECRã ──
    ecra = re.search(r'(\d+(?:[.,]\d+)?)\s*"', texto_orig)
    if ecra and specs.get("tipo") in ("Portátil", "Tudo-em-Um"):
        specs["ecra_polegadas"] = ecra.group(1).replace(",", ".")

    if re.search(r"FHD|Full HD|1920.?x.?1080", texto_orig, re.IGNORECASE):
        specs["resolucao"] = "Full HD"
    elif re.search(r"HD\+|1600.?x.?900", texto_orig, re.IGNORECASE):
        specs["resolucao"] = "HD+"
    elif re.search(r"\b4K\b|UHD|3840.?x.?2160", texto_orig, re.IGNORECASE):
        specs["resolucao"] = "4K"
    elif re.search(r"\bHD\b|1280.?x.?720", texto_orig, re.IGNORECASE):
        specs["resolucao"] = "HD"

    if re.search(r"t[aá]ctil|touch|táctil", texto, re.IGNORECASE):
        specs["tactil"] = "Sim"

    # ── SISTEMA OPERATIVO ──
    if "Windows 11 Pro" in texto_orig:
        specs["sistema_operativo"] = "Windows 11 Pro"
    elif "Windows 11 Home" in texto_orig:
        specs["sistema_operativo"] = "Windows 11 Home"
    elif "Windows 11" in texto_orig:
        specs["sistema_operativo"] = "Windows 11"
    elif "Windows 10 Pro" in texto_orig:
        specs["sistema_operativo"] = "Windows 10 Pro"
    elif "Windows 10" in texto_orig:
        specs["sistema_operativo"] = "Windows 10"
    elif re.search(r"Chrome OS|ChromeOS", texto_orig, re.IGNORECASE):
        specs["sistema_operativo"] = "Chrome OS"
    elif re.search(r"sin sistema|sem sistema|FreeDOS", texto_orig, re.IGNORECASE):
        specs["sistema_operativo"] = "Sem sistema operativo"

    # ── GRAU ──
    if re.search(r"GRAU\s*A|GRADO\s*A", texto_orig):
        specs["grau"] = "A"
    elif re.search(r"GRAU\s*B|GRADO\s*B", texto_orig):
        specs["grau"] = "B"

    # ── LEITOR/GRAVADOR ──
    leit = re.search(r"Lector/Grabador\s{2,}([^\.<]+)", texto_orig, re.IGNORECASE)
    if leit:
        val = re.sub(r"<[^>]+>", "", leit.group(1)).strip().upper()
        if any(x in val for x in ("NO", "NÃO", "NAO")):
            specs["leitor_gravador"] = "Não"
        elif any(x in val for x in ("DVD", "SI", "SIM", "YES", "LEITOR")):
            specs["leitor_gravador"] = "DVD"
        else:
            specs["leitor_gravador"] = "Não"

    # ── WEBCAM ──
    wcam = re.search(r"Webcam\s{2,}(\S+)", texto_orig, re.IGNORECASE)
    if wcam:
        val = wcam.group(1).strip().upper()
        specs["webcam"] = "Sim" if val in ("SI", "SIM", "YES") else "Não"
    elif "webcam" in texto:
        specs["webcam"] = "Sim"

    # ── WIFI ──
    wifi = re.search(r"\bWifi\b\s{2,}(\S+)", texto_orig, re.IGNORECASE)
    if wifi:
        val = wifi.group(1).strip().upper()
        specs["wifi"] = "Sim" if val in ("SI", "SIM", "YES") else "Não"

    # ── BLUETOOTH ──
    bt = re.search(r"Bluetooth\s{2,}(\S+)", texto_orig, re.IGNORECASE)
    if bt:
        val = bt.group(1).strip().upper()
        specs["bluetooth"] = "Sim" if val in ("SI", "SIM", "YES") else "Não"

    # ── PORTAS ──
    portas_front = re.search(r"[Cc]onexiones frontales\s{2,}(.+?)(?:<br|·|\n|$)", texto_orig)
    if portas_front:
        specs["portas_frontais"] = portas_front.group(1).strip()[:100]

    portas_adic = re.search(r"[Cc]onexiones adicionales\s{2,}(.+?)(?:<br|·|\n|$)", texto_orig)
    if portas_adic:
        specs["portas"] = portas_adic.group(1).strip()[:150]
    else:
        portas = re.search(r"[Cc]onexiones\s{2,}(.+?)(?:<br|·|\n|$)", texto_orig)
        if portas:
            specs["portas"] = portas.group(1).strip()[:150]

    # ── COR ──
    cor = re.search(r"[Cc]olor\s{2,}(.+?)(?:<br|·|\n|$)", texto_orig)
    if cor:
        val = cor.group(1).strip()
        specs["cor"] = traduzir_texto(val)[:30]

    # ── TECLADO — só para portáteis e AIO ──
    if specs.get("tipo") in ("Portátil", "Tudo-em-Um"):
        texto_teclado = f"{nome_es} {desc_es}".lower()
        teclado_valor = None
        teclado_nota = None

        if any(x in texto_teclado for x in ["portugués", "portugues", "kit portugu", "tecl. num. portugu", "teclado em portugu", "teclado portugu"]):
            teclado_valor = "PT"
            teclado_nota = None
        elif any(x in texto_teclado for x in ["castellano", "kit castellano", "tecl. num. castellano"]):
            teclado_valor = "ES"
            teclado_nota = f"Teclado não português. Pode adquirir autocolantes PT para o seu teclado — ver em {LINK_ACESSORIOS_PT}"
        elif "teclado internacional" in texto_teclado:
            teclado_valor = "Internacional"
            teclado_nota = f"Teclado não português. Pode adquirir autocolantes PT para o seu teclado — ver em {LINK_ACESSORIOS_PT}"
        elif teclado_personalizavel:
            teclado_valor = "Personalizável"
            teclado_nota = "Teclado não PT. Possibilidade de colocar PT — contacte-nos para saber disponibilidade e valor."
        else:
            teclado_valor = "Internacional"
            teclado_nota = f"Teclado não português. Pode adquirir autocolantes PT para o seu teclado — ver em {LINK_ACESSORIOS_PT}"

        if teclado_valor:
            specs["teclado"] = teclado_valor
        if teclado_nota:
            specs["teclado_nota"] = teclado_nota

    return specs

# ─────────────────────────────────────────────
# CÁLCULO DE PREÇOS
# ─────────────────────────────────────────────
def calcular_precos(precio_es: str, familia: str) -> dict:
    try:
        pvp_es = float(precio_es)
    except (ValueError, TypeError):
        return None

    compra_sem_iva = round(pvp_es / IVA_ES, 2)
    compra_com_iva = round(pvp_es, 2)
    custo = round(compra_sem_iva * (1 - DESCONTO_DIGINOVA), 2)
    margem = custo * MARGEM
    grupo = FAMILIA_GRUPO.get(familia.strip(), "componentes")
    margem = max(margem, MARGEM_MINIMA[grupo])
    preco_venda = round(custo + margem, 2)

    return {
        "purchase_price":     compra_sem_iva,
        "purchase_price_vat": compra_com_iva,
        "price":              preco_venda,
    }

# ─────────────────────────────────────────────
# CARREGAR CSVs
# ─────────────────────────────────────────────
def carregar_csv_presta(src: str) -> list:
    if src.startswith("http"):
        r = requests.get(src, timeout=60)
        r.encoding = "latin1"
        reader = csv.DictReader(StringIO(r.text), delimiter="|")
    else:
        reader = csv.DictReader(open(src, encoding="latin1"), delimiter="|")
    rows = [r for r in reader if r.get("REFERENCIA")]
    print(f"  CSV Presta: {len(rows)} produtos")
    return rows

def carregar_csv_simples(src: str) -> dict:
    if src.startswith("http"):
        r = requests.get(src, timeout=60)
        r.encoding = "latin1"
        reader = csv.DictReader(StringIO(r.text), delimiter=";")
    else:
        reader = csv.DictReader(open(src, encoding="latin1"), delimiter=";")
    rows = {r.get("Referencia", "").strip(): r for r in reader if r.get("Referencia")}
    print(f"  CSV Simples: {len(rows)} produtos")
    return rows

# ─────────────────────────────────────────────
# EDGE FUNCTION
# ─────────────────────────────────────────────
def supabase_upsert(produtos: list, fornecedor: str = "diginova"):
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

def marcar_inactivos(skus: list, fornecedor: str = "diginova"):
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    resp = requests.post(IMPORT_URL, headers=headers,
                         json={"fornecedor": fornecedor, "skus_activos": skus, "action": "marcar_inactivos"}, timeout=30)
    if resp.status_code == 200:
        n = resp.json().get("inactivos", 0)
        print(f"  ⚠ {n} produtos desactivados" if n else "  ✅ Sem produtos a desactivar")
    else:
        print(f"  ⚠ Não foi possível verificar inactivos: {resp.status_code}")

# ─────────────────────────────────────────────
# TRADUÇÃO VIA CLAUDE
# ─────────────────────────────────────────────
def traduzir_com_claude(nome_es: str, desc_es: str) -> dict:
    if not ANTHROPIC_KEY:
        return {"nome_pt": traduzir_texto(nome_es), "descricao_pt": traduzir_texto(desc_es)}
    prompt = f"""Traduz do espanhol para português europeu (PT-PT).

NOME: {nome_es}
DESCRIÇÃO (HTML): {desc_es[:2000]}

Responde APENAS em JSON: {{"nome_pt": "...", "descricao_pt": "..."}}

Regras: termos técnicos em inglês (SSD, NVMe, DDR4, Wi-Fi, USB), português europeu, mantém HTML, Grau A/B, Tudo-em-Um."""
    try:
        r = requests.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": "claude-haiku-4-5-20251001", "max_tokens": 1000, "messages": [{"role": "user", "content": prompt}]},
            timeout=30)
        text = r.json()["content"][0]["text"].strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"  ⚠ Claude API: {e}")
        return {"nome_pt": traduzir_texto(nome_es), "descricao_pt": traduzir_texto(desc_es)}

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main(local=False):
    print("=" * 60)
    print("VRCF — Importação Diginova v2")
    print("=" * 60)

    print("\n📥 A carregar CSVs...")
    rows_presta  = carregar_csv_presta("diginova_presta_50181.csv" if local else URL_CSV_PRESTA)
    rows_simples = carregar_csv_simples("diginova_59931.csv" if local else URL_CSV_SIMPLES)

    print("\n⚙️  A processar produtos...")
    produtos = []
    refs_activas = []
    traduzidos_claude = 0

    for row in rows_presta:
        ref = row.get("REFERENCIA", "").strip()
        if not ref:
            continue

        nome_es  = row.get("NOMBREARTICULO", "").strip()
        desc_es  = row.get("DESCRIPCION", "").strip()
        marca    = row.get("MARCA", "").strip()
        familia  = row.get("FAMILIA", "").strip()
        precio   = row.get("PRECIO", "0").strip()
        stock_raw = row.get("STOCK", "0").strip()
        imagem   = row.get("IMAGEN", "").strip()

        precos = calcular_precos(precio, familia)
        if precos is None:
            continue

        # Stock
        try:
            stock_qty = int(stock_raw)
        except ValueError:
            stock_qty = 0
        stock_status = "high" if stock_qty >= 5 else ("low" if stock_qty > 0 else "on_request")
        sob_encomenda = stock_qty == 0

        # Teclado personalizável (CSV simples)
        simples = rows_simples.get(ref, {})
        teclado_pers = "personaliz" in simples.get("Teclado personalizable", "").lower()

        # Tradução
        nome_pt_dict = traduzir_texto(nome_es)
        palavras_es = ["Ordenador", "Portátiles", "Sobremesa", "Disco Duro", "Memorias", "Procesador"]
        if any(p in nome_pt_dict for p in palavras_es) and ANTHROPIC_KEY:
            resultado = traduzir_com_claude(nome_es, desc_es)
            nome_pt = resultado.get("nome_pt", nome_pt_dict)
            desc_pt = resultado.get("descricao_pt", traduzir_texto(desc_es))
            traduzidos_claude += 1
            time.sleep(0.3)
        else:
            nome_pt = nome_pt_dict
            desc_pt = traduzir_texto(desc_es)

        # Specs
        specs = extrair_specs(nome_es, desc_es, familia, teclado_pers)
        teclado_nota = specs.pop("teclado_nota", None)

        # Descrição limpa — só introdução
        cortes = ["Especificações:", "Especificaciones:", "· Marca", "·Marca"]
        desc_intro = desc_pt
        for corte in cortes:
            if corte in desc_pt:
                desc_intro = desc_pt[:desc_pt.index(corte)].strip()
                break
        desc_intro_limpa = re.sub(r'<[^>]+>', ' ', desc_intro)
        desc_intro_limpa = re.sub(r'  +', ' ', desc_intro_limpa).strip()
        if not desc_intro_limpa:
            desc_intro_limpa = "Equipamento recondicionado testado e verificado completamente."

        # Categoria e família PT
        cat_familia = CATEGORIA_MAP.get(familia.strip(), ("Computadores", familia))
        categoria_pt = cat_familia[0]
        familia_pt   = cat_familia[1]

        # Slug
        slug = slugify(f"{marca}-{ref}", separator="-")

        produto = {
            "sku":                ref,
            "slug":               slug,
            "name":               nome_pt,
            "short_description":  nome_pt,
            "description":        desc_intro_limpa,
            "brand_id":           None,
            "price":              precos["price"],
            "purchase_price":     precos["purchase_price"],
            "purchase_price_vat": precos["purchase_price_vat"],
            "stock_status":       stock_status,
            "sob_encomenda":      sob_encomenda,
            "include_in_catalog": True,
            "featured":           False,
            "show_on_homepage":   False,
            "image_url":          imagem,
            "weight":             float(row.get("PESO", 0) or 0),
            "fornecedor":         "diginova",
            "mundo":              "escritorio",
            "category":           categoria_pt,
            "family":             familia_pt,
            "brand":              marca,
            "especificacoes":     specs,
            "destaques":          [teclado_nota] if teclado_nota else [],
        }

        produtos.append(produto)
        refs_activas.append(ref)

    print(f"\n  Total processados: {len(produtos)}")
    print(f"  Traduzidos via Claude: {traduzidos_claude}")
    print(f"  Teclado PT: {sum(1 for p in produtos if p['especificacoes'].get('teclado') == 'PT')}")
    print(f"  Teclado ES: {sum(1 for p in produtos if p['especificacoes'].get('teclado') == 'ES')}")
    print(f"  Teclado Personalizável: {sum(1 for p in produtos if p['especificacoes'].get('teclado') == 'Personalizável')}")
    print(f"  Sem stock: {sum(1 for p in produtos if p['stock_status'] == 'on_request')}")

    if not IMPORT_API_KEY:
        print("\n⚠️  IMPORT_API_KEY não definida — a guardar preview local")
        with open("diginova_v2_preview.json", "w", encoding="utf-8") as f:
            json.dump(produtos[:3], f, ensure_ascii=False, indent=2)
        print("  Ficheiro diginova_v2_preview.json criado")
        return

    print("\n📤 A fazer upsert no Supabase...")
    inseridos = supabase_upsert(produtos)

    print("\n🗑️  A verificar produtos descontinuados...")
    marcar_inactivos(refs_activas)

    print(f"\n✅ Importação concluída — {inseridos} produtos actualizados")
    print("=" * 60)

if __name__ == "__main__":
    import sys
    main(local="local" in sys.argv)
