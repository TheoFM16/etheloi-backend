import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. GERADOR DE IMAGENS (Sem Pollinations, rápido e direto)
    const querImagem = (lowerMsg.includes('cria') || lowerMsg.includes('gere') || lowerMsg.includes('desenhe') || lowerMsg.includes('faça')) && 
                       (lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato') || lowerMsg.includes('anime'));

    if (querImagem && !image) {
      let promptLimpo = message
        .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();
      if (!promptLimpo) promptLimpo = message;

      // Usando uma API de imagens limpa e sem telas de espera
      const encodedPrompt = encodeURIComponent(promptLimpo);
      const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&nologo=true`;

      return res.json({ 
        reply: `Aqui está a tua imagem! 🎨\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CHAT DE TEXTO (Usando o gemini-1.5-flash de forma direta e rápida)
    let parts = [{ text: `Tu és o Etheloi, uma inteligência artificial avançada criada pelo Theo. Responde sempre em Português de forma direta, útil e amigável. Sê prestativo com programação, Roblox e jogos.\n\nUsuário: ${message}` }];

    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          role: "user",
          parts: parts
        }]
      },
      { timeout: 10000 }
    );

    const respostaTexto = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (respostaTexto) {
      return res.json({ reply: respostaTexto });
    } else {
      return res.json({ reply: "Opa mestre, recebi uma resposta vazia. Tenta mandar de novo!" });
    }

  } catch (error) {
    console.error("Erro no servidor:", error.response?.data || error.message);
    return res.json({ reply: "⚠️ Ocorreu uma instabilidade ao falar com o Gemini. Manda a mensagem de novo!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
