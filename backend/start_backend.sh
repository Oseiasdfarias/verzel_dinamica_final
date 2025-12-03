#!/bin/bash
# start_backend.sh

echo "Iniciando Rosana Desk Backend com Llama 3.2"

# Verificar se Ollama está rodando
if ! pgrep -x "ollama" > /dev/null
then
    echo "Iniciando Ollama..."
    ollama serve &
    sleep 5
fi

# Verificar modelo Llama 3.2
echo "Verificando modelo Llama 3.2..."
if ! ollama list | grep -q "llama3.2"; then
    echo "📥 Baixando Llama 3.2..."
    ollama pull llama3.2:latest
fi

# Iniciar backend
echo "Iniciando servidor FastAPI..."
uv run uvicorn backend_rag:app --host 0.0.0.0 --port 8000 --reload