# 📚 Rosana Desk - Sistema RAG com Llama 3.2

## Documentação Completa do Projeto

### 🎯 Visão Geral

O **Rosana Desk** é uma plataforma de automação de atendimento que utiliza técnicas de RAG (Retrieval-Augmented Generation) com o modelo Llama 3.2 local. O sistema combina busca vetorial (FAISS) com um modelo de linguagem para fornecer respostas precisas baseadas em uma base de conhecimento específica.

---

## 📋 Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Classes Principais](#classes-principais)
3. [RAG Chain - Pipeline de Processamento](#rag-chain---pipeline-de-processamento)
4. [Sistema de Templates](#sistema-de-templates)
5. [Fluxo de Dados Completo](#fluxo-de-dados-completo)
6. [Instalação e Configuração](#instalação-e-configuração)
7. [Uso da API](#uso-da-api)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                   (Cliente HTTP)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP Request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Server                           │
│                    (porta 8000)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      RAG CHAIN                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Retriever (FAISS)                                 │   │
│  │    ↓                                                 │   │
│  │ 2. Prompt Template                                   │   │
│  │    ↓                                                 │   │
│  │ 3. LLM (Llama 3.2)                                   │   │
│  │    ↓                                                 │   │
│  │ 4. Output Parser                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Base de Conhecimento                       │
│                    (10 documentos)                           │
│                    ↕️ Embeddings                              │
│                   FAISS Vector Store                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Classes Principais

### 1. **FastAPI**

**Localização no código:**
```python
app = FastAPI(title="Rosana Desk - Local RAG (Llama 3.2)")
```

**Descrição:**
- Framework web moderno e assíncrono para Python
- Gera documentação automática (Swagger UI em `/docs`)
- Suporta validação de dados com Pydantic
- Alta performance comparável a Node.js

**Funções principais:**
- `@app.get()` - Define rotas GET
- `@app.post()` - Define rotas POST
- `app.add_middleware()` - Adiciona middlewares (CORS, etc)

**Uso no projeto:**
```python
# Cria servidor HTTP
# Define endpoints: /, /chat, /health
# Gerencia requisições e respostas JSON
```

**Exemplo de requisição:**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Qual o horário de atendimento?"}'
```

---

### 2. **BaseModel (Pydantic)**

**Localização no código:**
```python
class UserMessage(BaseModel):
    message: str
```

**Descrição:**
- Classe base do Pydantic para validação de dados
- Converte automaticamente tipos de dados
- Gera erros detalhados quando dados estão incorretos

**Validações automáticas:**
```python
# ✅ Válido
{"message": "Olá"}

# ❌ Inválido - falta campo obrigatório
{}

# ❌ Inválido - tipo errado
{"message": 123}  # Espera string
```

**Uso no projeto:**
```python
@app.post("/chat")
async def chat_endpoint(user_msg: UserMessage):
    # FastAPI valida automaticamente
    # Se passar, user_msg.message é garantidamente string
    print(user_msg.message)
```

**Exemplo com mais campos:**
```python
class UserMessage(BaseModel):
    message: str
    user_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.now)
```

---

### 3. **OllamaEmbeddings**

**Localização no código:**
```python
embeddings = OllamaEmbeddings(model="llama3.2:latest")
```

**Descrição:**
- Converte texto em vetores numéricos (embeddings)
- Cada texto vira uma lista de ~4000 números
- Textos similares têm vetores similares

**Como funciona:**
```python
# Texto original
texto = "O horário é das 09h às 18h"

# Embedding (simplificado)
vetor = [0.23, -0.45, 0.12, ..., 0.89]  # ~4096 dimensões
```

**Comparação de similaridade:**
```python
# Dois textos similares
texto1 = "Qual o horário?"
texto2 = "Que horas funciona?"

# Embeddings próximos
vetor1 = [0.5, 0.3, 0.2, ...]
vetor2 = [0.52, 0.28, 0.21, ...]  # Muito similar!

# Textos diferentes
texto3 = "Como fazer bolo?"
vetor3 = [0.1, -0.8, 0.9, ...]  # Muito diferente!
```

**Uso no projeto:**
```python
# Converte toda base de conhecimento em vetores
knowledge_base = ["texto1", "texto2", ...]
vetores = embeddings.embed_documents(knowledge_base)

# Quando usuário pergunta, converte pergunta também
pergunta = "Qual horário?"
vetor_pergunta = embeddings.embed_query(pergunta)

# FAISS compara vetores e acha os mais similares
```

---

### 4. **ChatOllama**

**Localização no código:**
```python
llm = ChatOllama(
    model="llama3.2:latest",
    temperature=0.7,
    num_predict=1024,
    top_k=40,
    top_p=0.9
)
```

**Descrição:**
- Interface para comunicar com o modelo Llama 3.2 local
- Gera texto baseado no prompt fornecido
- Roda localmente via Ollama

**Parâmetros explicados:**

| Parâmetro | Valor | O que faz |
|-----------|-------|-----------|
| `model` | llama3.2:latest | Modelo a ser usado |
| `temperature` | 0.7 | Criatividade (0=robótico, 1=criativo) |
| `num_predict` | 1024 | Máximo de tokens na resposta |
| `top_k` | 40 | Considera top 40 palavras mais prováveis |
| `top_p` | 0.9 | Nucleus sampling (diversidade) |

**Exemplo de uso direto:**
```python
# Sem RAG
resposta = llm.invoke("Olá, como vai?")
print(resposta)
# Output: "Olá! Vou bem, obrigado. Como posso ajudar?"

# Com contexto
prompt_completo = """
Contexto: O horário é 09h-18h
Pergunta: Qual o horário?
"""
resposta = llm.invoke(prompt_completo)
```

**Tipos de temperatura:**
```python
# temperature=0.0 (Determinístico)
# Sempre: "O horário é das 09h às 18h"

# temperature=0.7 (Balanceado)
# Pode variar: "Funcionamos das 09h às 18h"
#              "Atendemos das 09h até 18h"

# temperature=1.0 (Muito criativo)
# Pode inventar: "Estamos disponíveis o dia todo!" ❌
```

---

### 5. **FAISS (Facebook AI Similarity Search)**

**Localização no código:**
```python
vector_store = FAISS.from_texts(knowledge_base, embedding=embeddings)
retriever = vector_store.as_retriever(search_kwargs={"k": 3})
```

**Descrição:**
- Biblioteca otimizada para busca de vetores similares
- Extremamente rápida mesmo com milhões de documentos
- Usado por Facebook, Google, OpenAI

**Como funciona:**

```python
# 1. Criação do índice
knowledge_base = [
    "Horário: 09h-18h",      # Doc 0
    "WhatsApp usa PlugChat", # Doc 1
    "Backups às 02h00",      # Doc 2
    ...
]

# FAISS converte em vetores e indexa
vector_store = FAISS.from_texts(knowledge_base, embeddings)

# 2. Busca por similaridade
pergunta = "Que horas funciona?"

# FAISS encontra os 3 docs mais similares
resultados = retriever.invoke(pergunta)
# Retorna: [
#   "Horário: 09h-18h",           # Score: 0.95
#   "Atendimento segunda-sexta",  # Score: 0.73
#   "Canal #emergencia no Slack"  # Score: 0.42
# ]
```

**Visualização da busca:**
```
Pergunta: "Como integrar WhatsApp?"
       ↓
   Embedding
       ↓
   [0.3, 0.7, -0.2, ...]
       ↓
   FAISS compara com todos vetores
       ↓
┌─────────────────────────────────┐
│ Doc 1: WhatsApp + PlugChat  ✓   │  95% similar
│ Doc 5: API REST integração  ✓   │  78% similar
│ Doc 3: Webhooks             ✓   │  65% similar
│ Doc 2: Backups              ✗   │  12% similar
└─────────────────────────────────┘
       ↓
   Retorna top 3
```

**Parâmetros do retriever:**
```python
retriever = vector_store.as_retriever(
    search_kwargs={
        "k": 3,              # Quantos docs retornar
        "fetch_k": 20,       # Quantos considerar antes de filtrar
        "score_threshold": 0.5  # Threshold de similaridade
    }
)
```

---

### 6. **ChatPromptTemplate**

**Localização no código:**
```python
prompt = ChatPromptTemplate.from_template(template)
```

**Descrição:**
- Cria templates reutilizáveis com variáveis
- Formata prompts no padrão do modelo
- Suporta múltiplas mensagens (system, user, assistant)

**Como funciona:**

```python
# Template com variáveis
template = """
System: Você é {nome}
Context: {contexto}
User: {pergunta}
"""

# LangChain substitui as variáveis
dados = {
    "nome": "Rosana Desk",
    "contexto": "Horário 09h-18h",
    "pergunta": "Qual o horário?"
}

prompt_formatado = prompt.invoke(dados)
# Result:
"""
System: Você é Rosana Desk
Context: Horário 09h-18h
User: Qual o horário?
"""
```

**Tipos de templates:**

```python
# 1. Template simples
ChatPromptTemplate.from_template("Responda: {question}")

# 2. Template com múltiplas mensagens
ChatPromptTemplate.from_messages([
    ("system", "Você é um assistente"),
    ("user", "{question}"),
])

# 3. Template com few-shot examples
ChatPromptTemplate.from_messages([
    ("system", "Traduza para inglês"),
    ("user", "Olá"), ("assistant", "Hello"),
    ("user", "Tchau"), ("assistant", "Goodbye"),
    ("user", "{text}"),
])
```

---

### 7. **StrOutputParser**

**Localização no código:**
```python
| StrOutputParser()
```

**Descrição:**
- Extrai apenas o texto da resposta do modelo
- Remove metadados e formatação extra
- Retorna string limpa

**Antes e depois:**

```python
# Output do LLM (objeto complexo)
{
    "content": "O horário é das 09h às 18h",
    "response_metadata": {
        "model": "llama3.2",
        "created_at": "2024-...",
        "done": true,
        "total_duration": 1234567
    },
    "id": "run-abc123",
    "usage_metadata": {...}
}

# Depois do StrOutputParser
"O horário é das 09h às 18h"
```

**Outros parsers disponíveis:**

```python
# JSON Parser
from langchain_core.output_parsers import JsonOutputParser
# Output: {"resposta": "09h-18h", "tipo": "horário"}

# List Parser
from langchain_core.output_parsers import CommaSeparatedListParser
# Output: ["09h", "18h", "segunda", "sexta"]

# Pydantic Parser
from langchain_core.output_parsers import PydanticOutputParser
# Output: RespostaModel(horario="09h-18h", dias=["seg", "sex"])
```

---

### 8. **RunnablePassthrough**

**Localização no código:**
```python
{"context": retriever, "question": RunnablePassthrough()}
```

**Descrição:**
- Passa dados adiante sem modificar
- Útil quando você quer preservar o input original
- Funciona como um "bypass" na chain

**Exemplo prático:**

```python
# Sem RunnablePassthrough (pergunta se perde)
chain = (
    retriever  # Retorna apenas contexto
    | prompt   # Não tem acesso à pergunta original!
    | llm
)

# Com RunnablePassthrough (pergunta é preservada)
chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt   # Tem acesso tanto ao contexto quanto à pergunta!
    | llm
)
```

**Casos de uso:**

```python
# 1. Preservar input original
{"original": RunnablePassthrough(), "processado": alguma_funcao}

# 2. Passar múltiplos valores
{
    "query": RunnablePassthrough(),
    "timestamp": lambda x: datetime.now(),
    "user": lambda x: "sistema"
}

# 3. Debugging
chain = (
    RunnablePassthrough()  # Não modifica nada
    | lambda x: print(f"DEBUG: {x}") or x  # Log e passa adiante
    | proxima_etapa
)
```

---

## ⛓️ RAG Chain - Pipeline de Processamento

### Estrutura Completa

```python
rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
```

### Operador Pipe (`|`) Explicado

O `|` no LangChain funciona como **composição de funções**, similar ao pipe do Unix/Linux:

```bash
# Unix pipe
cat arquivo.txt | grep "erro" | wc -l

# LangChain pipe
input | funcao1 | funcao2 | funcao3
```

**Equivalente sem pipe:**
```python
def rag_chain_manual(question):
    # Etapa 1: Buscar contexto
    context = retriever.invoke(question)
    data = {"context": context, "question": question}
    
    # Etapa 2: Formatar prompt
    formatted_prompt = prompt.invoke(data)
    
    # Etapa 3: Gerar resposta
    llm_response = llm.invoke(formatted_prompt)
    
    # Etapa 4: Extrair texto
    final_response = StrOutputParser().invoke(llm_response)
    
    return final_response

# Com pipe (muito mais limpo!)
rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
```

### Fluxo Detalhado Passo a Passo

#### **ETAPA 1: Dicionário Inicial**
```python
{"context": retriever, "question": RunnablePassthrough()}
```

**Input:** `"Qual o horário de atendimento?"`

**Processo:**
1. `retriever` busca no FAISS os 3 docs mais similares
2. `RunnablePassthrough()` mantém a pergunta original

**Output:**
```python
{
    "context": [
        "O horário de atendimento do suporte humano é das 09h às 18h, de segunda a sexta, exceto feriados.",
        "Para problemas críticos, acionar o canal #emergencia no Slack da equipe.",
        "A empresa Verzel valoriza autonomia, comunicação assíncrona e entrega contínua de valor."
    ],
    "question": "Qual o horário de atendimento?"
}
```

---

#### **ETAPA 2: Prompt Template**
```python
| prompt
```

**Input:** Dicionário da Etapa 1

**Processo:**
Substitui `{context}` e `{question}` no template

**Output:**
```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Você é o Rosana Desk, assistente virtual especializado da empresa Verzel.

INSTRUÇÕES CRÍTICAS:
1. Use EXCLUSIVAMENTE as informações do contexto fornecido
2. Se a resposta não estiver no contexto, diga claramente que não sabe
3. Seja prestativo e ofereça alternativas quando possível
4. Mantenha linguagem profissional mas amigável
5. Formate respostas para melhor legibilidade

CONTEXTO DISPONÍVEL:
O horário de atendimento do suporte humano é das 09h às 18h, de segunda a sexta, exceto feriados.
Para problemas críticos, acionar o canal #emergencia no Slack da equipe.
A empresa Verzel valoriza autonomia, comunicação assíncrona e entrega contínua de valor.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Qual o horário de atendimento?<|eot_id|><|start_header_id|>assistant<|end_header_id|>
```

---

#### **ETAPA 3: LLM (Llama 3.2)**
```python
| llm
```

**Input:** String formatada da Etapa 2

**Processo:**
1. Llama 3.2 lê o prompt completo
2. Identifica o contexto fornecido
3. Gera resposta baseada APENAS no contexto
4. Retorna objeto com resposta + metadados

**Output:**
```python
{
    "content": "O atendimento do suporte humano da Verzel funciona das 09h às 18h, de segunda a sexta-feira, exceto em feriados. Para situações críticas fora desse horário, você pode acionar o canal #emergencia no Slack da equipe.",
    "response_metadata": {
        "model": "llama3.2:latest",
        "created_at": "2024-01-15T10:30:00Z",
        "done": true,
        "total_duration": 2847291234,
        "load_duration": 1234567,
        "prompt_eval_count": 156,
        "eval_count": 48,
        "eval_duration": 1234567890
    },
    "id": "run-abc123def456",
    "usage_metadata": {
        "input_tokens": 156,
        "output_tokens": 48,
        "total_tokens": 204
    }
}
```

---

#### **ETAPA 4: Output Parser**
```python
| StrOutputParser()
```

**Input:** Objeto complexo da Etapa 3

**Processo:**
Extrai apenas o campo `content`

**Output:**
```
"O atendimento do suporte humano da Verzel funciona das 09h às 18h, de segunda a sexta-feira, exceto em feriados. Para situações críticas fora desse horário, você pode acionar o canal #emergencia no Slack da equipe."
```

---

### Visualização Gráfica do Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: "Qual o horário de atendimento?"                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │ ETAPA 1: Dicionário + FAISS           │
        │                                       │
        │ retriever → busca 3 docs similares    │
        │ RunnablePassthrough → preserva query  │
        └───────────────┬───────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ {"context": [...], "question": "..."}│
        └───────────────┬───────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ ETAPA 2: Prompt Template              │
        │                                       │
        │ Substitui {context} e {question}      │
        └───────────────┬───────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ String formatada com tags especiais   │
        │ <|begin_of_text|>...                  │
        └───────────────┬───────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ ETAPA 3: LLM (Llama 3.2)              │
        │                                       │
        │ Gera resposta baseada no contexto     │
        └───────────────┬───────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ Objeto complexo com metadata          │
        │ {content: "...", metadata: {...}}     │
        └───────────────┬───────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ ETAPA 4: StrOutputParser              │
        │                                       │
        │ Extrai apenas o texto                 │
        └───────────────┬───────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT: "O atendimento funciona das 09h às 18h..."          │
└─────────────────────────────────────────────────────────────┘
```

### Modos de Execução da Chain

```python
# 1. Síncrono (bloqueia até terminar)
response = rag_chain.invoke("Qual o horário?")
print(response)

# 2. Assíncrono (não bloqueia)
response = await rag_chain.ainvoke("Qual o horário?")

# 3. Streaming (resposta em tempo real)
for chunk in rag_chain.stream("Qual o horário?"):
    print(chunk, end="", flush=True)
# Output: "O atendimento func... iona das 09... h às 18h..."

# 4. Batch (múltiplas perguntas de uma vez)
perguntas = [
    "Qual o horário?",
    "Como integrar WhatsApp?",
    "Onde acessar o backup?"
]
respostas = rag_chain.batch(perguntas)
```

---

## 📝 Sistema de Templates

### Anatomia do Template

```python
template = """
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Você é o Rosana Desk, assistente virtual especializado da empresa Verzel.

INSTRUÇÕES CRÍTICAS:
1. Use EXCLUSIVAMENTE as informações do contexto fornecido
2. Se a resposta não estiver no contexto, diga claramente que não sabe
3. Seja prestativo e ofereça alternativas quando possível
4. Mantenha linguagem profissional mas amigável
5. Formate respostas para melhor legibilidade

CONTEXTO DISPONÍVEL:
{context}<|eot_id|><|start_header_id|>user<|end_header_id|>
{question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""
```

### Tags Especiais do Llama 3.2

| Tag | Significado | Uso |
|-----|-------------|-----|
| `<\|begin_of_text\|>` | Início da conversa | Marca o começo do prompt |
| `<\|start_header_id\|>system<\|end_header_id\|>` | Mensagem do sistema | Instruções e personalidade |
| `<\|start_header_id\|>user<\|end_header_id\|>` | Mensagem do usuário | Pergunta real |
| `<\|start_header_id\|>assistant<\|end_header_id\|>` | Resposta do assistente | Onde o modelo começa a gerar |
| `<\|eot_id\|>` | End of Turn | Marca fim de cada turno |

**Por que essas tags existem?**

O Llama 3.2 foi treinado com essas tags específicas. É como ensinar um cachorro a sentar quando você fala "senta" - o modelo aprendeu que `<|start_header_id|>user<|end_header_id|>` significa "aqui vem a pergunta do usuário".

### Seções do Template

#### **1. System (Personalidade e Regras)**

```python
<|start_header_id|>system<|end_header_id|>
Você é o Rosana Desk, assistente virtual especializado da empresa Verzel.

INSTRUÇÕES CRÍTICAS:
1. Use EXCLUSIVAMENTE as informações do contexto fornecido
2. Se a resposta não estiver no contexto, diga claramente que não sabe
...
```

**Função:**
- Define QUEM é o assistente
- Estabelece COMO ele deve se comportar
- Define REGRAS que deve seguir

**Analogia:**
É como o treinamento que um atendente recebe antes de começar a trabalhar.

#### **2. Context (Conhecimento Relevante)**

```python
CONTEXTO DISPONÍVEL:
{context}
```

**Função:**
- Injeta informações relevantes recuperadas pelo FAISS
- O modelo DEVE usar essas informações para responder
- É a base do RAG (Retrieval-Augmented Generation)

**Exemplo de substituição:**
```python
# Antes
{context}

# Depois (substituído pelo FAISS)
O horário de atendimento do suporte humano é das 09h às 18h, de segunda a sexta, exceto feriados.
Para problemas críticos, acionar o canal #emergencia no Slack da equipe.
```

#### **3. User (Pergunta)**

```python
<|start_header_id|>user<|end_header_id|>
{question}<|eot_id|>
```

**Função:**
- Contém a pergunta real do usuário
- Substituída pela query recebida na API

**Exemplo:**
```python
# Antes
{question}

# Depois
Qual o horário de atendimento?
```

#### **4. Assistant (Resposta)**

```python
<|start_header_id|>assistant<|end_header_id|>
```

**Função:**
- Marca onde o modelo deve começar a gerar a resposta
- Não tem conteúdo predefinido
- O Llama 3.2 continua a partir daqui

### Placeholders (Variáveis Dinâmicas)

**Sintaxe:**
```python
{nome_da_variavel}
```

**Variáveis no template atual:**
- `{context}` - Substituído pelos docs do FAISS
- `{question}` - Substituído pela pergunta do usuário

**Como adicionar mais variáveis:**

```python
template = """
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Você é {assistant_name}, especialista em {specialty}.
Hoje é {current_date}.
Seu idioma preferido é {language}.

CONTEXTO:
{context}

<|start_header_id|>user<|end_header_id|>
{question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

# Uso na chain
from datetime import datetime

rag_chain = (
    {
        "context": retriever,
        "question": RunnablePassthrough(),
        "assistant_name": lambda x: "Rosana Desk",
        "specialty": lambda x: "atendimento Verzel",
        "current_date": lambda x: datetime.now().strftime("%d/%m/%Y"),
        "language": lambda x: "português brasileiro"
    }
    | prompt
    | llm
    | StrOutputParser()
)
```

### Exemplo Completo de Substituição

#### **Template Original:**
```python
template = """
<|begin_of_text|><|start_header_