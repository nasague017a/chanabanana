import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// MODELOS CONFIGURADOS
// -----------------------------
const MODEL_MAPPING = {
  "gpt-4": "moonshotai/kimi-k2-thinking",           // Kimi K2 Thinking
  "gpt-4o": "deepseek-ai/deepseek-v3.1",                 // DeepSeek V3.1
  "gpt-4-turbo": "deepseek-ai/deepseek-v3.1-terminus"    // DeepSeek V3.1 Terminus
};

// -----------------------------
// CONFIG DE THINKING & REASONING
// -----------------------------
const THINKING_ENABLED = true;
const REASONING_DISPLAY = false;

// -----------------------------
// NIM API URL
// -----------------------------
const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

// -----------------------------
// HEALTH CHECK
// -----------------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// -----------------------------
// MODELS ENDPOINT
// -----------------------------
app.get("/v1/models", (req, res) => {
  const models = Object.keys(MODEL_MAPPING).map((key) => ({
    id: key,
    object: "model"
  }));

  res.json({
    object: "list",
    data: models
  });
});

// -----------------------------
// CHAT COMPLETIONS
// -----------------------------
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;

    const targetModel = MODEL_MAPPING[model];
    if (!targetModel) {
      return res.status(400).json({
        error: `Modelo no soportado: ${model}`
      });
    }

    // -----------------------------
    // THINKING MODE
    // -----------------------------
    let reasoningConfig = {
      reasoning: THINKING_ENABLED ? { effort: "high" } : null,
      reasoning_output: REASONING_DISPLAY ? "all" : "none"
    };

    // -----------------------------
    // REQUEST A NVIDIA NIM
    // -----------------------------
    const response = await axios.post(
      `${NIM_BASE_URL}/chat/completions`,
      {
        model: targetModel,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2048,
        ...reasoningConfig
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NIM_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Enviamos respuesta estilo OpenAI
    res.json(response.data);

  } catch (err) {
    console.error("Error NIM:", err?.response?.data || err.message);
    res.status(500).json({
      error: "Error llamando a NVIDIA NIM",
      details: err?.response?.data || err.message
    });
  }
});

// -----------------------------
// PORT
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy corriendo en puerto ${PORT}`);
});
