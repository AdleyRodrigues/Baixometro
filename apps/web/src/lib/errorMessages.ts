export type ErrorDescriptor = {
  title: string,
  message: string,
  action?: string,
};

export type ErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_MISSING_TOKEN'
  | 'AUTH_MALFORMED_HEADER'
  | 'AUTH_NAME_REQUIRED'
  | 'AUTH_EMAIL_INVALID'
  | 'AUTH_PASSWORD_TOO_SHORT'
  | 'AUTH_EMAIL_ALREADY_EXISTS'
  | 'AUTH_MISSING_CREDENTIALS'
  | 'AUTH_UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'SEFAZ_UNAVAILABLE'
  | 'SEFAZ_CAPTCHA_REQUIRED'
  | 'SEFAZ_TIMEOUT'
  | 'SEFAZ_INVALID_KEY'
  | 'SEFAZ_CONNECTION_FAILED'
  | 'SEFAZ_LAYOUT_UNRECOGNIZED'
  | 'SEFAZ_HEADLESS_LAUNCH_ERROR'
  | 'RECEIPT_DUPLICATE'
  | 'RECEIPT_NOT_FOUND'
  | 'RECEIPT_STORE_NAME_REQUIRED'
  | 'RECEIPT_NO_ITEMS'
  | 'RECEIPT_ITEM_DESC_REQUIRED'
  | 'RECEIPT_ITEM_QTY_INVALID'
  | 'RECEIPT_ITEM_PRICE_INVALID'
  | 'RECEIPT_XML_EMPTY'
  | 'RECEIPT_XML_MALFORMED'
  | 'RECEIPT_XML_NOT_NFCE'
  | 'RECEIPT_XML_INVALID'
  | 'RECEIPT_ACCESS_KEY_REQUIRED'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_NAME_REQUIRED'
  | 'CATEGORY_NAME_TOO_LONG'
  | 'CATEGORY_DELETE_ERROR'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_NAME_REQUIRED'
  | 'PRODUCT_SOURCE_NOT_FOUND'
  | 'PRODUCT_TARGET_NOT_FOUND'
  | 'PRODUCT_MERGE_SAME_ID'
  | 'PRODUCT_IN_USE'
  | 'PRODUCT_DELETE_ERROR'
  | 'DB_UNIQUE_VIOLATION'
  | 'DB_FOREIGN_KEY_VIOLATION'
  | 'DB_CHECK_VIOLATION'
  | 'VALIDATION_ERROR'
  | 'NETWORK_DISCONNECTED'
  | 'NETWORK_TIMEOUT'
  | 'INTERNAL_SERVER_ERROR'
  | 'RENDER_CRASH'
  | 'UNKNOWN_ERROR';

export const ERROR_CATALOG: Record<ErrorCode, ErrorDescriptor> = {
  // Autenticação
  AUTH_INVALID_CREDENTIALS: {
    title: 'Credenciais Incorretas',
    message: 'Não foi possível entrar. O e-mail ou a senha informados não conferem.',
    action: 'Verifique seus dados de acesso e tente novamente.',
  },
  AUTH_INVALID_TOKEN: {
    title: 'Sessão Expirada',
    message: 'Sua sessão de acesso expirou por motivos de segurança.',
    action: 'Entre novamente na sua conta para continuar.',
  },
  AUTH_MISSING_TOKEN: {
    title: 'Acesso Restrito',
    message: 'Esta operação requer uma conta conectada.',
    action: 'Faça login ou crie uma conta para salvar seus dados.',
  },
  AUTH_MALFORMED_HEADER: {
    title: 'Autenticação Inválida',
    message: 'Os dados da sua sessão foram corrompidos.',
    action: 'Saia da conta e faça login novamente.',
  },
  AUTH_NAME_REQUIRED: {
    title: 'Nome Obrigatório',
    message: 'Não foi possível concluir o cadastro sem seu nome.',
    action: 'Informe seu nome completo ou apelido.',
  },
  AUTH_EMAIL_INVALID: {
    title: 'E-mail Inválido',
    message: 'O formato do e-mail digitado não parece válido.',
    action: 'Digite um endereço de e-mail como exemplo@dominio.com.',
  },
  AUTH_PASSWORD_TOO_SHORT: {
    title: 'Senha Curta',
    message: 'Sua senha precisa ter no mínimo 6 caracteres para proteger sua conta.',
    action: 'Escolha uma senha com pelo menos 6 dígitos.',
  },
  AUTH_EMAIL_ALREADY_EXISTS: {
    title: 'E-mail Já Cadastrado',
    message: 'Já existe uma conta associada a este endereço de e-mail.',
    action: 'Acesse a aba de Login para entrar com sua senha.',
  },
  AUTH_MISSING_CREDENTIALS: {
    title: 'Campos Incompletos',
    message: 'O e-mail e a senha precisam ser preenchidos.',
    action: 'Preencha todos os campos para entrar.',
  },
  AUTH_UNAUTHORIZED: {
    title: 'Não Autorizado',
    message: 'Você não tem permissão para acessar este recurso.',
    action: 'Verifique se está conectado na conta correta.',
  },
  USER_NOT_FOUND: {
    title: 'Usuário Não Localizado',
    message: 'A conta solicitada não foi encontrada no sistema.',
    action: 'Cadastre-se novamente ou verifique suas credenciais.',
  },

  // SEFAZ e Importadores
  SEFAZ_UNAVAILABLE: {
    title: 'SEFAZ Temporariamente Instável',
    message: 'O portal da Receita/SEFAZ estadual está fora do ar ou retornando instabilidade momentânea.',
    action: 'Baixe o arquivo XML da nota e utilize a opção "Importar XML da Nota".',
  },
  SEFAZ_CAPTCHA_REQUIRED: {
    title: 'Desafio de Captcha no Portal',
    message: 'A SEFAZ exigiu uma confirmação visual (Captcha) para liberar a consulta deste cupom.',
    action: 'Utilize a opção "Importar XML da Nota" para carregar os itens sem depender do portal.',
  },
  SEFAZ_TIMEOUT: {
    title: 'Tempo Limite da SEFAZ Excedido',
    message: 'Os servidores da SEFAZ demoraram mais de 15 segundos para responder à consulta.',
    action: 'Tente novamente em alguns instantes ou envie o XML da nota.',
  },
  SEFAZ_INVALID_KEY: {
    title: 'Chave de Acesso Inválida',
    message: 'A URL do QR Code ou chave informada não contém os 44 dígitos obrigatórios da NFC-e.',
    action: 'Verifique o código ou aponte a câmera com mais iluminação.',
  },
  SEFAZ_CONNECTION_FAILED: {
    title: 'Falha de Conexão com a SEFAZ',
    message: 'Não foi possível alcançar o servidor da SEFAZ estadual.',
    action: 'Verifique sua conexão ou envie o arquivo XML da nota.',
  },
  SEFAZ_LAYOUT_UNRECOGNIZED: {
    title: 'Formato da Nota Desconhecido',
    message: 'O portal da SEFAZ alterou a estrutura visual desta nota.',
    action: 'Envie o arquivo XML oficial para registrar todos os produtos com precisão.',
  },
  SEFAZ_HEADLESS_LAUNCH_ERROR: {
    title: 'Leitor Automático Indisponível',
    message: 'O navegador headless do servidor não pôde ser iniciado no momento.',
    action: 'Utilize o envio manual do XML da nota.',
  },

  // Notas Fiscais
  RECEIPT_DUPLICATE: {
    title: 'Nota Já Cadastrada',
    message: 'Esta nota fiscal (mesma chave de 44 dígitos) já está no seu histórico de compras.',
    action: 'Visualize os itens na lista de notas ou ative a substituição na revisão.',
  },
  RECEIPT_NOT_FOUND: {
    title: 'Nota Fiscal Não Encontrada',
    message: 'O comprovante fiscal solicitado não existe ou foi excluído.',
    action: 'Retorne à lista de notas para localizar suas compras.',
  },
  RECEIPT_STORE_NAME_REQUIRED: {
    title: 'Nome do Mercado Obrigatório',
    message: 'Não foi possível salvar a compra sem o nome do estabelecimento.',
    action: 'Informe onde a compra foi realizada.',
  },
  RECEIPT_NO_ITEMS: {
    title: 'Nenhum Item na Nota',
    message: 'Uma nota fiscal precisa de ao menos um produto registrado.',
    action: 'Adicione os produtos comprados antes de salvar.',
  },
  RECEIPT_ITEM_DESC_REQUIRED: {
    title: 'Descrição de Produto Ausente',
    message: 'Um ou mais itens da lista não possuem descrição.',
    action: 'Preencha o nome de todos os produtos.',
  },
  RECEIPT_ITEM_QTY_INVALID: {
    title: 'Quantidade Inválida',
    message: 'A quantidade de um dos produtos está zerada ou em formato incorreto.',
    action: 'Informe uma quantidade positiva maior que zero.',
  },
  RECEIPT_ITEM_PRICE_INVALID: {
    title: 'Preço Unitário Inválido',
    message: 'O valor unitário de um dos produtos não pode ser negativo ou vazio.',
    action: 'Revise os preços unitários digitados.',
  },
  RECEIPT_XML_EMPTY: {
    title: 'Arquivo XML Vazio',
    message: 'O arquivo selecionado não contém dados.',
    action: 'Selecione um arquivo de NFC-e válido com terminação .xml.',
  },
  RECEIPT_XML_MALFORMED: {
    title: 'XML com Estrutura Corrompida',
    message: 'Não foi possível ler as tags do arquivo XML enviado.',
    action: 'Certifique-se de que o arquivo baixado não foi corrompido.',
  },
  RECEIPT_XML_NOT_NFCE: {
    title: 'Arquivo Não é uma NFC-e',
    message: 'O arquivo XML não possui os blocos fiscais oficiais (<emit> e <det>).',
    action: 'Faça o download do XML oficial no portal da SEFAZ.',
  },
  RECEIPT_XML_INVALID: {
    title: 'XML Inválido',
    message: 'Os dados do arquivo XML não puderam ser processados.',
    action: 'Verifique se o arquivo corresponde a um cupom fiscal de consumidor.',
  },
  RECEIPT_ACCESS_KEY_REQUIRED: {
    title: 'Chave de Acesso Necessária',
    message: 'Informe a chave de 44 dígitos ou aponte a câmera para o QR Code.',
    action: 'Cole a URL da nota ou faça o escaneamento.',
  },

  // Categorias
  CATEGORY_NOT_FOUND: {
    title: 'Categoria Não Localizada',
    message: 'A categoria solicitada não existe ou já foi removida.',
    action: 'Atualize a página para recarregar sua lista de categorias.',
  },
  CATEGORY_NAME_REQUIRED: {
    title: 'Nome da Categoria Obrigatório',
    message: 'Não é possível criar ou atualizar uma categoria sem nome.',
    action: 'Digite um nome representativo (ex.: Hortifrúti, Carnes).',
  },
  CATEGORY_NAME_TOO_LONG: {
    title: 'Nome Muito Longo',
    message: 'O nome da categoria deve ter no máximo 60 caracteres.',
    action: 'Escolha um nome mais conciso.',
  },
  CATEGORY_DELETE_ERROR: {
    title: 'Não Foi Possível Excluir a Categoria',
    message: 'Esta categoria pode conter produtos ou notas vinculadas a ela.',
    action: 'Desvincule os itens da categoria antes de removê-la.',
  },

  // Produtos
  PRODUCT_NOT_FOUND: {
    title: 'Produto Não Localizado',
    message: 'O produto solicitado não foi encontrado no catálogo.',
    action: 'Volte ao catálogo para pesquisar outros itens.',
  },
  PRODUCT_NAME_REQUIRED: {
    title: 'Nome do Produto Obrigatório',
    message: 'O produto precisa ter um nome identificável.',
    action: 'Preencha o nome do produto.',
  },
  PRODUCT_SOURCE_NOT_FOUND: {
    title: 'Produto de Origem Inexistente',
    message: 'O primeiro produto selecionado para mesclagem não foi encontrado.',
    action: 'Selecione novamente os produtos que deseja unificar.',
  },
  PRODUCT_TARGET_NOT_FOUND: {
    title: 'Produto de Destino Inexistente',
    message: 'O produto final selecionado para a mesclagem não existe.',
    action: 'Selecione um produto de destino válido.',
  },
  PRODUCT_MERGE_SAME_ID: {
    title: 'Produtos Idênticos',
    message: 'Você selecionou o mesmo produto como origem e destino.',
    action: 'Selecione dois produtos diferentes para mesclar.',
  },
  PRODUCT_IN_USE: {
    title: 'Produto com Histórico',
    message: 'Este produto já possui compras registradas no seu histórico e não pode ser apagado.',
    action: 'Utilize a função "Mesclar" caso queira unificá-lo com outro produto.',
  },
  PRODUCT_DELETE_ERROR: {
    title: 'Não Foi Possível Excluir o Produto',
    message: 'Ocorreu uma falha ao tentar remover o produto do catálogo.',
    action: 'Tente novamente ou verifique se há compras vinculadas.',
  },

  // Banco de dados e Validação genérica
  DB_UNIQUE_VIOLATION: {
    title: 'Registro Já Existente',
    message: 'Um item com esses mesmos dados já foi registrado.',
    action: 'Verifique se o item já consta na sua lista.',
  },
  DB_FOREIGN_KEY_VIOLATION: {
    title: 'Vínculo Inválido',
    message: 'O item selecionado faz referência a um registro que não existe.',
    action: 'Recarregue a página e tente novamente.',
  },
  DB_CHECK_VIOLATION: {
    title: 'Valor Fora do Permitido',
    message: 'Os valores enviados ultrapassam os limites permitidos pelo sistema.',
    action: 'Ajuste os valores digitados.',
  },
  VALIDATION_ERROR: {
    title: 'Dados Incompletos ou Inválidos',
    message: 'Alguns campos não atendem aos critérios necessários.',
    action: 'Revise os campos destacados no formulário.',
  },

  // Rede, Sistema e Renderização
  NETWORK_DISCONNECTED: {
    title: 'Sem Conexão com o Servidor',
    message: 'Não foi possível alcançar a API do Baixômetro. Você pode estar sem internet ou o servidor está em reinicialização.',
    action: 'Verifique sua conexão Wi-Fi/4G e tente novamente.',
  },
  NETWORK_TIMEOUT: {
    title: 'Tempo de Espera Esgotado',
    message: 'A operação demorou mais de 20 segundos para responder.',
    action: 'Verifique sua conexão ou tente novamente em instantes.',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Instabilidade Temporária',
    message: 'Ocorreu um imprevisto nos nossos servidores.',
    action: 'Aguarde alguns instantes e tente novamente.',
  },
  RENDER_CRASH: {
    title: 'Falha na Interface',
    message: 'Algo inesperado aconteceu ao renderizar esta tela. Seus dados cadastrados permanecem salvos.',
    action: 'Clique em "Recarregar" para reiniciar a visualização.',
  },
  UNKNOWN_ERROR: {
    title: 'Não Foi Possível Concluir a Ação',
    message: 'Ocorreu uma falha inesperada durante o processamento.',
    action: 'Tente novamente ou recarregue a página se persistir.',
  },
};

/**
 * Resolve qualquer código, mensagem ou objeto de erro para uma descrição amigável de UX.
 */
export function getErrorMessage(err: unknown): ErrorDescriptor {
  if (typeof err === 'string') {
    if (err in ERROR_CATALOG) {
      return ERROR_CATALOG[err as ErrorCode];
    }
    const lower = err.toLowerCase();
    if (lower.includes('sefaz')) {
      return ERROR_CATALOG.SEFAZ_UNAVAILABLE;
    }
    if (lower.includes('timeout') || lower.includes('tempo limite') || lower.includes('esgotado')) {
      return ERROR_CATALOG.NETWORK_TIMEOUT;
    }
    if (lower.includes('duplicad') || lower.includes('anteriormente')) {
      return ERROR_CATALOG.RECEIPT_DUPLICATE;
    }
    if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('conexão')) {
      return ERROR_CATALOG.NETWORK_DISCONNECTED;
    }
    return {
      title: 'Aviso',
      message: err,
      action: 'Tente novamente ou recarregue a página se persistir.',
    };
  }

  if (err && typeof err === 'object') {
    const candidate = err as { code?: string; message?: string; name?: string };

    if (candidate.code && candidate.code in ERROR_CATALOG) {
      return ERROR_CATALOG[candidate.code as ErrorCode];
    }

    if (candidate.name === 'AbortError') {
      return ERROR_CATALOG.NETWORK_TIMEOUT;
    }

    if (candidate.message) {
      return getErrorMessage(candidate.message);
    }
  }

  return ERROR_CATALOG.UNKNOWN_ERROR;
}
