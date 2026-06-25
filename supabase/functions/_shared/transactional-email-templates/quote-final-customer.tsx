import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface QuoteFinalItem {
  name: string
  quantity: number
  unitPrice?: number | null
  lineTotal?: number | null
}

interface Props {
  customerName?: string
  quoteNumber?: string
  items?: QuoteFinalItem[]
  subtotal?: number
  shippingTotal?: number | null
  prazoEntrega?: string
  total?: number
  notes?: string
}

const formatPrice = (p?: number | null) =>
  p != null ? `${Number(p).toFixed(2).replace('.', ',')} €` : 'Sob consulta'

const QuoteFinalCustomerEmail = ({
  customerName = '',
  quoteNumber = '',
  items = [],
  subtotal = 0,
  shippingTotal = null,
  prazoEntrega = '',
  total = 0,
  notes = '',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O seu orçamento {quoteNumber} está pronto</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ O seu Orçamento está Pronto</Heading>
        <Text style={text}>Olá {customerName || ''},</Text>
        <Text style={text}>
          Segue o orçamento completo <strong>{quoteNumber}</strong>, com produtos, portes e prazo de entrega confirmados.
        </Text>
        <Hr style={hr} />
        <Heading as="h2" style={h2}>Produtos</Heading>
        <Section>
          {items.map((item, idx) => (
            <Section key={idx} style={itemRow}>
              <Text style={itemText}><strong>{item.name}</strong></Text>
              <Text style={itemMeta}>
                Quantidade: {item.quantity} · Preço unit.: {formatPrice(item.unitPrice)}
                {item.lineTotal != null ? ` · Total: ${formatPrice(item.lineTotal)}` : ''}
              </Text>
            </Section>
          ))}
        </Section>
        <Hr style={hr} />
        <Text style={text}><strong>Subtotal produtos:</strong> {formatPrice(subtotal)}</Text>
        <Text style={text}><strong>Portes:</strong> {shippingTotal != null ? formatPrice(shippingTotal) : 'Incluído / a confirmar na entrega'}</Text>
        {prazoEntrega ? <Text style={text}><strong>Prazo de entrega:</strong> {prazoEntrega}</Text> : null}
        <Text style={totalText}><strong>Total: {formatPrice(total)}</strong></Text>
        {notes ? (
          <>
            <Hr style={hr} />
            <Text style={text}><strong>Notas:</strong> {notes}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          Qualquer dúvida, responda a este email ou contacte-nos. Obrigado pela preferência — VRCF.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuoteFinalCustomerEmail,
  subject: (d: Record<string, any>) =>
    `O seu orçamento ${(d?.quoteNumber || '').toString()} está pronto`,
  displayName: 'Orçamento final (cliente)',
  previewData: {
    customerName: 'João Silva',
    quoteNumber: 'ORC-2026-0042',
    items: [
      { name: 'Câmara IP', quantity: 2, unitPrice: 89.9, lineTotal: 179.8 },
      { name: 'Switch 8 portas', quantity: 1, unitPrice: 45, lineTotal: 45 },
    ],
    subtotal: 224.8,
    shippingTotal: 12.45,
    prazoEntrega: '3-5 dias úteis',
    total: 237.25,
    notes: 'Pagamento por transferência bancária.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #22c55e', paddingBottom: '10px', margin: '0 0 20px' }
const h2 = { fontSize: '18px', color: '#1a1a2e', margin: '20px 0 12px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const totalText = { fontSize: '16px', color: '#1a1a2e', margin: '12px 0 0' }
const itemRow = { background: '#f7f7f9', padding: '10px 14px', borderRadius: '6px', margin: '0 0 8px' }
const itemText = { fontSize: '14px', color: '#1a1a2e', margin: '0' }
const itemMeta = { fontSize: '12px', color: '#666', margin: '4px 0 0' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
