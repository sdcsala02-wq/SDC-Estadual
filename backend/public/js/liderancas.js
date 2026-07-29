const API_LIDERANCAS_XAVIER = "/api/liderancas";
const API_DEMANDAS_LIDERANCAS_XAVIER = "/api/demandas";

let liderancaEditandoId = null;
let liderancasCarregadas = [];

document.addEventListener("DOMContentLoaded", () => {
  configurarFormularioLideranca();
  configurarFiltrosLiderancas();
  configurarRankingLiderancas();

  carregarLiderancas();
});

function garantirArray(dados) {
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.dados)) return dados.dados;
  if (Array.isArray(dados?.liderancas)) return dados.liderancas;
  if (Array.isArray(dados?.rows)) return dados.rows;
  return [];
}

async function buscarJsonLiderancas(url, opcoes = {}) {
  const resposta = await fetch(url, {
    credentials: "include",
    ...opcoes
  });

  const texto = await resposta.text();

  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = {
      erro: texto || "Resposta inválida do servidor."
    };
  }

  if (!resposta.ok) {
    throw new Error(dados?.erro || dados?.mensagem || `Erro HTTP ${resposta.status}`);
  }

  return dados;
}

function configurarFormularioLideranca() {
  const form = document.getElementById("formLideranca");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const dados = {
      cidade:
        document.getElementById("cidade")
          ?.value
          .trim() || "",

      bairro:
        document.getElementById("bairro")
          ?.value
          .trim() || "",

      nome:
        document.getElementById("nome")
          ?.value
          .trim() || "",

      telefone:
        document.getElementById("telefone")
          ?.value
          .trim() || "",

      status:
        document.getElementById("status")
          ?.value || "ATIVO",

      observacao:
        document.getElementById("observacao")
          ?.value
          .trim() || ""
    };

    if (!dados.cidade || !dados.bairro || !dados.nome) {
      alert(
        "Informe a cidade, o bairro e o nome da liderança."
      );

      return;
    }

    try {
      const url = liderancaEditandoId
        ? `${API_LIDERANCAS_XAVIER}/${liderancaEditandoId}`
        : API_LIDERANCAS_XAVIER;

      const metodo = liderancaEditandoId ? "PUT" : "POST";

      await buscarJsonLiderancas(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });

      alert(
        liderancaEditandoId
          ? "Liderança atualizada com sucesso!"
          : "Liderança cadastrada com sucesso!"
      );

      limparFormulario();
      carregarLiderancas();

    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao conectar com a API.");
    }
  });
}

async function carregarLiderancas() {
  try {
    const dadosLiderancas = await buscarJsonLiderancas(API_LIDERANCAS_XAVIER);
    const liderancas = garantirArray(dadosLiderancas);
    liderancasCarregadas = liderancas;

    let demandas = [];

    try {
      const dadosDemandas = await buscarJsonLiderancas(API_DEMANDAS_LIDERANCAS_XAVIER);
      demandas = garantirArray(dadosDemandas);
    } catch (erroDemandas) {
      console.warn("Não foi possível carregar demandas relacionadas:", erroDemandas);
    }

    atualizarCards(liderancas, demandas);
    preencherFiltrosLiderancas(liderancas);
    aplicarFiltrosLiderancas();
    montarRankingLiderancas(liderancas);



  } catch (error) {
    console.error("Erro ao carregar lideranças:", error);

    atualizarCards([], []);
    montarTabelaLiderancas([]);
    montarRankingLiderancas([]);
  }
}

function atualizarCards(liderancas, demandas) {
  const listaLiderancas = garantirArray(liderancas);
  const listaDemandas = garantirArray(demandas);

  const cidades = new Set(
    listaLiderancas
      .map(item => normalizar(item.cidade))
      .filter(Boolean)
  );

  const bairros = new Set(
    listaLiderancas
      .map(item => normalizar(item.bairro))
      .filter(Boolean)
  );

  const demandasRelacionadas = listaDemandas.filter(demanda =>
    bairros.has(normalizar(demanda.bairro))
  );

  const totalLiderancas =
    document.getElementById("totalLiderancas");

  const totalCidades =
    document.getElementById("totalCidadesLiderancas");

  const totalBairros =
    document.getElementById("totalBairrosLiderancas");

  const totalDemandas =
    document.getElementById("totalDemandasLiderancas");

  if (totalLiderancas) {
    totalLiderancas.innerText =
      listaLiderancas.length;
  }

  if (totalCidades) {
    totalCidades.innerText =
      cidades.size;
  }

  if (totalBairros) {
    totalBairros.innerText =
      bairros.size;
  }

  if (totalDemandas) {
    totalDemandas.innerText =
      demandasRelacionadas.length;
  }
}

function montarTabelaLiderancas(liderancas) {
  const tbody =
    document.getElementById("listaLiderancas");

  const lista =
    garantirArray(liderancas);

  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          Nenhuma liderança cadastrada.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = lista.map(item => {
    const status =
      String(item.status || "ATIVO")
        .toUpperCase();

    const classeStatus =
      status === "INATIVO"
        ? "inativo"
        : "ativo";

    return `
  <tr>

    <td>
      <strong class="nome-lideranca-tabela">
        ${escaparHtml(item.nome || "-")}
      </strong>
    </td>

    <td>
      ${escaparHtml(item.telefone || "-")}
    </td>

    <td>
      ${escaparHtml(item.cidade || "-")}
    </td>

    <td>
      ${escaparHtml(item.bairro || "-")}
    </td>

    <td>
      <span class="status-lideranca ${classeStatus}">
        ${escaparHtml(status)}
      </span>
    </td>

    <td>
      ${escaparHtml(item.observacao || "-")}
    </td>

    <td>
      <div class="acoes-lideranca">

        <button
  type="button"
  class="btn-acao-lideranca btn-editar-lideranca"
  onclick="editarLiderancaPorId(${Number(item.id)})"
  title="Editar liderança">

  <span class="icone-acao">✏️</span>
  <span>Editar</span>

</button>

        <button
  type="button"
  class="btn-acao-lideranca btn-excluir-lideranca"
  onclick="excluirLideranca(${Number(item.id)})"
  title="Excluir liderança">

  <span class="icone-acao">🗑️</span>
  <span>Excluir</span>

</button>

      </div>
    </td>

  </tr>
`;
  }).join("");
}

function editarLiderancaPorId(id) {
  const item = liderancasCarregadas.find(
    lideranca =>
      Number(lideranca.id) === Number(id)
  );

  if (!item) {
    alert("Não foi possível localizar essa liderança.");
    return;
  }

  editarLideranca(item);
}

function editarLideranca(item) {
  liderancaEditandoId = item.id;

  const campoCidade =
    document.getElementById("cidade");

  const campoBairro =
    document.getElementById("bairro");

  const campoNome =
    document.getElementById("nome");

  const campoTelefone =
    document.getElementById("telefone");

  const campoStatus =
    document.getElementById("status");

  const campoObservacao =
    document.getElementById("observacao");

  if (campoCidade) {
    campoCidade.value =
      item.cidade || "";
  }

  if (campoBairro) {
    campoBairro.value =
      item.bairro || "";
  }

  if (campoNome) {
    campoNome.value =
      item.nome || "";
  }

  if (campoTelefone) {
    campoTelefone.value =
      item.telefone || "";
  }

  if (campoStatus) {
    campoStatus.value =
      String(item.status || "ATIVO")
        .toUpperCase();
  }

  if (campoObservacao) {
    campoObservacao.value =
      item.observacao || "";
  }

  const botaoSalvar =
    document.getElementById(
      "btnSalvarLideranca"
    );

  if (botaoSalvar) {
    botaoSalvar.innerText =
      "Atualizar Liderança";
  }

  const botaoCancelar =
    document.getElementById(
      "btnCancelarEdicao"
    );

  if (botaoCancelar) {
    botaoCancelar.style.display =
      "inline-flex";

    botaoCancelar.onclick =
      limparFormulario;
  }

  const formulario =
    document.getElementById(
      "formLideranca"
    );

  if (formulario) {
    formulario.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  setTimeout(() => {
    campoCidade?.focus();
  }, 400);
}


function criarBotaoCancelar() {
  if (document.getElementById("btnCancelarEdicao")) return;

  const botaoSalvar = document.querySelector("#formLideranca button[type='submit']");

  if (!botaoSalvar) return;

  const botaoCancelar = document.createElement("button");
  botaoCancelar.type = "button";
  botaoCancelar.id = "btnCancelarEdicao";
  botaoCancelar.className = "btn-cancelar";
  botaoCancelar.innerText = "Cancelar Edição";
  botaoCancelar.onclick = limparFormulario;

  botaoSalvar.insertAdjacentElement("afterend", botaoCancelar);
}

function limparFormulario() {
  liderancaEditandoId = null;

  const form =
    document.getElementById(
      "formLideranca"
    );

  if (form) {
    form.reset();
  }

  const botaoSalvar =
    document.getElementById(
      "btnSalvarLideranca"
    );

  if (botaoSalvar) {
    botaoSalvar.innerText =
      "Salvar Liderança";
  }

  const botaoCancelar =
    document.getElementById(
      "btnCancelarEdicao"
    );

  if (botaoCancelar) {
    botaoCancelar.style.display =
      "none";
  }
}

function montarRankingLiderancas(liderancas) {
  const container =
    document.getElementById("rankingLiderancas");

  const seletor =
    document.getElementById("tipoRankingLiderancas");

  const lista =
    garantirArray(liderancas);

  if (!container) return;

  if (!lista.length) {
    container.innerHTML =
      "<p>Nenhuma liderança cadastrada.</p>";

    return;
  }

  const tipo =
    seletor?.value === "bairro"
      ? "bairro"
      : "cidade";

  const resumo = {};

  lista.forEach(item => {
    const valor = String(item[tipo] || "").trim();

    const nome = valor || "Não informado";

    resumo[nome] =
      (resumo[nome] || 0) + 1;
  });

  const ranking = Object.entries(resumo)
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(
        b[0],
        "pt-BR"
      );
    });

  const maior =
    Math.max(...ranking.map(item => item[1]));

  container.innerHTML = ranking
    .map(([nome, total]) => {
      const largura =
        maior > 0
          ? (total / maior) * 100
          : 0;

      return `
        <div class="ranking-item">

          <span>
            ${escaparHtml(nome)}
          </span>

          <div class="barra-ranking">
            <b style="width: ${largura}%"></b>
          </div>

          <strong>
            ${total}
          </strong>

        </div>
      `;
    })
    .join("");
}

function configurarRankingLiderancas() {
  const seletor =
    document.getElementById("tipoRankingLiderancas");

  seletor?.addEventListener("change", () => {
    montarRankingLiderancas(
      liderancasCarregadas
    );
  });
}

function preencherFiltrosLiderancas(liderancas) {
  const filtroCidade =
    document.getElementById("filtroCidadeLideranca");

  const filtroBairro =
    document.getElementById("filtroBairroLideranca");

  if (!filtroCidade || !filtroBairro) return;

  const cidadeSelecionada = filtroCidade.value;
  const bairroSelecionado = filtroBairro.value;

  const cidades = [
    ...new Set(
      garantirArray(liderancas)
        .map(item => String(item.cidade || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const bairros = [
    ...new Set(
      garantirArray(liderancas)
        .map(item => String(item.bairro || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  filtroCidade.innerHTML = `
    <option value="">
      Todas as cidades
    </option>

    ${cidades.map(cidade => `
      <option value="${escaparHtml(cidade)}">
        ${escaparHtml(cidade)}
      </option>
    `).join("")}
  `;

  filtroBairro.innerHTML = `
    <option value="">
      Todos os bairros
    </option>

    ${bairros.map(bairro => `
      <option value="${escaparHtml(bairro)}">
        ${escaparHtml(bairro)}
      </option>
    `).join("")}
  `;

  filtroCidade.value = cidadeSelecionada;
  filtroBairro.value = bairroSelecionado;
}

function configurarFiltrosLiderancas() {
  const filtroCidade =
    document.getElementById("filtroCidadeLideranca");

  const filtroBairro =
    document.getElementById("filtroBairroLideranca");

  const campoBusca =
    document.getElementById("buscaLideranca");

  const botaoLimpar =
    document.getElementById("btnLimparFiltrosLideranca");

  filtroCidade?.addEventListener(
    "change",
    aplicarFiltrosLiderancas
  );

  filtroBairro?.addEventListener(
    "change",
    aplicarFiltrosLiderancas
  );

  campoBusca?.addEventListener(
    "input",
    aplicarFiltrosLiderancas
  );

  botaoLimpar?.addEventListener("click", () => {
    if (filtroCidade) filtroCidade.value = "";
    if (filtroBairro) filtroBairro.value = "";
    if (campoBusca) campoBusca.value = "";

    aplicarFiltrosLiderancas();
  });
}
function aplicarFiltrosLiderancas() {
  const cidadeSelecionada = normalizar(
    document.getElementById("filtroCidadeLideranca")?.value
  );

  const bairroSelecionado = normalizar(
    document.getElementById("filtroBairroLideranca")?.value
  );

  const busca = normalizar(
    document.getElementById("buscaLideranca")?.value
  );

  const listaFiltrada = liderancasCarregadas.filter(item => {
    const correspondeCidade =
      !cidadeSelecionada ||
      normalizar(item.cidade) === cidadeSelecionada;

    const correspondeBairro =
      !bairroSelecionado ||
      normalizar(item.bairro) === bairroSelecionado;

    const textoCompleto = normalizar([
      item.nome,
      item.telefone,
      item.cidade,
      item.bairro,
      item.observacao,
      item.status
    ].join(" "));

    const correspondeBusca =
      !busca ||
      textoCompleto.includes(busca);

    return (
      correspondeCidade &&
      correspondeBairro &&
      correspondeBusca
    );
  });

  montarTabelaLiderancas(listaFiltrada);
}

async function excluirLideranca(id) {
  if (!confirm("Deseja excluir esta liderança?")) return;

  try {
    await buscarJsonLiderancas(`${API_LIDERANCAS_XAVIER}/${id}`, {
      method: "DELETE"
    });

    carregarLiderancas();

  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao excluir liderança.");
  }
}

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}