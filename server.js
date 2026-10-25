import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ultimoPromptCriado = "pato";

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. DETECÇÃO RIGOROSA DE IMAGEM (Só dispara se houver intenção explícita de criar/desenhar)
    const verbosCriacao = ['cria ', 'crie ', 'gere ', 'gerar ', 'desenhe ', 'desenhar ', 'faça uma', 'faca uma', 'mostre uma', 'quero ver'];
    const temVerbo = verbosCriacao.some(v => lowerMsg.includes(v));
    const temTemaVisual = lowerMsg.includes('foto') || lowerMsg.includes('imagem') || lowerMsg.includes('desenho') || lowerMsg.includes('pato') || lowerMsg.includes('anime');

    const querImagem = temVerbo && temTemaVisual;

    if (querImagem) {
      if ((lowerMsg.includes('adiciona') || lowerMsg.includes('coloca') || lowerMsg.includes('põe') || lowerMsg.includes('cabelo')) && ultimoPromptCriado) {
        ultimoPromptCriado = `${ultimoPromptCriado} with ${message}, detailed anime style`;
      } else {
        ultimoPromptCriado = message
          .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim)?/gi, '')
          .trim();
        if (!ultimoPromptCriado) ultimoPromptCriado = message;
      }

      const encodedPrompt = encodeURIComponent(ultimoPromptCriado);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;

      return res.json({ 
        reply: `Aqui está! 🎨\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CHAT DE TEXTO NORMAL (Vai direto para o Gemini sem frescura)
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: `Tu és o Etheloi, uma inteligência artificial avançada criada pelo Theo. Responde sempre em Português de forma direta, útil e amigável. Sê prestativo com programação, Roblox e jogos.\n\nUsuário: ${message}` }]
        }]
      },
      { timeout: 10000 }
    );

    const respostaTexto = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (respostaTexto) {
      return res.json({ reply: respostaTexto });
    } else {
      return res.json({ reply: "Mestre, recebi uma resposta vazia. Tenta mandar novamente!" });
    }

  } catch (error) {
    console.error("Erro no chat:", error.message);
    return res.json({ reply: "Opa, ocorreu uma instabilidade rápida ao falar com o Gemini. Manda de novo!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
