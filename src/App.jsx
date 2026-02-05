import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, ArrowRightLeft, Download, AlertTriangle, CheckCircle } from 'lucide-react';

const ComparisonApp = () => {
  const [fileA, setFileA] = useState(null); // 全日物流
  const [fileB, setFileB] = useState(null); // 同興出庫
  const [results, setResults] = useState([]);
  const [hasCompared, setHasCompared] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // Popup 訊息

  const handleFileUpload = (e, setFile) => {
    const file = e.target.files[0];
    if (file) setFile(file);
  };

  const processFiles = async () => {
    // 7. 判斷檔案是否存在
    if (!fileA) {
      setErrorMsg("請上傳全日物流貨運出貨單Excel檔案");
      return;
    }
    if (!fileB) {
      setErrorMsg("請上傳同興出庫單Excel檔案");
      return;
    }

    const dataA = await readExcel(fileA);
    const dataB = await readExcel(fileB);

    // 8(2). 全日物流處理: C=單據別(index 2), L=客戶單號(index 11), I=出庫數量(index 8)
    const groupA = {};
    dataA.forEach((row) => {
      if (row[2] === '出庫') {
        const orderNo = String(row[11] || '').trim();
        const qty = parseFloat(row[8]) || 0;
        if (orderNo) {
          groupA[orderNo] = (groupA[orderNo] || 0) + qty;
        }
      }
    });

    // 8(4). 同興出庫處理: C=單號(index 2), L=數量(副)(index 11)
    const groupB = {};
    dataB.forEach((row, index) => {
      if (index === 0) return; // 跳過標題列
      const orderNo = String(row[2] || '').trim();
      const qty = parseFloat(row[11]) || 0;
      if (orderNo) {
        groupB[orderNo] = (groupB[orderNo] || 0) + qty;
      }
    });

    // 8(5,6). 比對邏輯
    const allOrderNos = Array.from(new Set([...Object.keys(groupA), ...Object.keys(groupB)]));
    const diffs = allOrderNos
      .map(no => ({
        orderNo: no,
        qtyA: groupA[no] || 0,
        qtyB: groupB[no] || 0,
        diff: (groupB[no] || 0) - (groupA[no] || 0)
      }))
      .filter(item => item.qtyA !== item.qtyB); // 僅找出不相同的

    setResults(diffs);
    setHasCompared(true);
  };

  const readExcel = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // 匯出功能
  const exportToExcel = () => {
    const wsData = [
      ["單號", "全日物流貨運出貨單-出庫數量", "同興出庫單-數量(副)", "差異數量"],
      ...results.map(r => [r.orderNo, r.qtyA, r.qtyB, r.diff])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "比對結果");
    XLSX.writeFile(wb, `比對結果_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 text-slate-800">
      {/* 錯誤彈窗 (Popup) */}
      {errorMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4 font-bold text-lg">
              <AlertTriangle /> 提示
            </div>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
            <button 
              onClick={() => setErrorMsg("")}
              className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-700"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-8 flex items-center gap-3 border-l-8 border-blue-600 pl-4">
          全日/同興 貨單比對系統
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* 左區塊：全日 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-blue-600 font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">1</span>
              全日物流貨運出貨單
            </h2>
            <input type="file" id="fileA" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, setFileA)} />
            <label htmlFor="fileA" className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
              <Upload className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-500 font-medium">{fileA ? fileA.name : "請上傳 Excel"}</span>
            </label>
          </div>

          {/* 右區塊：同興 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-green-600 font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">2</span>
              同興出庫單
            </h2>
            <input type="file" id="fileB" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, setFileB)} />
            <label htmlFor="fileB" className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center cursor-pointer hover:bg-green-50 hover:border-green-300 transition-all">
              <Upload className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-500 font-medium">{fileB ? fileB.name : "請上傳 Excel"}</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mb-12">
          <button 
            onClick={processFiles}
            className="bg-blue-600 text-white px-16 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
          >
            <ArrowRightLeft size={20} /> 開始比對
          </button>
        </div>

        {/* 下半部：比對結果 */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold flex items-center gap-2">比對結果</h2>
            {results.length > 0 && (
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={16} /> 匯出差異 Excel
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="px-6 py-4 font-bold">單號</th>
                  <th className="px-6 py-4 font-bold text-right">全日物流-出庫數量</th>
                  <th className="px-6 py-4 font-bold text-right">同興出庫單-數量(副)</th>
                  <th className="px-6 py-4 font-bold text-right">差異數量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length > 0 ? (
                  results.map((row, i) => (
                    <tr key={i} className="hover:bg-red-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm">{row.orderNo}</td>
                      <td className="px-6 py-4 text-right">{row.qtyA}</td>
                      <td className="px-6 py-4 text-right">{row.qtyB}</td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">{row.diff}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      {hasCompared ? (
                        <div className="flex flex-col items-center text-green-600 animate-bounce">
                          <CheckCircle size={48} />
                          <p className="mt-2 font-bold text-lg">數據完全吻合！</p>
                        </div>
                      ) : (
                        <p className="text-slate-400">尚未上傳檔案進行比對</p>
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