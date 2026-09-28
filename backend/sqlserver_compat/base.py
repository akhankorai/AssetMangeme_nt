from mssql.base import DatabaseWrapper as MssqlDatabaseWrapper


class DatabaseWrapper(MssqlDatabaseWrapper):
    _sql_server_versions = {**MssqlDatabaseWrapper._sql_server_versions, 17: 2022}

    def get_connection_params(self):
        conn_params = super().get_connection_params()
        host = conn_params.get("HOST") or "localhost"
        instance = conn_params.get("INSTANCE") or ""

        if "\\" not in host and instance:
            conn_params["HOST"] = f"{host}\\{instance}"
            conn_params["INSTANCE"] = ""

        options = dict(conn_params.get("OPTIONS") or {})
        options.setdefault("driver", "ODBC Driver 18 for SQL Server")
        options.setdefault("extra_params", "Encrypt=no;TrustServerCertificate=yes")
        conn_params["OPTIONS"] = options
        return conn_params
