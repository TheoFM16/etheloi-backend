import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TAVILY_API_KEY = "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";

// Função de Busca Web com Tavily
async function buscarNaWeb(query) {
  try {
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      max_results: 3
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results.map(r => `- ${r.title}: ${r.content}`).join("\n");
    }
  } catch (err) {
    console.error("Erro na busca Tavily:", err.message);
  }
  return "";
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. GERADOR DE IMAGENS (Pollinations AI)
    const palavrasChave = ['cria', 'crie', 'gere', 'gerar', 'desenhe', 'faça', 'faca', 'mostre', 'foto'];
    const querImagem = palavrasChave.some(p => lowerMsg.includes(p)) && (lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato'));

    if (querImagem && !image) {
      let promptLimpo = message
        .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();

      if (!promptLimpo) promptLimpo = message;

      const encodedPrompt = encodeURIComponent(promptLimpo);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

      return res.json({ 
        reply: `Aqui está a imagem que criei para ti!\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. BUSCA NA WEB COM TAVILY (Se precisar de factos reais)
    let contextoWeb = "";
    const precisaPesquisa = lowerMsg.includes('scp') || lowerMsg.includes('quem é') || lowerMsg.includes('pesquise') || lowerMsg.includes('notícia') || lowerMsg.includes('quanto foi');
    
    if (precisaPesquisa && !image) {
      contextoWeb = await buscarNaWeb(message);
    }

    // 3. CHAMADA DIRETA À API DO GEMINI VIA AXIOS
    let promptFinal = message;
    if (contextoWeb) {
      promptFinal = `Com base nestes dados reais da web:\n${contextoWeb}\n\nResponda à pergunta do usuário: ${message}`;
    }

    let contents = [{
      role: "user",
      parts: [{ text: promptFinal }]
    }];

    // Se houver imagem em Base64
    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contents[0].parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: contents,
        systemInstruction: {
          parts: [{ text: "Tu és o Etheloi, uma inteligência artificial avançada criada pelo Theo. Responde sempre em Português de forma direta, clara e precisa." }]
        }
      }
    );

    const candidate = geminiResponse.data?.candidates?.[0];
    const textoResposta = candidate?.content?.parts?.[0]?.text || "Opa, ocorreu uma instabilidade. Pode repetir, mestre?";

    res.json({ reply: textoResposta });

  } catch (error) {
    console.error("Erro no servidor:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
