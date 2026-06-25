import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  quoteNumber?: string
  statusLabel?: string
  notes?: string
}

const STATUS_COLOR: Record<string, string> = {
  in_review:  '#f59e0b',
  accepted:   '#16a34a',
  rejected:   '#dc2626',
  cancelled:  '#6b7280',
  completed:  '#16a34a',
}

const QuoteStatusUpdateEmail = ({
  customerName = '',
  quoteNumber = '',
  statusLabel = 'Atualizado',
  notes = '',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Atualização do seu pedido de orçamento {quoteNumber} - VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📋 Atualização do seu Orçamento</Heading>
        <Text style={text}>Olá {customerName || 'cliente'},</Text>
        <Text style={text}>
          O estado do seu pedido de orçamento <strong>{quoteNumber}</strong> foi atualizado.
        </Text>
        <Section style={badgeBox}>
          <Text style={badge}>{statusLabel}</Text>
        </Section>
        {notes ? (
          <>
            <Heading as="h3" style={h3}>Nota da equipa</Heading>
            <Text style={text}>{notes}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={text}>
          Para qualquer dúvida, contacte-nos por email ou WhatsApp.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</Text>
        <Text style={footer}>📞 +351 911 564 243 · ✉️ geral@vrcf.pt</Text>
        <Text style={footer}>📍 Rua Luis Calado Nunes 15 LJB, 2870-350 Montijo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuoteStatusUpdateEmail,
  subject: (d: Record<string, any>) =>
    `Atualização do orçamento ${(d?.quoteNumber || '').toString()} - VRCF`,
  displayName: 'Atualização de estado de orçamento (cliente)',
  previewData: {
    customerName: 'João Silva',
    quoteNumber: 'ORC-2026-0042',
    statusLabel: 'Aceite',
    notes: 'Orçamento aprovado. Aguardamos confirmação de encomenda.',
  },
} satisfies TemplateEntry

const main  = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #f97316', paddingBottom: '10px', margin: '0 0 20px' }
const h3 = { fontSize: '15px', color: '#1a1a2e', margin: '20px 0 8px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 12px' }
const badgeBox = { textAlign: 'center' as const, margin: '20px 0' }
const badge = { display: 'inline-block', padding: '8px 20px', borderRadius: '20px', background: '#f97316', color: '#fff', fontWeight: 'bold', fontSize: '14px', margin: '0' }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '11px', color: '#999', margin: '4px 0' }
