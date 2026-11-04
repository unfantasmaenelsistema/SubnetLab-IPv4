import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Table,
  Cpu,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { cidrToMaskDecimal, cidrToMaskInt, intToBinaryOctets } from '../utils/ipv4';

export const AcademyView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [octetGroupFilter, setOctetGroupFilter] = useState<'all' | 'oct4' | 'oct3' | 'oct2'>('all');

  const cidrRows = Array.from({ length: 25 }, (_, i) => 8 + i).map((cidr) => {
    const maskDec = cidrToMaskDecimal(cidr);
    const maskInt = cidrToMaskInt(cidr);
    const binOctets = intToBinaryOctets(maskInt);
    const wildcardDec = intToBinaryOctets((~maskInt) >>> 0)
      .map((b) => parseInt(b, 2))
      .join('.');
    const totalIps = Math.pow(2, 32 - cidr);
    const usableHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.max(0, totalIps - 2);

    let octIdx = 3;
    if (cidr <= 8) octIdx = 0;
    else if (cidr <= 16) octIdx = 1;
    else if (cidr <= 24) octIdx = 2;
    else octIdx = 3;

    const maskParts = maskDec.split('.').map(Number);
    const blockSize = 256 - maskParts[octIdx];

    return {
      cidr,
      maskDec,
      wildcardDec,
      binary: binOctets.join('.'),
      totalIps,
      usableHosts,
      octIdx: octIdx + 1,
      blockSize,
    };
  });

  const filteredRows = cidrRows.filter((r) => {
    if (octetGroupFilter === 'oct4' && r.cidr < 24) return false;
    if (octetGroupFilter === 'oct3' && (r.cidr < 16 || r.cidr >= 24)) return false;
    if (octetGroupFilter === 'oct2' && r.cidr >= 16) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      `/${r.cidr}`.includes(q) ||
      r.maskDec.includes(q) ||
      String(r.usableHosts).includes(q) ||
      String(r.blockSize).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Method Guide Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-500" />
              Guía de Cálculo Mental Rápido y Chuleta Técnica IPv4
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Domina el método del Número Mágico (Salto de Bloque) para resolver cualquier ejercicio en menos de 20 segundos sin calculadora.
            </p>
          </div>

          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            Más recursos en Un Fantasma en el Sistema
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
              01. El Octeto Interesante y el Salto
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Identifica el octeto donde la máscara no es ni <code className="font-mono">255</code> ni <code className="font-mono">0</code> (o el último <code className="font-mono">255</code> si es <code className="font-mono">/8, /16, /24</code>). Resta ese valor a <strong>256</strong>:
            </p>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white">
              Salto = 256 − Máscara = 2^(bits a cero en ese octeto)
            </div>
            <p className="text-[11px] text-slate-500">
              Ejemplo: En <code className="font-mono">/27</code> (255.255.255.224), el salto es <code className="font-mono">256 − 224 = 32</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              02. Red, Siguiente Red y Broadcast
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Las subredes siempre empiezan en múltiplos exactos del salto (<code className="font-mono">0, Salto, 2×Salto...</code>). El Broadcast es simplemente <strong>1 menos que la siguiente subred</strong>:
            </p>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white">
              Red = Múltiplo ≤ IP · Broadcast = Sig_Red − 1
            </div>
            <p className="text-[11px] text-slate-500">
              Primer Host = <code className="font-mono">Red + 1</code> · Último Host = <code className="font-mono">Broadcast − 1</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              03. Fórmulas de Subredes y Hosts
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Si tomas <strong>n</strong> bits prestados hacia la derecha creas subredes; si dejas <strong>h</strong> bits libres a la derecha defines los hosts por subred:
            </p>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white">
              Subredes = 2^n  ·  Hosts Útiles = 2^h − 2
            </div>
            <p className="text-[11px] text-slate-500">
              Se restan 2 direcciones porque la primera es la Red y la última el Broadcast.
            </p>
          </div>
        </div>
      </div>

      {/* Reference Tables: Powers of 2 & RFC 1918 Private Ranges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Octet Values Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-500" />
            Los 8 Valores Posibles de un Octeto de Máscara
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-sans">
                  <th className="py-2 pr-3">Bits a 1</th>
                  <th className="py-2 px-3">Binario</th>
                  <th className="py-2 px-3">Valor Decimal</th>
                  <th className="py-2 px-3">Peso Último Bit (Salto)</th>
                  <th className="py-2 pl-3 text-right">Prefijos Equivalentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {[
                  { bits: 1, bin: '10000000', dec: 128, jump: 128, eq: '/9  · /17 · /25' },
                  { bits: 2, bin: '11000000', dec: 192, jump: 64, eq: '/10 · /18 · /26' },
                  { bits: 3, bin: '11100000', dec: 224, jump: 32, eq: '/11 · /19 · /27' },
                  { bits: 4, bin: '11110000', dec: 240, jump: 16, eq: '/12 · /20 · /28' },
                  { bits: 5, bin: '11111000', dec: 248, jump: 8, eq: '/13 · /21 · /29' },
                  { bits: 6, bin: '11111100', dec: 252, jump: 4, eq: '/14 · /22 · /30' },
                  { bits: 7, bin: '11111110', dec: 254, jump: 2, eq: '/15 · /23 · /31' },
                  { bits: 8, bin: '11111111', dec: 255, jump: 1, eq: '/8  · /16 · /24 · /32' },
                ].map((r) => (
                  <tr key={r.bits}>
                    <td className="py-2 pr-3 text-slate-500">+{r.bits} bits</td>
                    <td className="py-2 px-3 text-sky-600 dark:text-sky-400">{r.bin}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{r.dec}</td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Salto {r.jump}
                    </td>
                    <td className="py-2 pl-3 text-right text-slate-600 dark:text-slate-400">
                      {r.eq}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Classes & RFC 1918 Private Ranges */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Clases IPv4 y Rangos Privados RFC 1918 / Especiales
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-sans">
                  <th className="py-2 pr-3">Clase / RFC</th>
                  <th className="py-2 px-3">Rango Primer Octeto</th>
                  <th className="py-2 px-3">Máscara Base</th>
                  <th className="py-2 pl-3 text-right">Bloque Privado RFC 1918</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900 dark:text-white">
                    Clase A (0xxx)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">1 – 126</td>
                  <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400">/8 (255.0.0.0)</td>
                  <td className="py-2.5 pl-3 text-right text-emerald-600 dark:text-emerald-400">
                    10.0.0.0/8
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900 dark:text-white">
                    Loopback
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">127</td>
                  <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400">/8</td>
                  <td className="py-2.5 pl-3 text-right text-slate-500">127.0.0.0/8 (Host local)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900 dark:text-white">
                    Clase B (10xx)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">128 – 191</td>
                  <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400">/16 (255.255.0.0)</td>
                  <td className="py-2.5 pl-3 text-right text-emerald-600 dark:text-emerald-400">
                    172.16.0.0/12 (172.16–31)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900 dark:text-white">
                    Clase C (110x)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">192 – 223</td>
                  <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400">/24 (255.255.255.0)</td>
                  <td className="py-2.5 pl-3 text-right text-emerald-600 dark:text-emerald-400">
                    192.168.0.0/16
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900 dark:text-white">
                    Clase D (1110)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">224 – 239</td>
                  <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Multicast</td>
                  <td className="py-2.5 pl-3 text-right text-slate-500">224.0.0.0/4 (OSPF/RIP)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-sans font-semibold text-slate-900 dark:text-white">
                    Clase E (1111)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">240 – 255</td>
                  <td className="py-2.5 px-3 text-rose-500">Experimental</td>
                  <td className="py-2.5 pl-3 text-right text-slate-500">255.255.255.255 Bcast</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Full Interactive CIDR Cheat Sheet Table (/8 to /32) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Table className="w-4 h-4 text-sky-500" />
              Tabla Completa de Referencia CIDR (/8 a /32)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filtra por octeto de trabajo o busca cualquier prefijo, máscara decimal o cantidad de hosts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/70 dark:border-slate-800">
              {(
                [
                  { id: 'all', label: 'Todos (/8–/32)' },
                  { id: 'oct4', label: '4º Octeto (/24–/32)' },
                  { id: 'oct3', label: '3er Octeto (/16–/23)' },
                  { id: 'oct2', label: '2º Octeto (/8–/15)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOctetGroupFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    octetGroupFilter === tab.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar /27, 224, 62..."
                className="pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-sans">
                <th className="py-2.5 pr-3 font-medium">CIDR</th>
                <th className="py-2.5 px-3 font-medium">Máscara Decimal</th>
                <th className="py-2.5 px-3 font-medium">Wildcard</th>
                <th className="py-2.5 px-3 font-medium">Octeto Activo & Salto</th>
                <th className="py-2.5 px-3 font-medium">Hosts Útiles (2^h−2)</th>
                <th className="py-2.5 pl-3 font-medium">Máscara en Binario (32 bits)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredRows.map((row) => (
                <tr
                  key={row.cidr}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-bold text-sky-600 dark:text-sky-400">
                    /{row.cidr}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {row.maskDec}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{row.wildcardDec}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Salto {row.blockSize}
                    </span>{' '}
                    <span className="text-slate-400 font-sans text-[11px]">
                      ({row.octIdx}º oct)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.usableHosts.toLocaleString('es-ES')}
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] text-slate-600 dark:text-slate-400">
                    {row.binary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
