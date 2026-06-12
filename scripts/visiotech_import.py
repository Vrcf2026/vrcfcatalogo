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
# MAPEAMENTO CATEGORIA (2 níveis)
# category_parent → Categoria Nível 1
# category        → Família Nível 2
# ─────────────────────────────────────────────
CATEGORIA_MAP = {
    # CCTV IP
    'Hikvision': 'CCTV IP', 'Ajax CCTV': 'CCTV IP', 'Safire Smart': 'CCTV IP',
    'Safire': 'CCTV IP', 'Uniview - Uniarch': 'CCTV IP', 'X-Security': 'CCTV IP',
    'Câmaras': 'CCTV IP', 'NVRs Profissionais': 'CCTV IP', 'IP Home': 'CCTV IP',
    'Imou': 'CCTV IP', 'Descodificadores': 'CCTV IP', 'Kits Profissionais': 'CCTV IP',
    'HiLook': 'CCTV IP', 'VCA Technology': 'CCTV IP', 'Soluções IP': 'CCTV IP',
    'Eufy': 'CCTV IP', 'Ezviz': 'CCTV IP', 'VicoHome': 'CCTV IP',
    'Térmicas': 'CCTV IP', 'Temperatura Corporal Febre': 'CCTV IP',
    # CCTV Analógico
    'CCTV analógico': 'CCTV Analógico', 'Câmaras AHD': 'CCTV Analógico', 'XVRs': 'CCTV Analógico',
    # Intrusão
    'Intrusão': 'Intrusão', 'Ajax Wireless': 'Intrusão', 'Detectores Cablados': 'Intrusão',
    'Pyronix Cablado': 'Intrusão', 'Hikvision - Pyronix': 'Intrusão', 'Wireless': 'Intrusão',
    'Chuango': 'Intrusão', 'DMTech': 'Intrusão', 'Jade Bird': 'Intrusão',
    'Sopras': 'Intrusão', 'Smanos': 'Intrusão', 'Home8': 'Intrusão',
    'Autónomos': 'Intrusão', 'Antirroubo': 'Intrusão',
    # Incêndio e Evacuação
    'Sonorização e áudio': 'Incêndio e Evacuação', 'Wizmart': 'Incêndio e Evacuação',
    # Controlo de Acessos
    'ZKTeco': 'Controlo de Acessos', 'Anviz': 'Controlo de Acessos',
    'Akuvox': 'Controlo de Acessos', 'iLOQ': 'Controlo de Acessos',
    'EasyClocking': 'Controlo de Acessos', 'Fechaduras': 'Controlo de Acessos',
    'Torniquetes': 'Controlo de Acessos', 'Estacionamento': 'Controlo de Acessos',
    'Easy-P': 'Controlo de Acessos', 'Hotel': 'Controlo de Acessos',
    'Hysoon': 'Controlo de Acessos', 'Virdi': 'Controlo de Acessos',
    'Akubela': 'Controlo de Acessos', 'Yale': 'Controlo de Acessos',
    'Contagem e Controlo de lotação máxima permitida': 'Controlo de Acessos',
    # Networking
    'Networking': 'Networking', 'Switching': 'Networking',
    'Routing': 'Networking', 'NGFW': 'Networking', 'Comunicação e redes': 'Networking',
    # Smart Home
    'Smart Home': 'Smart Home', 'AQARA': 'Smart Home', 'Shelly': 'Smart Home', 'Fibaro': 'Smart Home',
    # Energia
    'Alimentação': 'Energia', 'Baterias': 'Energia', 'Instalações solares': 'Energia',
    'Energía portátil': 'Energia', 'Veículos eléctricos': 'Energia',
    # Acessórios IT e Segurança
    'Acessórios IT e Segurança': 'Acessórios IT e Segurança',
    'Acessórios': 'Acessórios IT e Segurança', 'Suportes para Câmaras': 'Acessórios IT e Segurança',
    'Armazenagem': 'Acessórios IT e Segurança', 'Gestão de Sinal': 'Acessórios IT e Segurança',
    'Periféricos': 'Acessórios IT e Segurança', 'Adaptador de encaixe (clip-on)': 'Acessórios IT e Segurança',
    'ONVIF': 'Acessórios IT e Segurança', 'Software': 'Acessórios IT e Segurança',
    'Ferramentas': 'Acessórios IT e Segurança', 'Discos rígidos e memórias': 'Acessórios IT e Segurança',
    'Discos rígidos de vigilância': 'Acessórios IT e Segurança',
    # Smartphone e Escritório
    'Smartphone e escritório': 'Smartphone e Escritório', 'Monitores': 'Smartphone e Escritório',
    'Videoconferencia': 'Smartphone e Escritório', 'Soluções LED': 'Smartphone e Escritório',
    # Mobilidade
    'Trackers': 'Mobilidade', 'Equipamento de bordo': 'Mobilidade',
    # Outros
    'Servicios': 'Outros', 'Promoções': 'Promoções', 'Merchandising': 'Merchandising',
    'Saúde': 'Outros', 'Câmara de vigilância para caça': 'Outdoor',
}
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
        if not val or val.lower() in ("", "n/a", "não", "no", "-"):
            continue
        if sk == "instalacao":
            val = INSTALACAO_MAP.get(val, val)
        if val.lower() in ("sim", "yes", "sí", "si", "true", "1"):
            val = "Sim"
        elif val.lower() in ("não", "no", "false", "0"):
            continue
        specs[sk] = val

    return specs


def extrair_specs_html(specs_html: str) -> dict:
    """Extrai specs da tabela HTML de especificações."""
    if not specs_html:
        return {}
    specs = {}
    pairs = re.findall(r'<strong>([^<]+)</strong></td><td[^>]*>([^<]+)', specs_html)
    for k, v in pairs:
        k = k.strip()
        v = re.sub(r'<[^>]+>', '', v).strip()
        if not v or v in ("-", "N/A"):
            continue
        # Mapear para chaves limpas
        key_map = {
            "Dimensões":                "dimensoes",
            "Peso":                     "peso",
            "Cor":                      "cor",
            "Marca":                    None,
            "Modelo":                   None,
            "Resolução máxima":         "resolucao_maxima",
            "Sensor de imagem":         "sensor",
            "Taxa Main Stream":         "fps",
            "Compressão":               "compressao",
            "Lente":                    "lente",
            "Alcance IR":               "alcance_ir",
            "Ângulo de visão":          "angulo_visao",
            "Melhoras de imagem":       "wdr",
            "Armazenagem":              "armazenamento",
            "Armazenagem interna":      "armazenamento_interno",
            "Áudio":                    "audio",
            "Protocolo de vídeo":       "protocolo",
            "Interface de Rede":        "interface_rede",
            "Encriptação":              "encriptacao",
            "Inteligência Artificial":  "ia",
            "Alimentação":              "alimentacao",
            "Temp. funcionamento":      "temperatura",
            "Temperatura de funcionamento": "temperatura",
            "Humidade de funcionamento":"humidade",
            "Grau de protecção":        "grau_protecao",
            "Grau de segurança":        "grau_seguranca",
            "Frequência":               "frequencia",
            "Distância de transmissão": "distancia_transmissao",
            "Canais":                   "canais",
            "Compatibilidade":          "compatibilidade",
            "Tecnologia":               "tecnologia",
            "Material":                 "material",
            "Bateria":                  "bateria",
            "Funções Inteligentes":     "funcoes_inteligentes",
            "Acesso remoto":            "acesso_remoto",
            "Comunicação":              "comunicacao",
            "Alarme":                   "alarme",
            "Sensibilidade":            "sensibilidade",
            "Atualização do firmware":  "firmware_ota",
        }
        mapped = key_map.get(k)
        if mapped is None:
            continue
        specs[mapped] = v[:150]

    return specs


def extrair_imagens_extra(extra_json: str) -> list:
    """Extrai lista de URLs de imagens extra."""
    if not extra_json or extra_json.strip() in ("", "{}"):
        return []
    try:
        data = json.loads(extra_json)
        imgs = data.get("details", [])
        return [i for i in imgs if i.startswith("http")][:8]
    except:
        return []


def extrair_relacionados(related_str: str) -> list:
    """Extrai lista de SKUs de produtos relacionados."""
    if not related_str:
        return []
    return [s.strip() for s in related_str.split(",") if s.strip()][:10]


def nota_envio_especial() -> str:
    return "Este produto tem condições especiais de envio. O custo e prazo de entrega serão indicados no orçamento."


# ─────────────────────────────────────────────
# EDGE FUNCTION
# ─────────────────────────────────────────────

def supabase_upsert(produtos: list, fornecedor: str = "visiotech"):
    headers = {"x-import-key": IMPORT_API_KEY, "Content-Type": "application/json"}
    total = len(produtos)
    inseridos = 0
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
        "com_imagens_extra": 0, "com_relacionados": 0,
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
        specs = extrair_specs_params(row.get("params", "{}"))
        specs_html = extrair_specs_html(row.get("specifications", ""))
        # HTML tem mais detalhe — sobrepõe onde existir
        specs.update(specs_html)

        # Imagens extra
        imagens_extra = extrair_imagens_extra(row.get("extra_images_paths", ""))
        if imagens_extra: stats["com_imagens_extra"] += 1

        # Produtos relacionados
        relacionados = extrair_relacionados(row.get("related_products", ""))
        if relacionados: stats["com_relacionados"] += 1

        # Descrição
        short_desc = re.sub(r'<[^>]+>', ' ', row.get("short_description", "") or "").strip()
        short_desc = re.sub(r'\s+', ' ', short_desc)[:300]
        description = row.get("description", "") or row.get("content", "") or short_desc

        # Nota envio especial nos destaques
        destaques = []
        if short_desc:
            # Converter bullet points da short_description em lista
            bullets = [b.strip() for b in re.split(r'\s*-\s+|\s*·\s+', short_desc) if len(b.strip()) > 3]
            destaques = bullets[:6]
        if envio_especial:
            destaques.append(nota_envio_especial())

        # Slug
        brand = row.get("brand", "").strip()
        slug = slugify(f"{brand}-{sku}".lower(), separator="-")

        produto = {
            "sku":                sku,
            "slug":               slug,
            "name":               short_desc or sku,
            "short_description":  short_desc,
            "description":        description,
            "brand_id":           None,
            "brand":              brand,
            "category":           CATEGORIA_MAP.get(row.get("category_parent", "").strip(), row.get("category_parent", "").strip()),
            "family":             f"{CATEGORIA_MAP.get(row.get('category_parent', '').strip(), row.get('category_parent', '').strip())} — {row.get('category', '').strip()}" if row.get('category', '').strip() else CATEGORIA_MAP.get(row.get('category_parent', '').strip(), row.get('category_parent', '').strip()),
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
