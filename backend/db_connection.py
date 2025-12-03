import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any


class DatabaseConnection:
    # ['categoria', 'cliente', 'loja', 'operador', 'produto', 'venda']
    def __init__(self, host, database, user, password, port=5432):
        self.conn_params = {
            "host": host,
            "database": database,
            "user": user,
            "password": password,
            "port": port,
            "sslmode": "require"  # Obrigatório para Neon
        }
        self.conn = None

    def connect(self):
        """Estabelece a conexão se ela não existir ou estiver fechada."""
        if self.conn is None or self.conn.closed:
            try:
                self.conn = psycopg2.connect(**self.conn_params)
            except psycopg2.Error as e:
                raise Exception(f"Erro ao conectar ao PostgreSQL: {e}")

    def disconnect(self):
        """Fecha a conexão de forma segura."""
        if self.conn and not self.conn.closed:
            self.conn.close()

    def fetch_all(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """
        Executa uma query SELECT e retorna uma lista de dicionários.
        Ex: [{'id': 1, 'nome': 'Teste'}, ...]
        """
        self.connect()
        # RealDictCursor é usado para que o retorno tenha o nome das colunas
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute(query, params)
                return cur.fetchall()
            except psycopg2.Error as e:
                self.conn.rollback()
                raise Exception(f"Erro na execução da query: {e}")

    def execute(self, query: str, params: tuple = None) -> None:
        """
        Executa comandos de INSERT, UPDATE, DELETE e faz commit.
        """
        self.connect()
        with self.conn.cursor() as cur:
            try:
                cur.execute(query, params)
                self.conn.commit()
            except psycopg2.Error as e:
                self.conn.rollback()
                raise Exception(f"Erro na execução do comando: {e}")

    def list_tables(self, schema: str = 'public') -> List[str]:
        """
        Retorna uma lista de strings com os nomes das tabelas de um esquema (padrão 'public').
        Ex: ['usuarios', 'produtos', 'vendas']
        """
        query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """
        results = self.fetch_all(query, (schema,))
        
        # Extrai apenas o nome da tabela do dicionário de resultados
        return [row['table_name'] for row in results]

    # Suporte para uso com 'with' (Context Manager)
    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
