import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import vrcfLogo from "@/assets/vrcf-logo.png";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={vrcfLogo} alt="VRCF Logo" className="h-16 w-auto drop-shadow-md" />
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão em vigor a partir de: 15/06/2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              1. Identificação do Responsável pelo Tratamento
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A presente Política de Privacidade é emitida por{" "}
              <strong className="text-foreground">VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</strong>, com o NIF{" "}
              <strong className="text-foreground">515237205</strong>, com sede em{" "}
              <strong className="text-foreground">R. Luis Calado Nunes 15 LJ B, Montijo</strong> (doravante "VRCF",
              "nós" ou "empresa"), enquanto Responsável pelo Tratamento dos dados pessoais nos termos do Regulamento
              (UE) 2016/679 (RGPD) e da Lei n.º 58/2019, de 8 de agosto.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Contacto para assuntos de proteção de dados:</strong>{" "}
              <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>{" "}
              · <a href="tel:+351911564243" className="text-primary hover:underline">+351 911 564 243</a>
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              2. Âmbito de Aplicação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Esta Política de Privacidade aplica-se ao tratamento de dados pessoais recolhidos através do catálogo
              online{" "}
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>{" "}
              (doravante "Catálogo"), incluindo a navegação no Catálogo, a criação e utilização de conta de
              utilizador, pedidos de orçamento, pedidos de RMA (devolução/reparação) e comunicações com a VRCF.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              3. Dados Pessoais que Tratamos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Podemos recolher e tratar as seguintes categorias de dados pessoais:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Dados de identificação e contacto:</strong>{" "}
                Nome, email, número de telefone, morada (quando fornecidos no pedido de orçamento, no perfil de
                conta ou no pedido de RMA);
              </li>
              <li>
                <strong className="text-foreground">Dados de conta:</strong>{" "}
                Email e palavra-passe (geridos de forma encriptada pelo nosso fornecedor de autenticação), data de
                criação e último acesso à conta;
              </li>
              <li>
                <strong className="text-foreground">Dados de perfil:</strong>{" "}
                Nome completo, telefone, empresa, NIF, morada de faturação/envio, e notas, quando o utilizador os
                preenche na área "A Minha Conta";
              </li>
              <li>
                <strong className="text-foreground">Dados de navegação:</strong>{" "}
                Endereço IP, tipo de browser, sistema operativo, páginas visitadas, data e hora do acesso (através
                de cookies — consulte a nossa{" "}
                <Link to="/politica-de-cookies" className="text-primary hover:underline">Política de Cookies</Link>);
              </li>
              <li>
                <strong className="text-foreground">Dados comerciais:</strong>{" "}
                Histórico de pedidos de orçamento, propostas enviadas, produtos no carrinho de orçamento e
                preferências de produtos;
              </li>
              <li>
                <strong className="text-foreground">Dados de RMA (devolução/reparação):</strong>{" "}
                Nome do produto, número de série, número de fatura, data de compra, motivo e descrição do pedido.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              4. Finalidades do Tratamento e Base Legal
            </h2>
            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-foreground">Finalidade</th>
                    <th className="text-left p-3 font-semibold text-foreground">Base Legal</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border">
                    <td className="p-3">Criar e gerir a conta de utilizador, incluindo autenticação e acesso à área "A Minha Conta"</td>
                    <td className="p-3">Execução de contrato (art. 6.º, n.º 1, al. b) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Processar e responder a pedidos de orçamento</td>
                    <td className="p-3">Execução de pré-contrato / contrato (art. 6.º, n.º 1, al. b) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Processar pedidos de RMA (devolução/reparação)</td>
                    <td className="p-3">Execução de contrato (art. 6.º, n.º 1, al. b) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Comunicações relacionadas com propostas comerciais e pedidos de RMA</td>
                    <td className="p-3">Interesse legítimo (art. 6.º, n.º 1, al. f) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Cumprimento de obrigações legais e fiscais</td>
                    <td className="p-3">Obrigação legal (art. 6.º, n.º 1, al. c) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Melhorar a experiência do utilizador e segurança do website</td>
                    <td className="p-3">Interesse legítimo (art. 6.º, n.º 1, al. f) RGPD)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              5. Destinatários dos Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os seus dados pessoais podem ser comunicados a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Autoridades públicas:</strong>{" "}
                Autoridade Tributária, Comissão Nacional de Proteção de Dados (CNPD), quando legalmente obrigatório;
              </li>
              <li>
                <strong className="text-foreground">Fornecedores de serviços (subcontratados):</strong>{" "}
                Prestador de serviços de base de dados, autenticação e alojamento ("backend-as-a-service"),
                serviços de envio de email transacional, e demais prestadores de serviços de TI — apenas quando
                necessário para a execução do contrato e com obrigações contratuais de confidencialidade;
              </li>
              <li>
                <strong className="text-foreground">Fornecedores/parceiros comerciais:</strong>{" "}
                Quando necessário para dar seguimento ao orçamento ou pedido de RMA solicitado.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os dados <strong className="text-foreground">não são vendidos</strong> a terceiros nem utilizados
              para fins de marketing de terceiros sem consentimento expresso.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              6. Transferências Internacionais de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A conta de utilizador, o perfil e os pedidos de orçamento/RMA são armazenados através de um
              fornecedor de infraestrutura cloud ("backend-as-a-service") que pode envolver o processamento de
              dados fora do Espaço Económico Europeu (EEE). Nesses casos, garantimos que:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>O país destino é reconhecido pela Comissão Europeia como oferecendo nível adequado de proteção; ou</li>
              <li>São implementadas salvaguardas contratuais aprovadas (Cláusulas Contratuais Tipo da Comissão Europeia); ou</li>
              <li>O subcontratado está certificado ao abrigo do Data Privacy Framework UE-EUA (Decisão de Adequação da Comissão Europeia de julho de 2023), quando aplicável.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              7. Prazos de Conservação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os dados pessoais são conservados apenas pelo tempo estritamente necessário à prossecução das
              finalidades para que foram recolhidos:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Conta de utilizador e dados de perfil:</strong>{" "}
                Enquanto a conta se mantiver ativa, e até 2 anos após o último acesso em caso de inatividade,
                salvo solicitação de eliminação antecipada;
              </li>
              <li>
                <strong className="text-foreground">Pedidos de orçamento não concretizados:</strong>{" "}
                Até 2 anos após o último contacto, para fins de histórico comercial;
              </li>
              <li>
                <strong className="text-foreground">Pedidos de RMA:</strong>{" "}
                Duração do processo de RMA + prazo legal de garantia aplicável ao produto;
              </li>
              <li>
                <strong className="text-foreground">Clientes com contrato/faturação:</strong>{" "}
                Duração do contrato + 10 anos (obrigações fiscais e contabilísticas);
              </li>
              <li>
                <strong className="text-foreground">Dados de navegação (cookies):</strong>{" "}
                Conforme indicado na <Link to="/politica-de-cookies" className="text-primary hover:underline">Política de Cookies</Link>.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Após os prazos indicados, os dados são eliminados ou anonimizados de forma segura.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              8. Os Seus Direitos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nos termos do RGPD, enquanto titular dos dados, tem o direito de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Acesso (art. 15.º RGPD):</strong>{" "}
                Obter confirmação sobre se os seus dados estão a ser tratados, aceder aos dados e receber
                informações sobre o tratamento;
              </li>
              <li>
                <strong className="text-foreground">Retificação (art. 16.º RGPD):</strong>{" "}
                Corrigir dados inexatos ou completar dados incompletos — pode fazê-lo diretamente na área "A Minha
                Conta &gt; Dados";
              </li>
              <li>
                <strong className="text-foreground">Apagamento ("Direito ao Esquecimento", art. 17.º RGPD):</strong>{" "}
                Solicitar a eliminação da sua conta e dos dados associados, quando aplicável (ex.: dados
                desnecessários, consentimento retirado, oposição legitimada), sem prejuízo da conservação de dados
                cuja retenção seja legalmente obrigatória (ex.: faturação);
              </li>
              <li>
                <strong className="text-foreground">Limitação do tratamento (art. 18.º RGPD):</strong>{" "}
                Solicitar a restrição do tratamento em determinadas situações (ex.: contestação da exatidão dos
                dados);
              </li>
              <li>
                <strong className="text-foreground">Portabilidade (art. 20.º RGPD):</strong>{" "}
                Receber os seus dados num formato estruturado, de uso comum e leitura automática, ou solicitar a
                transmissão direta a outro responsável (quando tecnicamente viável);
              </li>
              <li>
                <strong className="text-foreground">Oposição (art. 21.º RGPD):</strong>{" "}
                Opor-se ao tratamento baseado em interesses legítimos, incluindo definição de perfis (profiling);
              </li>
              <li>
                <strong className="text-foreground">Retirar o consentimento (art. 7.º, n.º 3, RGPD):</strong>{" "}
                A qualquer momento, sem afetar a licitude do tratamento anterior;
              </li>
              <li>
                <strong className="text-foreground">Não ser sujeito a decisões automatizadas (art. 22.º RGPD):</strong>{" "}
                Incluindo definição de perfis, que produzam efeitos jurídicos ou significativos (a VRCF não utiliza
                este tipo de processamento).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              9. Como Exercer os Seus Direitos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para corrigir os seus dados de perfil, pode fazê-lo diretamente em{" "}
              <Link to="/conta/dados" className="text-primary hover:underline">A Minha Conta &gt; Dados</Link>.
              Para exercer qualquer outro direito, incluindo a eliminação da sua conta, pode contactar-nos
              através de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Email:</strong>{" "}
                <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>{" "}
                (assunto: "Dados Pessoais")
              </li>
              <li>
                <strong className="text-foreground">Morada:</strong>{" "}
                VALTER ROBERTO CRUZ FRANCISCO UNI. LDA · R. Luis Calado Nunes 15 LJ B, Montijo
              </li>
              <li>
                <strong className="text-foreground">Telefone:</strong>{" "}
                <a href="tel:+351911564243" className="text-primary hover:underline">+351 911 564 243</a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O pedido deve identificar claramente o direito que pretende exercer. Responderemos no prazo de{" "}
              <strong className="text-foreground">30 dias</strong>, prorrogáveis para 60 dias em casos complexos.
              A resposta é gratuita, salvo pedidos manifestamente infundados ou excessivos.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              10. Direito de Reclamação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Se considerar que o tratamento dos seus dados viola o RGPD, tem o direito de apresentar uma
              reclamação à autoridade de controlo:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong className="text-foreground">Comissão Nacional de Proteção de Dados (CNPD)</strong><br />
              Av. D. Carlos I, 134, 1.º · 1200-651 Lisboa · Portugal<br />
              Tel: <a href="tel:+351213928400" className="text-primary hover:underline">+351 213 928 400</a><br />
              Email: <a href="mailto:geral@cnpd.pt" className="text-primary hover:underline">geral@cnpd.pt</a><br />
              Website: <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnpd.pt</a>
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              11. Medidas de Segurança
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF implementa medidas técnicas e organizativas adequadas para proteger os dados pessoais contra:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Acesso não autorizado, alteração ou divulgação;</li>
              <li>Destruição acidental ou ilícita;</li>
              <li>Perda acidental ou ilícita.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As medidas incluem: encriptação de palavras-passe e de dados em trânsito, controlo de acesso a
              dados de conta restrito ao próprio utilizador e a administradores autorizados, políticas de
              passwords seguras, backups regulares e auditorias periódicas.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Em caso de violação de dados pessoais (data breach), notificaremos a CNPD no prazo de 72 horas,
              conforme obrigação legal, e os titulares afetados quando houver risco elevado para os seus direitos
              e liberdades.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              12. Menores de Idade
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os nossos serviços não se destinam a menores de 16 anos. Não recolhemos intencionalmente dados
              pessoais de menores nem permitimos o registo de contas por menores. Se tiver conhecimento de que um
              menor criou uma conta ou nos forneceu dados pessoais, contacte-nos imediatamente para que possamos
              eliminá-los.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              13. Alterações a esta Política
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF reserva-se o direito de alterar esta Política de Privacidade a qualquer momento, nomeadamente
              para refletir alterações legislativas, tecnológicas ou na organização da empresa. As alterações
              serão publicadas nesta página com a data de atualização indicada no topo.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Recomendamos a consulta regular desta página. A continuação da utilização da sua conta e dos
              nossos serviços após alterações implica a aceitação da nova versão.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-10 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">VRCF — Catálogo Online de Informática & Segurança</p>
            <p className="text-xs text-muted-foreground">
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>{" "}
              | Atualizado em 15/06/2026
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} VALTER ROBERTO CRUZ FRANCISCO UNI. LDA — NIF: 515237205
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PoliticaPrivacidade;
