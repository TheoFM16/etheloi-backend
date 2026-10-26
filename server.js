import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Função para tentar chamar o Gemini com diferentes modelos caso um esteja sobrecarregado
async function chamarGeminiComFallback(contents) {
  // Lista de modelos para tentar em ordem de preferência
  const modelos = ['gemini-3.8-flash', 'gemini-1.5-flash'];

  for (const modelo of modelos) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ role: "user", parts: contents }] },
        { timeout: 12000 }
      );

      const texto = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto) return texto;
    } catch (error) {
      console.log(`Modelo ${modelo} falhou ou com alta demanda, testando próximo...`);
    }
  }
  return null;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. DETECÇÃO DE IMAGEM (Pollinations AI)
    const verbosCriacao = ['cria ', 'crie ', 'gere ', 'gerar ', 'desenhe ', 'desenhar ', 'faça uma', 'faca uma', 'mostre uma', 'quero ver'];
    const temVerbo = verbosCriacao.some(v => lowerMsg.includes(v));
    const temTemaVisual = lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato') || lowerMsg.includes('anime');

    const querImagem = temVerbo && temTemaVisual;

    if (querImagem && !image) {
      let promptLimpo = message
        .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
        .trim();
      if (!promptLimpo) promptLimpo = message;

      const encodedPrompt = encodeURIComponent(promptLimpo);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;

      return res.json({ 
        reply: `Aqui está! 🎨\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CHAT DE TEXTO COM O SISTEMA DE FALLBACK
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

    const respostaTexto = await chamarGeminiComFallback(parts);

    if (respostaTexto) {
      return res.json({ reply: respostaTexto });
    } else {
      return res.json({ reply: "⚠️ Os servidores do Gemini estão com alta demanda no momento. Tenta enviar a mensagem novamente em instantes!" });
    }

  } catch (error) {
    console.error("Erro no servidor:", error.message);
    return res.json({ reply: "⚠️ Ocorreu uma instabilidade no servidor. Tenta de novo!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
