import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Variável para guardar o último assunto gerado (permite edições tipo "adiciona cabelo")
let ultimoPromptCriado = "pato";

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const lowerMsg = (message || '').toLowerCase();

    // 1. GERADOR DE IMAGENS INTELIGENTE
    const palavrasChave = ['cria', 'crie', 'gere', 'gerar', 'desenhe', 'faça', 'faca', 'mostre', 'foto', 'adiciona', 'adicione', 'coloca', 'põe', 'poe'];
    const querImagem = palavrasChave.some(p => lowerMsg.includes(p)) || lowerMsg.includes('cabelo') || lowerMsg.includes('anime');

    if (querImagem) {
      // Se o usuário pediu para adicionar algo ao último objeto (ex: "adiciona cabelo de anime nele")
      if ((lowerMsg.includes('adiciona') || lowerMsg.includes('coloca') || lowerMsg.includes('põe') || lowerMsg.includes('cabelo')) && ultimoPromptCriado) {
        ultimoPromptCriado = `${ultimoPromptCriado} with ${message}, high quality, detailed anime style`;
      } else {
        // Limpa o comando e guarda o novo foco
        ultimoPromptCriado = message
          .replace(/(cria|crie|gere|gerar|desenhe|faça|faca|mostre|adiciona|adicione|coloca|põe)\s+(uma|um)?\s*(foto|imagem|desenho)?\s*(de|do|da|sobre|pra mim|para mim|nele)?/gi, '')
          .trim();
        if (!ultimoPromptCriado) ultimoPromptCriado = message;
      }

      const encodedPrompt = encodeURIComponent(ultimoPromptCriado);
      // Usamos parâmetros otimizados do Pollinations para carregar mais rápido e sem travar
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 999999)}`;

      return res.json({ 
        reply: `Aqui está! Aplicado: *"${ultimoPromptCriado}"*\n\n![Imagem Gerada](${imageUrl})` 
      });
    }

    // 2. CHAMADA AO GEMINI PARA TEXTO COMUM
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: `Tu és o Etheloi, uma IA criada pelo Theo. Responde sempre em Português de forma direta e útil.\n\nUsuário: ${message}` }]
        }]
      },
      { timeout: 8000 }
    );

    const respostaTexto = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.json({ reply: respostaTexto || "Mestre, recebi uma resposta vazia. Tenta de novo!" });

  } catch (error) {
    console.error("Erro no chat:", error.message);
    return res.json({ reply: "Eita, o servidor deu uma engasgada. Manda a mensagem de novo!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
