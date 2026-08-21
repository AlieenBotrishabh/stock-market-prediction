import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import {
  formatPrice, formatPercent, formatChange, formatVolume, DASH,
} from '../utils/formatting';

/**
 * Sortable quote table.
 *
 * Fixes carried over from the previous version:
 *  - The sort chevron was always ChevronDown regardless of direction
 *    (ChevronUp was imported but never used), so the header lied about
 *    the current sort.
 *  - The "View" button had no onClick handler.
 *  - Nulls sorted as 0, mixing missing data in with genuine zeroes.
 */

const COLUMNS = [
  { key: 'symbol', label: 'Symbol', align: 'left', sortable: true },
  { key: 'name', label: 'Company', align: 'left', sortable: true, hideBelow: 'md' },
  { key: 'price', label: 'Price', align: 'right', sortable: true },
  { key: 'change', label: 'Change', align: 'right', sortable: true, hideBelow: 'sm' },
  { key: 'changePercent', label: 'Change %', align: 'right', sortable: true },
  { key: 'high', label: 'Day High', align: 'right', sortable: true, hideBelow: 'lg' },
  { key: 'low', label: 'Day Low', align: 'right', sortable: true, hideBelow: 'lg' },
  { key: 'volume', label: 'Volume', align: 'right', sortable: true, hideBelow: 'xl' },
];

const HIDE_CLASS = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

const StockTable = ({ stocks = [], onRowClick }) => {
  const [sort, setSort] = useState({ key: 'changePercent', dir: 'desc' });

  const sorted = useMemo(() => {
    const rows = [...stocks];
    const { key, dir } = sort;
    rows.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      // Missing values always sink to the bottom, whichever way we sort.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string'
        ? av.localeCompare(bv)
        : av - bv;
      return dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [stocks, sort]);

  const toggleSort = (key) =>
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc',
    }));

  return (
    <div className="glass-effect rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`px-4 py-3.5 text-${col.align} text-xs uppercase tracking-wider font-semibold text-white/40 whitespace-nowrap ${
                      col.hideBelow ? HIDE_CLASS[col.hideBelow] : ''
                    }`}
                  >
                    <button
                      onClick={() => col.sortable && toggleSort(col.key)}
                      disabled={!col.sortable}
                      className={`inline-flex items-center gap-1 hover:text-white transition-colors ${
                        active ? 'text-accent-blue' : ''
                      } ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                    >
                      {col.label}
                      {col.sortable && (
                        active
                          ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ArrowUpDown size={11} className="opacity-30" />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((stock, i) => {
              const positive = (stock.changePercent ?? 0) >= 0;
              return (
                <motion.tr
                  key={stock.symbol}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4) }}
                  onClick={() => onRowClick?.(stock)}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                    {stock.symbol}
                  </td>
                  <td className={`px-4 py-3.5 text-white/50 max-w-[220px] truncate ${HIDE_CLASS.md}`}>
                    {stock.name ?? DASH}
                  </td>
                  <td className="px-4 py-3.5 text-right text-white font-semibold tabular-nums whitespace-nowrap">
                    {formatPrice(stock.price)}
                  </td>
                  <td className={`px-4 py-3.5 text-right tabular-nums whitespace-nowrap ${HIDE_CLASS.sm} ${
                    positive ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {formatChange(stock.change)}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                        positive
                          ? 'bg-accent-green/15 text-accent-green'
                          : 'bg-accent-red/15 text-accent-red'
                      }`}
                    >
                      {formatPercent(stock.changePercent)}
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 text-right text-white/60 tabular-nums whitespace-nowrap ${HIDE_CLASS.lg}`}>
                    {formatPrice(stock.high)}
                  </td>
                  <td className={`px-4 py-3.5 text-right text-white/60 tabular-nums whitespace-nowrap ${HIDE_CLASS.lg}`}>
                    {formatPrice(stock.low)}
                  </td>
                  <td className={`px-4 py-3.5 text-right text-white/50 tabular-nums whitespace-nowrap ${HIDE_CLASS.xl}`}>
                    {formatVolume(stock.volume)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockTable;
