const express = require("express");
const router = express.Router();
const pool = require("../db");

// GARANTIR TABELA
async function garantirTabelaLiderancas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS liderancas (
      id SERIAL PRIMARY KEY,
      cidade VARCHAR(150),
      bairro VARCHAR(120) NOT NULL,
      nome VARCHAR(160) NOT NULL,
      telefone VARCHAR(40),
      observacao TEXT,
      ativo BOOLEAN DEFAULT true,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE liderancas
    ADD COLUMN IF NOT EXISTS cidade VARCHAR(150);
  `);

  await pool.query(`
    ALTER TABLE liderancas
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
  `);

  await pool.query(`
    ALTER TABLE liderancas
    ADD COLUMN IF NOT EXISTS observacao TEXT;
  `);
}

// LISTAR TODAS AS LIDERANÇAS
router.get("/", async (req, res) => {
  try {
    await garantirTabelaLiderancas();

    const resultado = await pool.query(`
      SELECT
        id,
        cidade,
        bairro,
        nome,
        telefone,
        observacao,
        ativo,
        CASE
          WHEN COALESCE(ativo, true) = true
            THEN 'ATIVO'
          ELSE 'INATIVO'
        END AS status,
        criado_em
      FROM liderancas
      WHERE COALESCE(ativo, true) = true
      ORDER BY
        cidade NULLS LAST,
        bairro,
        nome
    `);

    res.json(resultado.rows);

  } catch (erro) {
    console.error("Erro ao listar lideranças:", erro);

    res.status(500).json({
      erro: "Erro ao listar lideranças",
      detalhe: erro.message
    });
  }
});

// RESUMO DAS LIDERANÇAS
router.get("/resumo", async (req, res) => {
  try {
    await garantirTabelaLiderancas();

    const resultado = await pool.query(`
      SELECT
        l.id,
        l.cidade,
        l.bairro,
        l.nome,
        l.telefone,
        l.observacao,
        l.ativo,

        CASE
          WHEN COALESCE(l.ativo, true) = true
            THEN 'ATIVO'
          ELSE 'INATIVO'
        END AS status,

        0::int AS total_demandas,
        0::int AS abertas,
        0::int AS resolvidas

      FROM liderancas l

      WHERE COALESCE(l.ativo, true) = true

      ORDER BY
        l.cidade NULLS LAST,
        l.bairro,
        l.nome
    `);

    res.json(resultado.rows);

  } catch (erro) {
    console.error(
      "Erro ao gerar resumo das lideranças:",
      erro
    );

    res.status(500).json({
      erro: "Erro ao gerar resumo das lideranças",
      detalhe: erro.message
    });
  }
});

// BUSCAR LIDERANÇA POR BAIRRO
router.get("/bairro/:bairro", async (req, res) => {
  try {
    await garantirTabelaLiderancas();

    const { bairro } = req.params;

    const resultado = await pool.query(`
      SELECT
        id,
        cidade,
        bairro,
        nome,
        telefone,
        observacao,
        ativo,
        CASE
          WHEN COALESCE(ativo, true) = true
            THEN 'ATIVO'
          ELSE 'INATIVO'
        END AS status,
        criado_em
      FROM liderancas
      WHERE UPPER(TRIM(bairro)) = UPPER(TRIM($1))
        AND COALESCE(ativo, true) = true
      LIMIT 1
    `, [bairro]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: "Nenhuma liderança encontrada."
      });
    }

    res.json(resultado.rows[0]);

  } catch (erro) {
    console.error(
      "Erro ao buscar liderança:",
      erro
    );

    res.status(500).json({
      erro: "Erro ao buscar liderança",
      detalhe: erro.message
    });
  }
});

// CADASTRAR LIDERANÇA
router.post("/", async (req, res) => {
  try {
    await garantirTabelaLiderancas();

    const {
      cidade,
      bairro,
      nome,
      telefone,
      observacao,
      status
    } = req.body;

    const cidadeLimpa =
      String(cidade || "").trim();

    const bairroLimpo =
      String(bairro || "").trim();

    const nomeLimpo =
      String(nome || "").trim();

    const telefoneLimpo =
      String(telefone || "").trim();

    const observacaoLimpa =
      String(observacao || "").trim();

    if (!cidadeLimpa || !bairroLimpo || !nomeLimpo) {
      return res.status(400).json({
        erro:
          "Cidade, bairro e nome são obrigatórios."
      });
    }

    const ativo =
      String(status || "ATIVO")
        .toUpperCase() !== "INATIVO";

    const existente = await pool.query(`
      SELECT id
      FROM liderancas
      WHERE UPPER(TRIM(cidade)) = UPPER(TRIM($1))
        AND UPPER(TRIM(bairro)) = UPPER(TRIM($2))
        AND UPPER(TRIM(nome)) = UPPER(TRIM($3))
        AND COALESCE(ativo, true) = true
    `, [
      cidadeLimpa,
      bairroLimpo,
      nomeLimpo
    ]);

    if (existente.rows.length > 0) {
      return res.status(400).json({
        erro:
          "Esta liderança já está cadastrada nesta cidade e neste bairro."
      });
    }

    const resultado = await pool.query(`
      INSERT INTO liderancas (
        cidade,
        bairro,
        nome,
        telefone,
        observacao,
        ativo
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        cidade,
        bairro,
        nome,
        telefone,
        observacao,
        ativo,
        CASE
          WHEN ativo = true
            THEN 'ATIVO'
          ELSE 'INATIVO'
        END AS status,
        criado_em
    `, [
      cidadeLimpa,
      bairroLimpo,
      nomeLimpo,
      telefoneLimpo || null,
      observacaoLimpa || null,
      ativo
    ]);

    res.status(201).json({
      mensagem:
        "Liderança cadastrada com sucesso.",
      lideranca: resultado.rows[0]
    });

  } catch (erro) {
    console.error(
      "Erro ao cadastrar liderança:",
      erro
    );

    res.status(500).json({
      erro: "Erro ao cadastrar liderança",
      detalhe: erro.message
    });
  }
});

// EDITAR LIDERANÇA
router.put("/:id", async (req, res) => {
  try {
    await garantirTabelaLiderancas();

    const { id } = req.params;

    const {
      cidade,
      bairro,
      nome,
      telefone,
      observacao,
      status
    } = req.body;

    const cidadeLimpa =
      String(cidade || "").trim();

    const bairroLimpo =
      String(bairro || "").trim();

    const nomeLimpo =
      String(nome || "").trim();

    const telefoneLimpo =
      String(telefone || "").trim();

    const observacaoLimpa =
      String(observacao || "").trim();

    if (!cidadeLimpa || !bairroLimpo || !nomeLimpo) {
      return res.status(400).json({
        erro:
          "Cidade, bairro e nome são obrigatórios."
      });
    }

    const ativo =
      String(status || "ATIVO")
        .toUpperCase() !== "INATIVO";

    const existente = await pool.query(`
      SELECT id
      FROM liderancas
      WHERE UPPER(TRIM(cidade)) = UPPER(TRIM($1))
        AND UPPER(TRIM(bairro)) = UPPER(TRIM($2))
        AND UPPER(TRIM(nome)) = UPPER(TRIM($3))
        AND id <> $4
        AND COALESCE(ativo, true) = true
    `, [
      cidadeLimpa,
      bairroLimpo,
      nomeLimpo,
      id
    ]);

    if (existente.rows.length > 0) {
      return res.status(400).json({
        erro:
          "Já existe outra liderança com este nome nesta cidade e neste bairro."
      });
    }

    const resultado = await pool.query(`
      UPDATE liderancas
      SET
        cidade = $1,
        bairro = $2,
        nome = $3,
        telefone = $4,
        observacao = $5,
        ativo = $6
      WHERE id = $7
      RETURNING
        id,
        cidade,
        bairro,
        nome,
        telefone,
        observacao,
        ativo,
        CASE
          WHEN ativo = true
            THEN 'ATIVO'
          ELSE 'INATIVO'
        END AS status,
        criado_em
    `, [
      cidadeLimpa,
      bairroLimpo,
      nomeLimpo,
      telefoneLimpo || null,
      observacaoLimpa || null,
      ativo,
      id
    ]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: "Liderança não encontrada."
      });
    }

    res.json({
      mensagem:
        "Liderança atualizada com sucesso.",
      lideranca: resultado.rows[0]
    });

  } catch (erro) {
    console.error(
      "Erro ao atualizar liderança:",
      erro
    );

    res.status(500).json({
      erro: "Erro ao atualizar liderança",
      detalhe: erro.message
    });
  }
});

// EXCLUIR LIDERANÇA
router.delete("/:id", async (req, res) => {
  try {
    await garantirTabelaLiderancas();

    const { id } = req.params;

    const resultado = await pool.query(`
      UPDATE liderancas
      SET ativo = false
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: "Liderança não encontrada."
      });
    }

    res.json({
      sucesso: true,
      mensagem:
        "Liderança excluída com sucesso."
    });

  } catch (erro) {
    console.error(
      "Erro ao excluir liderança:",
      erro
    );

    res.status(500).json({
      erro: "Erro ao excluir liderança",
      detalhe: erro.message
    });
  }
});

module.exports = router;