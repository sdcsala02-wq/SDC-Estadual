document.addEventListener("DOMContentLoaded", () => {
  carregarDashboard();
});

async function carregarDashboard() {
  try {
    const resposta = await fetch("/api/dashboard/resumo", {
      method: "GET",
      credentials: "include"
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.ok) {
      throw new Error(
        dados.mensagem ||
        "Erro ao carregar o dashboard."
      );
    }

    preencherCards(dados.resumo || {});

    preencherUltimosEleitores(
      dados.ultimos_eleitores || []
    );

    desenharRankingBairros(
      dados.por_bairro || []
    );

    desenharRankingCidades(
      dados.por_cidade || []
    );

    desenharEvolucaoMensal(
      dados.evolucao_mensal || []
    );

    desenharPerfilBase(
      dados.resumo || {}
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar dashboard:",
      erro
    );
  }
}

function preencherCards(resumo) {
  atualizarTexto(
    "totalEleitores",
    resumo.total_eleitores
  );

  atualizarTexto(
    "totalCidades",
    resumo.total_cidades
  );

  atualizarTexto(
    "bairrosAtendidos",
    resumo.bairros_atendidos
  );

  atualizarTexto(
    "totalLiderancas",
    resumo.total_liderancas
  );
}

function atualizarTexto(id, valor) {
  const elemento =
    document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.textContent =
    Number(valor) || 0;
}

function preencherUltimosEleitores(eleitores) {
  const tbody =
    document.getElementById(
      "listaEleitores"
    );

  if (!tbody) {
    return;
  }

  if (eleitores.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          Nenhum eleitor encontrado.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    eleitores.map(eleitor => `
      <tr>
        <td>
          ${escaparHtml(eleitor.nome)}
        </td>

        <td>
          ${escaparHtml(eleitor.telefone)}
        </td>

        <td>
          ${escaparHtml(eleitor.bairro)}
        </td>

        <td>
          ${escaparHtml(eleitor.cidade)}
        </td>

        <td>
          ${formatarData(
      eleitor.criado_em
    )}
        </td>
      </tr>
    `).join("");
}

function desenharRankingBairros(lista) {
  const container =
    document.getElementById(
      "rankingBairros"
    );

  if (!container) {
    return;
  }

  desenharRanking(
    container,
    lista,
    "bairro"
  );
}

function desenharRankingCidades(lista) {
  const container =
    document.getElementById(
      "rankingCidades"
    );

  if (!container) {
    return;
  }

  desenharRanking(
    container,
    lista,
    "cidade"
  );
}

function desenharRanking(
  container,
  lista,
  campoNome
) {
  if (!lista.length) {
    container.innerHTML = `
      <p class="dashboard-vazio">
        Nenhum dado disponível.
      </p>
    `;

    return;
  }

  const maiorTotal =
    Math.max(
      ...lista.map(item =>
        Number(item.total) || 0
      ),
      1
    );

  container.innerHTML =
    lista.map((item, indice) => {
      const total =
        Number(item.total) || 0;

      const percentual =
        Math.max(
          4,
          Math.round(
            total / maiorTotal * 100
          )
        );

      return `
  <div class="ranking-item">

    <span class="ranking-nome">
      ${escaparHtml(item[campoNome])}
    </span>

    <div class="ranking-barra">
      <div
        class="ranking-preenchimento"
        style="width:${percentual}%"
      ></div>
    </div>
      
    <strong class="ranking-total">
      ${total}
    </strong>

  </div>
`;
    }).join("");
}

function desenharEvolucaoMensal(lista) {
  const container =
    document.getElementById(
      "evolucaoMensal"
    );

  if (!container) {
    return;
  }

  if (!lista.length) {
    container.innerHTML = `
      <p class="dashboard-vazio">
        Nenhum cadastro mensal disponível.
      </p>
    `;

    return;
  }

  const maiorTotal =
    Math.max(
      ...lista.map(item =>
        Number(item.total) || 0
      ),
      1
    );

  container.innerHTML = `
    <div class="grafico-colunas">
      ${lista.map(item => {
    const total =
      Number(item.total) || 0;

    const altura =
      Math.max(
        8,
        Math.round(
          total / maiorTotal * 100
        )
      );

    return `
          <div class="grafico-coluna-item">
            <span class="grafico-valor">
              ${total}
            </span>

            <div class="grafico-area">
              <div
                class="grafico-coluna"
                style="height: ${altura}%"
              ></div>
            </div>

            <span class="grafico-legenda">
              ${nomeMes(item.mes)}/${item.ano}
            </span>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

function desenharPerfilBase(resumo) {
  const container =
    document.getElementById(
      "legendaStatus"
    );

  if (!container) {
    return;
  }

  const total =
    Number(
      resumo.total_eleitores
    ) || 0;

  const totalCentro =
    document.getElementById("donutTotal");

  if (totalCentro) {
    totalCentro.textContent = total;
  }

  const novos =
    Number(
      resumo.novos_cadastros
    ) || 0;

  const anteriores =
    Math.max(
      total - novos,
      0
    );

  container.innerHTML = `
    <div class="perfil-item">
      <span>
        Novos neste mês
      </span>

      <strong>
        ${novos}
      </strong>
    </div>

    <div class="perfil-item">
      <span>
        Base anterior
      </span>

      <strong>
        ${anteriores}
      </strong>
    </div>

    <div class="perfil-item">
      <span>
        Total da base
      </span>

      <strong>
        ${total}
      </strong>
    </div>
  `;
}

function nomeMes(numeroMes) {
  const meses = [
    "",
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ"
  ];

  return meses[
    Number(numeroMes)
  ] || "-";
}

function formatarData(valor) {
  if (!valor) {
    return "-";
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "-";
  }

  return data.toLocaleDateString(
    "pt-BR"
  );
}

function escaparHtml(valor) {
  const texto =
    String(valor ?? "-");

  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}