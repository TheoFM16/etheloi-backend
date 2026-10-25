import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TAVILY_API_KEY = "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";

// Função para buscar na web usando Tavily
async function buscarNaWeb(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        max_results: 3
      })
    });
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results.map(r => `- ${r.title}: ${r.content}`).join("\n");
    }
  } catch (err) {
    console.error("Erro na busca Tavily:", err);
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

    // 2. BUSCA NA WEB COM TAVILY (Se a pergunta parecer pedir factos/pesquisa)
    let contextoWeb = "";
    const precisaPesquisa = lowerMsg.includes('scp') || lowerMsg.includes('quem é') || lowerMsg.includes('pesquise') || lowerMsg.includes('notícia') || lowerMsg.includes('quanto foi') || lowerMsg.includes('como funciona');
    
    if (precisaPesquisa && !image) {
      contextoWeb = await buscarNaWeb(message);
    }

    // 3. CONSTRUÇÃO DO PROMPT PARA O GEMINI
    let contents = [];
    let promptFinal = message;

    if (contextoWeb) {
      promptFinal = `Com base nestes dados da web:\n${contextoWeb}\n\nResponda à pergunta do usuário: ${message}`;
    }

    let currentParts = [{ text: promptFinal }];

    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        currentParts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    contents.push({ role: 'user', parts: currentParts });

    const config = {
      systemInstruction: "Tu és o Etheloi, uma inteligência artificial avançada criada pelo Theo. Responde sempre em Português de forma direta, clara e detalhada."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: config
    });

    const textoFinal = response.text || "Opa, ocorreu uma instabilidade. Pode repetir, mestre?";
    res.json({ reply: textoFinal });

  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
