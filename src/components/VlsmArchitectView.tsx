import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Network,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  GraduationCap,
  Terminal,
  Send,
  Route,
} from 'lucide-react';
import {
  VlsmSegmentInput,
  calculateVlsm,
  isValidIpv4,
  ipToInt,
} from '../utils/ipv4';

interface TopologyPreset {
  id: string;
  name: string;
  baseIp: string;
  baseCidr: number;
  segments: VlsmSegmentInput[];
}

const TOPOLOGY_PRESETS: TopologyPreset[] = [
  {
    id: 'corp',
    name: 'Empresa Multisede + Enlaces WAN (/24)',
    baseIp: '192.168.10.0',
    baseCidr: 24,
    segments: [
      { id: 's1', name: 'Sede Central — Ingeniería', requiredHosts: 100, role: 'LAN', vlanId: 10 },
      { id: 's2', name: 'Sucursal Norte — Ventas', requiredHosts: 50, role: 'LAN', vlanId: 20 },
      { id: 's3', name: 'Servidores DMZ & Firewall', requiredHosts: 25, role: 'DMZ', vlanId: 30 },
      { id: 's4', name: 'Red Inalámbrica Invitados', requiredHosts: 12, role: 'WIFI', vlanId: 40 },
      { id: 's5', name: 'Enlace WAN Router A–B', requiredHosts: 2, role: 'WAN', vlanId: 90 },
      { id: 's6', name: 'Enlace WAN Router B–C', requiredHosts: 2, role: 'WAN', vlanId: 91 },
    ],
  },
  {
    id: 'campus',
    name: 'Campus Universitario (/21 · 2048 IPs)',
    baseIp: '172.16.32.0',
    baseCidr: 21,
    segments: [
      { id: 'c1', name: 'Facultad de Informática', requiredHosts: 480, role: 'LAN', vlanId: 100 },
      { id: 'c2', name: 'Biblioteca & Aulas estudio', requiredHosts: 240, role: 'WIFI', vlanId: 110 },
      { id: 'c3', name: 'Rectorado & Administración', requiredHosts: 110, role: 'LAN', vlanId: 120 },
      { id: 'c4', name: 'Clúster HPC Investigación', requiredHosts: 55, role: 'DMZ', vlanId: 130 },
      { id: 'c5', name: 'Gestión Switches OOB', requiredHosts: 24, role: 'MGMT', vlanId: 199 },
      { id: 'c6', name: 'Enlace Troncal RedIRIS', requiredHosts: 2, role: 'WAN', vlanId: 900 },
    ],
  },
  {
    id: 'hospital',
    name: 'Hospital Regional Segmentado (/22)',
    baseIp: '10.20.4.0',
    baseCidr: 22,
    segments: [
      { id: 'h1', name: 'Estaciones Clínicas & HIS', requiredHosts: 250, role: 'LAN', vlanId: 10 },
      { id: 'h2', name: 'Diagnóstico por Imagen PACS', requiredHosts: 120, role: 'DMZ', vlanId: 20 },
      { id: 'h3', name: 'Telemetría UCI & Monitores', requiredHosts: 60, role: 'LAN', vlanId: 30 },
      { id: 'h4', name: 'Movilidad Médica Wi-Fi 6', requiredHosts: 115, role: 'WIFI', vlanId: 40 },
      { id: 'h5', name: 'Enlace Redundante MPLS', requiredHosts: 2, role: 'WAN', vlanId: 99 },
    ],
  },
];

const SEGMENT_COLORS = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-purple-500',
  'bg-cyan-500',
];

export const VlsmArchitectView: React.FC = () => {
  const [baseIp, setBaseIp] = useState<string>(TOPOLOGY_PRESETS[0].baseIp);
  const [baseCidr, setBaseCidr] = useState<number>(TOPOLOGY_PRESETS[0].baseCidr);
  const [segments, setSegments] = useState<VlsmSegmentInput[]>(TOPOLOGY_PRESETS[0].segments);

  const [newSegName, setNewSegName] = useState<string>('');
  const [newSegHosts, setNewSegHosts] = useState<string>('28');
  const [newSegRole, setNewSegRole] = useState<VlsmSegmentInput['role']>('LAN');

  const [quizMode, setQuizMode] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<
    Record<string, { cidr: string; network: string; broadcast: string }>
  >({});
  const [quizVerified, setQuizVerified] = useState<boolean>(false);
  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [showRouterCli, setShowRouterCli] = useState<boolean>(false);

  // Packet Forwarding Simulator State
  const [simSourceSegId, setSimSourceSegId] = useState<string>('');
  const [simDestIp, setSimDestIp] = useState<string>('192.168.10.135');

  const safeBaseIp = isValidIpv4(baseIp) ? baseIp.trim() : '192.168.10.0';
  const vlsm = calculateVlsm(safeBaseIp, baseCidr, segments);

  const activeSourceAlloc =
    vlsm.allocations.find((a) => a.id === simSourceSegId) || vlsm.allocations[0];

  const handleLoadPreset = (preset: TopologyPreset) => {
    setBaseIp(preset.baseIp);
    setBaseCidr(preset.baseCidr);
    setSegments(preset.segments);
    setQuizAnswers({});
    setQuizVerified(false);
    const computed = calculateVlsm(preset.baseIp, preset.baseCidr, preset.segments);
    if (computed.allocations.length > 1) {
      setSimSourceSegId(computed.allocations[0].id);
      setSimDestIp(computed.allocations[1].lastHost);
    }
  };

  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    const hostsNum = Math.max(1, Math.min(16000000, Number(newSegHosts) || 10));
    const name = newSegName.trim() || `Subred ${segments.length + 1}`;
    setSegments((prev) => [
      ...prev,
      {
        id: `seg_${Date.now()}`,
        name,
        requiredHosts: hostsNum,
        role: newSegRole,
        vlanId: (prev.length + 1) * 10,
      },
    ]);
    setNewSegName('');
    setQuizVerified(false);
  };

  const handleRemoveSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    setQuizVerified(false);
  };

  const handleUpdateSegmentHosts = (id: string, hosts: number) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, requiredHosts: Math.max(1, hosts) } : s))
    );
    setQuizVerified(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Orden VLSM',
      'VLAN ID',
      'Segmento / Topología',
      'Rol',
      'Hosts Solicitados',
      'Hosts Útiles',
      'Prefijo CIDR',
      'Máscara Decimal',
      'Dirección de Red',
      'Gateway (Primer Host)',
      'Último Host',
      'Broadcast',
      'Eficiencia %',
    ];
    const rows = vlsm.allocations.map((a, idx) => [
      idx + 1,
      a.vlanId,
      `"${a.name}"`,
      a.role,
      a.requiredHosts,
      a.usableHosts,
      `/${a.allocatedCidr}`,
      a.maskDecimal,
      a.networkAddress,
      a.firstHost,
      a.lastHost,
      a.broadcastAddress,
      `${a.utilizationPercent}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan_vlsm_${vlsm.baseAnalysis.networkAddress}_${baseCidr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const header = `| # | VLAN | Segmento | Rol | Hosts Req. | Red / CIDR | Máscara | Gateway — Último Host | Broadcast |\n|---|---|---|---|---|---|---|---|---|`;
    const lines = vlsm.allocations.map(
      (a, i) =>
        `| ${i + 1} | VLAN ${a.vlanId} | ${a.name} | ${a.role} | ${a.requiredHosts} | \`${
          a.networkAddress
        }/${a.allocatedCidr}\` | \`${a.maskDecimal}\` | \`${a.firstHost} - ${
          a.lastHost
        }\` | \`${a.broadcastAddress}\` |`
    );
    navigator.clipboard.writeText([header, ...lines].join('\n'));
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  };

  // Generate complete Cisco IOS Router-on-a-Stick & OSPF script for the entire VLSM plan
  const generateFullTopologyCiscoScript = () => {
    const lines: string[] = [
      `! ====================================================================`,
      `! SCRIPT CISCO IOS — ARQUITECTURA VLSM (${vlsm.baseAnalysis.networkAddress}/${baseCidr})`,
      `! Generado por SubnetLab IPv4 · Un Fantasma en el Sistema`,
      `! ====================================================================`,
      `enable`,
      `configure terminal`,
      `hostname CORE-RTR-VLSM`,
      `ip routing`,
      `!`,
      `interface GigabitEthernet0/0`,
      ` description TRUNK_HACIA_SWITCH_CORE`,
      ` no ip address`,
      ` no shutdown`,
      `!`,
    ];

    vlsm.allocations.forEach((a) => {
      if (a.overflow) return;
      const cleanName = a.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toUpperCase();
      lines.push(
        `interface GigabitEthernet0/0.${a.vlanId}`,
        ` description ${cleanName}_${a.role}`,
        ` encapsulation dot1Q ${a.vlanId}`,
        ` ip address ${a.firstHost} ${a.maskDecimal}`,
        `!`,
        `ip dhcp excluded-address ${a.firstHost}`,
        `ip dhcp pool POOL_VLAN_${a.vlanId}`,
        ` network ${a.networkAddress} ${a.maskDecimal}`,
        ` default-router ${a.firstHost}`,
        ` dns-server 1.1.1.1 8.8.8.8`,
        `!`
      );
    });

    lines.push(`router ospf 1`, ` router-id 1.1.1.1`);
    vlsm.allocations.forEach((a) => {
      if (a.overflow) return;
      lines.push(` network ${a.networkAddress} ${a.wildcardDecimal} area 0`);
    });
    lines.push(`end`, `write memory`);
    return lines.join('\n');
  };

  // Simulate Packet Forwarding (L2 vs L3 + Longest Prefix Match in VLSM table)
  const evaluatePacketSimulation = () => {
    if (!activeSourceAlloc || !isValidIpv4(simDestIp)) {
      return {
        valid: false,
        steps: ['Introduce una dirección IPv4 de destino válida para simular el envío del paquete.'],
        matchedRoute: null,
        status: 'error' as const,
      };
    }

    const destInt = ipToInt(simDestIp.trim());
    const srcStart = activeSourceAlloc.startInt;
    const srcEnd = activeSourceAlloc.endInt;
    const traceSteps: string[] = [];

    traceSteps.push(
      `1. Origen en [${activeSourceAlloc.name} · VLAN ${activeSourceAlloc.vlanId}] (Host ${activeSourceAlloc.lastHost}/${activeSourceAlloc.allocatedCidr}, Gateway ${activeSourceAlloc.firstHost}).`
    );

    if (destInt >= srcStart && destInt <= srcEnd) {
      if (destInt === srcStart) {
        traceSteps.push(
          `2. Operación AND en Origen: El destino ${simDestIp} coincide con la Dirección de Red (${activeSourceAlloc.networkAddress}). Paquete descartado (IP de red no asignable a host).`
        );
        return { valid: true, steps: traceSteps, matchedRoute: activeSourceAlloc, status: 'warning' as const };
      }
      if (destInt === srcEnd) {
        traceSteps.push(
          `2. Operación AND en Origen: El destino ${simDestIp} es la dirección de Broadcast local (${activeSourceAlloc.broadcastAddress}). Se envía trama Ethernet FF:FF:FF:FF:FF:FF en Capa 2 a toda la VLAN ${activeSourceAlloc.vlanId}.`
        );
        return { valid: true, steps: traceSteps, matchedRoute: activeSourceAlloc, status: 'ok' as const };
      }
      traceSteps.push(
        `2. Operación AND en Origen: El destino ${simDestIp} pertenece a la misma subred (${activeSourceAlloc.networkAddress}/${activeSourceAlloc.allocatedCidr}).`
      );
      traceSteps.push(
        `3. Conmutación directa Capa 2 (Switch VLAN ${activeSourceAlloc.vlanId}): Resolución ARP directa y entrega sin pasar por el Router.`
      );
      return { valid: true, steps: traceSteps, matchedRoute: activeSourceAlloc, status: 'ok' as const };
    }

    traceSteps.push(
      `2. Operación AND en Origen: El destino ${simDestIp} NO pertenece a ${activeSourceAlloc.networkAddress}/${activeSourceAlloc.allocatedCidr}. El host encapsula el paquete hacia su Default Gateway (${activeSourceAlloc.firstHost} en Gi0/0.${activeSourceAlloc.vlanId}).`
    );

    // Search VLSM Routing Table using Longest Prefix Match
    const matchingAllocs = vlsm.allocations
      .filter((a) => !a.overflow && destInt >= a.startInt && destInt <= a.endInt)
      .sort((a, b) => b.allocatedCidr - a.allocatedCidr);

    if (matchingAllocs.length > 0) {
      const winner = matchingAllocs[0];
      traceSteps.push(
        `3. Lookup en Tabla de Enrutamiento (Longest Prefix Match): Coincidencia exacta con la ruta directamente conectada ${winner.networkAddress}/${winner.allocatedCidr} vía subinterfaz Gi0/0.${winner.vlanId} (${winner.name}).`
      );
      if (destInt === winner.startInt || destInt === winner.endInt) {
        traceSteps.push(
          `4. Alerta en Destino: ${simDestIp} corresponde a la dirección de ${
            destInt === winner.startInt ? 'Red' : 'Broadcast'
          } de la subred destino. El router descarta ICMP dirigido.`
        );
        return { valid: true, steps: traceSteps, matchedRoute: winner, status: 'warning' as const };
      }
      traceSteps.push(
        `4. Entrega Capa 3 exitosa: El router decrementa TTL, reescribe cabeceras MAC y entrega el paquete a ${simDestIp} en la VLAN ${winner.vlanId}.`
      );
      return { valid: true, steps: traceSteps, matchedRoute: winner, status: 'ok' as const };
    }

    traceSteps.push(
      `3. Lookup en Tabla de Enrutamiento: Ninguna de las ${vlsm.allocations.length} subredes VLSM contiene a ${simDestIp}. Si no existe ruta por defecto (0.0.0.0/0), el router devuelve ICMP Destination Unreachable.`
    );
    return { valid: true, steps: traceSteps, matchedRoute: null, status: 'error' as const };
  };

  const simResult = evaluatePacketSimulation();
  const fullCiscoScript = generateFullTopologyCiscoScript();

  return (
    <div className="space-y-6">
      {/* Header & Topology Preset Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-sky-500" />
              Arquitecto de Subredes VLSM (Máscara de Subred de Longitud Variable)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ordena automáticamente las subredes de mayor a menor demanda de hosts para evitar solapamiento de bloques y optimizar el espacio IPv4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TOPOLOGY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Base Block & Mode Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Bloque IPv4 Base de Partida
            </label>
            <input
              type="text"
              value={baseIp}
              onChange={(e) => setBaseIp(e.target.value)}
              placeholder="192.168.10.0"
              className="w-full px-3.5 py-2 text-sm font-mono font-semibold rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Prefijo CIDR Base (/{baseCidr} · {vlsm.baseSpaceAddresses.toLocaleString('es-ES')} IPs)
            </label>
            <select
              value={baseCidr}
              onChange={(e) => setBaseCidr(Number(e.target.value))}
              aria-label="Prefijo CIDR Base"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {Array.from({ length: 22 }, (_, i) => i + 8).map((c) => (
                <option key={c} value={c}>
                  /{c} ({Math.pow(2, 32 - c).toLocaleString('es-ES')} direcciones totales)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setQuizMode((q) => !q);
                setQuizVerified(false);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                quizMode
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              {quizMode ? 'Salir de Autoevaluación' : 'Modo Autoevaluación VLSM'}
            </button>

            <button
              type="button"
              onClick={() => setShowRouterCli((v) => !v)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Terminal className="w-3.5 h-3.5 text-sky-500" />
              {showRouterCli ? 'Ocultar Script Cisco IOS' : 'Generar Script Router Cisco'}
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copiedMd ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Markdown
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Full Cisco IOS Router-on-a-Stick Script */}
      {showRouterCli && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-500" />
                Configuración Completa Cisco IOS (Subinterfaces 802.1Q + Pools DHCP + OSPF Area 0)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lista para pegar en Cisco Packet Tracer, GNS3, EVE-NG o routers ISR reales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(fullCiscoScript);
                setCopiedCli(true);
                setTimeout(() => setCopiedCli(false), 1800);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
            >
              {copiedCli ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCli ? 'Script Copiado' : 'Copiar Script Completo'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto border border-slate-800">
            <code>{fullCiscoScript}</code>
          </pre>
        </div>
      )}

      {/* Address Space Proportional Allocation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Mapa de Ocupación del Espacio de Direccionamiento ({vlsm.baseAnalysis.networkAddress}/
              {baseCidr})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Asignadas {vlsm.totalAllocatedAddresses.toLocaleString('es-ES')} de{' '}
              {vlsm.baseSpaceAddresses.toLocaleString('es-ES')} direcciones totales (
              {vlsm.overallUtilizationPercent}% del bloque padre utilizado).
            </p>
          </div>

          {vlsm.hasOverflow ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              Desbordamiento: El bloque /{baseCidr} es insuficiente para estas subredes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Espacio VLSM Válido sin Solapamientos (
              {vlsm.baseSpaceAddresses - vlsm.totalAllocatedAddresses} IPs libres)
            </span>
          )}
        </div>

        <div className="h-8 w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex">
          {vlsm.allocations.map((alloc, idx) => {
            if (alloc.overflow) return null;
            const widthPct = Math.max(2, (alloc.totalAddresses / vlsm.baseSpaceAddresses) * 100);
            const colorClass = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
            return (
              <div
                key={alloc.id}
                style={{ width: `${Math.min(100, widthPct)}%` }}
                title={`${alloc.name}: ${alloc.networkAddress}/${alloc.allocatedCidr} (${alloc.totalAddresses} IPs)`}
                className={`${colorClass} h-full border-r border-white/30 dark:border-slate-950/50 flex items-center justify-center text-[10px] font-mono font-bold text-white truncate px-1`}
              >
                /{alloc.allocatedCidr}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
          {vlsm.allocations.map((alloc, idx) => (
            <div key={alloc.id} className="inline-flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-xs ${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}`}
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">{alloc.name}</span>
              <span className="font-mono text-slate-500">
                (/{alloc.allocatedCidr} · {alloc.totalAddresses} IPs)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Segments + VLSM Allocation Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Requisitos de Subredes de la Topología
          </h3>

          <form
            onSubmit={handleAddSegment}
            className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre de VLAN / Subred / Enlace
              </label>
              <input
                type="text"
                value={newSegName}
                onChange={(e) => setNewSegName(e.target.value)}
                placeholder="Ej. VLAN Finanzas"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hosts Requeridos
                </label>
                <input
                  type="number"
                  min={1}
                  max={65534}
                  value={newSegHosts}
                  onChange={(e) => setNewSegHosts(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Segmento
                </label>
                <select
                  value={newSegRole}
                  onChange={(e) => setNewSegRole(e.target.value as VlsmSegmentInput['role'])}
                  aria-label="Tipo de segmento de red"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="LAN">LAN Usuarios</option>
                  <option value="WAN">WAN Punto a Punto</option>
                  <option value="DMZ">DMZ Servidores</option>
                  <option value="WIFI">Wi-Fi / Movilidad</option>
                  <option value="MGMT">Gestión OOB</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Subred a la Topología
            </button>
          </form>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {seg.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">Rol: {seg.role}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    value={seg.requiredHosts}
                    onChange={(e) => handleUpdateSegmentHosts(seg.id, Number(e.target.value))}
                    aria-label={`Hosts requeridos para ${seg.name}`}
                    className="w-20 px-2 py-1 text-xs font-mono text-right rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] text-slate-400">hosts</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSegment(seg.id)}
                    title="Eliminar segmento"
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 8 cols: VLSM Master Plan Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {quizMode
                  ? 'Reto de Diseño VLSM: Calcula el CIDR, Red y Broadcast de cada Subred'
                  : 'Tabla Maestra de Direccionamiento VLSM (Ordenada Mayor → Menor)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {quizMode
                  ? 'Las subredes ya están ordenadas de mayor a menor número de hosts. Completa el prefijo CIDR, IP de Red y Broadcast.'
                  : 'Cada subred comienza exactamente en la dirección siguiente al broadcast del bloque anterior.'}
              </p>
            </div>

            {quizMode && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuizVerified(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
                >
                  Comprobar Diseño VLSM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const filled: Record<
                      string,
                      { cidr: string; network: string; broadcast: string }
                    > = {};
                    vlsm.allocations.forEach((a) => {
                      filled[a.id] = {
                        cidr: `/${a.allocatedCidr}`,
                        network: a.networkAddress,
                        broadcast: a.broadcastAddress,
                      };
                    });
                    setQuizAnswers(filled);
                    setQuizVerified(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Solución
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">VLAN</th>
                  <th className="py-2.5 px-3 font-medium">Segmento</th>
                  <th className="py-2.5 px-3 font-medium">Hosts Req. / Útiles</th>
                  <th className="py-2.5 px-3 font-medium">Prefijo / Máscara</th>
                  <th className="py-2.5 px-3 font-medium">IP de Red</th>
                  <th className="py-2.5 px-3 font-medium">Gateway — Último Host</th>
                  <th className="py-2.5 pl-3 font-medium">Broadcast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono tabular-nums">
                {vlsm.allocations.map((alloc) => {
                  const userAns = quizAnswers[alloc.id] || {
                    cidr: '',
                    network: '',
                    broadcast: '',
                  };
                  const cidrOk =
                    userAns.cidr.trim().replace('/', '') === String(alloc.allocatedCidr);
                  const netOk = userAns.network.trim() === alloc.networkAddress;
                  const bcastOk = userAns.broadcast.trim() === alloc.broadcastAddress;

                  return (
                    <tr
                      key={alloc.id}
                      className={
                        alloc.overflow
                          ? 'bg-rose-500/10'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-3 pr-3 text-slate-500">VLAN {alloc.vlanId}</td>
                      <td className="py-3 px-3 font-sans">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {alloc.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {alloc.role} · {alloc.utilizationPercent}% uso
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {alloc.requiredHosts}
                        </span>{' '}
                        <span className="text-slate-400">/ {alloc.usableHosts}</span>
                      </td>

                      {quizMode ? (
                        <>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              placeholder="/26"
                              value={userAns.cidr}
                              onChange={(e) =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [alloc.id]: { ...userAns, cidr: e.target.value },
                                }))
                              }
                              className="w-16 px-2 py-1 text-xs font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                            />
                            {quizVerified && (
                              <div className="mt-1">
                                {cidrOk ? (
                                  <span className="text-[11px] text-emerald-500 inline-flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-rose-500 inline-flex items-center gap-0.5">
                                    <XCircle className="w-3 h-3" /> /{alloc.allocatedCidr}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              placeholder="IP de Red"
                              value={userAns.network}
                              onChange={(e) =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [alloc.id]: { ...userAns, network: e.target.value },
                                }))
                              }
                              className="w-32 px-2 py-1 text-xs font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                            />
                            {quizVerified && (
                              <div className="mt-1">
                                {netOk ? (
                                  <span className="text-[11px] text-emerald-500 inline-flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-rose-500 inline-flex items-center gap-0.5">
                                    <XCircle className="w-3 h-3" /> {alloc.networkAddress}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {quizVerified
                              ? `${alloc.firstHost} — ${alloc.lastHost}`
                              : 'Calculado tras Red/Broadcast'}
                          </td>
                          <td className="py-2.5 pl-2">
                            <input
                              type="text"
                              placeholder="Broadcast"
                              value={userAns.broadcast}
                              onChange={(e) =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [alloc.id]: { ...userAns, broadcast: e.target.value },
                                }))
                              }
                              className="w-32 px-2 py-1 text-xs font-mono rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                            />
                            {quizVerified && (
                              <div className="mt-1">
                                {bcastOk ? (
                                  <span className="text-[11px] text-emerald-500 inline-flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-rose-500 inline-flex items-center gap-0.5">
                                    <XCircle className="w-3 h-3" /> {alloc.broadcastAddress}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3">
                            <div className="font-bold text-sky-600 dark:text-sky-400">
                              /{alloc.allocatedCidr}
                            </div>
                            <div className="text-[11px] text-slate-500">{alloc.maskDecimal}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                            {alloc.networkAddress}
                          </td>
                          <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400">
                            {alloc.firstHost} — {alloc.lastHost}
                          </td>
                          <td className="py-3 pl-3 text-amber-600 dark:text-amber-400">
                            {alloc.broadcastAddress}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Packet Routing & Longest Prefix Match Simulator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Route className="w-4 h-4 text-sky-500" />
              Simulador de Enrutamiento de Paquetes en la Topología VLSM (Longest Prefix Match)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprueba cómo un paquete IPv4 decide entre ARP local (Capa 2) o reenvío a través del Router Core hacia otra VLAN (Capa 3).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subred / VLAN de Origen del Paquete
            </label>
            <select
              value={activeSourceAlloc?.id || ''}
              onChange={(e) => setSimSourceSegId(e.target.value)}
              aria-label="Subred de origen"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {vlsm.allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  VLAN {a.vlanId} — {a.name} ({a.networkAddress}/{a.allocatedCidr})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Dirección IPv4 de Destino (Ping / Traceroute)
            </label>
            <input
              type="text"
              value={simDestIp}
              onChange={(e) => setSimDestIp(e.target.value)}
              placeholder="Ej. 192.168.10.135"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-3 flex flex-wrap gap-1.5">
            {vlsm.allocations.slice(0, 3).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSimDestIp(a.lastHost)}
                className="px-2.5 py-2 text-[11px] font-mono rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Probar VLAN {a.vlanId}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          {simResult.steps.map((st, idx) => (
            <div
              key={idx}
              className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2"
            >
              <span className="text-sky-500 font-bold">→</span>
              <span>{st}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
