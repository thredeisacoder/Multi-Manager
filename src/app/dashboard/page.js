'use client';

import { useState, useEffect } from 'react';
import { getSegments, getAllRecords, getAccounts, getDebts } from '@/lib/store';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import Modal from '@/components/ui/Modal';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const fmt = (n, currency = 'USD') => new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(n || 0);

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('business');
  const [timeRange, setTimeRange] = useState('6m');
  const [accountsCount, setAccountsCount] = useState(0);
  const [statusData, setStatusData] = useState(null);
  const [selectedMonthDetails, setSelectedMonthDetails] = useState(null);
  
  const [businessInfo, setBusinessInfo] = useState({ stats: { revenue: 0, expenses: 0, profit: 0, debt: 0, dti: 0 }, chartData: null, expenseChartData: null, profitChartData: null, profitMarginData: null, cumulativeRevenueData: null, dailyChartData: null, categoryTrendData: null, monthlyHistory: [], segments: [] });
  const [personalInfo, setPersonalInfo] = useState({ stats: { revenue: 0, expenses: 0, profit: 0, debt: 0, dti: 0 }, chartData: null, expenseChartData: null, profitChartData: null, monthlyRunningData: null, dailyChartData: null, categoryTrendData: null, monthlyHistory: [], segments: [] });

  useEffect(() => { loadData(); }, [timeRange]);

  const loadData = () => {
    const segs = getSegments();
    const records = getAllRecords();
    const accounts = getAccounts();
    setAccountsCount(accounts.length);

    // Process Accounts
    const statusCounts = { active: 0, inactive: 0, suspended: 0, banned: 0 };
    accounts.forEach(a => { 
      const st = (a.status || 'active').toLowerCase();
      if (statusCounts[st] !== undefined) statusCounts[st]++; 
      else statusCounts.active++; // fallback to active if unknown
    });
    
    // Only show chart if there is at least one account mapped
    if (accounts.length > 0) {
      setStatusData({
        labels: ['Active', 'Inactive', 'Suspended', 'Banned'],
        datasets: [{ data: [statusCounts.active, statusCounts.inactive, statusCounts.suspended, statusCounts.banned], backgroundColor: ['#00ff6a', '#feca57', '#ff9f43', '#ff4757'], borderWidth: 0 }],
      });
    } else {
      setStatusData(null);
    }

    // Process Finance Segments
    const processCategory = (category) => {
      const catSegs = segs.filter(s => (s.category || 'business') === category);
      const dominantCurrency = catSegs.length > 0 ? (catSegs[0].currency || 'USD') : 'USD';
      let totalIncome = 0, totalExpense = 0, currentDebtBalance = 0, totalPending = 0;
      const monthlyData = {};
      const expenseBreakdown = {};
      const allTxLogs = [];
      
      // Calculate current outstanding debt across all time (Globally)
      const allDebts = getDebts();
      const validDebtIds = new Set(allDebts.map(d => d.id));
      const totalInitialDebt = allDebts.reduce((sum, d) => sum + d.initial_amount, 0);
      const validSegIds = new Set(segs.map(s => s.id));
      let totalRepaidDebt = 0;
      for (const rec of records) {
        if (!validSegIds.has(rec.segment_id)) continue; // skip orphaned records
        if (rec.values && rec.values._dynamic_debts) {
          for (const d of rec.values._dynamic_debts) {
            const isValidId = validDebtIds.has(d.debt_id);
            const isOrphanAndOnlyDebt = !isValidId && allDebts.length === 1;
            if (isValidId || isOrphanAndOnlyDebt) {
              totalRepaidDebt += (parseFloat(d.amount) || 0);
            }
          }
        }
      }
      currentDebtBalance = totalInitialDebt - totalRepaidDebt;
      const now = new Date();
      let minMonthStr = '0000-00';
      if (timeRange === '1m') {
        minMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else if (timeRange === '3m') {
        const d = new Date(); d.setMonth(d.getMonth() - 2);
        minMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (timeRange === '6m') {
        const d = new Date(); d.setMonth(d.getMonth() - 5);
        minMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (timeRange === '12m') {
        const d = new Date(); d.setMonth(d.getMonth() - 11);
        minMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (timeRange === 'ytd') {
        minMonthStr = `${now.getFullYear()}-01`;
      }

      for (const rec of records) {
        if (rec.month < minMonthStr) continue;

        const seg = catSegs.find(s => s.id === rec.segment_id);
        if (!seg) continue;
        
        const fields = seg.fields || [];
        const vals = rec.values || {};
        const month = rec.month;
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0, details: {} };

        for (const f of fields) {
          const v = parseFloat(vals[f.id]) || 0;
          if (v > 0) {
            const key = `${f.type}_${f.name}`;
            if (!monthlyData[month].details[key]) monthlyData[month].details[key] = { name: f.name, type: f.type, value: 0 };
            monthlyData[month].details[key].value += v;
          }

          if (f.type === 'income') { 
            totalIncome += v; 
            monthlyData[month].income += v;
          } else if (f.type === 'expense') { 
            totalExpense += v; 
            monthlyData[month].expense += v; 
            if (v > 0) {
              expenseBreakdown[f.name] = (expenseBreakdown[f.name] || 0) + v;
            }
          }
        }
        
        // Process dynamic debts as expenses
        if (rec.values && rec.values._dynamic_debts) {
          for (const d of rec.values._dynamic_debts) {
            const isValidId = validDebtIds.has(d.debt_id);
            const isOrphanAndOnlyDebt = !isValidId && allDebts.length === 1;
            if (isValidId || isOrphanAndOnlyDebt) {
              const v = parseFloat(d.amount) || 0;
              if (v > 0) {
                totalExpense += v;
                monthlyData[month].expense += v;
                expenseBreakdown['Debt Repayment'] = (expenseBreakdown['Debt Repayment'] || 0) + v;
                
                const key = `expense_Debt Repayment`;
                if (!monthlyData[month].details[key]) monthlyData[month].details[key] = { name: 'Debt Repayment', type: 'expense', value: 0 };
                monthlyData[month].details[key].value += v;
              }
            }
          }
        }
        
        // Process pending amounts
        if (rec.values && rec.values._pending_amount) {
          totalPending += (parseFloat(rec.values._pending_amount) || 0);
        }

        // Collect tx_log entries for transaction analytics
        if (rec.values?._tx_log) {
          rec.values._tx_log.forEach(tx => {
            const fieldName = (seg.fields || []).find(f => f.id === tx.field_id)?.name || 'Other';
            allTxLogs.push({ ...tx, month, fieldName, kind: tx.kind || (seg.fields.find(f => f.id === tx.field_id)?.type) });
          });
        }
      }

      // Strictly filter months based on the selected time range
      const allMonthsInRecords = Object.keys(monthlyData).sort();
      let months;
      if (timeRange === '1m') {
        // Only current month
        const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        months = allMonthsInRecords.filter(m => m === currentMonthStr);
      } else {
        months = allMonthsInRecords.filter(m => m >= minMonthStr);
      }
      
      let chartData = null;
      if (months.length > 0) {
        chartData = {
          labels: months.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y}`; }),
          datasets: [
            { label: 'Income', data: months.map(m => monthlyData[m].income), backgroundColor: 'rgba(0,255,106,0.6)', borderColor: '#00ff6a', borderWidth: 2, borderRadius: 6 },
            { label: 'Expenses', data: months.map(m => monthlyData[m].expense), backgroundColor: 'rgba(255,71,87,0.6)', borderColor: '#ff4757', borderWidth: 2, borderRadius: 6 },
          ],
        };
      }

      // Generate Expense Breakdown Chart Data
      const expenseKeys = Object.keys(expenseBreakdown).sort((a, b) => expenseBreakdown[b] - expenseBreakdown[a]).slice(0, 6);
      let expenseChartData = null;
      if (expenseKeys.length > 0) {
        const expColors = ['#ff4757', '#ff6b81', '#ff9f43', '#feca57', '#e55039', '#c0392b'];
        expenseChartData = {
          labels: expenseKeys,
          datasets: [{ data: expenseKeys.map(k => expenseBreakdown[k]), backgroundColor: expColors, borderWidth: 0 }]
        };
      }

      // Generate Net Profit Trend (Line Chart)
      let profitChartData = null;
      if (months.length > 0) {
        const profitValues = months.map(m => monthlyData[m].income - monthlyData[m].expense);
        profitChartData = {
          labels: months.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y}`; }),
          datasets: [{
            label: 'Net Balance',
            data: profitValues,
            borderColor: profitValues[profitValues.length - 1] >= 0 ? '#00ff6a' : '#ff4757',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return 'transparent';
              const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(0,255,106,0.3)');
              gradient.addColorStop(1, 'rgba(0,255,106,0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#00ff6a',
            pointBorderColor: '#001a0d',
            pointBorderWidth: 2,
            borderWidth: 2,
          }],
        };
      }

      // Generate Daily Activity (Aggregated pattern across selected range)
      let dailyChartData = null;
      if (months.length > 0) {
        const dailyIncome = {}, dailyExpense = {};
        allTxLogs.filter(t => months.includes(t.month)).forEach(t => {
          const d = t.date ? parseInt(t.date.slice(8, 10)) : 1;
          if (t.kind === 'income') dailyIncome[d] = (dailyIncome[d] || 0) + t.amount;
          else dailyExpense[d] = (dailyExpense[d] || 0) + t.amount;
        });
        const days = Array.from({ length: 31 }, (_, i) => i + 1);
        dailyChartData = {
          labels: days.map(d => `Day ${d}`),
          datasets: [
            { label: 'Income', data: days.map(d => dailyIncome[d] || 0), backgroundColor: '#00ff6a' },
            { label: 'Expense', data: days.map(d => dailyExpense[d] || 0), backgroundColor: '#ff4757' }
          ]
        };
      }

      // Generate Expense Category Trend — STACKED AREA chart (each category is a fill band)
      let categoryTrendData = null;
      const catMonthMap = {};
      allTxLogs.filter(t => t.kind === 'expense').forEach(t => {
        if (!catMonthMap[t.fieldName]) catMonthMap[t.fieldName] = {};
        catMonthMap[t.fieldName][t.month] = (catMonthMap[t.fieldName][t.month] || 0) + t.amount;
      });
      const catNames = Object.keys(catMonthMap).slice(0, 6);
      if (catNames.length > 0 && months.length > 0) {
        const catColors = ['#ff4757', '#ff9f43', '#feca57', '#1dd1a1', '#54a0ff', '#a29bfe'];
        categoryTrendData = {
          labels: months.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y}`; }),
          datasets: catNames.map((name, i) => ({
            label: name,
            data: months.map(m => catMonthMap[name][m] || 0),
            borderColor: catColors[i % catColors.length],
            backgroundColor: `${catColors[i % catColors.length]}40`, // 25% opacity fill
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 2,
          })),
        };
      }

      // Generate Cumulative Revenue Build-up (Business: stepped income line across selected time range)
      let cumulativeRevenueData = null;
      const incomeTxs = allTxLogs
        .filter(t => t.kind === 'income' && months.includes(t.month))
        .sort((a, b) => {
          const dateA = a.date || `${a.month}-01`;
          const dateB = b.date || `${b.month}-01`;
          return dateA.localeCompare(dateB);
        });

      if (incomeTxs.length > 0) {
        let cumulative = 0;
        const labels = ['Start'];
        const data = [0];
        incomeTxs.forEach(tx => {
          cumulative += tx.amount;
          let label = '?';
          if (tx.date) {
            const [y, m, d] = tx.date.split('-');
            label = `${m}/${d}`;
          } else {
            label = tx.month;
          }
          labels.push(`${label} (+${tx.fieldName})`);
          data.push(cumulative);
        });
        cumulativeRevenueData = {
          labels,
          datasets: [{
            label: 'Cumulative Revenue',
            data,
            borderColor: '#00ff6a',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return 'rgba(0,255,106,0.1)';
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, 'rgba(0,255,106,0.25)');
              g.addColorStop(1, 'rgba(0,255,106,0)');
              return g;
            },
            fill: true,
            stepped: 'before',
            tension: 0,
            pointRadius: incomeTxs.length > 30 ? 2 : 5, // Smaller points if many txs
            pointBackgroundColor: '#00ff6a',
            pointBorderColor: '#0d1a2d',
            pointBorderWidth: 1,
            borderWidth: 2,
          }],
        };
      }

      // Generate Running Balance Build-up (Personal: stepped balance across selected time range)
      let monthlyRunningData = null;
      const allPeriodTxs = allTxLogs
        .filter(t => months.includes(t.month))
        .sort((a, b) => {
          const dateA = a.date || `${a.month}-01`;
          const dateB = b.date || `${b.month}-01`;
          return dateA.localeCompare(dateB);
        });

      if (allPeriodTxs.length > 0) {
        let balance = 0;
        const labels = ['Start'];
        const data = [0];
        const pointColors = ['#8aab8a'];
        allPeriodTxs.forEach(tx => {
          balance += tx.kind === 'income' ? tx.amount : -tx.amount;
          let label = '?';
          if (tx.date) {
            const [y, m, d] = tx.date.split('-');
            label = `${m}/${d}`;
          } else {
            label = tx.month;
          }
          labels.push(`${label} (${tx.kind === 'income' ? '+' : '-'}${tx.fieldName})`);
          data.push(balance);
          pointColors.push(tx.kind === 'income' ? '#00ff6a' : '#ff4757');
        });
        monthlyRunningData = {
          labels,
          datasets: [{
            label: 'Running Balance',
            data,
            borderColor: '#54a0ff',
            backgroundColor: 'transparent',
            stepped: 'before',
            tension: 0,
            pointRadius: allPeriodTxs.length > 30 ? 2 : 5,
            pointBackgroundColor: pointColors,
            pointBorderColor: '#0d1a2d',
            pointBorderWidth: 1,
            borderWidth: 2,
          }],
        };
      }

      // Generate Profit Margin % Trend (Business)
      let profitMarginData = null;
      if (months.length > 0) {
        const marginValues = months.map(m => {
          const inc = monthlyData[m].income;
          return inc > 0 ? parseFloat(((inc - monthlyData[m].expense) / inc * 100).toFixed(1)) : 0;
        });
        const lastMargin = marginValues[marginValues.length - 1];
        profitMarginData = {
          labels: months.map(m => { const [y, mo] = m.split('-'); return `${mo}/${y}`; }),
          datasets: [{
            label: 'Profit Margin %',
            data: marginValues,
            borderColor: lastMargin >= 0 ? '#54a0ff' : '#ff4757',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return 'rgba(84,160,255,0.1)';
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, lastMargin >= 0 ? 'rgba(84,160,255,0.25)' : 'rgba(255,71,87,0.25)');
              g.addColorStop(1, 'rgba(0,0,0,0)');
              return g;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: marginValues.map(v => v >= 0 ? '#54a0ff' : '#ff4757'),
            pointBorderColor: '#0d1a2d',
            pointBorderWidth: 2,
            borderWidth: 2,
          }],
        };
      }

      // Compute Debt-to-Income ratio (monthly debt payments / monthly income)
      const avgMonthlyIncome = months.length > 0 ? totalIncome / months.length : 0;
      const avgMonthlyDebtRepayment = months.length > 0 ? totalRepaidDebt / months.length : 0;
      const dti = avgMonthlyIncome > 0 ? parseFloat((avgMonthlyDebtRepayment / avgMonthlyIncome * 100).toFixed(1)) : 0;

      // Generate Monthly History Table
      const monthlyHistory = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a)).map(m => ({
        month: m,
        income: monthlyData[m].income,
        expense: monthlyData[m].expense,
        profit: monthlyData[m].income - monthlyData[m].expense,
        details: Object.values(monthlyData[m].details).sort((a, b) => b.value - a.value)
      }));

      return { 
        stats: { revenue: totalIncome, expenses: totalExpense, profit: totalIncome - totalExpense, debt: currentDebtBalance, initialDebt: totalInitialDebt, repaidDebt: totalRepaidDebt, pending: totalPending, currency: dominantCurrency, dti }, 
        chartData, 
        expenseChartData,
        profitChartData,
        profitMarginData,
        cumulativeRevenueData,
        monthlyRunningData,
        dailyChartData,
        categoryTrendData,
        monthlyHistory,
        segments: catSegs
      };
    };

    setBusinessInfo(processCategory('business'));
    setPersonalInfo(processCategory('personal'));
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8aab8a', font: { family: 'Inter' } } } },
    scales: {
      x: { ticks: { color: '#5a7a5a' }, grid: { color: 'rgba(0,255,106,0.05)' } },
      y: { ticks: { color: '#5a7a5a', callback: v => fmt(v, activeTab === 'business' ? businessInfo.stats.currency : personalInfo.stats.currency) }, grid: { color: 'rgba(0,255,106,0.05)' } },
    },
  };

  const lineChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.raw, activeTab === 'business' ? businessInfo.stats.currency : personalInfo.stats.currency)}`,
        }
      }
    },
    scales: {
      x: { ticks: { color: '#5a7a5a' }, grid: { color: 'rgba(0,255,106,0.05)' } },
      y: {
        ticks: { color: '#5a7a5a', callback: v => fmt(v, activeTab === 'business' ? businessInfo.stats.currency : personalInfo.stats.currency) },
        grid: { color: 'rgba(0,255,106,0.05)' },
        beginAtZero: false,
      },
    },
  };

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#8aab8a', padding: 16, font: { family: 'Inter', size: 11 } } } },
    cutout: '65%',
  };

  // For stacked area category chart
  const stackedAreaOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#8aab8a', font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: '#5a7a5a' }, grid: { color: 'rgba(0,255,106,0.05)' }, stacked: true },
      y: {
        stacked: true,
        ticks: { color: '#5a7a5a', callback: v => fmt(v, activeTab === 'business' ? businessInfo.stats.currency : personalInfo.stats.currency) },
        grid: { color: 'rgba(0,255,106,0.05)' },
      },
    },
  };

  // For profit margin % chart (Y axis in %)
  const percentOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } },
    },
    scales: {
      x: { ticks: { color: '#5a7a5a' }, grid: { color: 'rgba(0,255,106,0.05)' } },
      y: {
        ticks: { color: '#5a7a5a', callback: v => `${v}%` },
        grid: { color: 'rgba(0,255,106,0.05)' },
        suggestedMin: -20,
        suggestedMax: 100,
      },
    },
  };

  const getModalChartData = (type) => {
    if (!selectedMonthDetails) return null;
    const items = selectedMonthDetails.details.filter(d => d.type === type && d.value > 0);
    if (items.length === 0) return null;
    return {
      labels: items.map(i => i.name),
      datasets: [{
        data: items.map(i => i.value),
        backgroundColor: type === 'income' 
          ? ['#00ff6a', '#1dd1a1', '#10ac84', '#01a3a4', '#00d2d3', '#48dbfb'] 
          : ['#ff4757', '#ff6b81', '#ff9f43', '#feca57', '#e55039', '#f6b93b'],
        borderWidth: 0
      }]
    };
  };

  const currentInfo = activeTab === 'business' ? businessInfo : personalInfo;

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Dashoard</h1>
      </div>

      <div className="flex-between" style={{ marginBottom: 16 }}>
        {/* Finance Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'business' ? 'active' : ''}`} onClick={() => setActiveTab('business')}>
            Business Finance
          </button>
          <button className={`tab ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
            Personal Finance
          </button>
        </div>

        {/* Time Range Filter */}
        <div className="page-actions">
          <select className="select" style={{ minWidth: 160 }} value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="1m">Current Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
            <option value="ytd">This Year (YTD)</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Revenue / Income</div>
          <div className="stat-value income">{fmt(currentInfo.stats.revenue, currentInfo.stats.currency)}</div>
          {activeTab === 'business' && currentInfo.stats.pending > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Pending Revenue</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#54a0ff', fontFamily: 'var(--font-mono)' }}>
                +{fmt(currentInfo.stats.pending, currentInfo.stats.currency)}
              </div>
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value expense">{fmt(currentInfo.stats.expenses, currentInfo.stats.currency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Balance</div>
          <div className={`stat-value ${currentInfo.stats.profit >= 0 ? 'income' : 'expense'}`}>{fmt(currentInfo.stats.profit, currentInfo.stats.currency)}</div>
        </div>
        
        {activeTab === 'personal' && (
          <div className="stat-card">
            <div className="stat-label">Total Debt (Remaining)</div>
            <div className="stat-value" style={{ color: currentInfo.stats.debt > 0 ? '#ff9f43' : 'var(--text-primary)' }}>{fmt(currentInfo.stats.debt, currentInfo.stats.currency)}</div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Initial:</span> <span>{fmt(currentInfo.stats.initialDebt, currentInfo.stats.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Repaid:</span> <span style={{ color: 'var(--expense)' }}>{fmt(currentInfo.stats.repaidDebt, currentInfo.stats.currency)}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'business' && (
          <div className="stat-card">
            <div className="stat-label">Total Accounts & Assets</div>
            <div className="stat-value" style={{ color: 'var(--neon)' }}>{accountsCount}</div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Active Segments:</span> <span style={{ color: 'var(--text-primary)' }}>{currentInfo.segments.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Active Accounts:</span> <span style={{ color: 'var(--income)' }}>{statusData ? statusData.datasets[0].data[0] : 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>      {/* ===== BUSINESS CHARTS ===== */}
      {activeTab === 'business' && (<>

        {/* B-Row 1: Revenue vs Expenses (monthly health) + Cumulative Revenue (intra-month momentum) */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Revenue vs Expenses</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly overview</span>
            </div>
            <div className="chart-container" style={{ height: 280 }}>
              {businessInfo.chartData ? <Bar data={businessInfo.chartData} options={chartOpts} /> :
                <div className="empty-state"><p>No financial data yet</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Cumulative Revenue</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current month — steps up with each income transaction</span>
            </div>
            <div className="chart-container" style={{ height: 280 }}>
              {businessInfo.cumulativeRevenueData
                ? <Line data={businessInfo.cumulativeRevenueData} options={{ ...lineChartOpts, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw, businessInfo.stats.currency)}` } } } }} />
                : <div className="empty-state"><p>Log income transactions in Finance to see revenue build-up</p></div>}
            </div>
          </div>
        </div>

        {/* B-Row 2: Net Balance Trend (area) + Profit Margin % Trend */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Net Balance Trend</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {businessInfo.monthlyHistory.length <= 1 ? 'Add data for more months to see the trend' : 'Monthly net profit/loss'}
              </span>
            </div>
            <div className="chart-container" style={{ height: 260 }}>
              {businessInfo.profitChartData ? <Line data={businessInfo.profitChartData} options={lineChartOpts} /> :
                <div className="empty-state"><p>No financial data yet</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Profit Margin % Trend</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Revenue remaining after expenses (%)</span>
            </div>
            <div className="chart-container" style={{ height: 260 }}>
              {businessInfo.profitMarginData
                ? <Line data={businessInfo.profitMarginData} options={percentOpts} />
                : <div className="empty-state"><p>No revenue data yet</p></div>}
            </div>
          </div>
        </div>

        {/* B-Row 3: Expense Category Trend — Stacked Area (full insight into cost structure) */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Expense Category Trend</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stacked area — see which categories are growing</span>
          </div>
          <div className="chart-container" style={{ height: 300 }}>
            {businessInfo.categoryTrendData
              ? <Line data={businessInfo.categoryTrendData} options={stackedAreaOpts} />
              : <div className="empty-state"><p>Log expense transactions to see category trends</p></div>}
          </div>
        </div>

        {/* B-Row 4: Daily Activity + Collected vs Pending */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Daily Activity</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Income & expense by day — current month</span>
            </div>
            <div className="chart-container" style={{ height: 260 }}>
              {businessInfo.dailyChartData ? <Bar data={businessInfo.dailyChartData} options={chartOpts} /> :
                <div className="empty-state"><p>Log transactions to see daily patterns</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Collected vs Pending Revenue</h3></div>
            <div className="chart-container" style={{ height: 260 }}>
              {businessInfo.stats.revenue > 0 || businessInfo.stats.pending > 0 ? (
                <Doughnut data={{ labels: ['Collected', 'Pending'], datasets: [{ data: [businessInfo.stats.revenue, businessInfo.stats.pending], backgroundColor: ['#00ff6a', '#54a0ff'], borderWidth: 0 }] }} options={doughnutOpts} />
              ) : <div className="empty-state"><p>No revenue data</p></div>}
            </div>
          </div>
        </div>

        {/* B-Row 5: Account Status + Expense Breakdown */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Account Status</h3></div>
            <div className="chart-container" style={{ height: 240 }}>
              {statusData ? <Doughnut data={statusData} options={doughnutOpts} /> :
                <div className="empty-state"><p>No accounts yet</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Expense Breakdown</h3></div>
            <div className="chart-container" style={{ height: 240 }}>
              {businessInfo.expenseChartData ? <Doughnut data={businessInfo.expenseChartData} options={doughnutOpts} /> :
                <div className="empty-state"><p>No expense data yet</p></div>}
            </div>
          </div>
        </div>
      </>)}

      {/* ===== PERSONAL CHARTS ===== */}
      {activeTab === 'personal' && (<>

        {/* P-Row 1: Income vs Expenses + Running Monthly Balance (most actionable intra-month view) */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Income vs Expenses</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly overview</span>
            </div>
            <div className="chart-container" style={{ height: 280 }}>
              {personalInfo.chartData ? <Bar data={personalInfo.chartData} options={chartOpts} /> :
                <div className="empty-state"><p>No financial data yet</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Running Monthly Balance</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🟢 up = income · 🔴 down = expense — current month</span>
            </div>
            <div className="chart-container" style={{ height: 280 }}>
              {personalInfo.monthlyRunningData
                ? <Line data={personalInfo.monthlyRunningData} options={{ ...lineChartOpts, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw, personalInfo.stats.currency)}` } } } }} />
                : <div className="empty-state"><p>Log income & expense transactions to see running balance</p></div>}
            </div>
          </div>
        </div>

        {/* P-Row 2: Net Balance Trend + Debt-to-Income Indicator */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Net Balance Trend</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {personalInfo.monthlyHistory.length <= 1 ? 'Add data for more months to see the trend' : 'Monthly net balance'}
              </span>
            </div>
            <div className="chart-container" style={{ height: 260 }}>
              {personalInfo.profitChartData ? <Line data={personalInfo.profitChartData} options={lineChartOpts} /> :
                <div className="empty-state"><p>No financial data yet</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Debt-to-Income Ratio</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly debt payments vs income · safe zone &lt; 30%</span>
            </div>
            <div style={{ padding: '24px 20px' }}>
              {personalInfo.stats.initialDebt > 0 && personalInfo.stats.revenue > 0 ? (() => {
                const dti = personalInfo.stats.dti;
                const color = dti < 20 ? '#1dd1a1' : dti < 35 ? '#feca57' : '#ff4757';
                const label = dti < 20 ? 'Healthy' : dti < 35 ? 'Moderate — watch your debt' : 'High risk — reduce debt payments';
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                      <span style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color, lineHeight: 1 }}>{dti}%</span>
                      <span style={{ fontSize: '0.85rem', color, fontWeight: 600, paddingBottom: 8 }}>{label}</span>
                    </div>
                    <div style={{ height: 12, borderRadius: 6, background: 'var(--bg-input)', overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ height: '100%', width: `${Math.min(dti, 100)}%`, borderRadius: 6, background: `linear-gradient(90deg, #1dd1a1, ${color})`, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.75rem' }}>
                      <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(29,209,161,0.1)', borderRadius: 6, border: '1px solid rgba(29,209,161,0.3)' }}>
                        <div style={{ color: '#1dd1a1', fontWeight: 700 }}>&lt; 20%</div>
                        <div style={{ color: 'var(--text-muted)' }}>Safe</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(254,202,87,0.1)', borderRadius: 6, border: '1px solid rgba(254,202,87,0.3)' }}>
                        <div style={{ color: '#feca57', fontWeight: 700 }}>20–35%</div>
                        <div style={{ color: 'var(--text-muted)' }}>Moderate</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(255,71,87,0.1)', borderRadius: 6, border: '1px solid rgba(255,71,87,0.3)' }}>
                        <div style={{ color: '#ff4757', fontWeight: 700 }}>&gt; 35%</div>
                        <div style={{ color: 'var(--text-muted)' }}>High Risk</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Avg monthly income:</span>
                        <span style={{ color: 'var(--income)', fontFamily: 'var(--font-mono)' }}>{fmt(personalInfo.stats.revenue / Math.max(personalInfo.monthlyHistory.length, 1), personalInfo.stats.currency)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Avg monthly debt payment:</span>
                        <span style={{ color: '#ff9f43', fontFamily: 'var(--font-mono)' }}>{fmt(personalInfo.stats.repaidDebt / Math.max(personalInfo.monthlyHistory.length, 1), personalInfo.stats.currency)}</span>
                      </div>
                    </div>
                  </div>
                );
              })() : <div className="empty-state" style={{ height: 200 }}><p>No debt tracked or no income data</p></div>}
            </div>
          </div>
        </div>

        {/* P-Row 3: Expense Category Stacked Area (full-width for better readability) */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Expense Category Trend</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stacked area — track which habits cost the most</span>
          </div>
          <div className="chart-container" style={{ height: 300 }}>
            {personalInfo.categoryTrendData
              ? <Line data={personalInfo.categoryTrendData} options={stackedAreaOpts} />
              : <div className="empty-state"><p>Log expense transactions to see category trends</p></div>}
          </div>
        </div>

        {/* P-Row 4: Debt Repayment Progress + Daily Activity */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Debt Repayment Progress</h3></div>
            <div className="chart-container" style={{ height: 260 }}>
              {personalInfo.stats.initialDebt > 0 ? (
                <Doughnut data={{ labels: ['Repaid', 'Remaining'], datasets: [{ data: [personalInfo.stats.repaidDebt, personalInfo.stats.debt], backgroundColor: ['#1dd1a1', '#ff9f43'], borderWidth: 0 }] }} options={doughnutOpts} />
              ) : <div className="empty-state"><p>No debt tracked</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Daily Activity</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Income & expense by day — current month</span>
            </div>
            <div className="chart-container" style={{ height: 260 }}>
              {personalInfo.dailyChartData ? <Bar data={personalInfo.dailyChartData} options={chartOpts} /> :
                <div className="empty-state"><p>Log transactions to see daily patterns</p></div>}
            </div>
          </div>
        </div>
      </>)}

      {/* Detailed Monthly History Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Monthly Detailed History</h3></div>
        {currentInfo.monthlyHistory.length > 0 ? (
          <div className="table-container">
            <table style={{ width: '100%', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Income</th>
                  <th style={{ textAlign: 'right' }}>Expense</th>
                  <th style={{ textAlign: 'right' }}>Net Profit/Balance</th>
                </tr>
              </thead>
              <tbody>
                {currentInfo.monthlyHistory.map(m => (
                  <tr key={m.month} onClick={() => setSelectedMonthDetails(m)} style={{ cursor: 'pointer' }} className="hover-row">
                    <td style={{ fontWeight: 600 }}>{m.month}</td>
                    <td style={{ textAlign: 'right', color: 'var(--income)' }}>{fmt(m.income, currentInfo.stats.currency)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--expense)' }}>{fmt(m.expense, currentInfo.stats.currency)}</td>
                    <td style={{ textAlign: 'right', color: m.profit >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                      {fmt(m.profit, currentInfo.stats.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No historical data available</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">{activeTab === 'business' ? 'Business' : 'Personal'} Segments Overview</h3></div>
        {currentInfo.segments.length > 0 ? (
          <div className="table-container">
            <table style={{ width: '100%', minWidth: '100%' }}>
              <thead><tr><th>Segment</th>{activeTab === 'business' && <th>Platform</th>}<th>Currency</th><th>Fields</th></tr></thead>
              <tbody>
                {currentInfo.segments.map(s => (
                  <tr key={s.id}>
                    <td><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.color || 'var(--neon)', marginRight: 8 }} />{s.name}</td>
                    {activeTab === 'business' && <td>{s.platform || '-'}</td>}
                    <td>{s.currency || 'USD'}</td>
                    <td>{(s.fields || []).length} fields</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No {activeTab} segments yet</h3>
            <p>Go to Finance to create your first {activeTab} segment</p>
          </div>
        )}
      </div>

      <Modal large isOpen={!!selectedMonthDetails} onClose={() => setSelectedMonthDetails(null)} title={`Details for ${selectedMonthDetails?.month}`}>
        {selectedMonthDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-2">
              <div className="card" style={{ background: 'rgba(0,255,106,0.05)', border: '1px solid rgba(0,255,106,0.1)' }}>
                <h3 style={{ color: 'var(--income)', marginBottom: 12, borderBottom: '1px solid rgba(0,255,106,0.1)', paddingBottom: 8 }}>Income Sources</h3>
                {getModalChartData('income') && (
                  <div className="chart-container" style={{ height: 320, marginBottom: 16 }}>
                    <Doughnut data={getModalChartData('income')} options={{ ...doughnutOpts, plugins: { legend: { display: false } } }} />
                  </div>
                )}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedMonthDetails.details.filter(d => d.type === 'income').map(d => (
                    <li key={d.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8aab8a' }}>{d.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--income)' }}>{fmt(d.value, currentInfo.stats.currency)}</span>
                    </li>
                  ))}
                  {selectedMonthDetails.details.filter(d => d.type === 'income').length === 0 && <li style={{ opacity: 0.5 }}>No income recorded</li>}
                </ul>
              </div>
              <div className="card" style={{ background: 'rgba(255,71,87,0.05)', border: '1px solid rgba(255,71,87,0.1)' }}>
                <h3 style={{ color: 'var(--expense)', marginBottom: 12, borderBottom: '1px solid rgba(255,71,87,0.1)', paddingBottom: 8 }}>Expenses</h3>
                {getModalChartData('expense') && (
                  <div className="chart-container" style={{ height: 320, marginBottom: 16 }}>
                    <Doughnut data={getModalChartData('expense')} options={{ ...doughnutOpts, plugins: { legend: { display: false } } }} />
                  </div>
                )}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedMonthDetails.details.filter(d => d.type === 'expense').map(d => (
                    <li key={d.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8aab8a' }}>{d.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--expense)' }}>{fmt(d.value, currentInfo.stats.currency)}</span>
                    </li>
                  ))}
                  {selectedMonthDetails.details.filter(d => d.type === 'expense').length === 0 && <li style={{ opacity: 0.5 }}>No expenses recorded</li>}
                </ul>
              </div>
            </div>
            {selectedMonthDetails.details.filter(d => d.type === 'debt' || d.type === 'debt_payment').length > 0 && (
              <div className="card" style={{ background: 'rgba(255,159,67,0.05)', border: '1px solid rgba(255,159,67,0.1)' }}>
                <h3 style={{ color: '#ff9f43', marginBottom: 12, borderBottom: '1px solid rgba(255,159,67,0.1)', paddingBottom: 8 }}>Debt / Loan Activity</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedMonthDetails.details.filter(d => d.type === 'debt' || d.type === 'debt_payment').map(d => (
                    <li key={d.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8aab8a' }}>{d.name} <span style={{ opacity: 0.6, fontSize: '0.85em' }}>{d.type === 'debt' ? '(Borrowed)' : '(Repaid)'}</span></span>
                      <span style={{ fontWeight: 600, color: '#ff9f43' }}>{fmt(d.value, currentInfo.stats.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
