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
        // (1) & (3) 不管名稱，指定讀取第一個 sheet
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

    // (2) 全日物流處理
    const groupA = {};
    dataA.forEach((row, index) => {
      if (index === 0) return; // 跳過標題
      const type = String(row[2] || '').trim();    // C欄：單據別
      const rawOrderNo = String(row[11] || '').trim(); // L欄：客戶單號
      const qty = parseFloat(row[8]) || 0;         // I欄：出庫數量

      if (type === '出庫' && rawOrderNo) {
        // (5) 比對 - 之前的編號，視為同一筆
        const cleanOrderNo = rawOrderNo.split('-')[0];
        groupA[cleanOrderNo] = (groupA[cleanOrderNo] || 0) + qty;
      }
    });

    // (4) 同興出庫處理
    const groupB = {};
    dataB.forEach((row, index) => {
      if (index === 0) return; // 跳過標題
      const rawOrderNo = String(row[2] || '').trim();  // C欄：單號
      const qty = parseFloat(row[11]) || 0;           // L欄：數量(副)

      if (rawOrderNo) {
        // 同樣處理 dash，確保比對基準一致
        const cleanOrderNo = rawOrderNo.split('-')[0];
        groupB[cleanOrderNo] = (groupB[cleanOrderNo] || 0) + qty;
      }
    });

    // (5) & (6) 比對邏輯
    const allKeys = Array.from(new Set([...Object.keys(groupA), ...Object.keys(groupB)]));
    const diffs = allKeys
      .map(no => ({
        orderNo: no,
        qtyA: groupA[no] || 0,
        qtyB: groupB[no] || 0,
        diff: (groupB[no] || 0) - (groupA[no] || 0)
      }))
      .filter(item =>