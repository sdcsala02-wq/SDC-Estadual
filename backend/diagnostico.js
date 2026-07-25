const fs = require("fs");
const path = require("path");

const PASTA_RAIZ = __dirname;

const PASTAS_IGNORADAS = new Set([
  "node_modules",
  ".git",
  ".wwebjs_auth",
  ".wwebjs_cache",
  "dist",
  "build",
  "coverage"
]);

const EXTENSOES_TEXTO = new Set([
  ".js",
  ".html",
  ".css",
  ".json",
  ".env",
  ".sql"
]);

function deveIgnorar(nome) {
  return PASTAS_IGNORADAS.has(nome);
}

function listarArquivos(pasta, resultado = []) {
  let itens;

  try {
    itens = fs.readdirSync(pasta, { withFileTypes: true });
  } catch (erro) {
    console.warn(`Não foi possível ler: ${pasta}`);
    return resultado;
  }

  for (const item of itens) {
    if (deveIgnorar(item.name)) {
      continue;
    }

    const caminhoCompleto = path.join(pasta, item.name);

    if (item.isDirectory()) {
      listarArquivos(caminhoCompleto, resultado);
    } else {
      resultado.push(caminhoCompleto);
    }
  }

  return resultado;
}

function caminhoRelativo(caminhoCompleto) {
  return path.relative(PASTA_RAIZ, caminhoCompleto).replace(/\\/g, "/");
}

function lerArquivo(caminho) {
  try {
    return fs.readFileSync(caminho, "utf8");
  } catch {
    return "";
  }
}

function extrairRotasExpress(conteudo, arquivo) {
  const rotas = [];

  const padraoRouter =
    /(router|app)\.(get|post|put|patch|delete|use)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

  let correspondencia;

  while ((correspondencia = padraoRouter.exec(conteudo)) !== null) {
    rotas.push({
      arquivo,
      objeto: correspondencia[1],
      metodo: correspondencia[2].toUpperCase(),
      rota: correspondencia[3]
    });
  }

  return rotas;
}

function extrairFetches(conteudo, arquivo) {
  const chamadas = [];

  const padraoFetch =
    /fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;

  let correspondencia;

  while ((correspondencia = padraoFetch.exec(conteudo)) !== null) {
    chamadas.push({
      arquivo,
      url: correspondencia[1]
    });
  }

  return chamadas;
}

function extrairScriptsHtml(conteudo, arquivo) {
  const scripts = [];

  const padraoScript =
    /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;

  let correspondencia;

  while ((correspondencia = padraoScript.exec(conteudo)) !== null) {
    scripts.push({
      arquivo,
      script: correspondencia[1]
    });
  }

  return scripts;
}

function extrairTabelasSql(conteudo, arquivo) {
  const tabelas = new Set();

  const padroes = [
    /\bFROM\s+([a-zA-Z0-9_]+)/gi,
    /\bJOIN\s+([a-zA-Z0-9_]+)/gi,
    /\bINSERT\s+INTO\s+([a-zA-Z0-9_]+)/gi,
    /\bUPDATE\s+([a-zA-Z0-9_]+)/gi,
    /\bDELETE\s+FROM\s+([a-zA-Z0-9_]+)/gi,
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi
  ];

  for (const padrao of padroes) {
    let correspondencia;

    while ((correspondencia = padrao.exec(conteudo)) !== null) {
      tabelas.add(correspondencia[1]);
    }
  }

  return [...tabelas].map(tabela => ({
    arquivo,
    tabela
  }));
}

function criarEstruturaPastas(arquivos) {
  return arquivos
    .map(caminhoRelativo)
    .sort((a, b) => a.localeCompare(b));
}

function agruparPorExtensao(arquivos) {
  const grupos = {};

  for (const arquivo of arquivos) {
    const extensao = path.extname(arquivo).toLowerCase() || "sem_extensao";

    if (!grupos[extensao]) {
      grupos[extensao] = [];
    }

    grupos[extensao].push(caminhoRelativo(arquivo));
  }

  return grupos;
}

function gerarRelatorioTexto(dados) {
  const linhas = [];

  linhas.push("======================================================");
  linhas.push("DIAGNÓSTICO DO PROJETO — LUCAS E CÁSSIO 2027");
  linhas.push("======================================================");
  linhas.push("");
  linhas.push(`Pasta analisada: ${PASTA_RAIZ}`);
  linhas.push(`Total de arquivos: ${dados.totalArquivos}`);
  linhas.push(`Arquivos JavaScript: ${dados.resumoExtensoes[".js"] || 0}`);
  linhas.push(`Arquivos HTML: ${dados.resumoExtensoes[".html"] || 0}`);
  linhas.push(`Arquivos CSS: ${dados.resumoExtensoes[".css"] || 0}`);
  linhas.push(`Rotas Express encontradas: ${dados.rotas.length}`);
  linhas.push(`Chamadas fetch encontradas: ${dados.fetches.length}`);
  linhas.push(`Tabelas SQL identificadas: ${dados.tabelasUnicas.length}`);
  linhas.push("");

  linhas.push("======================================================");
  linhas.push("ESTRUTURA DE ARQUIVOS");
  linhas.push("======================================================");

  for (const arquivo of dados.estrutura) {
    linhas.push(arquivo);
  }

  linhas.push("");
  linhas.push("======================================================");
  linhas.push("ROTAS EXPRESS");
  linhas.push("======================================================");

  for (const rota of dados.rotas) {
    linhas.push(
      `${rota.metodo.padEnd(7)} ${rota.rota.padEnd(40)} ${rota.arquivo}`
    );
  }

  linhas.push("");
  linhas.push("======================================================");
  linhas.push("CHAMADAS FETCH");
  linhas.push("======================================================");

  for (const chamada of dados.fetches) {
    linhas.push(`${chamada.url} -> ${chamada.arquivo}`);
  }

  linhas.push("");
  linhas.push("======================================================");
  linhas.push("SCRIPTS UTILIZADOS NAS PÁGINAS HTML");
  linhas.push("======================================================");

  for (const item of dados.scriptsHtml) {
    linhas.push(`${item.arquivo} -> ${item.script}`);
  }

  linhas.push("");
  linhas.push("======================================================");
  linhas.push("TABELAS SQL");
  linhas.push("======================================================");

  for (const tabela of dados.tabelasUnicas) {
    linhas.push(tabela);
  }

  linhas.push("");
  linhas.push("======================================================");
  linhas.push("POSSÍVEIS CHAMADAS DE API SEM ROTA LOCAL EXATA");
  linhas.push("======================================================");

  if (!dados.fetchesSemRota.length) {
    linhas.push("Nenhuma inconsistência simples encontrada.");
  } else {
    for (const item of dados.fetchesSemRota) {
      linhas.push(`${item.url} -> ${item.arquivo}`);
    }
  }

  return linhas.join("\n");
}

function executarDiagnostico() {
  console.log("Iniciando diagnóstico do projeto...");

  const arquivos = listarArquivos(PASTA_RAIZ);

  const arquivosTexto = arquivos.filter(arquivo => {
    const nome = path.basename(arquivo);

    if (nome === ".env" || nome.startsWith(".env.")) {
      return true;
    }

    return EXTENSOES_TEXTO.has(path.extname(arquivo).toLowerCase());
  });

  const rotas = [];
  const fetches = [];
  const scriptsHtml = [];
  const tabelas = [];

  for (const arquivo of arquivosTexto) {
    const relativo = caminhoRelativo(arquivo);
    const conteudo = lerArquivo(arquivo);
    const extensao = path.extname(arquivo).toLowerCase();

    if (extensao === ".js") {
      rotas.push(...extrairRotasExpress(conteudo, relativo));
      fetches.push(...extrairFetches(conteudo, relativo));
      tabelas.push(...extrairTabelasSql(conteudo, relativo));
    }

    if (extensao === ".html") {
      scriptsHtml.push(...extrairScriptsHtml(conteudo, relativo));
      fetches.push(...extrairFetches(conteudo, relativo));
    }

    if (extensao === ".sql") {
      tabelas.push(...extrairTabelasSql(conteudo, relativo));
    }
  }

  const grupos = agruparPorExtensao(arquivos);

  const resumoExtensoes = {};

  for (const [extensao, lista] of Object.entries(grupos)) {
    resumoExtensoes[extensao] = lista.length;
  }

  const tabelasUnicas = [
    ...new Set(
      tabelas
        .map(item => item.tabela)
        .filter(Boolean)
        .map(tabela => tabela.toLowerCase())
    )
  ].sort();

  const caminhosRotas = rotas.map(rota => rota.rota);

  const fetchesSemRota = fetches.filter(chamada => {
    if (!chamada.url.startsWith("/api/")) {
      return false;
    }

    return !caminhosRotas.some(rota => {
      return (
        chamada.url === rota ||
        chamada.url.startsWith(`${rota}/`) ||
        rota.startsWith(`${chamada.url}/`)
      );
    });
  });

  const dados = {
    geradoEm: new Date().toISOString(),
    pastaRaiz: PASTA_RAIZ,
    totalArquivos: arquivos.length,
    estrutura: criarEstruturaPastas(arquivos),
    resumoExtensoes,
    rotas,
    fetches,
    scriptsHtml,
    tabelas,
    tabelasUnicas,
    fetchesSemRota
  };

  const relatorioTxt = gerarRelatorioTexto(dados);

  fs.writeFileSync(
    path.join(PASTA_RAIZ, "diagnostico-projeto.txt"),
    relatorioTxt,
    "utf8"
  );

  fs.writeFileSync(
    path.join(PASTA_RAIZ, "diagnostico-projeto.json"),
    JSON.stringify(dados, null, 2),
    "utf8"
  );

  console.log("");
  console.log("Diagnóstico concluído com sucesso.");
  console.log("");
  console.log("Arquivos gerados:");
  console.log("- diagnostico-projeto.txt");
  console.log("- diagnostico-projeto.json");
  console.log("");
  console.log(`Total de arquivos analisados: ${arquivos.length}`);
  console.log(`Rotas encontradas: ${rotas.length}`);
  console.log(`Chamadas fetch encontradas: ${fetches.length}`);
  console.log(`Tabelas SQL identificadas: ${tabelasUnicas.length}`);
}

try {
  executarDiagnostico();
} catch (erro) {
  console.error("Erro ao executar o diagnóstico:", erro);
  process.exitCode = 1;
}