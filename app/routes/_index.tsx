import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?worker'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import DataVisualization from '~/components/DataVisualization';
import { useEffect, useState } from "react";
import { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

export async function loader() {
  return json({ 
    initialData: {
      columns: ['id', 'name'],
      values: [[1, 'Alice'], [2, 'Bob'], [3, 'Charlie']]
    }
  });
}

// クライアントサイドのローダー
export function clientLoader() {
  return {
    async initializeDuckDB() {
      const worker = new duckdb_worker();
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      
      await db.instantiate(duckdb_wasm);
      const conn = await db.connect();

      return { db, conn };
    }
  };
}

export default function Index() {
  const { initialData } = useLoaderData<typeof loader>();
  const { initializeDuckDB } = clientLoader();
  const [db, setDb] = useState<AsyncDuckDB | null>(null);
  const [conn, setConn] = useState<AsyncDuckDBConnection | null>(null);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    initializeDuckDB().then(({ db, conn }) => {
      setDb(db);
      setConn(conn);
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile || !conn) return;

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
      setData({
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
      {data ? (
        <>
          <table style={{ border: "1px solid black" }}>
            <thead>
              <tr>
                {data.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.values.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, idx) => (
                    <td key={idx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <DataVisualization data={data} />
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
