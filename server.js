import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TAVILY_API_KEY = "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";

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. GERADOR DE IMAGENS (Pollinations AI)
    const palavrasChave = ['cria', 'crie', 'gere', 'gerar', 'desenhe', 'faça', 'faca', 'mostre', 'foto', 'adiciona', 'adicione', 'coloca', 'põe', 'poe'];
    const querImagem = palavrasChave.some(p => lowerMsg.includes(p)) && (lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato') || lowerMsg.includes('cabelo') || lowerMsg.includes('anime'));

    if (querImagem && !image) {
      let promptLimpo = message
        .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre|adiciona|adicione|coloca|põe)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim|nele)?/gi, '')
        .trim();

      if (!promptLimpo) promptLimpo = message;

      const encodedPrompt = encodeURIComponent(promptLimpo);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

      return res.json({ 
        reply: `Aqui está a imagem! 🎨\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. BUSCA WEB COM TAVILY (Opcional para perguntas gerais)
    let contextoWeb = "";
    if (lowerMsg.includes('scp') || lowerMsg.includes('roblox') || lowerMsg.includes('pesquise') || lowerMsg.includes('notícia')) {
      try {
        const tavilyRes = await axios.post("https://api.tavily.com/search", {
          api_key: TAVILY_API_KEY,
          query: message,
          search_depth: "basic",
          max_results: 2
        }, { timeout: 4000 });
        
        if (tavilyRes.data?.results) {
          contextoWeb = tavilyRes.data.results.map(r => r.content).join("\n");
        }
      } catch (e) {
        console.log("Aviso Tavily ignorado");
      }
    }

    // 3. CHAMADA DIRETA AO GEMINI (Modelo Flash 1.5 ou 2.0)
    let promptFinal = message;
    if (contextoWeb) {
      promptFinal = `Com base nestes dados da web:\n${contextoWeb}\n\nResponda: ${message}`;
    }

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: `Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma direta e útil.\n\nUsuário: ${promptFinal}` }]
        }]
      },
      { timeout: 8000 }
    );

    const respostaTexto = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (respostaTexto) {
      return res.json({ reply: respostaTexto });
    } else {
      return res.json({ reply: "Opa mestre, recebi uma resposta vazia do modelo. Tenta mandar novamente!" });
    }

  } catch (error) {
    console.error("Erro no chat:", error.response?.data || error.message);
    return res.json({ reply: "Eita, o servidor engasgou aqui agora. Manda a pergunta de novo!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
