import { describe, expect, it } from 'vitest';
import {
  analyzeIpv4,
  calculateVlsm,
  ChallengeCategory,
  compareIpPair,
  decimalMaskToCidr,
  DifficultyLevel,
  generateChallenge,
  generateSubnetsList,
  getIpClassAndScope,
  getStepByStepExplanation,
  intToIp,
  ipToInt,
  isValidIpv4,
} from './ipv4';

const DIFFS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'exam'];
const N = 400; // retos aleatorios por combinación de categoría y dificultad

const inRange = (ip: string, net: string, bcast: string) =>
  ipToInt(ip) >= ipToInt(net) && ipToInt(ip) <= ipToInt(bcast);

describe('validación y conversiones', () => {
  it('valida IPv4 con 4 octetos de 0 a 255 y sin ceros a la izquierda', () => {
    for (const ok of ['0.0.0.0', '192.168.1.1', '255.255.255.255']) expect(isValidIpv4(ok)).toBe(true);
    for (const bad of ['256.1.1.1', '192.168.1', '192.168.01.1', '1.2.3.4.5', 'a.b.c.d', '']) expect(isValidIpv4(bad)).toBe(false);
  });

  it('máscara decimal a CIDR solo si los unos son contiguos', () => {
    expect(decimalMaskToCidr('255.255.255.192')).toBe(26);
    expect(decimalMaskToCidr('255.255.240.0')).toBe(20);
    expect(decimalMaskToCidr('255.255.255.255')).toBe(32);
    expect(decimalMaskToCidr('255.255.0.255')).toBeNull();
    expect(decimalMaskToCidr('255.0.255.0')).toBeNull();
  });

  it('ipToInt e intToIp son inversas en todo el rango', () => {
    for (const ip of ['0.0.0.0', '10.0.0.1', '128.0.0.0', '255.255.255.255']) expect(intToIp(ipToInt(ip))).toBe(ip);
  });
});

describe('análisis de subred', () => {
  it('192.168.10.140/26', () => {
    const a = analyzeIpv4('192.168.10.140', 26);
    expect(a).toMatchObject({
      maskDecimal: '255.255.255.192',
      wildcardDecimal: '0.0.0.63',
      networkAddress: '192.168.10.128',
      broadcastAddress: '192.168.10.191',
      firstHost: '192.168.10.129',
      lastHost: '192.168.10.190',
      usableHosts: 62,
      blockSize: 64,
      ipClass: 'C',
      borrowedBits: 2,
      isRfc1918: true,
    });
  });

  it('172.16.45.200/20 (octeto interesante: el tercero)', () => {
    const a = analyzeIpv4('172.16.45.200', 20);
    expect([a.networkAddress, a.broadcastAddress, a.usableHosts, a.blockSize]).toEqual(['172.16.32.0', '172.16.47.255', 4094, 16]);
  });

  it('/31 (RFC 3021) y /32', () => {
    const p2p = analyzeIpv4('10.0.0.1', 31);
    expect([p2p.firstHost, p2p.lastHost, p2p.usableHosts]).toEqual(['10.0.0.0', '10.0.0.1', 2]);
    const host = analyzeIpv4('10.0.0.7', 32);
    expect([host.firstHost, host.lastHost, host.usableHosts]).toEqual(['10.0.0.7', '10.0.0.7', 1]);
  });

  it('el paso a paso no muestra «2^h − 2» en /31 y /32', () => {
    for (const cidr of [31, 32]) {
      const paso5 = getStepByStepExplanation(analyzeIpv4('10.0.0.1', cidr))[4];
      expect(paso5.formula).not.toContain('- 2');
    }
    expect(getStepByStepExplanation(analyzeIpv4('10.0.0.1', 30))[4].formula).toContain('2^2 - 2 = 2');
  });

  it('clases D y E no tienen máscara por defecto ni bits prestados', () => {
    const d = analyzeIpv4('224.0.0.5', 24);
    expect([d.ipClass, d.defaultClassCidr, d.borrowedBits]).toEqual(['D', 0, 0]);
    expect(getStepByStepExplanation(d)[4].detail).toContain('no tienen máscara por defecto');
  });

  it('identifica los rangos especiales', () => {
    const scope = (ip: string) => getIpClassAndScope(ipToInt(ip)).scope;
    expect(scope('0.1.2.3')).toContain('Esta red');
    expect(scope('192.0.2.10')).toContain('Documentación');
    expect(scope('203.0.113.5')).toContain('Documentación');
    expect(scope('198.18.0.1')).toContain('rendimiento');
    expect(scope('255.255.255.255')).toContain('Broadcast limitado');
    expect(scope('100.64.0.1')).toContain('CGNAT');
    expect(scope('169.254.1.1')).toContain('APIPA');
    expect(scope('8.8.8.8')).toContain('Pública');
    expect(getIpClassAndScope(ipToInt('172.32.0.1')).isRfc1918).toBe(false);
    expect(getIpClassAndScope(ipToInt('172.31.255.1')).isRfc1918).toBe(true);
  });

  it('compara dos IP en la misma subred o en distintas', () => {
    expect(compareIpPair('192.168.1.10', '192.168.1.62', 26).sameSubnet).toBe(true);
    expect(compareIpPair('192.168.1.10', '192.168.1.70', 26).sameSubnet).toBe(false);
    expect(compareIpPair('192.168.1.10', '192.168.1.63', 26).roleB).toBe('direccion_broadcast');
  });

  it('lista de subredes consecutivas', () => {
    const l = generateSubnetsList('10.0.0.0', 24, 26);
    expect(l.map((s) => s.networkAddress)).toEqual(['10.0.0.0', '10.0.0.64', '10.0.0.128', '10.0.0.192']);
  });
});

describe('VLSM', () => {
  it('ejemplo clásico: 100, 50, 20 y un enlace de 2 hosts en 192.168.1.0/24', () => {
    const v = calculateVlsm('192.168.1.0', 24, [
      { id: 'a', name: 'Enlace WAN', requiredHosts: 2, role: 'WAN' },
      { id: 'b', name: 'Ventas', requiredHosts: 100, role: 'LAN' },
      { id: 'c', name: 'Wi-Fi', requiredHosts: 20, role: 'WIFI' },
      { id: 'd', name: 'Admin', requiredHosts: 50, role: 'LAN' },
    ]);
    expect(v.allocations.map((a) => `${a.networkAddress}/${a.allocatedCidr}`)).toEqual([
      '192.168.1.0/25',
      '192.168.1.128/26',
      '192.168.1.192/27',
      '192.168.1.224/30',
    ]);
    expect(v.hasOverflow).toBe(false);
  });

  it('detecta el desbordamiento también al final del espacio IPv4 (sin dar la vuelta a 0.0.0.0)', () => {
    const v = calculateVlsm('255.255.255.0', 24, [
      { id: 'a', name: 'A', requiredHosts: 200, role: 'LAN' },
      { id: 'b', name: 'B', requiredHosts: 100, role: 'LAN' },
    ]);
    expect(v.allocations[0].overflow).toBe(false);
    expect(v.allocations[1].overflow).toBe(true);
    expect(v.hasOverflow).toBe(true);
  });

  it('los bloques asignados no se solapan y están alineados', () => {
    const v = calculateVlsm('10.20.0.0', 16, [500, 300, 120, 60, 30, 12, 2, 2].map((h, i) => ({ id: String(i), name: `S${i}`, requiredHosts: h, role: 'LAN' as const })));
    const blocks = v.allocations.map((a) => [a.startInt, a.endInt, a.totalAddresses]);
    for (const [start, , size] of blocks) expect(start % size).toBe(0);
    for (let i = 1; i < blocks.length; i++) expect(blocks[i][0]).toBeGreaterThan(blocks[i - 1][1]);
  });
});

describe.each(DIFFS)('retos aleatorios (%s)', (diff) => {
  const gen = (cat: ChallengeCategory) => Array.from({ length: N }, () => generateChallenge(cat, diff));

  it('cálculo de red: la IP dada es siempre un host válido', () => {
    for (const ch of gen('full_network')) {
      const a = ch.analysis;
      expect(a.ip).not.toBe(a.networkAddress);
      expect(a.ip).not.toBe(a.broadcastAddress);
      expect(a.cidr).toBeLessThanOrEqual(30);
    }
  });

  it('diagnóstico: el fallo descrito existe de verdad', () => {
    for (const ch of gen('troubleshooting')) {
      const t = ch.troubleshooting!;
      const gw = analyzeIpv4(t.gatewayIp, t.gatewayCidr);
      if (t.faultType === 'host_is_network_id') expect(t.hostIp).toBe(gw.networkAddress);
      if (t.faultType === 'host_is_broadcast') expect(t.hostIp).toBe(gw.broadcastAddress);
      if (t.faultType === 'different_subnet') {
        const siguiente = intToIp(ipToInt(gw.broadcastAddress) + 1);
        const h = analyzeIpv4(t.hostIp, t.gatewayCidr);
        expect(h.networkAddress, `${t.hostIp} en ${siguiente}`).toBe(siguiente);
        expect(t.hostIp).not.toBe(h.networkAddress);
        expect(t.hostIp).not.toBe(h.broadcastAddress);
      }
      if (t.faultType === 'wrong_mask') {
        expect(t.hostCidr).not.toBe(t.gatewayCidr);
        expect(inRange(t.hostIp, gw.firstHost, gw.lastHost)).toBe(true);
        const vistaHost = analyzeIpv4(t.hostIp, t.hostCidr);
        expect(t.hostIp).not.toBe(vistaHost.networkAddress);
        expect(t.hostIp).not.toBe(vistaHost.broadcastAddress);
        expect(inRange(t.gatewayIp, vistaHost.networkAddress, vistaHost.broadcastAddress)).toBe(false);
      }
    }
  });

  it('topología: los bits prestados son los mínimos que cumplen el requisito', () => {
    for (const ch of gen('topology_design')) {
      const t = ch.topology!;
      const b = t.expectedBorrowedBits;
      if (t.constraintType === 'subnets') {
        expect(2 ** b).toBeGreaterThanOrEqual(t.requiredCount);
        expect(2 ** (b - 1)).toBeLessThan(t.requiredCount);
      } else {
        const h = 32 - t.expectedNewCidr;
        expect(2 ** h - 2).toBeGreaterThanOrEqual(t.requiredCount);
        expect(2 ** (h - 1) - 2).toBeLessThan(t.requiredCount);
      }
      const size = 2 ** (32 - t.expectedNewCidr);
      expect(ipToInt(t.targetNetwork)).toBe(ipToInt(t.baseNetwork) + (t.targetSubnetIndex - 1) * size);
      expect(t.targetBroadcast).toBe(intToIp(ipToInt(t.targetNetwork) + size - 1));
    }
  });

  it('sumarización: la superred cubre exactamente las rutas dadas', () => {
    for (const ch of gen('supernetting')) {
      const sp = ch.supernetting!;
      const sum = analyzeIpv4(sp.expectedSummaryIp, sp.expectedSummaryCidr);
      const routeSize = 2 ** (32 - sp.baseCidr);
      expect(sp.routes.length * routeSize).toBe(sum.totalAddresses);
      for (const r of sp.routes) {
        const [ip] = r.split('/');
        expect(inRange(ip, sum.networkAddress, sum.broadcastAddress)).toBe(true);
      }
      expect(sp.expectedSummaryIp).toBe(sum.networkAddress);
    }
  });
});
