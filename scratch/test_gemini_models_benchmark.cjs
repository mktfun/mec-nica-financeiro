/**
 * BENCHMARK MULTI-MODELO GEMINI:
 * - gemini-3.1-flash-lite (3ª Geração Ultra-Rápida)
 * - models/gemini-2.5-flash-lite (2.5 Lite)
 * - models/gemini-2.5-flash      (2.5 Flash Padrão)
 * 
 * Ambiente isolado de testes: NÃO grava em produção.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Carrega de process.env ou de variável local sem expor no Git
const API_KEY = process.env.GEMINI_API_KEY || '';

const MODELS_TO_TEST = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (3ª Geração)', costInput1M: 0.25, costOutput1M: 1.00 },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', costInput1M: 0.10, costOutput1M: 0.40 },
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (Padrão)', costInput1M: 0.50, costOutput1M: 2.00 }
];

async function callGemini(modelId, prompt, systemInstruction, customKey) {
  const key = customKey || API_KEY;
  if (!key) {
    throw new Error('API Key não fornecida.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`;
  const start = Date.now();
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        }
      })
    });

    const elapsed = Date.now() - start;
    const json = await res.json();
    
    if (json.error) {
      return { success: false, error: json.error.message, elapsed };
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = json.usageMetadata || {};

    return {
      success: true,
      text,
      elapsed,
      promptTokens: usage.promptTokenCount || 0,
      candidatesTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0
    };
  } catch (err) {
    return { success: false, error: err.message, elapsed: Date.now() - start };
  }
}

module.exports = {
  MODELS_TO_TEST,
  callGemini
};
