import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ArrowRightLeft, Download, AlertTriangle, CheckCircle } from 'lucide-react';

const ComparisonApp = () => {
  const [fileA, setFileA] = useState(null); // 全日物流
  const [fileB, setFileB] = useState(null); // 同興出庫
  const [results, setResults] = useState([]);
  const [hasCompared, setHasCompared] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileUpload = (e, setFile) => {
    const file = e.target.files[0];
    if (file) setFile(file);
  };

  const readExcel = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const worksheet = wb.Sheets[firstSheetName];
        resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1 }));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processFiles = async () => {
    if (!fileA) { setErrorMsg("請上傳 全日物流貨運出貨單"); return; }
    if (!fileB) { setErrorMsg("請上傳 同興出庫單"); return; }

    const dataA = await readExcel(fileA);
    const dataB = await readExcel(fileB);

    const groupA = {};
    dataA.forEach((row, index) => {
      if (index === 0) return;
      const type = String(row[2] || '').trim();    
      const rawOrderNo = String(row[11] || '').trim(); 
      const qty = parseFloat(row[8]) || 0;         

      if (type === '出庫' && rawOrderNo) {
        const cleanOrderNo = rawOrderNo.split('-')[0];
        groupA[cleanOrderNo] = (groupA[cleanOrderNo] || 0) + qty;
      }
    });

    const groupB = {};
    dataB.forEach((row, index) => {
      if (index === 0) return;
      const rawOrderNo = String(row[2] || '').trim();  
      const qty = parseFloat(row[11]) || 0;           

      if (rawOrderNo) {
        const cleanOrderNo = rawOrderNo.split('-')[0];
        groupB[cleanOrderNo] = (groupB[cleanOrderNo] || 0) + qty;
      }
    });

    const allKeys = Array.from(new Set([...Object.keys(groupA), ...Object.keys(groupB)]));
    const diffs = allKeys
      .map(no => ({
        orderNo: no,
        qtyA: groupA[no] || 0,
        qtyB: groupB[no] || 0,
        diff: (groupB[no] || 0) - (groupA[no] || 0)
      }))
      .filter(item => item.qtyA !== item.qtyB);

    setResults(diffs);
    setHasCompared(true);
  };

  const exportToExcel = () => {
    const wsData = [
      ["客戶單號(不含-)", "全日物流-出庫數量(加總)", "同興出庫-數量(副)(加總)", "差異值"],
      ...results.map(r => [r.orderNo, r.qtyA, r.qtyB, r.diff])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "比對差異清單");
    XLSX.writeFile(wb, `比對報告_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      {errorMsg && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-xl font-bold mb-2">上傳提示</h3>
            <p className="text-slate-600 mb-6">{errorMsg}</p>
            <button onClick={() => setErrorMsg("")} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">確認</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-8 flex items-center gap-3 border-l-8 border-blue-600 pl-4 text-slate-800">
          全日物流 / 同興實業 出貨單比對系統
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <div className="flex justify-between items-center mb-4 text-blue-600 font-bold">
              <span>全日物流貨運出貨單 (C, L, I)</span>
              {fileA && <CheckCircle size={18} className="text-green-500" />}
            </div>
            <input type="file" id="fileA" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, setFileA)} />
            <label htmlFor="fileA" className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center cursor-pointer transition-all ${fileA ? 'bg-blue-50 border-blue-300' : 'border-slate-300 hover:bg-slate-50'}`}>
              <Upload className="text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600 text-center">{fileA ? fileA.name : "點擊上傳或拖入檔案"}</span>
            </label>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <div className="flex justify-between items-center mb-4 text-green-600 font-bold">
              <span>同興出庫單 (C, L)</span>
              {fileB && <CheckCircle size={18} className="text-green-500" />}
            </div>
            <input type="file" id="fileB" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, setFileB)} />
            <label htmlFor="fileB" className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center cursor-pointer transition-all ${fileB ? 'bg-green-50 border-green-300' : 'border-slate-300 hover:bg-slate-50'}`}>
              <Upload className="text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600 text-center">{fileB ? fileB.name : "點擊上傳或拖入檔案"}</span>
            </label>
          </div>
        </div>

        <div className="flex justify-center mb-12">
          <button onClick={processFiles} className="bg-blue-700 text-white px-12 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-blue-800 transition-all flex items-center gap-3 active:scale-95">
            <ArrowRightLeft /> 開始比對
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="font-bold text-slate-700 text-lg">比對結果異常清單</span>
            {results.length > 0 && (
              <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700">
                <Download size={18} /> 匯出差異檔案
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-8 py-4 font-bold">客戶單號 (彙整)</th>
                  <th className="px-8 py-4 font-bold text-right">全日加總</th>
                  <th className="px-8 py-4 font-bold text-right">同興加總</th>
                  <th className="px-8 py-4 font-bold text-right">差異</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length > 0 ? (
                  results.map((row, i) => (
                    <tr key={i} className="hover:bg-red-50 transition-colors">
                      <td className="px-8 py-4 font-mono font-medium text-blue-700">{row.orderNo}</td>
                      <td className="px-8 py-4 text-right">{row.qtyA}</td>
                      <td className="px-8 py-4 text-right">{row.qtyB}</td>
                      <td className="px-8 py-4 text-right font-black text-red-500">{row.diff}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-8 py-20 text-center">
                      {hasCompared ? (
                        <div className="text-green-500 font-bold text-xl flex flex-col items-center">
                          <CheckCircle size={60} className="mb-2" /> 恭喜！資料完全吻合
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">尚未進行比對，請先上傳檔案。</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonApp;