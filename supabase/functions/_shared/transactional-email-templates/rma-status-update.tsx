import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  rmaNumber?: string
  statusLabel?: string
  statusDescription?: string
  resolutionNotes?: string
}

const STATUS_COLOR: Record<string, string> = {
  approved: '#16a34a',
  in_repair: '#f59e0b',
  shipped_back: '#3b82f6',
  completed: '#16a34a',
  rejected: '#dc2626',
  cancelled: '#6b7280',
}

const RmaStatusUpdateEmail = ({
  customerName = '',
  rmaNumber = '',
  statusLabel = 'Atualizado',
  statusDescription = '',
  resolutionNotes = '',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Atualização do seu pedido RMA {rmaNumber} - VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔧 Atualização do Pedido RMA</Heading>
        <Text style={text}>Olá {customerName || 'cliente'},</Text>
        <Text style={text}>
          O estado do seu pedido <strong>{rmaNumber}</strong> foi atualizado.
        </Text>
        <Section style={badgeBox}>
          <Text style={{ ...badge }}>{statusLabel}</Text>
        </Section>
        {statusDescription ? (
          <Text style={text}>{statusDescription}</Text>
        ) : null}
        {resolutionNotes ? (
          <>
            <Heading as="h3" style={h3}>Notas da equipa</Heading>
            <Text style={text}>{resolutionNotes}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={text}>
          Podes consultar o pedido em qualquer momento na tua área pessoal.
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
  component: RmaStatusUpdateEmail,
  subject: (data: Record<string, any>) =>
    `Pedido RMA ${data.rmaNumber ?? ''} — ${data.statusLabel ?? 'Atualizado'}`,
  displayName: 'Atualização de RMA (cliente)',
  previewData: {
    customerName: 'João Silva',
    rmaNumber: 'RMA-2026-0042',
    statusLabel: 'Em reparação',
    statusDescription: 'O equipamento foi recebido e está em análise técnica.',
    resolutionNotes: '',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #ff6b00', paddingBottom: '10px', margin: '0 0 20px' }
const h3 = { fontSize: '15px', color: '#1a1a2e', margin: '16px 0 8px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 8px' }
const badgeBox = { textAlign: 'center' as const, margin: '16px 0' }
const badge = { display: 'inline-block', padding: '8px 16px', borderRadius: '999px', background: '#1a1a2e', color: '#ffffff', fontSize: '13px', fontWeight: 'bold' as const, margin: 0 }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#666', margin: '0 0 4px' }
