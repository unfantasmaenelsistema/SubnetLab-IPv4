import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Award,
  Sliders,
  Eye,
  BookOpen,
  Network,
  Cpu,
  Binary,
  Sparkles,
  Check,
  AlertTriangle,
  Stethoscope,
  GitMerge,
  Download,
} from 'lucide-react';
import {
  ChallengeCategory,
  DifficultyLevel,
  SubnetChallenge,
  TroubleshootingFaultType,
  generateChallenge,
  diagnoseIpAnswer,
  normalizeBinaryString,
  getStepByStepExplanation,
} from '../utils/ipv4';

export interface PlayerStats {
  totalSolved: number;
  totalAttempts: number;
  currentStreak: number;
  bestStreak: number;
  highScore60: number;
  highScore180: number;
  totalScore: number;
  history: {
    id: string;
    timestamp: string;
    prompt: string;
    category: string;
    score: number;
    accuracy: number;
    timeSpentSec: number;
  }[];
}

interface Props {
  stats: PlayerStats;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
}

type TimerMode = 'practice' | '60s' | '180s' | '300s';

interface FieldEvaluation {
  isCorrect: boolean;
  message: string;
  expected: string;
}

const COMMON_BINARY_OCTETS = [
  { dec: 255, bin: '11111111', cidrBits: 8 },
  { dec: 254, bin: '11111110', cidrBits: 7 },
  { dec: 252, bin: '11111100', cidrBits: 6 },
  { dec: 248, bin: '11111000', cidrBits: 5 },
  { dec: 240, bin: '11110000', cidrBits: 4 },
  { dec: 224, bin: '11100000', cidrBits: 3 },
  { dec: 192, bin: '11000000', cidrBits: 2 },
  { dec: 128, bin: '10000000', cidrBits: 1 },
  { dec: 0, bin: '00000000', cidrBits: 0 },
];

export const ChallengerView: React.FC<Props> = ({ stats, onUpdateStats }) => {
  const [category, setCategory] = useState<ChallengeCategory>('full_network');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [timerMode, setTimerMode] = useState<TimerMode>('practice');

  const [challenge, setChallenge] = useState<SubnetChallenge>(() =>
    generateChallenge('full_network', 'beginner')
  );

  // Timer state
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [questionStartSec, setQuestionStartSec] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [sessionSolved, setSessionSolved] = useState<number>(0);
  const [timeUpModal, setTimeUpModal] = useState<boolean>(false);

  // Helper toggles
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showBinaryRuler, setShowBinaryRuler] = useState<boolean>(false);
  const [showSteps, setShowSteps] = useState<boolean>(false);

  // User Form Inputs (Full Network & Binary Drill)
  const [ansNetwork, setAnsNetwork] = useState<string>('');
  const [ansFirstHost, setAnsFirstHost] = useState<string>('');
  const [ansLastHost, setAnsLastHost] = useState<string>('');
  const [ansBroadcast, setAnsBroadcast] = useState<string>('');
  const [ansMaskOrCidr, setAnsMaskOrCidr] = useState<string>('');
  const [ansBinaryMask, setAnsBinaryMask] = useState<string>('11111111.11111111.11111111.00000000');
  const [ansUsableHosts, setAnsUsableHosts] = useState<string>('');
  const [ansBlockSize, setAnsBlockSize] = useState<string>('');

  // User Form Inputs (Topology Mode)
  const [ansBorrowedBits, setAnsBorrowedBits] = useState<string>('');
  const [ansNewCidr, setAnsNewCidr] = useState<string>('');
  const [ansNewMask, setAnsNewMask] = useState<string>('');
  const [ansSubnetsCreated, setAnsSubnetsCreated] = useState<string>('');
  const [ansHostsPerSubnet, setAnsHostsPerSubnet] = useState<string>('');

  // User Form Inputs (Troubleshooting Mode)
  const [ansFaultType, setAnsFaultType] = useState<TroubleshootingFaultType>('different_subnet');

  // Evaluation state
  const [evaluated, setEvaluated] = useState<Record<string, FieldEvaluation> | null>(null);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const resetFormForChallenge = (nextCh: SubnetChallenge) => {
    setAnsNetwork('');
    setAnsFirstHost('');
    setAnsLastHost('');
    setAnsBroadcast('');
    setAnsMaskOrCidr('');
    if (nextCh.analysis.cidr >= 24) {
      setAnsBinaryMask('11111111.11111111.11111111.00000000');
    } else if (nextCh.analysis.cidr >= 16) {
      setAnsBinaryMask('11111111.11111111.00000000.00000000');
    } else {
      setAnsBinaryMask('11111111.00000000.00000000.00000000');
    }
    setAnsUsableHosts('');
    setAnsBlockSize('');
    setAnsBorrowedBits('');
    setAnsNewCidr('');
    setAnsNewMask('');
    setAnsSubnetsCreated('');
    setAnsHostsPerSubnet('');
    setAnsFaultType('different_subnet');
    setEvaluated(null);
    setShowHint(false);
    setShowSteps(false);
    setLastPointsEarned(null);
    setQuestionStartSec(elapsedSeconds);
  };

  const handleNextChallenge = (
    cat: ChallengeCategory = category,
    diff: DifficultyLevel = difficulty
  ) => {
    const next = generateChallenge(cat, diff);
    setChallenge(next);
    resetFormForChallenge(next);
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 40);
  };

  const startSession = (mode: TimerMode, cat = category, diff = difficulty) => {
    setTimerMode(mode);
    setTimeUpModal(false);
    setSessionScore(0);
    setSessionSolved(0);
    setElapsedSeconds(0);
    setQuestionStartSec(0);
    if (mode === '60s') setSecondsLeft(60);
    else if (mode === '180s') setSecondsLeft(180);
    else if (mode === '300s') setSecondsLeft(300);
    setIsRunning(true);
    handleNextChallenge(cat, diff);
  };

  useEffect(() => {
    if (!isRunning || timeUpModal) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (timerMode !== 'practice') {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimeUpModal(true);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timerMode, timeUpModal]);

  const setBinaryOctetAt = (octetIndex: number, binaryEightBits: string) => {
    const currentParts = normalizeBinaryString(ansBinaryMask).split('.');
    const safeParts =
      currentParts.length === 4
        ? currentParts
        : ['11111111', '11111111', '11111111', '00000000'];
    safeParts[octetIndex] = binaryEightBits;
    setAnsBinaryMask(safeParts.join('.'));
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (evaluated) {
      handleNextChallenge();
      return;
    }

    const a = challenge.analysis;
    const results: Record<string, FieldEvaluation> = {};

    if (challenge.category === 'full_network') {
      const netDiag = diagnoseIpAnswer(ansNetwork, a.networkAddress, a, 'networkAddress');
      results.network = {
        isCorrect: netDiag.isCorrect,
        message: netDiag.hintMessage,
        expected: a.networkAddress,
      };

      const firstDiag = diagnoseIpAnswer(ansFirstHost, a.firstHost, a, 'firstHost');
      results.firstHost = {
        isCorrect: firstDiag.isCorrect,
        message: firstDiag.hintMessage,
        expected: a.firstHost,
      };

      const lastDiag = diagnoseIpAnswer(ansLastHost, a.lastHost, a, 'lastHost');
      results.lastHost = {
        isCorrect: lastDiag.isCorrect,
        message: lastDiag.hintMessage,
        expected: a.lastHost,
      };

      const bcastDiag = diagnoseIpAnswer(ansBroadcast, a.broadcastAddress, a, 'broadcastAddress');
      results.broadcast = {
        isCorrect: bcastDiag.isCorrect,
        message: bcastDiag.hintMessage,
        expected: a.broadcastAddress,
      };

      if (challenge.givenFormat === 'cidr') {
        const cleanMask = ansMaskOrCidr.trim();
        const okMask = cleanMask === a.maskDecimal;
        results.maskOrCidr = {
          isCorrect: okMask,
          message: okMask ? 'Correcto' : `Máscara decimal para /${a.cidr}: ${a.maskDecimal}`,
          expected: a.maskDecimal,
        };
      } else {
        const cleanCidr = ansMaskOrCidr.trim().replace('/', '');
        const okCidr = Number(cleanCidr) === a.cidr && cleanCidr !== '';
        results.maskOrCidr = {
          isCorrect: okCidr,
          message: okCidr ? 'Correcto' : `Prefijo CIDR esperado: /${a.cidr}`,
          expected: `/${a.cidr}`,
        };
      }

      const expectedBin = a.maskBinaryOctets.join('.');
      const normalizedUserBin = normalizeBinaryString(ansBinaryMask);
      const okBin = normalizedUserBin === expectedBin;
      results.binaryMask = {
        isCorrect: okBin,
        message: okBin ? 'Correcto' : `Binario esperado: ${expectedBin}`,
        expected: expectedBin,
      };

      const cleanHosts = ansUsableHosts.replace(/[.,\s]/g, '');
      const okHosts = Number(cleanHosts) === a.usableHosts && cleanHosts !== '';
      results.usableHosts = {
        isCorrect: okHosts,
        message: okHosts
          ? 'Correcto'
          : `2^${a.hostBits} - 2 = ${a.usableHosts.toLocaleString('es-ES')} hosts útiles`,
        expected: String(a.usableHosts),
      };
    } else if (challenge.category === 'topology_design' && challenge.topology) {
      const t = challenge.topology;

      const okBits =
        Number(ansBorrowedBits.trim()) === t.expectedBorrowedBits && ansBorrowedBits.trim() !== '';
      results.borrowedBits = {
        isCorrect: okBits,
        message: okBits
          ? 'Correcto'
          : `Se requieren ${t.expectedBorrowedBits} bits prestados (/${t.baseCidr} → /${t.expectedNewCidr})`,
        expected: String(t.expectedBorrowedBits),
      };

      const cleanCidr = ansNewCidr.trim().replace('/', '');
      const okCidr = Number(cleanCidr) === t.expectedNewCidr && cleanCidr !== '';
      results.newCidr = {
        isCorrect: okCidr,
        message: okCidr ? 'Correcto' : `Nueva máscara CIDR: /${t.expectedNewCidr}`,
        expected: `/${t.expectedNewCidr}`,
      };

      const okMask = ansNewMask.trim() === t.expectedNewMask;
      results.newMask = {
        isCorrect: okMask,
        message: okMask ? 'Correcto' : `Máscara decimal: ${t.expectedNewMask}`,
        expected: t.expectedNewMask,
      };

      const okSubnets =
        Number(ansSubnetsCreated.replace(/[.,\s]/g, '')) === t.expectedSubnetsCreated &&
        ansSubnetsCreated.trim() !== '';
      results.subnetsCreated = {
        isCorrect: okSubnets,
        message: okSubnets
          ? 'Correcto'
          : `2^${t.expectedBorrowedBits} = ${t.expectedSubnetsCreated} subredes`,
        expected: String(t.expectedSubnetsCreated),
      };

      const okHosts =
        Number(ansHostsPerSubnet.replace(/[.,\s]/g, '')) === t.expectedHostsPerSubnet &&
        ansHostsPerSubnet.trim() !== '';
      results.hostsPerSubnet = {
        isCorrect: okHosts,
        message: okHosts
          ? 'Correcto'
          : `2^${32 - t.expectedNewCidr} - 2 = ${t.expectedHostsPerSubnet} hosts/subred`,
        expected: String(t.expectedHostsPerSubnet),
      };

      const netDiag = diagnoseIpAnswer(ansNetwork, t.targetNetwork, a, 'networkAddress');
      results.network = {
        isCorrect: netDiag.isCorrect,
        message: netDiag.hintMessage,
        expected: t.targetNetwork,
      };

      const firstDiag = diagnoseIpAnswer(ansFirstHost, t.targetFirstHost, a, 'firstHost');
      results.firstHost = {
        isCorrect: firstDiag.isCorrect,
        message: firstDiag.hintMessage,
        expected: t.targetFirstHost,
      };

      const lastDiag = diagnoseIpAnswer(ansLastHost, t.targetLastHost, a, 'lastHost');
      results.lastHost = {
        isCorrect: lastDiag.isCorrect,
        message: lastDiag.hintMessage,
        expected: t.targetLastHost,
      };

      const bcastDiag = diagnoseIpAnswer(ansBroadcast, t.targetBroadcast, a, 'broadcastAddress');
      results.broadcast = {
        isCorrect: bcastDiag.isCorrect,
        message: bcastDiag.hintMessage,
        expected: t.targetBroadcast,
      };
    } else if (challenge.category === 'troubleshooting' && challenge.troubleshooting) {
      const tb = challenge.troubleshooting;
      const okFault = ansFaultType === tb.faultType;
      results.faultType = {
        isCorrect: okFault,
        message: okFault ? 'Diagnóstico exacto' : tb.faultExplanation,
        expected: tb.faultType,
      };

      const netDiag = diagnoseIpAnswer(
        ansNetwork,
        tb.expectedGatewayNetwork,
        a,
        'networkAddress'
      );
      results.network = {
        isCorrect: netDiag.isCorrect,
        message: netDiag.hintMessage,
        expected: tb.expectedGatewayNetwork,
      };

      const firstDiag = diagnoseIpAnswer(
        ansFirstHost,
        tb.expectedValidFirstHost,
        a,
        'firstHost'
      );
      results.firstHost = {
        isCorrect: firstDiag.isCorrect,
        message: firstDiag.hintMessage,
        expected: tb.expectedValidFirstHost,
      };

      const lastDiag = diagnoseIpAnswer(ansLastHost, tb.expectedValidLastHost, a, 'lastHost');
      results.lastHost = {
        isCorrect: lastDiag.isCorrect,
        message: lastDiag.hintMessage,
        expected: tb.expectedValidLastHost,
      };

      const bcastDiag = diagnoseIpAnswer(
        ansBroadcast,
        tb.expectedBroadcast,
        a,
        'broadcastAddress'
      );
      results.broadcast = {
        isCorrect: bcastDiag.isCorrect,
        message: bcastDiag.hintMessage,
        expected: tb.expectedBroadcast,
      };
    } else if (challenge.category === 'supernetting' && challenge.supernetting) {
      const sp = challenge.supernetting;
      const netDiag = diagnoseIpAnswer(
        ansNetwork,
        sp.expectedSummaryIp,
        a,
        'networkAddress'
      );
      results.network = {
        isCorrect: netDiag.isCorrect,
        message: netDiag.hintMessage,
        expected: sp.expectedSummaryIp,
      };

      const cleanCidr = ansNewCidr.trim().replace('/', '');
      const okCidr = Number(cleanCidr) === sp.expectedSummaryCidr && cleanCidr !== '';
      results.newCidr = {
        isCorrect: okCidr,
        message: okCidr
          ? 'Correcto'
          : `Los bloques comparten los primeros ${sp.commonBitsCount} bits → /${sp.expectedSummaryCidr}`,
        expected: `/${sp.expectedSummaryCidr}`,
      };

      const okMask = ansNewMask.trim() === sp.expectedSummaryMask;
      results.newMask = {
        isCorrect: okMask,
        message: okMask ? 'Correcto' : `Máscara sumarizada: ${sp.expectedSummaryMask}`,
        expected: sp.expectedSummaryMask,
      };
    } else {
      // Binary & Magic Number Rapid Drill
      const cleanBlock = ansBlockSize.trim();
      const okBlock = Number(cleanBlock) === a.blockSize && cleanBlock !== '';
      results.blockSize = {
        isCorrect: okBlock,
        message: okBlock
          ? 'Correcto'
          : `Salto = 256 - ${a.interestingMaskValue} = ${a.blockSize}`,
        expected: String(a.blockSize),
      };

      const expectedBin = a.maskBinaryOctets.join('.');
      const normalizedUserBin = normalizeBinaryString(ansBinaryMask);
      const okBin = normalizedUserBin === expectedBin;
      results.binaryMask = {
        isCorrect: okBin,
        message: okBin ? 'Correcto' : `Binario: ${expectedBin}`,
        expected: expectedBin,
      };

      if (challenge.givenFormat === 'cidr') {
        const okMask = ansMaskOrCidr.trim() === a.maskDecimal;
        results.maskOrCidr = {
          isCorrect: okMask,
          message: okMask ? 'Correcto' : `Decimal: ${a.maskDecimal}`,
          expected: a.maskDecimal,
        };
      } else {
        const cleanCidr = ansMaskOrCidr.trim().replace('/', '');
        const okCidr = Number(cleanCidr) === a.cidr && cleanCidr !== '';
        results.maskOrCidr = {
          isCorrect: okCidr,
          message: okCidr ? 'Correcto' : `CIDR: /${a.cidr}`,
          expected: `/${a.cidr}`,
        };
      }

      const netDiag = diagnoseIpAnswer(ansNetwork, a.networkAddress, a, 'networkAddress');
      results.network = {
        isCorrect: netDiag.isCorrect,
        message: netDiag.hintMessage,
        expected: a.networkAddress,
      };

      const bcastDiag = diagnoseIpAnswer(ansBroadcast, a.broadcastAddress, a, 'broadcastAddress');
      results.broadcast = {
        isCorrect: bcastDiag.isCorrect,
        message: bcastDiag.hintMessage,
        expected: a.broadcastAddress,
      };
    }

    setEvaluated(results);

    const entries = Object.values(results);
    const correctCount = entries.filter((x) => x.isCorrect).length;
    const totalFields = entries.length;
    const accuracyRatio = totalFields > 0 ? correctCount / totalFields : 0;
    const allCorrect = correctCount === totalFields;

    const diffMult =
      difficulty === 'beginner'
        ? 1
        : difficulty === 'intermediate'
        ? 1.5
        : difficulty === 'advanced'
        ? 2.2
        : 2.5;
    const timeSpent = Math.max(1, elapsedSeconds - questionStartSec);
    const speedBonus = Math.max(0, Math.round((45 - timeSpent) * 2));
    const hintPenalty = showHint ? 0.7 : 1;
    const rawPoints = Math.round(
      (correctCount * 25 + (allCorrect ? 50 + speedBonus : 0)) * diffMult * hintPenalty
    );

    setLastPointsEarned(rawPoints);
    const nextSessionScore = sessionScore + rawPoints;
    setSessionScore(nextSessionScore);
    if (allCorrect) {
      setSessionSolved((prev) => prev + 1);
    }

    onUpdateStats((prev) => {
      const nextStreak = allCorrect ? prev.currentStreak + 1 : 0;
      const bestStreak = Math.max(prev.bestStreak, nextStreak);
      const highScore60 =
        timerMode === '60s' ? Math.max(prev.highScore60, nextSessionScore) : prev.highScore60;
      const highScore180 =
        timerMode === '180s' ? Math.max(prev.highScore180, nextSessionScore) : prev.highScore180;

      const promptLabel =
        challenge.category === 'topology_design' && challenge.topology
          ? `${challenge.topology.baseNetwork}/${challenge.topology.baseCidr} (${challenge.topology.requiredCount} ${
              challenge.topology.constraintType === 'subnets' ? 'subredes' : 'hosts'
            })`
          : challenge.category === 'troubleshooting' && challenge.troubleshooting
          ? `${challenge.troubleshooting.ticketId}: Host ${challenge.troubleshooting.hostIp}`
          : challenge.category === 'supernetting' && challenge.supernetting
          ? `Superred ${challenge.supernetting.expectedSummaryIp}/${challenge.supernetting.expectedSummaryCidr}`
          : `${challenge.givenIp}/${challenge.givenCidr}`;

      const catLabel =
        challenge.category === 'full_network'
          ? 'Cálculo Red'
          : challenge.category === 'topology_design'
          ? 'Topología'
          : challenge.category === 'troubleshooting'
          ? 'Troubleshooting'
          : challenge.category === 'supernetting'
          ? 'Sumarización'
          : 'Sprint Binario';

      return {
        totalSolved: prev.totalSolved + (allCorrect ? 1 : 0),
        totalAttempts: prev.totalAttempts + 1,
        currentStreak: nextStreak,
        bestStreak,
        highScore60,
        highScore180,
        totalScore: prev.totalScore + rawPoints,
        history: [
          {
            id: challenge.id,
            timestamp: new Date().toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            prompt: promptLabel,
            category: catLabel,
            score: rawPoints,
            accuracy: Math.round(accuracyRatio * 100),
            timeSpentSec: timeSpent,
          },
          ...prev.history.slice(0, 19),
        ],
      };
    });
  };

  const handleRevealSolution = () => {
    const a = challenge.analysis;
    if (challenge.category === 'full_network') {
      setAnsNetwork(a.networkAddress);
      setAnsFirstHost(a.firstHost);
      setAnsLastHost(a.lastHost);
      setAnsBroadcast(a.broadcastAddress);
      setAnsMaskOrCidr(challenge.givenFormat === 'cidr' ? a.maskDecimal : `/${a.cidr}`);
      setAnsBinaryMask(a.maskBinaryOctets.join('.'));
      setAnsUsableHosts(String(a.usableHosts));
    } else if (challenge.category === 'topology_design' && challenge.topology) {
      const t = challenge.topology;
      setAnsBorrowedBits(String(t.expectedBorrowedBits));
      setAnsNewCidr(`/${t.expectedNewCidr}`);
      setAnsNewMask(t.expectedNewMask);
      setAnsSubnetsCreated(String(t.expectedSubnetsCreated));
      setAnsHostsPerSubnet(String(t.expectedHostsPerSubnet));
      setAnsNetwork(t.targetNetwork);
      setAnsFirstHost(t.targetFirstHost);
      setAnsLastHost(t.targetLastHost);
      setAnsBroadcast(t.targetBroadcast);
    } else if (challenge.category === 'troubleshooting' && challenge.troubleshooting) {
      const tb = challenge.troubleshooting;
      setAnsFaultType(tb.faultType);
      setAnsNetwork(tb.expectedGatewayNetwork);
      setAnsFirstHost(tb.expectedValidFirstHost);
      setAnsLastHost(tb.expectedValidLastHost);
      setAnsBroadcast(tb.expectedBroadcast);
    } else if (challenge.category === 'supernetting' && challenge.supernetting) {
      const sp = challenge.supernetting;
      setAnsNetwork(sp.expectedSummaryIp);
      setAnsNewCidr(`/${sp.expectedSummaryCidr}`);
      setAnsNewMask(sp.expectedSummaryMask);
    } else {
      setAnsBlockSize(String(a.blockSize));
      setAnsBinaryMask(a.maskBinaryOctets.join('.'));
      setAnsMaskOrCidr(challenge.givenFormat === 'cidr' ? a.maskDecimal : `/${a.cidr}`);
      setAnsNetwork(a.networkAddress);
      setAnsBroadcast(a.broadcastAddress);
    }
    setShowSteps(true);
  };

  const handleExportProgressJson = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      application: 'SubnetLab IPv4 — Un Fantasma en el Sistema',
      url: 'https://www.unfantasmaenelsistema.com/',
      stats,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe_rendimiento_subnetlab_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const steps = getStepByStepExplanation(challenge.analysis);
  const currentBinParts = normalizeBinaryString(ansBinaryMask).split('.');
  const safeBinParts =
    currentBinParts.length === 4
      ? currentBinParts
      : ['11111111', '11111111', '11111111', '00000000'];

  return (
    <div className="space-y-6">
      {/* Control Deck: Mode, Difficulty & Timer Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          {/* 5 Mode Selector Tabs */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Modalidad de Entrenamiento Didáctico (5 Escenarios Reales)
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCategory('full_network');
                  handleNextChallenge('full_network', difficulty);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  category === 'full_network'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Cálculo de Red
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategory('topology_design');
                  handleNextChallenge('topology_design', difficulty);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  category === 'topology_design'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                Topología FLSM
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategory('troubleshooting');
                  handleNextChallenge('troubleshooting', difficulty);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  category === 'troubleshooting'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Troubleshooting IP
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategory('supernetting');
                  handleNextChallenge('supernetting', difficulty);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  category === 'supernetting'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                Sumarización CIDR
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategory('binary_drill');
                  handleNextChallenge('binary_drill', difficulty);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  category === 'binary_drill'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                Sprint Binario
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Difficulty Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                Nivel de Complejidad CIDR
              </span>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/70 dark:border-slate-800">
                {(
                  [
                    { id: 'beginner', label: 'Inicial' },
                    { id: 'intermediate', label: 'Intermedio' },
                    { id: 'advanced', label: 'Avanzado' },
                    { id: 'exam', label: 'CCNA' },
                  ] as const
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setDifficulty(lvl.id);
                      handleNextChallenge(category, lvl.id);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      difficulty === lvl.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Mode Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                Reloj de Competición
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/70 dark:border-slate-800">
                {(
                  [
                    { id: 'practice', label: 'Libre' },
                    { id: '60s', label: '60s Blitz' },
                    { id: '180s', label: '3m Sprint' },
                    { id: '300s', label: '5m Examen' },
                  ] as const
                ).map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => startSession(tm.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      timerMode === tm.id
                        ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Telemetry & Score Strip */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-semibold text-sm">
              <Timer className="w-4 h-4 text-sky-500" />
              {timerMode === 'practice'
                ? `Tiempo: ${formatClock(elapsedSeconds)}`
                : `Restante: ${formatClock(secondsLeft)}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Puntos Sesión:{' '}
              <strong className="text-slate-900 dark:text-white">{sessionScore}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Racha Actual:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {stats.currentStreak}
              </strong>{' '}
              (Récord: {stats.bestStreak})
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Resueltos Perfectos:{' '}
              <strong className="text-slate-900 dark:text-white">{stats.totalSolved}</strong> /{' '}
              {stats.totalAttempts}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBinaryRuler((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-500" />
              {showBinaryRuler ? 'Ocultar Regla Binaria' : 'Regla Binaria 128–1'}
            </button>
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              {showHint ? 'Ocultar Pista' : 'Pista Didáctica'}
            </button>
            <button
              type="button"
              onClick={() => handleNextChallenge()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Nuevo Reto
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Interactive Binary Ruler */}
      {showBinaryRuler && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Regla de Pesos de un Octeto Binario y Valores de Máscara Acumulados
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Salto = 256 − Valor Máscara
            </span>
          </div>
          <div className="grid grid-cols-8 gap-2 text-center font-mono">
            {[
              { bit: 1, weight: 128, maskAcc: 128, jump: 128 },
              { bit: 2, weight: 64, maskAcc: 192, jump: 64 },
              { bit: 3, weight: 32, maskAcc: 224, jump: 32 },
              { bit: 4, weight: 16, maskAcc: 240, jump: 16 },
              { bit: 5, weight: 8, maskAcc: 248, jump: 8 },
              { bit: 6, weight: 4, maskAcc: 252, jump: 4 },
              { bit: 7, weight: 2, maskAcc: 254, jump: 2 },
              { bit: 8, weight: 1, maskAcc: 255, jump: 1 },
            ].map((col) => (
              <div
                key={col.bit}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="text-[11px] text-slate-400">Bit +{col.bit}</div>
                <div className="text-sm font-bold text-sky-600 dark:text-sky-400 my-0.5">
                  +{col.weight}
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  Másc: <strong>{col.maskAcc}</strong>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Salto: {col.jump}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Hint Box */}
      {showHint && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-800/70 rounded-xl p-4 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            Pista Didáctica de Resolución
          </div>
          {challenge.category === 'topology_design' && challenge.topology ? (
            <p className="leading-relaxed">
              1. Para{' '}
              <strong>
                {challenge.topology.requiredCount}{' '}
                {challenge.topology.constraintType === 'subnets' ? 'subredes' : 'hosts útiles'}
              </strong>
              , busca la potencia de 2 inmediata superior:{' '}
              {challenge.topology.constraintType === 'subnets'
                ? `2^n ≥ ${challenge.topology.requiredCount} → n = ${challenge.topology.expectedBorrowedBits} bits prestados.`
                : `2^h - 2 ≥ ${challenge.topology.requiredCount} → h = ${
                    32 - challenge.topology.expectedNewCidr
                  } bits de host, lo que deja /${challenge.topology.expectedNewCidr}.`}{' '}
              2. La nueva máscara es <strong>/{challenge.topology.expectedNewCidr}</strong> (
              <code className="font-mono">{challenge.topology.expectedNewMask}</code>), cuyo salto
              es <strong>{challenge.topology.expectedBlockSize}</strong>.
            </p>
          ) : challenge.category === 'troubleshooting' && challenge.troubleshooting ? (
            <p className="leading-relaxed">
              Analiza primero la subred del Gateway{' '}
              <strong>
                {challenge.troubleshooting.gatewayIp}/{challenge.troubleshooting.gatewayCidr}
              </strong>
              : su salto es <strong>{challenge.analysis.blockSize}</strong>, la red empieza en{' '}
              <code className="font-mono">{challenge.troubleshooting.expectedGatewayNetwork}</code>{' '}
              y el broadcast es{' '}
              <code className="font-mono">{challenge.troubleshooting.expectedBroadcast}</code>.
              Compara ahora la IP y máscara del Host con ese rango.
            </p>
          ) : challenge.category === 'supernetting' && challenge.supernetting ? (
            <p className="leading-relaxed">
              Observa la representación en binario de las rutas listadas abajo: cuenta cuántos bits
              de izquierda a derecha permanecen idénticos en todas las rutas (
              <strong>{challenge.supernetting.commonBitsCount} bits comunes</strong>). Ese número es
              tu nuevo prefijo CIDR sumarizado{' '}
              <strong>/{challenge.supernetting.expectedSummaryCidr}</strong>.
            </p>
          ) : (
            <p className="leading-relaxed">
              1. Prefijo <strong>/{challenge.analysis.cidr}</strong> significa que el octeto
              interesante es el{' '}
              <strong>{challenge.analysis.interestingOctetIndex + 1}º octeto</strong>, donde la
              máscara vale <strong>{challenge.analysis.interestingMaskValue}</strong>. 2. El salto
              de bloque es{' '}
              <code className="font-mono">
                256 - {challenge.analysis.interestingMaskValue} = {challenge.analysis.blockSize}
              </code>
              .
            </p>
          )}
        </div>
      )}

      {/* Main Split Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Problem Card & Diagram (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Escenario Técnico Activo
              </span>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                {challenge.category === 'full_network'
                  ? 'Cálculo de Parámetros de Red'
                  : challenge.category === 'topology_design'
                  ? challenge.topology?.title
                  : challenge.category === 'troubleshooting'
                  ? challenge.troubleshooting?.title
                  : challenge.category === 'supernetting'
                  ? challenge.supernetting?.title
                  : 'Conversión Binaria & Salto de Bloque'}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Clase {challenge.analysis.ipClass}
            </span>
          </div>

          {challenge.category === 'topology_design' && challenge.topology ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Bloque de Red Base Asignado
                </div>
                <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 tracking-tight">
                  {challenge.topology.baseNetwork}/{challenge.topology.baseCidr}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {challenge.topology.description}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 font-mono">
                  <span>DIAGRAMA LÓGICO DE TOPOLOGÍA</span>
                  <span>OBJETIVO: SUBRED #{challenge.topology.targetSubnetIndex}</span>
                </div>
                <svg
                  viewBox="0 0 420 215"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Diagrama de topología de red con router central y subredes"
                >
                  {challenge.topology.branches.map((_, idx) => {
                    const xPos = 60 + idx * 100;
                    const isTarget = idx + 1 === challenge.topology?.targetSubnetIndex;
                    return (
                      <line
                        key={idx}
                        x1={210}
                        y1={48}
                        x2={xPos}
                        y2={125}
                        stroke={isTarget ? '#38bdf8' : '#334155'}
                        strokeWidth={isTarget ? 2.5 : 1.5}
                        strokeDasharray={isTarget ? 'none' : '4 3'}
                      />
                    );
                  })}
                  <g transform="translate(155, 12)">
                    <rect
                      width="110"
                      height="38"
                      rx="8"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <text
                      x="55"
                      y="17"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                    >
                      CORE ROUTER
                    </text>
                    <text
                      x="55"
                      y="30"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {challenge.topology.baseNetwork}/{challenge.topology.baseCidr}
                    </text>
                  </g>
                  {challenge.topology.branches.map((br, idx) => {
                    const xCenter = 60 + idx * 100;
                    const isTarget = idx + 1 === challenge.topology?.targetSubnetIndex;
                    return (
                      <g key={br.name} transform={`translate(${xCenter - 44}, 125)`}>
                        <rect
                          width="88"
                          height="74"
                          rx="8"
                          fill={isTarget ? '#082f49' : '#0f172a'}
                          stroke={isTarget ? '#38bdf8' : '#334155'}
                          strokeWidth={isTarget ? 2 : 1}
                        />
                        <text
                          x="44"
                          y="18"
                          textAnchor="middle"
                          fill={isTarget ? '#7dd3fc' : '#94a3b8'}
                          fontSize="9.5"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="700"
                        >
                          SUBRED #{idx + 1}
                        </text>
                        <text
                          x="44"
                          y="34"
                          textAnchor="middle"
                          fill="#e2e8f0"
                          fontSize="8.5"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                        >
                          {br.name.split(' (')[0].slice(0, 14)}
                        </text>
                        <text
                          x="44"
                          y="50"
                          textAnchor="middle"
                          fill={isTarget ? '#34d399' : '#64748b'}
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          ≥{br.hosts} hosts
                        </text>
                        {isTarget && (
                          <text
                            x="44"
                            y="65"
                            textAnchor="middle"
                            fill="#fbbf24"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="700"
                          >
                            ★ CALCULAR ESTA
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          ) : challenge.category === 'troubleshooting' && challenge.troubleshooting ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-amber-600 dark:text-amber-400">
                  <span>TICKET {challenge.troubleshooting.ticketId}</span>
                  <span>FALLO PING L2/L3</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {challenge.troubleshooting.symptom}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-sans text-slate-500">
                    Router Default Gateway (Correcto)
                  </div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {challenge.troubleshooting.gatewayIp}/{challenge.troubleshooting.gatewayCidr}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Másc: {challenge.analysis.maskDecimal}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/30">
                  <div className="text-[11px] font-sans text-rose-600 dark:text-rose-400">
                    Estación Host (Sin conexión)
                  </div>
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {challenge.troubleshooting.hostIp}/{challenge.troubleshooting.hostCidr}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Estado: ICMP Timeout</div>
                </div>
              </div>
            </div>
          ) : challenge.category === 'supernetting' && challenge.supernetting ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {challenge.supernetting.description}
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-medium text-slate-500">
                   Tabla de Subredes Contiguas a Sumarizar:
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  {challenge.supernetting.binaryComparisonRows.map((row) => (
                    <div
                      key={row.ip}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-1 border-b border-slate-200/60 dark:border-slate-800 last:border-0"
                    >
                      <span className="font-bold text-sky-600 dark:text-sky-400">{row.ip}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {row.binaryFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Dirección IPv4 y Máscara de Entrada</span>
                  <span>
                    {challenge.givenFormat === 'cidr' ? 'Notación CIDR' : 'Notación Decimal'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-600 dark:text-sky-400 tracking-tight break-all">
                  {challenge.givenFormat === 'cidr'
                    ? `${challenge.givenIp} /${challenge.givenCidr}`
                    : `${challenge.givenIp}`}
                </div>
                {challenge.givenFormat === 'decimal_mask' && (
                  <div className="pt-1 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between font-mono text-sm">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      Máscara de Subred:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {challenge.analysis.maskDecimal}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <span>Ámbito de direccionamiento</span>
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    {challenge.analysis.scope}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <span>IP en binario (referencia)</span>
                  <span className="font-mono text-[11px] text-slate-800 dark:text-slate-300">
                    {challenge.analysis.ipBinaryOctets.join('.')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span>Octeto donde actúa la máscara</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
                    {challenge.analysis.interestingOctetIndex + 1}º octeto
                  </span>
                </div>
              </div>
            </div>
          )}

          {lastPointsEarned !== null && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Resultado de la verificación
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />+{lastPointsEarned} puntos obtenidos
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                {showSteps ? 'Ocultar Explicación' : 'Ver Paso a Paso'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Worksheet Form (7 cols) */}
        <form
          onSubmit={handleVerify}
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Hoja de Respuestas del Reto
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Completa los campos solicitados y pulsa Comprobar Respuesta (o la tecla Enter).
              </p>
            </div>
            <button
              type="button"
              onClick={handleRevealSolution}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              Resolver y Explicar
            </button>
          </div>

          {challenge.category === 'full_network' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    1. Dirección IP de Red (Network ID)
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={ansNetwork}
                    onChange={(e) => setAnsNetwork(e.target.value)}
                    placeholder="Ej. 192.168.1.0"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.network && <FeedbackLine evalItem={evaluated.network} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    2. Dirección IP de Broadcast
                  </label>
                  <input
                    type="text"
                    value={ansBroadcast}
                    onChange={(e) => setAnsBroadcast(e.target.value)}
                    placeholder="Ej. 192.168.1.255"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.broadcast && <FeedbackLine evalItem={evaluated.broadcast} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    3. Primer Host Disponible (Red + 1)
                  </label>
                  <input
                    type="text"
                    value={ansFirstHost}
                    onChange={(e) => setAnsFirstHost(e.target.value)}
                    placeholder="Ej. 192.168.1.1"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.firstHost && <FeedbackLine evalItem={evaluated.firstHost} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    4. Último Host Disponible (Broadcast − 1)
                  </label>
                  <input
                    type="text"
                    value={ansLastHost}
                    onChange={(e) => setAnsLastHost(e.target.value)}
                    placeholder="Ej. 192.168.1.254"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.lastHost && <FeedbackLine evalItem={evaluated.lastHost} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {challenge.givenFormat === 'cidr'
                      ? `5. Máscara en Decimal (para /${challenge.givenCidr})`
                      : '5. Notación Prefijo CIDR (ej. /26)'}
                  </label>
                  <input
                    type="text"
                    value={ansMaskOrCidr}
                    onChange={(e) => setAnsMaskOrCidr(e.target.value)}
                    placeholder={
                      challenge.givenFormat === 'cidr' ? 'Ej. 255.255.255.192' : 'Ej. /26'
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.maskOrCidr && <FeedbackLine evalItem={evaluated.maskOrCidr} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    6. Número de Hosts Disponibles (2^h − 2)
                  </label>
                  <input
                    type="text"
                    value={ansUsableHosts}
                    onChange={(e) => setAnsUsableHosts(e.target.value)}
                    placeholder="Ej. 62"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.usableHosts && <FeedbackLine evalItem={evaluated.usableHosts} />}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    7. Máscara de Subred en Binario (32 bits)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Puedes escribir o usar los selectores rápidos de octeto
                  </span>
                </div>
                <input
                  type="text"
                  value={ansBinaryMask}
                  onChange={(e) => setAnsBinaryMask(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[0, 1, 2, 3].map((octIdx) => (
                    <div
                      key={octIdx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Octeto {octIdx + 1}</span>
                        <span className="font-mono text-sky-600 dark:text-sky-400">
                          {parseInt(safeBinParts[octIdx] || '0', 2)}
                        </span>
                      </div>
                      <select
                        value={safeBinParts[octIdx] || '00000000'}
                        onChange={(e) => setBinaryOctetAt(octIdx, e.target.value)}
                        aria-label={`Seleccionar binario para octeto ${octIdx + 1}`}
                        className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-900 dark:text-slate-100"
                      >
                        {COMMON_BINARY_OCTETS.map((o) => (
                          <option key={o.bin} value={o.bin}>
                            {o.bin} ({o.dec})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {evaluated?.binaryMask && <FeedbackLine evalItem={evaluated.binaryMask} />}
              </div>
            </div>
          )}

          {challenge.category === 'topology_design' && challenge.topology && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    1. Bits Prestados (n)
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={ansBorrowedBits}
                    onChange={(e) => setAnsBorrowedBits(e.target.value)}
                    placeholder="Ej. 3"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.borrowedBits && <FeedbackLine evalItem={evaluated.borrowedBits} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    2. Nueva Máscara CIDR
                  </label>
                  <input
                    type="text"
                    value={ansNewCidr}
                    onChange={(e) => setAnsNewCidr(e.target.value)}
                    placeholder="Ej. /27"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.newCidr && <FeedbackLine evalItem={evaluated.newCidr} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    3. Nueva Máscara Decimal
                  </label>
                  <input
                    type="text"
                    value={ansNewMask}
                    onChange={(e) => setAnsNewMask(e.target.value)}
                    placeholder="Ej. 255.255.255.224"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.newMask && <FeedbackLine evalItem={evaluated.newMask} />}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    4. Total de Subredes Creadas (2^n)
                  </label>
                  <input
                    type="text"
                    value={ansSubnetsCreated}
                    onChange={(e) => setAnsSubnetsCreated(e.target.value)}
                    placeholder="Ej. 8"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.subnetsCreated && (
                    <FeedbackLine evalItem={evaluated.subnetsCreated} />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    5. Hosts Útiles por Subred (2^h − 2)
                  </label>
                  <input
                    type="text"
                    value={ansHostsPerSubnet}
                    onChange={(e) => setAnsHostsPerSubnet(e.target.value)}
                    placeholder="Ej. 30"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.hostsPerSubnet && (
                    <FeedbackLine evalItem={evaluated.hostsPerSubnet} />
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 mb-3">
                  Direccionamiento de la Subred #{challenge.topology.targetSubnetIndex} señalada en
                  la Topología
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      6. IP de Red (Subred #{challenge.topology.targetSubnetIndex})
                    </label>
                    <input
                      type="text"
                      value={ansNetwork}
                      onChange={(e) => setAnsNetwork(e.target.value)}
                      placeholder="Ej. 192.168.10.32"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {evaluated?.network && <FeedbackLine evalItem={evaluated.network} />}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      7. IP de Broadcast (Subred #{challenge.topology.targetSubnetIndex})
                    </label>
                    <input
                      type="text"
                      value={ansBroadcast}
                      onChange={(e) => setAnsBroadcast(e.target.value)}
                      placeholder="Ej. 192.168.10.63"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {evaluated?.broadcast && <FeedbackLine evalItem={evaluated.broadcast} />}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      8. Primer Host Útil (Subred #{challenge.topology.targetSubnetIndex})
                    </label>
                    <input
                      type="text"
                      value={ansFirstHost}
                      onChange={(e) => setAnsFirstHost(e.target.value)}
                      placeholder="Ej. 192.168.10.33"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {evaluated?.firstHost && <FeedbackLine evalItem={evaluated.firstHost} />}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      9. Último Host Útil (Subred #{challenge.topology.targetSubnetIndex})
                    </label>
                    <input
                      type="text"
                      value={ansLastHost}
                      onChange={(e) => setAnsLastHost(e.target.value)}
                      placeholder="Ej. 192.168.10.62"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {evaluated?.lastHost && <FeedbackLine evalItem={evaluated.lastHost} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {challenge.category === 'troubleshooting' && challenge.troubleshooting && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  1. Causa Raíz del Fallo de Comunicación con el Gateway
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      {
                        id: 'different_subnet',
                        label: 'La IP del Host pertenece a otra subred distinta a la del Gateway',
                      },
                      {
                        id: 'host_is_network_id',
                        label: 'El Host tiene asignada la Dirección IP de Red (bits de host a 0)',
                      },
                      {
                        id: 'host_is_broadcast',
                        label: 'El Host tiene asignada la Dirección IP de Broadcast de la subred',
                      },
                      {
                        id: 'wrong_mask',
                        label: 'El Host tiene una máscara CIDR incongruente con la del Gateway',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnsFaultType(opt.id)}
                      className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        ansFaultType === opt.id
                          ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {evaluated?.faultType && <FeedbackLine evalItem={evaluated.faultType} />}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 mb-3">
                  Calcula los Parámetros Correctos de la Subred del Gateway (
                  {challenge.troubleshooting.gatewayIp}/{challenge.troubleshooting.gatewayCidr})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      2. Dirección IP de Red del Gateway
                    </label>
                    <input
                      ref={firstInputRef}
                      type="text"
                      value={ansNetwork}
                      onChange={(e) => setAnsNetwork(e.target.value)}
                      placeholder="Ej. 192.168.10.64"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {evaluated?.network && <FeedbackLine evalItem={evaluated.network} />}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      3. Dirección de Broadcast del Gateway
                    </label>
                    <input
                      type="text"
                      value={ansBroadcast}
                      onChange={(e) => setAnsBroadcast(e.target.value)}
                      placeholder="Ej. 192.168.10.127"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {evaluated?.broadcast && <FeedbackLine evalItem={evaluated.broadcast} />}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      4. Primer Host Útil Válido
                    </label>
                    <input
                      type="text"
                      value={ansFirstHost}
                      onChange={(e) => setAnsFirstHost(e.target.value)}
                      placeholder="Ej. 192.168.10.65"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {evaluated?.firstHost && <FeedbackLine evalItem={evaluated.firstHost} />}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      5. Último Host Útil Válido
                    </label>
                    <input
                      type="text"
                      value={ansLastHost}
                      onChange={(e) => setAnsLastHost(e.target.value)}
                      placeholder="Ej. 192.168.10.126"
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {evaluated?.lastHost && <FeedbackLine evalItem={evaluated.lastHost} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {challenge.category === 'supernetting' && challenge.supernetting && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    1. IP de Superred Sumarizada
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={ansNetwork}
                    onChange={(e) => setAnsNetwork(e.target.value)}
                    placeholder="Ej. 172.16.8.0"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  {evaluated?.network && <FeedbackLine evalItem={evaluated.network} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    2. Prefijo CIDR Sumarizado
                  </label>
                  <input
                    type="text"
                    value={ansNewCidr}
                    onChange={(e) => setAnsNewCidr(e.target.value)}
                    placeholder="Ej. /22"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  {evaluated?.newCidr && <FeedbackLine evalItem={evaluated.newCidr} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    3. Máscara Decimal Sumarizada
                  </label>
                  <input
                    type="text"
                    value={ansNewMask}
                    onChange={(e) => setAnsNewMask(e.target.value)}
                    placeholder="Ej. 255.255.252.0"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  {evaluated?.newMask && <FeedbackLine evalItem={evaluated.newMask} />}
                </div>
              </div>
            </div>
          )}

          {challenge.category === 'binary_drill' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    1. Salto de Bloque / Número Mágico (256 − Máscara)
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={ansBlockSize}
                    onChange={(e) => setAnsBlockSize(e.target.value)}
                    placeholder="Ej. 16, 32, 64..."
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.blockSize && <FeedbackLine evalItem={evaluated.blockSize} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {challenge.givenFormat === 'cidr'
                      ? `2. Máscara en Decimal (para /${challenge.givenCidr})`
                      : '2. Prefijo CIDR equivalente (ej. /27)'}
                  </label>
                  <input
                    type="text"
                    value={ansMaskOrCidr}
                    onChange={(e) => setAnsMaskOrCidr(e.target.value)}
                    placeholder={
                      challenge.givenFormat === 'cidr' ? 'Ej. 255.255.255.224' : 'Ej. /27'
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.maskOrCidr && <FeedbackLine evalItem={evaluated.maskOrCidr} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    3. Dirección IP de Red
                  </label>
                  <input
                    type="text"
                    value={ansNetwork}
                    onChange={(e) => setAnsNetwork(e.target.value)}
                    placeholder="Ej. 192.168.1.32"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.network && <FeedbackLine evalItem={evaluated.network} />}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    4. Dirección IP de Broadcast
                  </label>
                  <input
                    type="text"
                    value={ansBroadcast}
                    onChange={(e) => setAnsBroadcast(e.target.value)}
                    placeholder="Ej. 192.168.1.63"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {evaluated?.broadcast && <FeedbackLine evalItem={evaluated.broadcast} />}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  5. Máscara de Subred en Binario (32 bits)
                </label>
                <input
                  type="text"
                  value={ansBinaryMask}
                  onChange={(e) => setAnsBinaryMask(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[0, 1, 2, 3].map((octIdx) => (
                    <div
                      key={octIdx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Octeto {octIdx + 1}</span>
                        <span className="font-mono text-sky-600 dark:text-sky-400">
                          {parseInt(safeBinParts[octIdx] || '0', 2)}
                        </span>
                      </div>
                      <select
                        value={safeBinParts[octIdx] || '00000000'}
                        onChange={(e) => setBinaryOctetAt(octIdx, e.target.value)}
                        aria-label={`Seleccionar binario para octeto ${octIdx + 1}`}
                        className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-900 dark:text-slate-100"
                      >
                        {COMMON_BINARY_OCTETS.map((o) => (
                          <option key={o.bin} value={o.bin}>
                            {o.bin} ({o.dec})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {evaluated?.binaryMask && <FeedbackLine evalItem={evaluated.binaryMask} />}
              </div>
            </div>
          )}

          {/* Primary Submit / Next Action Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {evaluated
                ? 'Revisa las correcciones o pasa al siguiente ejercicio.'
                : 'Se validará cada octeto y se explicará cualquier desviación.'}
            </div>
            <div className="flex items-center gap-3">
              {!evaluated ? (
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Comprobar Respuesta
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Siguiente Reto
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Step-by-Step Pedagogical Breakdown Section */}
      {showSteps && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Resolución Didáctica Paso a Paso ({challenge.analysis.ip}/{challenge.analysis.cidr})
            </h3>
            <span className="text-xs font-mono text-sky-600 dark:text-sky-400">
              Salto = {challenge.analysis.blockSize} · Hosts ={' '}
              {challenge.analysis.usableHosts.toLocaleString('es-ES')}
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
      )}

      {/* Time Up Summary Modal */}
      {timeUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Tiempo Completado
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Resumen de Competición Contra Reloj
                </h3>
              </div>
              <Award className="w-8 h-8 text-amber-500 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-sans">Puntuación Final</div>
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                  {sessionScore} pts
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-sans">Retos Perfectos</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {sessionSolved}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-sans">Mejor Racha</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {stats.bestStreak} seguidos
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-sans">Récord Personal</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {timerMode === '60s' ? stats.highScore60 : stats.highScore180} pts
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => startSession('practice')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Pasar a Modo Libre
              </button>
              <button
                type="button"
                onClick={() => startSession(timerMode)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Jugar Otra Ronda ({timerMode})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Challenge History Table */}
      {stats.history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Historial Reciente de Ejercicios Verificados
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Puntuación acumulada: {stats.totalScore.toLocaleString('es-ES')} pts
              </span>
            </div>
            <button
              type="button"
              onClick={handleExportProgressJson}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-sky-500" />
              Exportar Informe JSON
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4 font-medium">Hora</th>
                  <th className="py-2 px-4 font-medium">Modalidad</th>
                  <th className="py-2 px-4 font-medium">Red / Incidencia</th>
                  <th className="py-2 px-4 font-medium">Precisión</th>
                  <th className="py-2 px-4 font-medium">Tiempo</th>
                  <th className="py-2 pl-4 font-medium text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono tabular-nums">
                {stats.history.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4 text-slate-500">{item.timestamp}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 dark:text-slate-300">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-4 text-sky-600 dark:text-sky-400 font-medium">
                      {item.prompt}
                    </td>
                    <td className="py-2.5 px-4">
                      {item.accuracy === 100 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Exacto
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {item.accuracy}% Parcial
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                      {item.timeSpentSec}s
                    </td>
                    <td className="py-2.5 pl-4 text-right font-semibold text-slate-900 dark:text-white">
                      +{item.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const FeedbackLine: React.FC<{ evalItem: FieldEvaluation }> = ({ evalItem }) => {
  if (evalItem.isCorrect) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Correcto ({evalItem.expected})</span>
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{evalItem.message}</span>
    </div>
  );
};
