import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

import os
# Se estiver usando .env para carregar variáveis
from dotenv import load_dotenv

from db_connection import DatabaseConnection

# Imports do LangChain
from langchain_community.vectorstores import FAISS
# from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser


load_dotenv()


# Instanciando com as credenciais
db = DatabaseConnection(
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    port=os.getenv("DB_PORT")
)


app = FastAPI(title="Rosana Desk - Local RAG (Llama 3.2)")



# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_data(tabela: str):
    try:
        with db as connection:
            # 1. Busca dados (retorna lista de RealDictRow)
            rows = connection.fetch_all(f"SELECT * FROM {tabela};")
            
            # 2. CONVERSÃO CRÍTICA:
            # Transformamos cada linha em dict normal e depois tudo em string JSON.
            # 'default=str' é importante para converter datas e decimais que o JSON padrão não aceita.
            dados_string = json.dumps([dict(row) for row in rows], indent=2, default=str, ensure_ascii=False)
            
            # Opcional: Adicionar um cabeçalho para a IA saber de qual tabela veio
            return f"Contexto da Tabela '{tabela}':\n{dados_string}"
    except Exception as e:
        print(f"Erro na tabela {tabela}: {e}")
        return "" # Retorna string vazia em caso de erro para não quebrar a lista


# O restante segue igual
tabelas = ['categoria', 'cliente', 'loja', 'operador', 'produto', 'venda']

# Agora knowledge_base será uma lista de STRINGS, que a OpenAI consegue ler
knowledge_base = [
    get_data(tabelas[0]),
    get_data(tabelas[1]),
    get_data(tabelas[2]),
    get_data(tabelas[3]),
    get_data(tabelas[4]),
    get_data(tabelas[5])
]

# --- 2. CONFIGURAÇÃO LLAMA 3.2 ---
# print("Inicializando Llama 3.2...")

# # Modelo de Chat com configurações otimizadas
# llm = ChatOllama(
#     model="llama3.2:latest",
#     temperature=0.7,
#     num_predict=1024,
#     top_k=40,
#     top_p=0.9
# )

print("Inicializando gpt-4o-mini...")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# Modelo de Embeddings
# embeddings = OllamaEmbeddings(model="llama3.2:latest")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


# --- 3. VECTOR STORE ---
vector_store = FAISS.from_texts(knowledge_base, embedding=embeddings)
retriever = vector_store.as_retriever(
    search_kwargs={"k": 10})  # Aumentado para 10 trechos

# --- 4. PROMPT TEMPLATE OTIMIZADO ---
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

prompt = ChatPromptTemplate.from_template(template)

# --- 5. CADEIA RAG ---
rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)


# --- API ENDPOINTS ---
class UserMessage(BaseModel):
    message: str


@app.get("/")
async def root():
    return {
        "message": "Rosana Desk API - OPENAI",
        "status": "online",
        "model": "OPENAI"
    }


@app.post("/chat")
async def chat_endpoint(user_msg: UserMessage):
    print(f"Pergunta recebida: {user_msg.message}")

    try:
        response = rag_chain.invoke(user_msg.message)
        print(f"Resposta gerada: {response[:100]}...")

        return {
            "response": response,
            "role": "ai",
            "model": "llama3.2:latest"
        }
    except Exception as e:
        print(f"Erro no processamento: {e}")
        return {
            "response": "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente.",
            "role": "ai",
            "error": True
        }


@app.get("/health")
async def health_check():
    """Endpoint de health check"""
    return {
        "status": "healthy",
        "model": "llama3.2:latest",
        "service": "Rosana Desk RAG"
    }

if __name__ == "__main__":
    print("Iniciando servidor Rosana Desk com Llama 3.2...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
