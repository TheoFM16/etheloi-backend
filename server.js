const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = "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";

// Módulo de pesquisa com as varas corretas do Fisch (Masterline Doomsekkar & Fabulous)
async function pesquisarDadosReais(query) {
  const cleanQuery = query.toLowerCase().trim();
  
  if (cleanQuery.includes("fisch") || cleanQuery.includes("vara")) {
    return `[DADOS OFICIAIS DO JOGO FISCH - ROBLOX]:
- As Melhores e Mais Fortes Varas do Fisch:
  1. Masterline (Uma das mais apelonas e fortes de todo o jogo, sorte e atributos insanos)
  2. Fabulous Rod (Extremamente apelona para peixes lendários, mitológicos e raros)
  3. Doomsekkar (Altíssima sorte para peixes Secretos)
  4. Pinion's Aria (Excelente para peixes pesados e raridades altas)
  5. Castbound`;
  }

  if (cleanQuery.includes("blox fruits") || cleanQuery.includes("fruta")) {
    return `[DADOS OFICIAIS DO JOGO BLOX FRUITS - ROBLOX]:
- Melhores Frutas para PvP: Dragon, Kitsune, Leopard, Dough (Despertada), Portal.
- Melhores Frutas para Farm/PvE/Missões: Buddha (A melhor de longe para farm), Magma (Despertada), Blizzard, Ice.`;
  }

  return "";
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    const contextoWeb = await pesquisarDadosReais(message);

    const systemPrompt = `Você é EXCLUSIVAMENTE o Etheloi, uma inteligência artificial moderna, ultra-rápida, direta e objetiva, criada exclusivamente pelo Theo.
Regras estritas:
1. Você NÃO é o ChatGPT e NÃO foi desenvolvido pela OpenAI. Você é o Etheloi, criado por Theo.
2. NUNCA invente itens ou nomes falsos de jogos. Use estritamente as informações reais da pesquisa enviadas junto com a pergunta quando houver.
3. Se o usuário perguntar o significado de alguma gíria da internet, responda e explique normalmente.
4. Seja sempre direto ao ponto, organizado em tópicos e tabelas limpas quando necessário, sem enrolação.`;

    const finalUserMessage = contextoWeb 
      ? `${contextoWeb}\n\n[Pergunta do Usuário]: ${message}\n(Responda utilizando os dados reais acima se for sobre o assunto)`
      : message;

    const messagesToSend = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: finalUserMessage }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: messagesToSend,
        temperature: 0.4
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      throw new Error(data.error?.message || "Erro na API do Groq");
    }

    const reply = data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor do Etheloi rodando na porta ${PORT}`);
});