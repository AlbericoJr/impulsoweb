# Mega prompt do MVP — ImpulsoWeb

Crie um MVP responsivo de uma agência digital chamada **ImpulsoWeb** com HTML5, CSS3 e JavaScript vanilla. Use Node.js (módulos nativos) para persistência e autenticação no servidor. Não use React, serviços pagos, imagens geradas ou APIs externas.

## Cliente
- Landing page em português brasileiro com hero, serviços, etapas, planos, FAQ e formulário.
- Visual minimalista, sofisticado e responsivo, usando azul-marinho `#101329`, violeta `#7661f4` e branco.
- Serviços: landing page, site institucional, portfólio.
- Planos: Essencial a partir de R$ 690, Profissional a partir de R$ 1.290 e Personalizado sob consulta; preços configuráveis pelo empreendedor.
- Formulário com nome, e-mail, telefone, empresa, serviço, orçamento, observações e consentimento.
- Salvar lead no servidor antes de liberar o link do WhatsApp com os dados preenchidos.
- Estados de carregamento, sucesso e erro; validação e acessibilidade.

## Administrador
- Login com senha guardada apenas em variável de ambiente no servidor.
- Dashboard com métricas: leads, novos leads, clientes e conversão.
- Listagem de leads com filtros, edição de status, exclusão e conversão em cliente.
- Acompanhamento simples da etapa de cada projeto.
- Lembretes com data, marcar como feito e exclusão.
- Persistência local do servidor (JSON); sem credenciais no front-end.

## Segurança e qualidade
- Validar dados novamente no servidor; limitar volume de solicitações; cookies HttpOnly e SameSite; impedir acesso às APIs do painel sem autenticação; mascarar qualquer dado interpolado no HTML.
- README com TAM/SAM/SOM, Canvas, tese, experimentos, instruções, configuração, testes e limitações.
- Preparar publicação com Node.js e armazenamento persistente, revisão de segurança e código no GitHub.
