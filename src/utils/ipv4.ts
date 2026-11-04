export interface SubnetAnalysis {
  ip: string;
  cidr: number;
  maskDecimal: string;
  wildcardDecimal: string;
  ipBinaryOctets: string[];
  maskBinaryOctets: string[];
  networkBinaryOctets: string[];
  broadcastBinaryOctets: string[];
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  defaultClassCidr: number;
  borrowedBits: number;
  hostBits: number;
  subnetsFromDefault: number;
  interestingOctetIndex: number; // 0, 1, 2, or 3
  interestingMaskValue: number;
  blockSize: number; // 256 - interestingMaskValue (Salto de bloque / Número mágico)
  scope: string;
  isRfc1918: boolean;
}

export interface StepExplanation {
  stepNumber: string;
  title: string;
  summary: string;
  formula: string;
  detail: string;
}

export interface VlsmSegmentInput {
  id: string;
  name: string;
  requiredHosts: number;
  role: 'LAN' | 'WAN' | 'DMZ' | 'MGMT' | 'WIFI';
  vlanId?: number;
}

export interface VlsmAllocatedBlock {
  id: string;
  name: string;
  role: 'LAN' | 'WAN' | 'DMZ' | 'MGMT' | 'WIFI';
  vlanId: number;
  requiredHosts: number;
  allocatedCidr: number;
  maskDecimal: string;
  wildcardDecimal: string;
  networkAddress: string;
  firstHost: string; // Typically Default Gateway
  lastHost: string;
  broadcastAddress: string;
  usableHosts: number;
  totalAddresses: number;
  wastedHosts: number;
  utilizationPercent: number;
  startInt: number;
  endInt: number;
  overflow: boolean;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'exam';
export type ChallengeCategory =
  | 'full_network'
  | 'topology_design'
  | 'binary_drill'
  | 'troubleshooting'
  | 'supernetting';

export interface TopologyScenario {
  title: string;
  description: string;
  baseNetwork: string;
  baseCidr: number;
  constraintType: 'subnets' | 'hosts';
  requiredCount: number;
  targetSubnetIndex: number;
  branches: {
    name: string;
    hosts: number;
    icon: 'router' | 'building' | 'server' | 'wifi';
  }[];
  expectedBorrowedBits: number;
  expectedNewCidr: number;
  expectedNewMask: string;
  expectedBlockSize: number;
  expectedSubnetsCreated: number;
  expectedHostsPerSubnet: number;
  targetNetwork: string;
  targetFirstHost: string;
  targetLastHost: string;
  targetBroadcast: string;
}

export type TroubleshootingFaultType =
  | 'host_is_network_id'
  | 'host_is_broadcast'
  | 'different_subnet'
  | 'wrong_mask';

export interface TroubleshootingScenario {
  ticketId: string;
  title: string;
  symptom: string;
  gatewayIp: string;
  gatewayCidr: number;
  hostIp: string;
  hostCidr: number;
  faultType: TroubleshootingFaultType;
  faultExplanation: string;
  expectedGatewayNetwork: string;
  expectedValidFirstHost: string;
  expectedValidLastHost: string;
  expectedBroadcast: string;
}

export interface SupernetScenario {
  title: string;
  description: string;
  routes: string[];
  baseCidr: number;
  expectedSummaryIp: string;
  expectedSummaryCidr: number;
  expectedSummaryMask: string;
  commonBitsCount: number;
  binaryComparisonRows: {
    ip: string;
    binaryFormatted: string;
  }[];
}

export interface SubnetChallenge {
  id: string;
  category: ChallengeCategory;
  difficulty: DifficultyLevel;
  givenIp: string;
  givenCidr: number;
  givenFormat: 'cidr' | 'decimal_mask';
  analysis: SubnetAnalysis;
  topology?: TopologyScenario;
  troubleshooting?: TroubleshootingScenario;
  supernetting?: SupernetScenario;
}

/**
 * Validate an IPv4 dotted-quad string
 */
export function isValidIpv4(ip: string): boolean {
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    if (num < 0 || num > 255) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
  }
  return true;
}

/**
 * Validate a valid subnet mask in dotted decimal
 */
export function decimalMaskToCidr(mask: string): number | null {
  if (!isValidIpv4(mask)) return null;
  const intVal = ipToInt(mask);
  const bin = intVal.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bin)) return null;
  return bin.indexOf('0') === -1 ? 32 : bin.indexOf('0');
}

/**
 * Convert IPv4 string to unsigned 32-bit integer
 */
export function ipToInt(ip: string): number {
  const parts = ip.trim().split('.').map(Number);
  return (
    (((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      (parts[3] >>> 0)) >>>
    0
  );
}

/**
 * Convert unsigned 32-bit integer to IPv4 dotted string
 */
export function intToIp(intVal: number): string {
  const u = intVal >>> 0;
  return [(u >>> 24) & 255, (u >>> 16) & 255, (u >>> 8) & 255, u & 255].join('.');
}

/**
 * Convert CIDR (0..32) to unsigned 32-bit mask integer
 */
export function cidrToMaskInt(cidr: number): number {
  const clamped = Math.max(0, Math.min(32, Math.floor(cidr)));
  if (clamped === 0) return 0;
  return (0xffffffff << (32 - clamped)) >>> 0;
}

/**
 * Convert CIDR (0..32) to dotted decimal mask
 */
export function cidrToMaskDecimal(cidr: number): string {
  return intToIp(cidrToMaskInt(cidr));
}

/**
 * Convert unsigned 32-bit int to 4 binary octets ["11000000", ...]
 */
export function intToBinaryOctets(intVal: number): string[] {
  const u = intVal >>> 0;
  return [
    ((u >>> 24) & 255).toString(2).padStart(8, '0'),
    ((u >>> 16) & 255).toString(2).padStart(8, '0'),
    ((u >>> 8) & 255).toString(2).padStart(8, '0'),
    (u & 255).toString(2).padStart(8, '0'),
  ];
}

/**
 * Normalize binary mask input
 */
export function normalizeBinaryString(input: string): string {
  const rawBits = input.replace(/[^01]/g, '');
  if (rawBits.length !== 32) return input.trim();
  return [
    rawBits.slice(0, 8),
    rawBits.slice(8, 16),
    rawBits.slice(16, 24),
    rawBits.slice(24, 32),
  ].join('.');
}

/**
 * Determine IPv4 Class & Scope
 */
export function getIpClassAndScope(ipInt: number): {
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  defaultClassCidr: number;
  scope: string;
  isRfc1918: boolean;
} {
  const firstOctet = (ipInt >>> 24) & 255;
  const secondOctet = (ipInt >>> 16) & 255;

  let ipClass: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
  let defaultClassCidr = 24;

  if (firstOctet <= 127) {
    ipClass = 'A';
    defaultClassCidr = 8;
  } else if (firstOctet <= 191) {
    ipClass = 'B';
    defaultClassCidr = 16;
  } else if (firstOctet <= 223) {
    ipClass = 'C';
    defaultClassCidr = 24;
  } else if (firstOctet <= 239) {
    ipClass = 'D';
    defaultClassCidr = 0; // sin máscara por defecto: no se divide en subredes
  } else {
    ipClass = 'E';
    defaultClassCidr = 0;
  }

  let scope = 'Pública Enrutable (Unicast)';
  let isRfc1918 = false;

  const thirdOctet = (ipInt >>> 8) & 255;

  if (firstOctet === 0) {
    scope = 'Esta red (RFC 1122 · 0.0.0.0/8) · no enrutable';
  } else if (ipInt >>> 0 === 0xffffffff) {
    scope = 'Broadcast limitado (255.255.255.255)';
  } else if (
    (firstOctet === 192 && secondOctet === 0 && thirdOctet === 2) ||
    (firstOctet === 198 && secondOctet === 51 && thirdOctet === 100) ||
    (firstOctet === 203 && secondOctet === 0 && thirdOctet === 113)
  ) {
    scope = 'Documentación (RFC 5737) · solo para ejemplos, no enrutable';
  } else if (firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)) {
    scope = 'Pruebas de rendimiento (RFC 2544 · 198.18.0.0/15)';
  } else if (firstOctet === 10) {
    scope = 'Privada RFC 1918 (Clase A · 10.0.0.0/8)';
    isRfc1918 = true;
  } else if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    scope = 'Privada RFC 1918 (Clase B · 172.16.0.0/12)';
    isRfc1918 = true;
  } else if (firstOctet === 192 && secondOctet === 168) {
    scope = 'Privada RFC 1918 (Clase C · 192.168.0.0/16)';
    isRfc1918 = true;
  } else if (firstOctet === 127) {
    scope = 'Loopback Diagnóstico (RFC 1122 · 127.0.0.0/8)';
  } else if (firstOctet === 169 && secondOctet === 254) {
    scope = 'Link-Local APIPA (RFC 3927 · 169.254.0.0/16)';
  } else if (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) {
    scope = 'CGNAT Carrier-Grade NAT (RFC 6598 · 100.64.0.0/10)';
  } else if (ipClass === 'D') {
    scope = 'Multicast (RFC 5771 · 224.0.0.0/4)';
  } else if (ipClass === 'E') {
    scope = 'Experimental Reservada (240.0.0.0/4)';
  }

  return { ipClass, defaultClassCidr, scope, isRfc1918 };
}

/**
 * Perform full IPv4 Subnet Analysis
 */
export function analyzeIpv4(ip: string, cidrInput: number): SubnetAnalysis {
  const safeIp = isValidIpv4(ip) ? ip.trim() : '192.168.1.10';
  const cidr = Math.max(1, Math.min(32, Math.floor(cidrInput)));

  const ipInt = ipToInt(safeIp);
  const maskInt = cidrToMaskInt(cidr);
  const wildcardInt = (~maskInt) >>> 0;

  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;

  let firstHostInt = networkInt;
  let lastHostInt = broadcastInt;
  let totalAddresses = Math.pow(2, 32 - cidr);
  let usableHosts = Math.max(0, totalAddresses - 2);

  if (cidr === 32) {
    firstHostInt = networkInt;
    lastHostInt = networkInt;
    totalAddresses = 1;
    usableHosts = 1;
  } else if (cidr === 31) {
    firstHostInt = networkInt;
    lastHostInt = broadcastInt;
    totalAddresses = 2;
    usableHosts = 2;
  } else {
    firstHostInt = (networkInt + 1) >>> 0;
    lastHostInt = (broadcastInt - 1) >>> 0;
  }

  const { ipClass, defaultClassCidr, scope, isRfc1918 } = getIpClassAndScope(ipInt);
  const hostBits = 32 - cidr;
  const borrowedBits = defaultClassCidr > 0 ? Math.max(0, cidr - defaultClassCidr) : 0;
  const subnetsFromDefault = Math.pow(2, borrowedBits);

  let interestingOctetIndex = 3;
  if (cidr <= 8) interestingOctetIndex = 0;
  else if (cidr <= 16) interestingOctetIndex = 1;
  else if (cidr <= 24) interestingOctetIndex = 2;
  else interestingOctetIndex = 3;

  const maskParts = intToIp(maskInt).split('.').map(Number);
  const interestingMaskValue = maskParts[interestingOctetIndex];
  const blockSize = 256 - interestingMaskValue;

  return {
    ip: safeIp,
    cidr,
    maskDecimal: intToIp(maskInt),
    wildcardDecimal: intToIp(wildcardInt),
    ipBinaryOctets: intToBinaryOctets(ipInt),
    maskBinaryOctets: intToBinaryOctets(maskInt),
    networkBinaryOctets: intToBinaryOctets(networkInt),
    broadcastBinaryOctets: intToBinaryOctets(broadcastInt),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstHost: intToIp(firstHostInt),
    lastHost: intToIp(lastHostInt),
    totalAddresses,
    usableHosts,
    ipClass,
    defaultClassCidr,
    borrowedBits,
    hostBits,
    subnetsFromDefault,
    interestingOctetIndex,
    interestingMaskValue,
    blockSize,
    scope,
    isRfc1918,
  };
}

/**
 * Compare two IPs under a given CIDR to check if they belong to the same subnet
 */
export function compareIpPair(ipA: string, ipB: string, cidr: number): {
  valid: boolean;
  sameSubnet: boolean;
  netA: string;
  netB: string;
  roleB: 'host_valido' | 'direccion_red' | 'direccion_broadcast';
  explanation: string;
} {
  if (!isValidIpv4(ipA) || !isValidIpv4(ipB)) {
    return {
      valid: false,
      sameSubnet: false,
      netA: '-',
      netB: '-',
      roleB: 'host_valido',
      explanation: 'Introduce una dirección IPv4 válida para comparar.',
    };
  }
  const a = analyzeIpv4(ipA, cidr);
  const b = analyzeIpv4(ipB, cidr);
  const sameSubnet = a.networkAddress === b.networkAddress;

  let roleB: 'host_valido' | 'direccion_red' | 'direccion_broadcast' = 'host_valido';
  if (cidr <= 30) {
    if (b.ip === b.networkAddress) roleB = 'direccion_red';
    else if (b.ip === b.broadcastAddress) roleB = 'direccion_broadcast';
  }

  let explanation = '';
  if (sameSubnet) {
    if (roleB === 'direccion_red') {
      explanation = `Ambas pertenecen al bloque ${a.networkAddress}/${cidr}, pero ${b.ip} es la Dirección de Red (no asignable a un host en /${cidr}).`;
    } else if (roleB === 'direccion_broadcast') {
      explanation = `Ambas pertenecen al bloque ${a.networkAddress}/${cidr}, pero ${b.ip} es la Dirección de Broadcast del bloque.`;
    } else {
      explanation = `Comunicación directa Capa 2 (Switch/ARP): Ambos hosts comparten la misma red (${a.networkAddress}/${cidr}) sin necesidad de cruzar el Default Gateway.`;
    }
  } else {
    explanation = `Diferente subred (${a.networkAddress}/${cidr} vs ${b.networkAddress}/${cidr}): Los paquetes deben enviarse al Default Gateway (enrutamiento Capa 3).`;
  }

  return {
    valid: true,
    sameSubnet,
    netA: a.networkAddress,
    netB: b.networkAddress,
    roleB,
    explanation,
  };
}

/**
 * Generate real CLI configuration snippets for a subnet
 */
export function generateSubnetCliConfigs(analysis: SubnetAnalysis, vlanId = 10): {
  ciscoIos: string;
  linuxIp: string;
  mikrotik: string;
} {
  const gw = analysis.firstHost;
  const ciscoIos = `! Configuración Interfaz y Pool DHCP en Cisco IOS
interface GigabitEthernet0/0.${vlanId}
 description SUBRED_${analysis.networkAddress.replace(/\./g, '_')}_${analysis.cidr}
 encapsulation dot1Q ${vlanId}
 ip address ${gw} ${analysis.maskDecimal}
 no shutdown
!
ip dhcp excluded-address ${gw}
ip dhcp pool POOL_VLAN_${vlanId}
 network ${analysis.networkAddress} ${analysis.maskDecimal}
 default-router ${gw}
 dns-server 1.1.1.1 8.8.8.8
!
router ospf 1
 network ${analysis.networkAddress} ${analysis.wildcardDecimal} area 0`;

  const linuxIp = `# Configuración en Linux (iproute2 / Debian / Ubuntu)
sudo ip link add link eth0 name eth0.${vlanId} type vlan id ${vlanId}
sudo ip addr add ${gw}/${analysis.cidr} brd ${analysis.broadcastAddress} dev eth0.${vlanId}
sudo ip link set dev eth0.${vlanId} up
# Verificar tabla de rutas del kernel:
ip route show proto kernel dev eth0.${vlanId}`;

  const mikrotik = `# Configuración en MikroTik RouterOS v7
/interface vlan
add interface=ether1 name=vlan${vlanId} vlan-id=${vlanId}
/ip address
add address=${gw}/${analysis.cidr} interface=vlan${vlanId} network=${analysis.networkAddress}
/ip pool
add name=pool_vlan${vlanId} ranges=${
    analysis.cidr <= 29
      ? `${intToIp((ipToInt(analysis.firstHost) + 1) >>> 0)}-${analysis.lastHost}`
      : analysis.lastHost
  }`;

  return { ciscoIos, linuxIp, mikrotik };
}

/**
 * Generate clear didactic step-by-step explanations in Spanish for any SubnetAnalysis
 */
export function getStepByStepExplanation(analysis: SubnetAnalysis): StepExplanation[] {
  const ipOctets = analysis.ip.split('.').map(Number);
  const netOctets = analysis.networkAddress.split('.').map(Number);
  const bcastOctets = analysis.broadcastAddress.split('.').map(Number);
  const idx = analysis.interestingOctetIndex;
  const octetNames = ['1er octeto', '2º octeto', '3er octeto', '4º octeto'];
  const ipOctetVal = ipOctets[idx];
  const netOctetVal = netOctets[idx];
  const nextNetOctetVal = netOctetVal + analysis.blockSize;

  return [
    {
      stepNumber: '01',
      title: 'Conversión de Prefijo CIDR a Máscara Decimal y Binaria',
      summary: `El prefijo /${analysis.cidr} indica ${analysis.cidr} bits encendidos (1) para red y ${analysis.hostBits} bits apagados (0) para hosts.`,
      formula: `/${analysis.cidr} = ${analysis.maskBinaryOctets.join('.')} = ${analysis.maskDecimal}`,
      detail: `El octeto donde cambia de unos a ceros (o termina la red) es el ${octetNames[idx]} con valor decimal ${analysis.interestingMaskValue} (${analysis.maskBinaryOctets[idx]}).`,
    },
    {
      stepNumber: '02',
      title: 'Cálculo del Número Mágico (Salto de Bloque)',
      summary: `Restamos a 256 el valor de la máscara en el ${octetNames[idx]} (${analysis.interestingMaskValue}).`,
      formula: `Salto = 256 - ${analysis.interestingMaskValue} = ${analysis.blockSize}`,
      detail: `Todas las subredes avanzan en múltiplos exactos de ${analysis.blockSize} dentro del ${octetNames[idx]} (0, ${analysis.blockSize}, ${Math.min(256, analysis.blockSize * 2)}...).`,
    },
    {
      stepNumber: '03',
      title: 'Dirección de Red (Operación AND / Múltiplo Inferior)',
      summary: `Buscamos el mayor múltiplo de ${analysis.blockSize} que sea menor o igual a ${ipOctetVal} en el ${octetNames[idx]}.`,
      formula: `⌊${ipOctetVal} / ${analysis.blockSize}⌋ × ${analysis.blockSize} = ${netOctetVal} → Red: ${analysis.networkAddress}`,
      detail: `Los octetos a la derecha del ${octetNames[idx]} se ponen a 0. En binario equivale a hacer IP AND Máscara.`,
    },
    {
      stepNumber: '04',
      title: 'Dirección de Broadcast (Siguiente Red menos 1)',
      summary: `La siguiente subred comenzaría en ${nextNetOctetVal} en el ${octetNames[idx]}. Restamos 1 para obtener el broadcast actual.`,
      formula: `Broadcast en ${octetNames[idx]} = (${netOctetVal} + ${analysis.blockSize}) - 1 = ${bcastOctets[idx]} → ${analysis.broadcastAddress}`,
      detail: `Todos los ${analysis.hostBits} bits de host se encienden a 1, por lo que cualquier octeto posterior al ${octetNames[idx]} vale 255.`,
    },
    {
      stepNumber: '05',
      title: 'Rango de Hosts Disponibles y Capacidad Total',
      summary: `El primer host es Red + 1 y el último host es Broadcast - 1. Se reservan 2 direcciones (Red y Broadcast).`,
      formula:
        analysis.cidr === 32
          ? `/32 = una sola dirección (ruta de host o loopback): ${analysis.firstHost}`
          : analysis.cidr === 31
          ? `/31 = 2 direcciones, ambas utilizables en enlaces punto a punto (RFC 3021): ${analysis.firstHost} y ${analysis.lastHost}`
          : `Hosts útiles = 2^${analysis.hostBits} - 2 = ${analysis.usableHosts.toLocaleString('es-ES')} (${analysis.firstHost} — ${analysis.lastHost})`,
      detail:
        analysis.defaultClassCidr === 0
          ? `Las direcciones de clase ${analysis.ipClass} (${analysis.ipClass === 'D' ? 'multicast' : 'experimentales'}) no tienen máscara por defecto ni se reparten entre hosts: el cálculo es solo un ejercicio binario.`
          : `Desde la máscara por defecto /${analysis.defaultClassCidr} (Clase ${analysis.ipClass}), se tomaron ${analysis.borrowedBits} bits prestados creando 2^${analysis.borrowedBits} = ${analysis.subnetsFromDefault.toLocaleString('es-ES')} subredes.`,
    },
  ];
}

/**
 * Generate a list of N sequential subnets from a base network and target CIDR
 */
export function generateSubnetsList(
  baseIp: string,
  baseCidr: number,
  targetCidr: number,
  limit = 64
): SubnetAnalysis[] {
  const safeBaseCidr = Math.max(1, Math.min(30, baseCidr));
  const safeTargetCidr = Math.max(safeBaseCidr, Math.min(32, targetCidr));
  const baseAnalysis = analyzeIpv4(baseIp, safeBaseCidr);
  const startInt = ipToInt(baseAnalysis.networkAddress);
  const totalSubnets = Math.pow(2, safeTargetCidr - safeBaseCidr);
  const count = Math.min(totalSubnets, limit);
  const subnetSize = Math.pow(2, 32 - safeTargetCidr);

  const list: SubnetAnalysis[] = [];
  for (let i = 0; i < count; i++) {
    const netInt = (startInt + i * subnetSize) >>> 0;
    list.push(analyzeIpv4(intToIp(netInt), safeTargetCidr));
  }
  return list;
}

/**
 * Calculate VLSM optimal allocation for a list of segments
 */
export function calculateVlsm(
  baseIp: string,
  baseCidr: number,
  segments: VlsmSegmentInput[]
): {
  baseAnalysis: SubnetAnalysis;
  allocations: VlsmAllocatedBlock[];
  totalRequiredAddresses: number;
  totalAllocatedAddresses: number;
  baseSpaceAddresses: number;
  overallUtilizationPercent: number;
  hasOverflow: boolean;
} {
  const baseAnalysis = analyzeIpv4(baseIp, baseCidr);
  const baseStartInt = ipToInt(baseAnalysis.networkAddress);
  const baseEndInt = ipToInt(baseAnalysis.broadcastAddress);
  const baseSpaceAddresses = baseAnalysis.totalAddresses;

  const sorted = [...segments].sort((a, b) => b.requiredHosts - a.requiredHosts);

  let cursorInt = baseStartInt;
  let totalRequiredAddresses = 0;
  let totalAllocatedAddresses = 0;
  let hasOverflow = false;

  const allocations: VlsmAllocatedBlock[] = sorted.map((seg, idx) => {
    const req = Math.max(1, Math.floor(seg.requiredHosts));
    totalRequiredAddresses += req;

    let hostBits = 2;
    while (Math.pow(2, hostBits) - 2 < req && hostBits < 30) {
      hostBits++;
    }
    const allocatedCidr = 32 - hostBits;
    const blockAddresses = Math.pow(2, hostBits);

    if (cursorInt % blockAddresses !== 0) {
      cursorInt = Math.ceil(cursorInt / blockAddresses) * blockAddresses;
    }

    const netInt = cursorInt;
    const bcastInt = netInt + blockAddresses - 1; // sin >>> 0: si pasa de 2^32 debe contar como desbordamiento
    const overflow = bcastInt > baseEndInt || allocatedCidr < baseCidr;
    if (overflow) hasOverflow = true;

    const subAnalysis = analyzeIpv4(intToIp(netInt >>> 0), allocatedCidr);
    const usable = subAnalysis.usableHosts;
    const wasted = Math.max(0, usable - req);
    const util = usable > 0 ? Math.min(100, Math.round((req / usable) * 100)) : 100;

    cursorInt = bcastInt + 1;
    if (!overflow) {
      totalAllocatedAddresses += blockAddresses;
    }

    return {
      id: seg.id,
      name: seg.name,
      role: seg.role,
      vlanId: seg.vlanId || (idx + 1) * 10,
      requiredHosts: req,
      allocatedCidr,
      maskDecimal: subAnalysis.maskDecimal,
      wildcardDecimal: subAnalysis.wildcardDecimal,
      networkAddress: subAnalysis.networkAddress,
      firstHost: subAnalysis.firstHost,
      lastHost: subAnalysis.lastHost,
      broadcastAddress: subAnalysis.broadcastAddress,
      usableHosts: usable,
      totalAddresses: blockAddresses,
      wastedHosts: wasted,
      utilizationPercent: util,
      startInt: netInt,
      endInt: bcastInt,
      overflow,
    };
  });

  const overallUtilizationPercent =
    baseSpaceAddresses > 0
      ? Math.min(100, Math.round((totalAllocatedAddresses / baseSpaceAddresses) * 100))
      : 0;

  return {
    baseAnalysis,
    allocations,
    totalRequiredAddresses,
    totalAllocatedAddresses,
    baseSpaceAddresses,
    overallUtilizationPercent,
    hasOverflow,
  };
}

/**
 * Random integer helper [min, max] inclusive
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a realistic topology design scenario
 */
function generateTopologyScenario(difficulty: DifficultyLevel): {
  givenIp: string;
  givenCidr: number;
  topology: TopologyScenario;
} {
  const templates = [
    {
      title: 'Topología Campus Corporativo Multisede',
      branchNames: [
        'VLAN Ingeniería',
        'VLAN Administración',
        'VLAN Laboratorios',
        'VLAN Servidores DMZ',
        'VLAN VoIP',
        'Enlace Core',
      ],
    },
    {
      title: 'Arquitectura Hospitalaria Segmentada',
      branchNames: [
        'Planta Urgencias',
        'Radiología Digital',
        'Gestión Clínica',
        'Farmacia Central',
        'Telemedicina',
        'Backbone Quirófanos',
      ],
    },
    {
      title: 'Red Industrial Planta Automatizada',
      branchNames: [
        'Celdas Robóticas SCADA',
        'Control de Calidad',
        'Logística & Almacén',
        'Ingeniería de Proceso',
        'Sensores IoT',
        'Telemetría PLC',
      ],
    },
    {
      title: 'Centro de Datos & Nodos Regionales',
      branchNames: [
        'Clúster Kubernetes A',
        'Base de Datos Réplica',
        'Balanceadores Edge',
        'Red de Gestión OOB',
        'Almacenamiento SAN',
        'Nodo Backup',
      ],
    },
  ];

  const tpl = templates[randInt(0, templates.length - 1)];

  let baseCidr = 24;
  let baseIp = `192.168.${randInt(10, 220)}.0`;
  let borrowedBits = randInt(2, 4);

  if (difficulty === 'beginner') {
    baseCidr = 24;
    baseIp = `192.168.${randInt(1, 99)}.0`;
    borrowedBits = randInt(1, 3);
  } else if (difficulty === 'intermediate') {
    baseCidr = randInt(0, 1) === 0 ? 24 : 16;
    baseIp = baseCidr === 24 ? `192.168.${randInt(10, 240)}.0` : `172.${randInt(16, 31)}.0.0`;
    borrowedBits = randInt(2, 4);
  } else {
    const choice = randInt(0, 2);
    if (choice === 0) {
      baseCidr = 24;
      baseIp = `192.168.${randInt(10, 240)}.0`;
      borrowedBits = randInt(2, 5);
    } else if (choice === 1) {
      baseCidr = 16;
      baseIp = `172.${randInt(16, 31)}.0.0`;
      borrowedBits = randInt(3, 6);
    } else {
      baseCidr = 20;
      baseIp = `10.${randInt(10, 180)}.${randInt(0, 15) * 16}.0`;
      borrowedBits = randInt(2, 4);
    }
  }

  const newCidr = baseCidr + borrowedBits;
  const subnetsCreated = Math.pow(2, borrowedBits);
  const hostsPerSubnet = Math.pow(2, 32 - newCidr) - 2;

  const constraintType: 'subnets' | 'hosts' = randInt(0, 1) === 0 ? 'subnets' : 'hosts';
  let requiredCount = subnetsCreated;

  if (constraintType === 'subnets') {
    const minSubnets = Math.pow(2, borrowedBits - 1) + 1;
    requiredCount = randInt(minSubnets, subnetsCreated);
  } else {
    const hostBits = 32 - newCidr;
    const minHosts = Math.max(2, Math.pow(2, hostBits - 1) + 1);
    requiredCount = randInt(minHosts, hostsPerSubnet);
  }

  const targetSubnetIndex = randInt(1, Math.min(4, subnetsCreated));
  const subnetsList = generateSubnetsList(baseIp, baseCidr, newCidr, targetSubnetIndex + 2);
  const targetAnalysis = subnetsList[targetSubnetIndex - 1];

  const icons: ('router' | 'building' | 'server' | 'wifi')[] = [
    'building',
    'server',
    'wifi',
    'router',
  ];
  const branchCount = Math.min(4, subnetsCreated);
  const branches = Array.from({ length: branchCount }, (_, idx) => ({
    name: `${tpl.branchNames[idx % tpl.branchNames.length]} (Subred #${idx + 1})`,
    hosts:
      constraintType === 'hosts'
        ? requiredCount
        : Math.max(2, Math.floor(hostsPerSubnet * 0.65)),
    icon: icons[idx % icons.length],
  }));

  const description =
    constraintType === 'subnets'
      ? `Partiendo del bloque base ${baseIp}/${baseCidr}, diseña un esquema de subnetting uniforme (FLSM) capaz de direccionar un mínimo de ${requiredCount} subredes independientes maximizando los hosts por subred, y calcula los parámetros de la Subred #${targetSubnetIndex}.`
      : `Partiendo del bloque base ${baseIp}/${baseCidr}, diseña un esquema de subnetting que aloje al menos ${requiredCount.toLocaleString('es-ES')} hosts útiles por cada subred maximizando el número total de subredes posibles, y calcula los parámetros de la Subred #${targetSubnetIndex}.`;

  return {
    givenIp: baseIp,
    givenCidr: newCidr,
    topology: {
      title: tpl.title,
      description,
      baseNetwork: baseIp,
      baseCidr,
      constraintType,
      requiredCount,
      targetSubnetIndex,
      branches,
      expectedBorrowedBits: borrowedBits,
      expectedNewCidr: newCidr,
      expectedNewMask: targetAnalysis.maskDecimal,
      expectedBlockSize: targetAnalysis.blockSize,
      expectedSubnetsCreated: subnetsCreated,
      expectedHostsPerSubnet: hostsPerSubnet,
      targetNetwork: targetAnalysis.networkAddress,
      targetFirstHost: targetAnalysis.firstHost,
      targetLastHost: targetAnalysis.lastHost,
      targetBroadcast: targetAnalysis.broadcastAddress,
    },
  };
}

/**
 * Generate a realistic Network Troubleshooting Scenario
 */
function generateTroubleshootingScenario(difficulty: DifficultyLevel): {
  givenIp: string;
  givenCidr: number;
  troubleshooting: TroubleshootingScenario;
} {
  const faultTypes: TroubleshootingFaultType[] = [
    'host_is_network_id',
    'host_is_broadcast',
    'different_subnet',
    'wrong_mask',
  ];
  const faultType = faultTypes[randInt(0, faultTypes.length - 1)];

  const randomCidr =
    difficulty === 'beginner'
      ? randInt(25, 29)
      : difficulty === 'intermediate'
      ? randInt(21, 29)
      : randInt(18, 30);
  // Con «máscara errónea» el host usa 2 bits más: hace falta un bloque de al menos 16 direcciones.
  const cidr = faultType === 'wrong_mask' ? Math.min(randomCidr, 28) : randomCidr;

  const baseIp =
    cidr >= 24
      ? `192.168.${randInt(10, 220)}.${randInt(1, 200)}`
      : `172.${randInt(16, 31)}.${randInt(10, 200)}.${randInt(1, 200)}`;

  const gwAnalysis = analyzeIpv4(baseIp, cidr);
  const gatewayIp = gwAnalysis.firstHost; // Standard gateway = first usable host

  let hostIp = gwAnalysis.lastHost;
  let hostCidr = cidr;
  let faultExplanation = '';

  if (faultType === 'host_is_network_id') {
    hostIp = gwAnalysis.networkAddress;
    faultExplanation = `El host tiene configurada la dirección IP de Red (${gwAnalysis.networkAddress}), cuyos bits de host son todos 0 y no es asignable a una interfaz final.`;
  } else if (faultType === 'host_is_broadcast') {
    hostIp = gwAnalysis.broadcastAddress;
    faultExplanation = `El host intenta utilizar la dirección de Broadcast del bloque (${gwAnalysis.broadcastAddress}), reservada para difusión a todos los nodos.`;
  } else if (faultType === 'different_subnet') {
    const nextNetworkInt = (ipToInt(gwAnalysis.broadcastAddress) + 1) >>> 0;
    const nextHostOffset = randInt(1, Math.max(1, gwAnalysis.usableHosts));
    hostIp = intToIp((nextNetworkInt + nextHostOffset) >>> 0);
    faultExplanation = `La IP del host (${hostIp}) cae fuera del rango de la subred del Gateway (${gwAnalysis.firstHost} — ${gwAnalysis.lastHost}) y pertenece al bloque siguiente.`;
  } else {
    // wrong_mask
    // Máscara más larga (+2 bits): el host cree que su subred es una cuarta parte de la real.
    // Se elige un host del último cuarto, así el gateway (primer host) queda fuera de su subred.
    hostCidr = cidr + 2;
    const quarter = Math.pow(2, 32 - hostCidr);
    const lastQuarterStart = ipToInt(gwAnalysis.networkAddress) + 3 * quarter;
    hostIp = intToIp((lastQuarterStart + randInt(1, quarter - 2)) >>> 0);
    faultExplanation = `Aunque la IP del host (${hostIp}) está dentro del rango del Gateway, tiene configurada una máscara /${hostCidr} distinta a la del Gateway (/${cidr}), provocando un cálculo erróneo de dominio de broadcast.`;
  }

  return {
    givenIp: gatewayIp,
    givenCidr: cidr,
    troubleshooting: {
      ticketId: `INC-${randInt(1040, 9890)}`,
      title: 'Incidencia de Conectividad L2/L3 con Default Gateway',
      symptom: `El equipo de soporte reporta que la estación de trabajo (${hostIp}/${hostCidr}) no responde a ICMP Echo (ping) hacia su puerta de enlace predeterminada (${gatewayIp}/${cidr}) conectada al mismo VLAN Switch.`,
      gatewayIp,
      gatewayCidr: cidr,
      hostIp,
      hostCidr,
      faultType,
      faultExplanation,
      expectedGatewayNetwork: gwAnalysis.networkAddress,
      expectedValidFirstHost: gwAnalysis.firstHost,
      expectedValidLastHost: gwAnalysis.lastHost,
      expectedBroadcast: gwAnalysis.broadcastAddress,
    },
  };
}

/**
 * Generate a Route Summarization (Supernetting / CIDR Aggregation) Scenario
 */
function generateSupernetScenario(difficulty: DifficultyLevel): {
  givenIp: string;
  givenCidr: number;
  supernetting: SupernetScenario;
} {
  // Number of contiguous blocks: 4 (2 bits) or 8 (3 bits)
  const summaryBits = difficulty === 'beginner' ? 2 : randInt(2, 3);
  const blockCount = Math.pow(2, summaryBits); // 4 or 8 contiguous subnets
  const baseCidr = difficulty === 'beginner' ? 24 : randInt(0, 1) === 0 ? 24 : 25;
  const summaryCidr = baseCidr - summaryBits;

  // Choose an aligned starting network for summaryCidr
  const secondOctet = randInt(16, 31);
  const jumpInThird = Math.pow(2, 24 - summaryCidr);
  const alignedThird = randInt(1, Math.floor(200 / jumpInThird)) * jumpInThird;

  const baseStartIp = `172.${secondOctet}.${alignedThird}.0`;
  const startInt = ipToInt(baseStartIp);
  const stepSize = Math.pow(2, 32 - baseCidr);

  const routes: string[] = [];
  const binaryComparisonRows: { ip: string; binaryFormatted: string }[] = [];

  for (let i = 0; i < blockCount; i++) {
    const netInt = (startInt + i * stepSize) >>> 0;
    const ipStr = intToIp(netInt);
    routes.push(`${ipStr}/${baseCidr}`);
    binaryComparisonRows.push({
      ip: `${ipStr}/${baseCidr}`,
      binaryFormatted: intToBinaryOctets(netInt).join('.'),
    });
  }

  const summaryAnalysis = analyzeIpv4(baseStartIp, summaryCidr);

  return {
    givenIp: baseStartIp,
    givenCidr: summaryCidr,
    supernetting: {
      title: 'Sumarización de Rutas OSPF / BGP (Supernetting)',
      description: `Un router de borde recibe las siguientes ${blockCount} subredes contiguas. Calcula la ruta sumarizada óptima (Dirección de Superred, Prefijo CIDR y Máscara Decimal) que agrupe exactamente estos bloques sin incluir redes externas:`,
      routes,
      baseCidr,
      expectedSummaryIp: summaryAnalysis.networkAddress,
      expectedSummaryCidr: summaryCidr,
      expectedSummaryMask: summaryAnalysis.maskDecimal,
      commonBitsCount: summaryCidr,
      binaryComparisonRows,
    },
  };
}

/**
 * Generate a random Subnetting Challenge based on category and difficulty
 */
export function generateChallenge(
  category: ChallengeCategory,
  difficulty: DifficultyLevel
): SubnetChallenge {
  const id = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (category === 'topology_design') {
    const { givenIp, givenCidr, topology } = generateTopologyScenario(difficulty);
    const analysis = analyzeIpv4(topology.targetNetwork, givenCidr);
    return {
      id,
      category,
      difficulty,
      givenIp,
      givenCidr: topology.baseCidr,
      givenFormat: 'cidr',
      analysis,
      topology,
    };
  }

  if (category === 'troubleshooting') {
    const { givenIp, givenCidr, troubleshooting } = generateTroubleshootingScenario(difficulty);
    const analysis = analyzeIpv4(givenIp, givenCidr);
    return {
      id,
      category,
      difficulty,
      givenIp,
      givenCidr,
      givenFormat: 'cidr',
      analysis,
      troubleshooting,
    };
  }

  if (category === 'supernetting') {
    const { givenIp, givenCidr, supernetting } = generateSupernetScenario(difficulty);
    const analysis = analyzeIpv4(givenIp, givenCidr);
    return {
      id,
      category,
      difficulty,
      givenIp,
      givenCidr,
      givenFormat: 'cidr',
      analysis,
      supernetting,
    };
  }

  let cidr = 24;
  let ip = '192.168.1.45';

  if (difficulty === 'beginner') {
    cidr = randInt(24, 30);
    ip = `192.168.${randInt(1, 250)}.${randInt(2, 253)}`;
  } else if (difficulty === 'intermediate') {
    cidr = randInt(18, 29);
    if (cidr >= 24) {
      ip = `192.168.${randInt(10, 240)}.${randInt(2, 253)}`;
    } else {
      ip = `172.${randInt(16, 31)}.${randInt(1, 250)}.${randInt(2, 253)}`;
    }
  } else if (difficulty === 'advanced') {
    cidr = randInt(10, 30);
    const pool = randInt(0, 2);
    if (pool === 0) {
      ip = `10.${randInt(1, 250)}.${randInt(1, 250)}.${randInt(2, 253)}`;
    } else if (pool === 1) {
      ip = `172.${randInt(16, 31)}.${randInt(1, 250)}.${randInt(2, 253)}`;
    } else {
      ip = `${randInt(11, 190)}.${randInt(1, 250)}.${randInt(1, 250)}.${randInt(2, 253)}`;
    }
  } else {
    const examCidrs = [17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30];
    cidr = examCidrs[randInt(0, examCidrs.length - 1)];
    if (cidr < 24) {
      ip = `172.${randInt(16, 31)}.${randInt(10, 245)}.${randInt(2, 253)}`;
    } else {
      ip = `192.168.${randInt(10, 245)}.${randInt(2, 253)}`;
    }
  }

  let analysis = analyzeIpv4(ip, cidr);
  if (analysis.ip === analysis.networkAddress || analysis.ip === analysis.broadcastAddress) {
    const tweakedInt = (ipToInt(analysis.networkAddress) + 1) >>> 0;
    ip = intToIp(tweakedInt);
    analysis = analyzeIpv4(ip, cidr);
  }

  const givenFormat: 'cidr' | 'decimal_mask' = randInt(0, 1) === 0 ? 'cidr' : 'decimal_mask';

  return {
    id,
    category,
    difficulty,
    givenIp: ip,
    givenCidr: cidr,
    givenFormat,
    analysis,
  };
}

/**
 * Diagnostic helper: compares user IP answer vs expected IP and returns specific octet feedback
 */
export function diagnoseIpAnswer(
  userValue: string,
  expectedIp: string,
  analysis: SubnetAnalysis,
  fieldLabel: string
): {
  isCorrect: boolean;
  hintMessage: string;
} {
  const clean = userValue.trim();
  if (clean === expectedIp) {
    return { isCorrect: true, hintMessage: 'Correcto' };
  }
  if (!clean) {
    return { isCorrect: false, hintMessage: `Falta responder (${expectedIp})` };
  }
  if (!isValidIpv4(clean)) {
    return { isCorrect: false, hintMessage: `Formato IPv4 inválido. Solución: ${expectedIp}` };
  }

  if (fieldLabel === 'firstHost' && clean === analysis.networkAddress) {
    return {
      isCorrect: false,
      hintMessage: `Introdujiste la IP de Red. El primer host útil es Red + 1 (${expectedIp}).`,
    };
  }
  if (fieldLabel === 'lastHost' && clean === analysis.broadcastAddress) {
    return {
      isCorrect: false,
      hintMessage: `Introdujiste la IP de Broadcast. El último host útil es Broadcast - 1 (${expectedIp}).`,
    };
  }
  if (fieldLabel === 'networkAddress' && clean === analysis.firstHost) {
    return {
      isCorrect: false,
      hintMessage: `Introdujiste el Primer Host. La IP de Red tiene todos los bits de host a 0 (${expectedIp}).`,
    };
  }

  const uParts = clean.split('.').map(Number);
  const eParts = expectedIp.split('.').map(Number);
  const wrongOctets: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (uParts[i] !== eParts[i]) wrongOctets.push(i + 1);
  }

  return {
    isCorrect: false,
    hintMessage: `Error en octeto(s) ${wrongOctets.join(', ')}. Solución: ${expectedIp} (Salto: ${analysis.blockSize})`,
  };
}
