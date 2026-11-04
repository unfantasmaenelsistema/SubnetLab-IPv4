import React, { useState } from 'react';
import {
  Copy,
  Check,
  Layers,
  Binary,
  BookOpen,
  RefreshCw,
  Terminal,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  analyzeIpv4,
  isValidIpv4,
  decimalMaskToCidr,
  cidrToMaskDecimal,
  getStepByStepExplanation,
  generateSubnetsList,
  compareIpPair,
  generateSubnetCliConfigs,
} from '../utils/ipv4';

const PRESET_NETWORKS = [
  { label: 'LAN Doméstica /24', ip: '192.168.1.45', cidr: 24 },
  { label: 'Subred /26 (62 hosts)', ip: '192.168.10.140', cidr: 26 },
  { label: 'Campus Clase B /20', ip: '172.16.35.120', cidr: 20 },
  { label: 'Core Clase A /12', ip: '10.44.198.15', cidr: 12 },
  { label: 'Enlace WAN /30', ip: '10.255.255.209', cidr: 30 },
  { label: 'Punto a Punto RFC 3021 /31', ip: '172.31.0.14', cidr: 31 },
];

export const CalculatorView: React.FC = () => {
  const [ipInput, setIpInput] = useState<string>('192.168.10.140');
  const [cidr, setCidr] = useState<number>(26);
  const [maskInput, setMaskInput] = useState<string>('255.255.255.192');
  const [subdivideTargetCidr, setSubdivideTargetCidr] = useState<number>(28);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Host-to-Host L2/L3 Comparator
  const [compareTargetIp, setCompareTargetIp] = useState<string>('192.168.10.190');

  // CLI Generator Vendor Tab
  const [cliVendor, setCliVendor] = useState<'cisco' | 'linux' | 'mikrotik'>('cisco');
  const [vlanId, setVlanId] = useState<number>(10);

  const validIp = isValidIpv4(ipInput) ? ipInput.trim() : '192.168.10.140';
  const analysis = analyzeIpv4(validIp, cidr);
  const steps = getStepByStepExplanation(analysis);
  const pairComparison = compareIpPair(validIp, compareTargetIp, cidr);
  const cliConfigs = generateSubnetCliConfigs(analysis, vlanId);

  const handleCidrChange = (newCidr: number) => {
    const clamped = Math.max(1, Math.min(32, newCidr));
    setCidr(clamped);
    setMaskInput(cidrToMaskDecimal(clamped));
    if (subdivideTargetCidr < clamped) {
      setSubdivideTargetCidr(Math.min(32, clamped + 2));
    }
  };

  const handleMaskInputChange = (val: string) => {
    setMaskInput(val);
    const parsedCidr = decimalMaskToCidr(val);
    if (parsedCidr !== null && parsedCidr >= 1) {
      setCidr(parsedCidr);
      if (subdivideTargetCidr < parsedCidr) {
        setSubdivideTargetCidr(Math.min(32, parsedCidr + 2));
      }
    }
  };

  const toggleIpBit = (globalBitIndex: number) => {
    const octIdx = Math.floor(globalBitIndex / 8);
    const bitInOctet = globalBitIndex % 8;
    const octets = [...analysis.ipBinaryOctets];
    const currentOctetStr = octets[octIdx];
    const toggledChar = currentOctetStr[bitInOctet] === '1' ? '0' : '1';
    octets[octIdx] =
      currentOctetStr.slice(0, bitInOctet) +
      toggledChar +
      currentOctetStr.slice(bitInOctet + 1);
    const newIp = octets.map((b) => parseInt(b, 2)).join('.');
    setIpInput(newIp);
  };

  const copyValue = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const effectiveSubdivideCidr = Math.max(cidr, Math.min(32, subdivideTargetCidr));
  const childSubnets = generateSubnetsList(
    analysis.networkAddress,
    cidr,
    effectiveSubdivideCidr,
    32
  );
  const totalChildSubnets = Math.pow(2, effectiveSubdivideCidr - cidr);

  const activeCliText =
    cliVendor === 'cisco'
      ? cliConfigs.ciscoIos
      : cliVendor === 'linux'
      ? cliConfigs.linuxIp
      : cliConfigs.mikrotik;

  return (
    <div className="space-y-6">
      {/* Top Input & Quick Preset Deck */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Calculadora Interactiva IPv4 & Laboratorio Bit a Bit
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Modifica la dirección IP, desliza el prefijo CIDR o haz clic directamente sobre cualquier bit en la matriz de 32 bits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_NETWORKS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setIpInput(p.ip);
                  handleCidrChange(p.cidr);
                  setSubdivideTargetCidr(Math.min(32, p.cidr + 2));
                }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Dirección IPv4 de Host o Red
              </label>
              {!isValidIpv4(ipInput) && (
                <span className="text-[11px] text-rose-500 font-medium">
                  Formato IPv4 inválido
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="192.168.10.140"
                className="w-full px-3.5 py-2.5 text-base font-mono font-semibold rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => {
                  const randomIp = `172.${Math.floor(Math.random() * 16) + 16}.${Math.floor(
                    Math.random() * 250
                  )}.${Math.floor(Math.random() * 250) + 1}`;
                  setIpInput(randomIp);
                }}
                title="Generar IP aleatoria"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Prefijo CIDR:{' '}
                <strong className="font-mono text-sky-600 dark:text-sky-400">/{cidr}</strong> ({cidr}{' '}
                bits de red · {32 - cidr} bits de host)
              </label>
              <span className="text-xs font-mono text-slate-500">Salto: {analysis.blockSize}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2">
              <span className="text-xs font-mono text-slate-400">/1</span>
              <input
                type="range"
                min={1}
                max={32}
                value={cidr}
                onChange={(e) => handleCidrChange(Number(e.target.value))}
                aria-label="Selector deslizante de prefijo CIDR"
                className="w-full accent-sky-600 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400">/32</span>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Máscara en Decimal
            </label>
            <input
              type="text"
              value={maskInput}
              onChange={(e) => handleMaskInputChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono font-medium rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Main Results Grid + Interactive 32-bit Bitwise Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Parámetros Calculados de la Red
            </h3>
            <span className="text-xs font-mono text-slate-500">Clase {analysis.ipClass}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {[
              {
                key: 'net',
                label: 'Dirección IP de Red (Network ID)',
                value: `${analysis.networkAddress}/${analysis.cidr}`,
                raw: analysis.networkAddress,
                highlight: 'text-sky-600 dark:text-sky-400 font-bold text-sm',
              },
              {
                key: 'first',
                label: 'Primer Host Disponible (Red + 1)',
                value: analysis.firstHost,
                raw: analysis.firstHost,
                highlight: 'text-emerald-600 dark:text-emerald-400 font-semibold text-sm',
              },
              {
                key: 'last',
                label: 'Último Host Disponible (Broadcast − 1)',
                value: analysis.lastHost,
                raw: analysis.lastHost,
                highlight: 'text-emerald-600 dark:text-emerald-400 font-semibold text-sm',
              },
              {
                key: 'bcast',
                label: 'Dirección IP de Broadcast',
                value: analysis.broadcastAddress,
                raw: analysis.broadcastAddress,
                highlight: 'text-amber-600 dark:text-amber-400 font-bold text-sm',
              },
              {
                key: 'mask',
                label: 'Máscara de Subred Decimal',
                value: analysis.maskDecimal,
                raw: analysis.maskDecimal,
                highlight: 'text-slate-900 dark:text-white font-semibold',
              },
              {
                key: 'wildcard',
                label: 'Máscara Wildcard (Inversa OSPF/ACL)',
                value: analysis.wildcardDecimal,
                raw: analysis.wildcardDecimal,
                highlight: 'text-slate-700 dark:text-slate-300',
              },
              {
                key: 'hosts',
                label: 'Hosts Útiles Disponibles (2^h − 2)',
                value: analysis.usableHosts.toLocaleString('es-ES'),
                raw: String(analysis.usableHosts),
                highlight: 'text-slate-900 dark:text-white font-semibold',
              },
              {
                key: 'total',
                label: 'Total Direcciones en el Bloque (2^h)',
                value: analysis.totalAddresses.toLocaleString('es-ES'),
                raw: String(analysis.totalAddresses),
                highlight: 'text-slate-700 dark:text-slate-300',
              },
              {
                key: 'jump',
                label: 'Número Mágico / Salto de Bloque',
                value: `${analysis.blockSize} (en el ${analysis.interestingOctetIndex + 1}º octeto)`,
                raw: String(analysis.blockSize),
                highlight: 'text-sky-600 dark:text-sky-400 font-semibold',
              },
              {
                key: 'scope',
                label: 'Clasificación RFC / Ámbito',
                value: analysis.scope,
                raw: analysis.scope,
                highlight: 'text-slate-700 dark:text-slate-300 font-sans',
              },
            ].map((row) => (
              <div key={row.key} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono tabular-nums ${row.highlight}`}>{row.value}</span>
                  <button
                    type="button"
                    onClick={() => copyValue(row.key, row.raw)}
                    title="Copiar valor"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {copiedKey === row.key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 7 Columns: Interactive 32-Bit Binary Bitwise Visualizer */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Binary className="w-4 h-4 text-sky-500" />
                Matriz Binaria Interactiva de 32 Bits (Operación Bitwise AND / OR)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Haz clic en cualquier bit de la fila IP para conmutarlo entre 0 y 1 en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" />
                Red ({Math.min(cidr, analysis.defaultClassCidr)}b)
              </span>
              {analysis.borrowedBits > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Subred (+{analysis.borrowedBits}b)
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                Host ({analysis.hostBits}b)
              </span>
            </div>
          </div>

          <div className="space-y-4 overflow-x-auto pb-1">
            {[
              {
                title: 'Dirección IPv4 (Interactiva: clic para cambiar bit)',
                octets: analysis.ipBinaryOctets,
                decimal: analysis.ip,
                interactive: true,
              },
              {
                title: `Máscara de Subred (/${analysis.cidr})`,
                octets: analysis.maskBinaryOctets,
                decimal: analysis.maskDecimal,
                interactive: false,
              },
              {
                title: 'Dirección de Red = (IP AND Máscara)',
                octets: analysis.networkBinaryOctets,
                decimal: analysis.networkAddress,
                interactive: false,
              },
              {
                title: 'Dirección de Broadcast = (Red OR Wildcard)',
                octets: analysis.broadcastBinaryOctets,
                decimal: analysis.broadcastAddress,
                interactive: false,
              },
            ].map((row) => (
              <div
                key={row.title}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 min-w-[600px]"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {row.title}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {row.decimal}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {row.octets.map((octetStr, octIdx) => (
                    <div key={octIdx} className="space-y-1">
                      <div className="grid grid-cols-8 gap-0.5">
                        {octetStr.split('').map((bitChar, bitInOct) => {
                          const globalBit = octIdx * 8 + bitInOct;
                          const isNetworkBit = globalBit < cidr;
                          const isBorrowedSubnetBit =
                            isNetworkBit && globalBit >= analysis.defaultClassCidr;

                          let cellColor =
                            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
                          if (isBorrowedSubnetBit) {
                            cellColor =
                              'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35';
                          } else if (isNetworkBit) {
                            cellColor =
                              'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35';
                          }

                          return row.interactive ? (
                            <button
                              key={bitInOct}
                              type="button"
                              onClick={() => toggleIpBit(globalBit)}
                              title={`Bit #${globalBit + 1} (valor ${Math.pow(
                                2,
                                7 - bitInOct
                              )}) — Clic para alternar`}
                              className={`h-7 rounded text-xs font-mono font-bold border transition-transform active:scale-95 cursor-pointer ${cellColor} hover:brightness-110`}
                            >
                              {bitChar}
                            </button>
                          ) : (
                            <div
                              key={bitInOct}
                              className={`h-7 rounded text-xs font-mono font-semibold border flex items-center justify-center ${cellColor}`}
                            >
                              {bitChar}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] font-mono text-center text-slate-400">
                        Octeto {octIdx + 1}:{' '}
                        <strong className="text-slate-600 dark:text-slate-300">
                          {parseInt(octetStr, 2)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Host-to-Host L2/L3 Connectivity Comparator + Real CLI Config Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 cols: Host-to-Host L2/L3 Comparator */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-sky-500" />
              Verificador de Pertenencia a Subred (Capa 2 vs Capa 3)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprueba si un segundo host o puerta de enlace pertenece al mismo dominio de broadcast que <code className="font-mono">{analysis.ip}/{cidr}</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Dirección IP del Segundo Host / Destino
            </label>
            <input
              type="text"
              value={compareTargetIp}
              onChange={(e) => setCompareTargetIp(e.target.value)}
              placeholder="Ej. 192.168.10.190"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500">Red Origen ({analysis.ip}):</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {pairComparison.netA}/{cidr}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500">Red Destino ({compareTargetIp}):</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {pairComparison.netB}/{cidr}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2">
              {pairComparison.sameSubnet && pairComparison.roleB === 'host_valido' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {pairComparison.explanation}
              </span>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Real Network Device CLI Config Generator */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-500" />
                Generador de Configuración CLI Real (Router / Switch / Linux)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ejemplos de configuración para la subred calculada ({analysis.networkAddress}/{cidr}): adáptalos (interfaz, DNS, área OSPF) antes de usarlos en un equipo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500">VLAN:</span>
                <input
                  type="number"
                  min={1}
                  max={4094}
                  value={vlanId}
                  onChange={(e) => setVlanId(Math.max(1, Math.min(4094, Number(e.target.value) || 10)))}
                  aria-label="ID de VLAN"
                  className="w-16 px-2 py-1 text-xs font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                {(
                  [
                    { id: 'cisco', label: 'Cisco IOS' },
                    { id: 'linux', label: 'Linux iproute2' },
                    { id: 'mikrotik', label: 'MikroTik' },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setCliVendor(v.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      cliVendor === v.id
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800">
              <code>{activeCliText}</code>
            </pre>
            <button
              type="button"
              onClick={() => copyValue('cli', activeCliText)}
              className="absolute top-3 right-3 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700"
            >
              {copiedKey === 'cli' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar CLI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Pedagogical Method Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-500" />
            Explicación Didáctica Paso a Paso para {analysis.ip}/{analysis.cidr}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Método del Número Mágico (256 − Máscara)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((st) => (
            <div
              key={st.stepNumber}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                {st.stepNumber}. {st.title}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {st.summary}
              </p>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all">
                {st.formula}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {st.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Subnet Splitter / Subdivision Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              Explorador de Subdivisión de Bloques (FLSM)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Divide el bloque actual{' '}
              <code className="font-mono">
                {analysis.networkAddress}/{cidr}
              </code>{' '}
              en subredes más pequeñas tomando bits prestados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Subdividir hacia prefijo:
            </label>
            <select
              value={effectiveSubdivideCidr}
              onChange={(e) => setSubdivideTargetCidr(Number(e.target.value))}
              aria-label="Seleccionar prefijo CIDR de subdivisión"
              className="min-w-0 max-w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {Array.from({ length: 32 - cidr + 1 }, (_, i) => cidr + i).map((c) => (
                <option key={c} value={c}>
                  /{c} ({Math.pow(2, c - cidr).toLocaleString('es-ES')} subredes ·{' '}
                  {Math.max(0, Math.pow(2, 32 - c) - 2).toLocaleString('es-ES')} hosts)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium"># Subred</th>
                <th className="py-2.5 px-4 font-medium">Dirección de Red</th>
                <th className="py-2.5 px-4 font-medium">Primer Host Útil</th>
                <th className="py-2.5 px-4 font-medium">Último Host Útil</th>
                <th className="py-2.5 px-4 font-medium">Dirección Broadcast</th>
                <th className="py-2.5 pl-4 font-medium text-right">Hosts Útiles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono tabular-nums">
              {childSubnets.map((sub, idx) => (
                <tr
                  key={sub.networkAddress}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 pr-4 text-slate-500">#{idx + 1}</td>
                  <td className="py-2.5 px-4 font-semibold text-sky-600 dark:text-sky-400">
                    {sub.networkAddress}/{sub.cidr}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400">
                    {sub.firstHost}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400">
                    {sub.lastHost}
                  </td>
                  <td className="py-2.5 px-4 text-amber-600 dark:text-amber-400">
                    {sub.broadcastAddress}
                  </td>
                  <td className="py-2.5 pl-4 text-right text-slate-700 dark:text-slate-300">
                    {sub.usableHosts.toLocaleString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalChildSubnets > 32 && (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
              Mostrando las primeras 32 subredes de un total de{' '}
              <strong className="font-mono">{totalChildSubnets.toLocaleString('es-ES')}</strong>{' '}
              subredes generadas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
