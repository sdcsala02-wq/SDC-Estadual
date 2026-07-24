"use strict";

const db = require("./db");

async function corrigirEstrutura() {
  try {
    console.log("Verificando banco utilizado pelo Lucas e Cássio 2027...");

    const conexao = await db.query(`
      SELECT
        current_database() AS banco,
        current_schema() AS esquema
    `);

    console.log("Banco:", conexao.rows[0].banco);
    console.log("Esquema:", conexao.rows[0].esquema);

    const tabela = await db.query(`
      SELECT
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_name = 'eleitores'
      ORDER BY table_schema
    `);

    console.log("Tabelas eleitores encontradas:", tabela.rows);

    await db.query(`
      ALTER TABLE public.eleitores
      ADD COLUMN IF NOT EXISTS lideranca_id INTEGER;

      ALTER TABLE public.eleitores
      ADD COLUMN IF NOT EXISTS criado_por_usuario_id INTEGER;

      ALTER TABLE public.eleitores
      ADD COLUMN IF NOT EXISTS atualizado_por_usuario_id INTEGER;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_eleitores_lideranca'
        ) THEN
          ALTER TABLE public.eleitores
          ADD CONSTRAINT fk_eleitores_lideranca
          FOREIGN KEY (lideranca_id)
          REFERENCES public.liderancas(id)
          ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_eleitores_lideranca
      ON public.eleitores(lideranca_id);
    `);

    const verificacao = await db.query(`
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'eleitores'
        AND column_name IN (
          'lideranca_id',
          'criado_por_usuario_id',
          'atualizado_por_usuario_id'
        )
      ORDER BY column_name
    `);

    console.log("");
    console.log("Colunas encontradas após a correção:");
    console.table(verificacao.rows);

    if (verificacao.rows.length !== 3) {
      throw new Error(
        "Nem todas as colunas foram criadas na tabela public.eleitores."
      );
    }

    console.log("");
    console.log("Estrutura corrigida com sucesso.");
  } catch (error) {
    console.error("");
    console.error("Erro ao corrigir a estrutura:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

corrigirEstrutura();