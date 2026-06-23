#!/usr/bin/env python3
"""
Script de importação Visiotech → Supabase (VRCF Catálogo)
Versão 2 — extracção máxima + price history + tiers

Requer:
  pip install requests python-slugify

Variáveis de ambiente:
  IMPORT_URL       → URL da edge function
  IMPORT_API_KEY   → chave secreta
"""

import csv, re, os, json, time, requests
from io import StringIO
from html import unescape
from slugify import slugify

# ─────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────
IMPORT_URL     = os.environ.get("IMPORT_URL", "https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/import-products")
IMPORT_API_KEY = os.environ.get("IMPORT_API_KEY", "")

URL_CSV = "https://www.visiotechsecurity.com/?option=com_csvgeneration&task=generate.generateCSV&token=4ac478b94365bdda557f071779349874&username=VT5771STW"

# Preços
MARCAS_PVP_DESCONTO = {"REYEE", "REYEE NETWORKS"}
FATOR_PVP_DESCONTO  = 0.75   # Reyee: PVP × 0.75

# Tiers de preço (percentagem de desconto sobre price)
DESCONTO_TIER2 = 0.10   # 10% desconto — clientes fidelizados
DESCONTO_TIER3 = 0.15   # 15% desconto — preço especial

# Limiar de variação de preço (não actualiza se variação < X%)
LIMIAR_VARIACAO = 0.05  # 5%

# Portes
PORTE_NORMAL   = 11.00  # fixo independente do nº de produtos
PORTE_ESPECIAL = None   # calculado no orçamento

# ─────────────────────────────────────────────
# MAPEAMENTO DE SPECS (params JSON → campo PT)
# ─────────────────────────────────────────────
PARAMS_MAP = {
    "tipo":                   "tipo",
    "resolucion-maxima":      "resolucao",
    "tipo-de-iluminacion":    "iluminacao",
    "tipo-iluminacion":       "iluminacao",
    "proteccion-ip":          "protecao_ip",
    "proteccion-ik":          "protecao_ik",
    "proteccion":             "protecao",
    "uso":                    "instalacao",
    "poe":                    "poe",
    "wifi":                   "wifi",
    "audio":                  "audio",
    "lente":                  "lente",
    "alcance-iluminacion":    "alcance_iluminacao",
    "alcance-de-iluminacion": "alcance_iluminacao",
    "almacenamiento_interno": "armazenamento_interno",
    "almacenamiento-interno": "armazenamento_interno",
    "comunicacion":           "comunicacao",
    "alimentacion":           "alimentacao",
    "gama":                   "gama",
    "colorvu":                "colorvu",
    "acusense":               "acusense",
    "lpr":                    "lpr",
    "face-detection":         "detecao_facial",
    "alarmas":                "alarmes",
    "tipo-de-dispositivo":    "tipo_dispositivo",
    "color":                  "cor",
    "wdr":                    "wdr",
    "marca":                  None,   # ignorar — já temos brand
    "categoria":              None,   # ignorar — já temos category
    "stock":                  None,   # ignorar

    # ── CCTV avançado ──
    "proteccion-anti-corrosion": "protecao_corrosao",
    "face-capture":              "captacao_facial",
    "motion-detection-20":       "detecao_movimento",
    "3-axis":                    "ajuste_3_eixos",
    "zoom-optico-ptz":           "zoom_ptz",
    "resolucion-max-grabacion":  "resolucao_max_gravacao",
    "resolucion_maxima":         "resolucao",
    "capacidad-de-grabacion":    "capacidade_gravacao",
    "tipo-de-camara":            "tipo_camara",
    "tipo-de-deteccion":         "tipo_detecao",
    "entradas-y-salidas-de-audio": "audio_io",
    "microfono-altavoz":         "microfone_altavoz",
    "hdd":                       "baias_hdd",
    "movimiento-remoto":         "movimento_remoto",

    # ── Networking ──
    "n-puertos-totales":              "portas_totais",
    "velocidad-maxima-puertos-uplink": "velocidade_uplink",
    "velocidad-maxima-puertos-lan":    "velocidade_lan",
    "n-puertos-poe-8023af-at-30w":     "portas_poe",
    "poe-total":                       "poe_total",
    "entradas-poe":                    "entradas_poe",
    "comunicacion-inalambrica":        "comunicacao_sem_fios",
    "comunicacion-principal":          "comunicacao_principal",
    "requiere-gateway-hub":            "requer_gateway",

    # ── Cabos / Acessórios ──
    "categoria-velocidad":   "categoria_cabo",
    "longitud":              "comprimento",
    "tipo-de-cable":         "tipo_cabo",
    "tipo-de-conductor":     "tipo_condutor",
    "apantallamiento":       "blindagem",
    "modo-pasillo":          "modo_corredor",

    # ── Energia ──
    "alimentacion-poc":  "alimentacao_poc",
    "potencia":          "potencia",
    "tension-salida":    "tensao_saida",
    "capacidad":         "capacidade",

    # ── Instalação / Ambiente ──
    "instalacion":        "tipo_montagem",
    "exterior-interior":  "ambiente",
    "escenario-de-instalacion": "cenario_instalacao",
    "grado":              "grau_resistencia",

    # ── Controlo de Acessos ──
    "tecnologia-rfid":   "tecnologia_rfid",
}

# Valores a normalizar
INSTALACAO_MAP = {
    "Interior": "Interior", "Exterior": "Exterior",
    "Int/Ext": "Interior/Exterior", "interior": "Interior", "exterior": "Exterior",
}


# ─────────────────────────────────────────────
# MAPEAMENTO CATEGORIA (3 níveis)
# Nível 1 (category) ← classify_category(category_parent, category, sku)
# Nível 2 (family)   ← family_for(category_parent, category, brand_values)
# Nível 3 (brand)    ← campo brand
# ─────────────────────────────────────────────
CATEGORIA_MAP = {
    # CCTV IP
    'Hikvision': 'CCTV IP', 'Ajax CCTV': 'CCTV IP', 'Safire Smart': 'CCTV IP',
    'Uniview - Uniarch': 'CCTV IP', 'X-Security': 'CCTV IP', 'Câmaras': 'CCTV IP',
    'NVRs Profissionais': 'CCTV IP', 'IP Home': 'CCTV IP', 'Imou': 'CCTV IP',
    'Descodificadores': 'CCTV IP', 'Kits Profissionais': 'CCTV IP', 'HiLook': 'CCTV IP',
    'Soluções IP': 'CCTV IP', 'Eufy': 'CCTV IP', 'Ezviz': 'CCTV IP', 'VicoHome': 'CCTV IP',
    'Térmicas': 'CCTV IP', 'Temperatura Corporal Febre': 'CCTV IP', 'EASY-P': 'CCTV IP',
    # CCTV Analógico
    'CCTV analógico': 'CCTV Analógico', 'Câmaras AHD': 'CCTV Analógico', 'XVRs': 'CCTV Analógico',
    # Analítica de Vídeo
    'VCA Technology': 'Analítica de Vídeo',
    # Intrusão
    'Intrusão': 'Intrusão', 'Ajax Wireless': 'Intrusão', 'Detectores Cablados': 'Intrusão',
    'Pyronix Cablado': 'Intrusão', 'Hikvision - Pyronix': 'Intrusão', 'Chuango': 'Intrusão',
    'DMTech': 'Intrusão', 'Jade Bird': 'Intrusão', 'Sopras': 'Intrusão', 'Smanos': 'Intrusão',
    'Home8': 'Intrusão', 'Autónomos': 'Intrusão', 'Antirroubo': 'Intrusão', 'Servicios': 'Intrusão',
    # Incêndio e Evacuação
    'Wizmart': 'Incêndio e Evacuação',
    # Controlo de Presença/Acessos (unificado)
    'ZKTeco': 'Controlo de Presença/Acessos', 'Anviz': 'Controlo de Presença/Acessos',
    'EasyClocking': 'Controlo de Presença/Acessos', 'Fechaduras': 'Controlo de Presença/Acessos',
    'Torniquetes': 'Controlo de Presença/Acessos', 'Estacionamento': 'Controlo de Presença/Acessos',
    'Hotel': 'Controlo de Presença/Acessos', 'Hysoon': 'Controlo de Presença/Acessos',
    'Yale': 'Controlo de Presença/Acessos', 'iLOQ': 'Controlo de Presença/Acessos',
    'Virdi': 'Controlo de Presença/Acessos',
    'Contagem e Controlo de lotação máxima permitida': 'Controlo de Presença/Acessos',
    # Videoporteiros
    'Akuvox': 'Videoporteiros', 'Akubela': 'Videoporteiros',
    # Networking
    'Networking': 'Networking', 'Switching': 'Networking', 'Routing': 'Networking',
    'NGFW': 'Networking', 'Comunicação e redes': 'Networking', 'Wireless': 'Networking',
    # Mobilidade
    'Trackers': 'Mobilidade', 'Equipamento de bordo': 'Mobilidade',
    # Audiovisuais
    'Monitores': 'Audiovisuais', 'Videoconferencia': 'Audiovisuais',
    'Soluções LED': 'Audiovisuais', 'Gestão de Sinal': 'Audiovisuais',
    # Energia
    'Alimentação': 'Energia', 'Baterias': 'Energia', 'Instalações solares': 'Energia',
    'Energía portátil': 'Energia', 'Veículos eléctricos': 'Energia',
    # Smart Home
    'Smart Home': 'Smart Home', 'AQARA': 'Smart Home', 'Shelly': 'Smart Home', 'Fibaro': 'Smart Home',
    # Smartphone e Escritório
    'Smartphone e escritório': 'Smartphone e Escritório', 'Periféricos': 'Smartphone e Escritório',
    # Outdoor
    'Câmara de vigilância para caça': 'Outdoor',
    # Acessórios IT e Segurança
    'Acessórios IT e Segurança': 'Acessórios IT e Segurança', 'Acessórios': 'Acessórios IT e Segurança',
    'Suportes para Câmaras': 'Acessórios IT e Segurança', 'Adaptador de encaixe (clip-on)': 'Acessórios IT e Segurança',
    'ONVIF': 'Acessórios IT e Segurança', 'Software': 'Acessórios IT e Segurança',
    'Ferramentas': 'Acessórios IT e Segurança', 'Discos rígidos e memórias': 'Acessórios IT e Segurança',
    'Saúde': 'Acessórios IT e Segurança',
    # Sonorização e Áudio
    'Sonorização e áudio': 'Sonorização e Áudio',
    # Promoções / Merchandising / Outlet
    'Promoções': 'Promoções', 'Merchandising': 'Merchandising', '': 'Outlet',
}

# Overrides por (category_parent, category) — casos em que category_parent
# por si só não chega para determinar a categoria correcta (ex: Videoporteiros
# vendidos sob category_parent="Hikvision"/"Safire Smart"/"X-Security").
CATEGORIA_OVERRIDES = {
    ('Hikvision', 'Comunidades 2 Fios'): 'Videoporteiros',
    ('Hikvision', 'Kits'):               'Videoporteiros',
    ('Hikvision', 'Monitores'):          'Videoporteiros',
    ('Hikvision', 'Placas'):             'Videoporteiros',
    ('Safire Smart', 'Monitores'):       'Videoporteiros',
    ('Safire Smart', 'Placas'):          'Videoporteiros',
    ('X-Security', 'Placas'):            'Videoporteiros',
    ('Eufy', 'Robôs aspiradores'):       'Robótica',
    ('Imou', 'Smarthome'):               'Smart Home',
}

# A "linha Safire" (terminais/fechaduras/teclados/videoporteiros SF-VI*)
# precisa de regras próprias por subcategoria.
SAFIRE_CAT_MAP = {
    'Terminais':           'Controlo de Presença/Acessos',
    'Teclados autónomos':  'Controlo de Presença/Acessos',
    'Fechaduras':          'Controlo de Presença/Acessos',
    'Acessórios':          'Controlo de Presença/Acessos',
    'Antirroubo':          'Intrusão',
    'Monitores':           'Videoporteiros',
    'Placas':              'Videoporteiros',
}

# Prefixos de SKU Hikvision que indicam acessórios de videoporteiro
# (cabos/teclados/peças de DS-KD/DS-KV/DS-KAB...) em vez de controlo de acessos.
INTERCOM_PREFIXES = ('DS-KAB', 'DS-KV', 'DS-KDM', 'DS-KD-', 'DS-KD8003')


def classify_category(category_parent: str, category: str, sku: str) -> str:
    """Determina a categoria de Nível 1 (uma das 21 categorias)."""
    cp = (category_parent or "").strip()
    cat = (category or "").strip()

    if (cp, cat) in CATEGORIA_OVERRIDES:
        return CATEGORIA_OVERRIDES[(cp, cat)]

    if cp == 'Hikvision' and cat in ('Controladoras', 'Leitores', 'Autónomos', 'Software'):
        return 'Controlo de Presença/Acessos'
    if cp == 'Hikvision' and cat == 'Acessórios':
        if any(sku.startswith(p) for p in INTERCOM_PREFIXES):
            return 'Videoporteiros'
        return 'Controlo de Presença/Acessos'

    if cp == 'Safire':
        return SAFIRE_CAT_MAP.get(cat, 'Controlo de Presença/Acessos')

    return CATEGORIA_MAP.get(cp, cp)


def family_for(category_parent: str, category: str, brand_values: set) -> str:
    """Determina a família de Nível 2.

    Quando 'category' é, na verdade, o nome de uma marca (ex: cp="Suportes
    para Câmaras", category="Hikvision"), usa-se 'category_parent' como
    família — é ele que descreve o tipo de produto nesses casos.
    """
    cp = (category_parent or "").strip()
    cat = (category or "").strip()
    if not cat:
        return cp or "Outros"
    if cat.upper() in brand_values:
        return cp or cat
    return cat


def tipo_for(params: dict) -> str:
    """Determina o Tipo de Nível 3 a partir do campo 'params' do feed.

    Usa 'tipo' (44.8% cobertura) como primeira opção, com
    'tipo-de-dispositivo' (mais usado em Networking) como fallback.
    Devolve "" se nenhum dos dois existir — produto fica sem Nível 3.
    """
    tipo = str(params.get("tipo") or "").strip()
    if tipo:
        return tipo
    return str(params.get("tipo-de-dispositivo") or "").strip()


# ─────────────────────────────────────────────
# FUNÇÕES DE EXTRACÇÃO
# ─────────────────────────────────────────────

def calcular_preco(row: dict) -> dict | None:
    """Calcula os 3 tiers de preço."""
    brand = row.get("brand", "").strip().upper()
    try:
        venda_sug = float(row.get("precio_venta_cliente_final", 0) or 0)
        pvp       = float(row.get("PVP", 0) or 0)
        compra    = float(row.get("precio_neto_compra", 0) or 0)
    except (ValueError, TypeError):
        return None

    if compra <= 0:
        return None

    # Preço base
    if brand in MARCAS_PVP_DESCONTO and pvp > 0:
        price = round(pvp * FATOR_PVP_DESCONTO, 2)
    elif venda_sug > 0:
        price = round(venda_sug, 2)
    else:
        price = round(compra * 1.35, 2)

    # Margem mínima de segurança: 35% sobre o preço de compra
    margem_minima = round(compra * 1.35, 2)
    if price < margem_minima:
        price = margem_minima

    return {
        "purchase_price":     round(compra, 2),
        "price":              price,
        "price_tier2":        round(price * (1 - DESCONTO_TIER2), 2),
        "price_tier3":        round(price * (1 - DESCONTO_TIER3), 2),
    }


def mapear_stock(stock: str, on_request: str) -> tuple:
    """Retorna (stock_status, sob_encomenda)."""
    sob = str(on_request).strip() == "1"
    s = stock.strip().lower()
    if sob: return "on_request", True
    if s == "high":   return "high", False
    if s == "medium": return "medium", False
    if s == "low":    return "low", False
    return "on_request", True


VALORES_VAZIOS = {
    "", "-", "n/a", "na", "não", "nao", "no",
    "não dispõe", "nao dispoe", "no disponible", "não disponível", "nao disponivel",
    "sin información", "sem informação",
    # "Se tiveres" — placeholder do fornecedor (Visiotech/UNI-TREND) para
    # campos de especificação não aplicáveis/preenchidos (ex: "Alarme
    # sonoro: Se tiveres", "Modo silencioso: Se tiveres"). Não é um valor
    # real, por isso é tratado como vazio (campo é omitido).
    "se tiveres",
}

# Prefixos de valores que começam por um placeholder do fornecedor mas têm
# texto adicional a seguir (ex: "Se tiveres: A luz indicadora muda de cor
# de acordo com a voltagem") — também tratados como vazios, porque o
# "Se tiveres" inicial indica que o campo não é aplicável independentemente
# do texto que se segue.
VALORES_VAZIOS_PREFIXOS = ("se tiveres",)

SPECS_IGNORAR_HTML = {"marca", "modelo"}


def extrair_specs_params(params_json: str) -> dict:
    """Extrai specs do campo params JSON."""
    specs = {}
    try:
        params = json.loads(params_json) if params_json.strip() else {}
    except:
        params = {}

    for pk, sk in PARAMS_MAP.items():
        if sk is None:
            continue
        val = str(params.get(pk, "")).strip()
        val_lower = val.lower()
        if val_lower in VALORES_VAZIOS or val_lower.startswith(VALORES_VAZIOS_PREFIXOS):
            continue
        if sk == "instalacao":
            val = INSTALACAO_MAP.get(val, val)
        if val.lower() in ("sim", "yes", "sí", "si", "true", "1"):
            val = "Sim"
        elif val.lower() in ("não", "nao", "no", "false", "0"):
            continue
        specs[sk] = val

    return specs


def extrair_specs_html(specs_html: str) -> dict:
    """Extrai TODOS os pares chave/valor da tabela HTML de especificações.

    Em vez de uma whitelist fixa (~40 chaves), captura qualquer
    <strong>Chave</strong></td><td>Valor</td> e usa a própria chave (em PT,
    slugificada) como nome do campo — maximiza a informação aproveitada sem
    ter de enumerar centenas de variantes manualmente. Ignora apenas
    "Marca"/"Modelo" (redundantes com brand/sku) e valores vazios/"não dispõe".
    """
    if not specs_html:
        return {}
    specs = {}
    pairs = re.findall(r'<strong>([^<]+)</strong></td>\s*<td[^>]*>(.*?)</td>', specs_html, re.S)
    for k, v in pairs:
        k = k.strip()
        v = re.sub(r'<[^>]+>', ' ', v)
        v = unescape(v)
        v = re.sub(r'\s+', ' ', v).strip()
        if not v or v.lower() in VALORES_VAZIOS or v.lower().startswith(VALORES_VAZIOS_PREFIXOS):
            continue
        key_slug = slugify(k, separator="_")
        if not key_slug or key_slug in SPECS_IGNORAR_HTML:
            continue
        specs[key_slug] = v[:200]

    return specs


def extrair_imagens_extra(extra_json: str) -> list:
    """Extrai lista de URLs de imagens extra (sem duplicados de baixa resolução _thumb)."""
    if not extra_json or extra_json.strip() in ("", "{}"):
        return []
    try:
        data = json.loads(extra_json)
        imgs = data.get("details", [])
        imgs = [i for i in imgs if i.startswith("http") and "_thumb" not in i.lower()]
        return imgs[:8]
    except:
        return []


def extrair_relacionados(related_str: str) -> list:
    """Extrai lista de SKUs de produtos relacionados."""
    if not related_str:
        return []
    return [s.strip() for s in related_str.split(",") if s.strip()][:10]


def nota_envio_especial() -> str:
    return "Este produto tem condições especiais de envio. O custo e prazo de entrega serão indicados no orçamento."


def limpar_descricao_html(html_str: str) -> str:
    """Converte a descrição HTML (parágrafos + listas) em texto limpo.

    <p>...</p> → parágrafos separados por linha em branco
    <li>...</li> → bullets "• ..."
    Remove todas as restantes tags e descodifica entidades HTML (&aacute; etc.)
    """
    if not html_str:
        return ""
    text = html_str

    # Listas: cada <li> torna-se um bullet numa linha própria
    text = re.sub(r'<li[^>]*>\s*(.*?)\s*</li>', lambda m: "• " + m.group(1) + "\n", text, flags=re.S)
    text = re.sub(r'</?[uo]l[^>]*>', '\n', text)

    # Parágrafos: cada <p> torna-se um parágrafo com linha em branco a seguir
    text = re.sub(r'<p[^>]*>\s*(.*?)\s*</p>', lambda m: m.group(1) + "\n\n", text, flags=re.S)

    # Quebras de linha explícitas
    text = re.sub(r'<br\s*/?>', '\n', text)

    # Remover quaisquer tags HTML remanescentes
    text = re.sub(r'<[^>]+>', '', text)

    # Descodificar entidades HTML (&aacute;, &amp;, etc.)
    text = unescape(text)

    # Normalizar espaços e linhas em branco
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


# ─────────────────────────────────────────────
# EDGE FUNCTION
# ─────────────────────────────────────────────

def supabase_upsert(produtos: list, fornecedor: str = "visiotech"):
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    total = len(produtos)
    inseridos = 0

    # ── Deduplicação de slugs antes de enviar ──────────────────────────────
    # Se dois produtos do mesmo lote gerarem o mesmo slug (marca+sku normalizados
    # podem colidir), o upsert rebenta com duplicate key em products_slug_key e
    # bloqueia o lote inteiro. Aqui garantimos unicidade dentro do lote acrescentando
    # sufixo numérico aos slugs duplicados (ex: "hikvision-ds-2cd" → "hikvision-ds-2cd-2").
    slugs_vistos: dict[str, int] = {}
    for p in produtos:
        slug_original = p.get("slug", "")
        if not slug_original:
            continue
        if slug_original in slugs_vistos:
            slugs_vistos[slug_original] += 1
            p["slug"] = f"{slug_original}-{slugs_vistos[slug_original]}"
            print(f"  ⚠ Slug duplicado no lote: {slug_original!r} → {p['slug']!r} (SKU {p.get('sku','')})")
        else:
            slugs_vistos[slug_original] = 1
    # ──────────────────────────────────────────────────────────────────────

    for i in range(0, total, 200):
        batch = produtos[i:i+200]
        resp = requests.post(IMPORT_URL, headers=headers,
                             json={"fornecedor": fornecedor, "produtos": batch}, timeout=60)
        if resp.status_code == 200:
            inseridos += resp.json().get("count", len(batch))
            print(f"  ✅ Upsert {i+1}-{min(i+200, total)}/{total}")
        else:
            print(f"  ❌ Erro lote {i}: {resp.status_code} — {resp.text[:200]}")
        time.sleep(0.1)
    return inseridos


def registar_price_history(alteracoes: list):
    """Envia alterações de preço para registo histórico."""
    if not alteracoes:
        return
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    resp = requests.post(IMPORT_URL, headers=headers,
                         json={"action": "price_history", "alteracoes": alteracoes}, timeout=30)
    if resp.status_code == 200:
        print(f"  📊 {len(alteracoes)} variações de preço registadas")
    else:
        print(f"  ⚠ Erro ao registar price history: {resp.status_code}")


def marcar_inactivos(skus: list, fornecedor: str = "visiotech"):
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
    """Busca preços actuais do Supabase para comparação."""
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
# CARREGAR CSV
# ─────────────────────────────────────────────

def carregar_csv(src: str) -> list:
    if src.startswith("http"):
        print("  A descarregar CSV Visiotech...")
        resp = requests.get(src, timeout=120)
        resp.encoding = "latin1"
        reader = csv.DictReader(StringIO(resp.text), delimiter=";")
    else:
        reader = csv.DictReader(open(src, encoding="latin1"), delimiter=";")
    rows = [r for r in reader if r.get("name") and r.get("published", "0").strip() == "1"]
    print(f"  CSV Visiotech: {len(rows)} produtos publicados")
    return rows


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main(local=False):
    print("=" * 60)
    print("VRCF — Importação Visiotech v2")
    print("=" * 60)

    # 1. Carregar CSV
    print("\n📥 A carregar CSV...")
    rows = carregar_csv("visiotech_connect__1_.csv" if local else URL_CSV)

    # Conjunto de marcas conhecidas — usado por family_for() para distinguir
    # quando o campo 'category' é na verdade o nome de uma marca.
    brand_values = {(r.get("brand") or "").strip().upper() for r in rows if r.get("brand")}
    brand_values.discard("")


    # 2. Buscar preços actuais para comparação (apenas se já houver produtos)
    print("\n💰 A buscar preços actuais...")
    precos_actuais = {}
    if IMPORT_API_KEY:
        try:
            precos_actuais = buscar_precos_actuais("visiotech")
            print(f"  {len(precos_actuais)} produtos com preço actual no Supabase")
        except Exception as e:
            print(f"  ⚠ Não foi possível buscar preços actuais: {e} — a continuar sem comparação")
    else:
        print("  ⚠ Sem API key — a saltar comparação de preços")

    # 3. Processar produtos
    print("\n⚙️  A processar produtos...")
    produtos = []
    skus_activos = []
    alteracoes_preco = []
    stats = {
        "sem_preco": 0, "sob_encomenda": 0, "envio_especial": 0,
        "com_stock": 0, "preco_actualizado": 0, "preco_estavel": 0,
        "com_imagens_extra": 0, "com_relacionados": 0, "min_sale_qty_gt1": 0,
        "com_tipo": 0,
    }

    for row in rows:
        sku = row.get("name", "").strip()
        if not sku:
            continue

        # Preços
        precos = calcular_preco(row)
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
                # Registar alteração
                alteracoes_preco.append({
                    "sku": sku,
                    "fornecedor": "visiotech",
                    "purchase_price_old": float(preco_actual.get("purchase_price") or 0),
                    "purchase_price_new": precos["purchase_price"],
                    "price_old": preco_ant,
                    "price_new": preco_nov,
                    "variacao_pct": round(variacao * 100, 1),
                })
                stats["preco_actualizado"] += 1
            else:
                # Manter preço actual — não actualizar
                precos["price"]       = preco_ant
                precos["price_tier2"] = round(preco_ant * (1 - DESCONTO_TIER2), 2)
                precos["price_tier3"] = round(preco_ant * (1 - DESCONTO_TIER3), 2)
                stats["preco_estavel"] += 1

        # Stock
        stock_status, sob_encomenda = mapear_stock(
            row.get("stock", "none"), row.get("on_request", "0"))
        if sob_encomenda: stats["sob_encomenda"] += 1
        if stock_status == "high": stats["com_stock"] += 1

        # Envio especial
        envio_especial = row.get("envio_especial", "0").strip() == "1"
        if envio_especial: stats["envio_especial"] += 1

        # Specs — combinar params + specifications HTML
        try:
            params_dict = json.loads(row.get("params") or "{}")
        except Exception:
            params_dict = {}
        specs = extrair_specs_params(row.get("params", "{}"))
        specs_html = extrair_specs_html(row.get("specifications", ""))
        # HTML tem mais detalhe — sobrepõe onde existir
        specs.update(specs_html)

        # Tipo (Nível 3) — a partir de params.tipo / params.tipo-de-dispositivo
        tipo = tipo_for(params_dict)
        if tipo: stats["com_tipo"] += 1

        # Imagens extra
        imagens_extra = extrair_imagens_extra(row.get("extra_images_paths", ""))
        if imagens_extra: stats["com_imagens_extra"] += 1

        # Produtos relacionados
        relacionados = extrair_relacionados(row.get("related_products", ""))
        if relacionados: stats["com_relacionados"] += 1

        # Descrição
        short_desc = re.sub(r'<[^>]+>', ' ', row.get("short_description", "") or "").strip()
        short_desc = re.sub(r'\s+', ' ', short_desc)[:300]
        description_raw = row.get("description", "") or row.get("content", "")
        description = limpar_descricao_html(description_raw) or short_desc

        # Quantidade mínima de encomenda
        try:
            qtd_minima = int(float(row.get("order_quantity_block", 1) or 1))
        except (ValueError, TypeError):
            qtd_minima = 1
        if qtd_minima < 1:
            qtd_minima = 1
        if qtd_minima > 1: stats["min_sale_qty_gt1"] += 1

        # Nota envio especial / quantidade mínima nos destaques
        destaques = []
        if short_desc:
            # Converter bullet points da short_description em lista
            bullets = [b.strip() for b in re.split(r'\s*-\s+|\s*·\s+', short_desc) if len(b.strip()) > 3]
            destaques = bullets[:6]
        if envio_especial:
            destaques.append(nota_envio_especial())
        if qtd_minima > 1:
            destaques.append(f"Vendido em embalagens/múltiplos de {qtd_minima} unidades.")

        # Slug
        brand = row.get("brand", "").strip()
        slug = slugify(f"{brand}-{sku}".lower(), separator="-")
        nome_produto = f"{brand} {sku}".strip() if brand else sku

        produto = {
            "sku":                sku,
            "slug":               slug,
            "name":               nome_produto,
            "short_description":  short_desc,
            "description":        description,
            "brand_id":           None,
            "brand":              brand,
            "category":           classify_category(row.get("category_parent", ""), row.get("category", ""), sku),
            "family":             family_for(row.get("category_parent", ""), row.get("category", ""), brand_values),
            "type":               tipo,
            "price":              precos["price"],
            "price_tier2":        precos["price_tier2"],
            "price_tier3":        precos["price_tier3"],
            "purchase_price":     precos["purchase_price"],
            "stock_status":       stock_status,
            "sob_encomenda":      sob_encomenda,
            "envio_especial":     envio_especial,
            "min_sale_qty":       qtd_minima,
            "include_in_catalog": True,
            "featured":           False,
            "show_on_homepage":   False,
            "image_url":          row.get("image_path", "").strip(),
            "imagens_extra":      imagens_extra,
            "relacionados":       relacionados,
            "ean":                row.get("ean", "").strip() or None,
            "fornecedor":         "visiotech",
            "mundo":              "seguranca",
            "especificacoes":     specs,
            "destaques":          destaques,
        }

        produtos.append(produto)
        skus_activos.append(sku)

    # Relatório
    print(f"\n  Total processados:      {len(produtos)}")
    print(f"  Sem preço (excluídos):  {stats['sem_preco']}")
    print(f"  Com stock:              {stats['com_stock']}")
    print(f"  Sob encomenda:          {stats['sob_encomenda']}")
    print(f"  Envio especial:         {stats['envio_especial']}")
    print(f"  Com imagens extra:      {stats['com_imagens_extra']}")
    print(f"  Com relacionados:       {stats['com_relacionados']}")
    print(f"  Qtd. mínima > 1:        {stats['min_sale_qty_gt1']}")
    print(f"  Com Tipo (Nível 3):     {stats['com_tipo']}")
    print(f"  Preço actualizado:      {stats['preco_actualizado']}")
    print(f"  Preço estável (<{int(LIMIAR_VARIACAO*100)}%): {stats['preco_estavel']}")
    if alteracoes_preco:
        print(f"\n  ⚠ Variações > {int(LIMIAR_VARIACAO*100)}% ({len(alteracoes_preco)} produtos):")
        for a in sorted(alteracoes_preco, key=lambda x: abs(x['variacao_pct']), reverse=True):
            sinal = "+" if a['price_new'] > a['price_old'] else ""
            print(f"    {a['sku']:30s} {a['price_old']:.2f}€ → {a['price_new']:.2f}€ ({sinal}{a['variacao_pct']}%)")

    if not IMPORT_API_KEY:
        print("\n⚠️  IMPORT_API_KEY não definida — a guardar preview local")
        with open("visiotech_v2_preview.json", "w", encoding="utf-8") as f:
            json.dump(produtos[:3], f, ensure_ascii=False, indent=2)
        print("  Ficheiro visiotech_v2_preview.json criado")
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
    import sys
    main(local="local" in sys.argv)
