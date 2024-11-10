import { useEffect, useState } from "react";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?worker'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import DataVisualization from '~/components/DataVisualization';
import { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

export const loader: LoaderFunction = async () => {
  return json({});
};

const Index = () => {
  const data = useLoaderData();
  const [db, setDb] = useState<AsyncDuckDB | null>(null);
  const [conn, setConn] = useState<AsyncDuckDBConnection | null>(null);
  const [queryResult, setQueryResult] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const initializeDuckDB = async () => {
      try {
        // Workerとロガーの初期化
        const worker = new duckdb_worker();
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);
        
        // DBのインスタンス化
        await db.instantiate(duckdb_wasm);
        
        // コネクションの作成
        const connection = await db.connect();
        
        // ステート更新
        setDb(db);
        setConn(connection);

        // テストデータの作成
        await connection.query(`CREATE TABLE users (id INTEGER, name TEXT)`);
        await connection.query(`INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')`);
        
        const result = await connection.query(`SELECT * FROM users`);
        setQueryResult({
          columns: result.schema.fields.map(field => field.name),
          values: result.toArray().map(row => Object.values(row)),
        });
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };

    initializeDuckDB();

    // クリーンアップ
    return () => {
      if (conn) conn.close();
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile || !conn) return;

    setFile(uploadedFile);
    try {
      // ファイルをArrayBufferとして読み込む
      const buffer = await uploadedFile.arrayBuffer();
      
      // DuckDBにバッファを登録
      await db?.registerFileBuffer(uploadedFile.name, new Uint8Array(buffer));
      
      // テーブルの作成とデータの読み込み
      await conn.query(`DROP TABLE IF EXISTS uploaded`);
      await conn.query(`CREATE TABLE uploaded AS SELECT * FROM read_csv_auto('${uploadedFile.name}')`);
      
      // 結果の取得
      const result = await conn.query(`SELECT * FROM uploaded LIMIT 1000`);
      setQueryResult({
        columns: result.schema.fields.map(field => field.name),
        values: result.toArray().map(row => Object.values(row)),
      });
    } catch (error) {
      console.error('Error processing CSV file:', error);
    }
  };

  return (
    <div>
      <h1>DuckDB-WasmとRemixによるデータ分析アプリ</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {queryResult ? (
        <>
          <table style={{ border: "1px solid black" }}>
            <thead>
              <tr>
                {queryResult.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult.values.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, idx) => (
                    <td key={idx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <DataVisualization data={queryResult} />
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Index;
