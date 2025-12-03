import os
# Se estiver usando .env para carregar variáveis
from dotenv import load_dotenv

from db_connection import DatabaseConnection



load_dotenv()


# Instanciando com as credenciais
db = DatabaseConnection(
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    port=os.getenv("DB_PORT")
)

# USO 1: Com Context Manager (Recomendado - abre e fecha sozinho)
try:
    with db as connection:
        # Busca dados (retorna lista de dicts puros)
        dados = connection.fetch_all("SELECT * FROM cliente;")
        print(dados)
        # Saída: [{'table_name': 'x', ...}, {'table_name': 'y', ...}]

except Exception as e:
    print(e)


# # Supondo que 'db' já esteja instanciado
# try:
#     with db as connection:
#         tabelas = connection.list_tables()
        
#         print(f"Foram encontradas {len(tabelas)} tabelas:")
#         print(tabelas) 
#         # Saída esperada: ['clientes', 'pedidos', 'produtos']

# except Exception as e:
#     print(f"Erro: {e}")


