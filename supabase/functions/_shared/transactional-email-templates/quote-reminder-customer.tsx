import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  quoteNumber?: string
  total?: number | null
  quoteUrl?: string
}

const fmt = (v?: number | null) =>
  v != null ? `${Number(v).toFixed(2).replace('.', ',')} €` : ''

const QuoteReminderEmail = ({
  customerName = '',
  quoteNumber = '',
  total = null,
  quoteUrl = '',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O seu orçamento {quoteNumber} continua disponível — VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>O seu orçamento continua disponível</Heading>
        <Text style={text}>Olá {customerName || 'cliente'},</Text>
        <Text style={text}>
          Há alguns dias enviámos-lhe o orçamento <strong>{quoteNumber}</strong>
          {total != null ? <> no valor de <strong>{fmt(total)}</strong></> : null}.
          Queríamos saber se ficou alguma dúvida ou se pretende ajustar alguma coisa.
        </Text>
        {quoteUrl ? (
          <Text style={text}>
            <Link href={quoteUrl} style={link}>Ver orçamento e responder</Link>
          </Text>
        ) : null}
        <Text style={text}>
          Pode também responder diretamente a este email ou ligar-nos — teremos todo o gosto em ajudar.
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
  component: QuoteReminderEmail,
  subject: (d: Record<string, any>) => `O seu orçamento ${(d?.quoteNumber || '').toString()} continua disponível — VRCF`,
  displayName: 'Lembrete de orçamento ao cliente',
  previewData: {
    customerName: 'João Silva',
    quoteNumber: 'ORC-2026-0142',
    total: 1249.9,
    quoteUrl: 'https://catalogo.vrcf.pt/conta/orcamentos',
  },
} satisfies TemplateEntry

const main      = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1        = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #f97316', paddingBottom: '10px', margin: '0 0 20px' }
const text      = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 12px' }
const link      = { color: '#f97316', fontWeight: 'bold' }
const hr        = { borderColor: '#eee', margin: '20px 0' }
const footer    = { fontSize: '11px', color: '#999', margin: '4px 0' }
