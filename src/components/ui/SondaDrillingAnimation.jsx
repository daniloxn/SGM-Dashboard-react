// src/components/ui/SondaDrillingAnimation.jsx
// Ilustração técnica e animação em SVG da sonda subterrânea de testemunhagem Epiroc Diamec 232

export default function SondaDrillingAnimation() {
  return (
    <div className="relative w-full h-full min-h-[460px] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Luz ambiente de fundo */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="w-80 h-80 bg-blue-500/5 rounded-full blur-2xl translate-x-24 -translate-y-12" />
      </div>

      <svg
        viewBox="0 0 720 460"
        className="w-full h-full max-h-[520px] drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradiente Epiroc Yellow */}
          <linearGradient id="epirocYellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Gradiente Aço Escuro / Chassi */}
          <linearGradient id="gradChassiEpiroc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* Gradiente Cilindro de Avanço / Aço Cromado */}
          <linearGradient id="gradCromo" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>

          {/* Gradiente da Haste de Perfuração */}
          <linearGradient id="gradHasteDiamec" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="35%" stopColor="#94A3B8" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* Gradiente Rocha Subterrânea */}
          <linearGradient id="gradRocha" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Padrão Listrado de Segurança Epiroc (45 deg) */}
          <pattern id="padraoSeguranca" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="#F59E0B" strokeWidth="8" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="#0F172A" strokeWidth="8" />
          </pattern>

          {/* Filtro Glow para luzes operacionais */}
          <filter id="glowLuz" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <style>{`
          /* Ciclo Mecânico Diamec 232: Avanço de furação e retorno rápido do cabeçote */
          @keyframes diamecAvanço {
            0% {
              transform: translateX(0px);
            }
            65% {
              transform: translateX(145px);
            }
            72% {
              transform: translateX(145px);
            }
            88% {
              transform: translateX(0px);
            }
            100% {
              transform: translateX(0px);
            }
          }

          /* Efeito de rotação e brilho contínuo da haste */
          @keyframes rotacaoHaste {
            0% {
              stroke-dashoffset: 0;
            }
            100% {
              stroke-dashoffset: 40;
            }
          }

          /* Névoa de água e fluido de perfuração saindo do furo da rocha */
          @keyframes sprayLavagem {
            0%, 100% {
              opacity: 0.2;
              transform: scale(0.9);
            }
            50% {
              opacity: 0.85;
              transform: scale(1.15) translate(2px, -2px);
            }
          }

          /* Pulsação do ponteiro de pressão hidráulica */
          @keyframes manometroOscila {
            0%, 100% {
              transform: rotate(-15deg);
            }
            40% {
              transform: rotate(35deg);
            }
            65% {
              transform: rotate(40deg);
            }
            80% {
              transform: rotate(-30deg);
            }
          }

          /* Piscar de status LED de operação */
          @keyframes statusLed {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          .anim-cabecote {
            animation: diamecAvanço 6s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
          }

          .anim-haste {
            stroke-dasharray: 6 3;
            animation: rotacaoHaste 0.3s linear infinite;
          }

          .anim-spray {
            animation: sprayLavagem 1.2s ease-in-out infinite;
          }

          .anim-ponteiro {
            transform-origin: 104px 314px;
            animation: manometroOscila 6s ease-in-out infinite;
          }

          .anim-led {
            animation: statusLed 1.5s ease-in-out infinite;
          }
        `}</style>

        {/* 1. PLANO DE FUNDO: Galeria Subterrânea & Frente de Lavra em Rocha */}
        <g id="ambiente-subterraneo">
          {/* Parede de rocha à direita (Frente de Lavra) */}
          <path
            d="M 520 40 Q 550 90, 535 150 T 560 260 T 530 360 L 720 360 L 720 40 Z"
            fill="url(#gradRocha)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* Texturas de fenda na rocha */}
          <path d="M 540 80 L 565 110 L 590 105" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M 550 200 L 585 220 L 610 215" stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />
          <path d="M 535 300 L 570 315 L 600 295" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />

          {/* Chumbador de teto / Tirante de contenção com placa quadrada */}
          <rect x="580" y="65" width="22" height="22" rx="2" fill="#475569" stroke="#64748B" />
          <circle cx="591" cy="76" r="4" fill="#0F172A" />
          <line x1="591" y1="76" x2="630" y2="45" stroke="#94A3B8" strokeWidth="3" />

          {/* Piso da galeria (Skid frame / base de solo nivelado) */}
          <line x1="20" y1="410" x2="700" y2="410" stroke="#334155" strokeWidth="2.5" />
          <line x1="20" y1="415" x2="700" y2="415" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
        </g>

        {/* 2. UNIDADE DE FORÇA PU 232 (Power Unit no fundo à esquerda) */}
        <g id="power-unit-pu232">
          {/* Tanque hidráulico e estrutura do motor */}
          <rect x="35" y="240" width="85" height="165" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          {/* Faixa decorativa Epiroc Yellow no PU */}
          <rect x="35" y="255" width="85" height="12" fill="url(#epirocYellow)" />
          {/* Grelha de resfriamento / aletas */}
          <g stroke="#334155" strokeWidth="1.5">
            <line x1="45" y1="285" x2="110" y2="285" />
            <line x1="45" y1="295" x2="110" y2="295" />
            <line x1="45" y1="305" x2="110" y2="305" />
            <line x1="45" y1="315" x2="110" y2="315" />
            <line x1="45" y1="325" x2="110" y2="325" />
          </g>
          {/* Visor de nível de óleo hidráulico */}
          <rect x="105" y="345" width="6" height="30" rx="3" fill="#0F172A" stroke="#64748B" />
          <rect x="106" y="355" width="4" height="18" rx="2" fill="#F59E0B" opacity="0.8" />
          {/* Rodas de manobra da unidade de força */}
          <circle cx="48" cy="408" r="10" fill="#0F172A" stroke="#475569" strokeWidth="2" />
          <circle cx="108" cy="408" r="10" fill="#0F172A" stroke="#475569" strokeWidth="2" />
          <text x="42" y="250" fill="#94A3B8" fontSize="8" fontFamily="monospace" fontWeight="bold">PU-232</text>
        </g>

        {/* 3. MESA DE COMANDO DHC (Direct Hydraulic Control) */}
        <g id="painel-dhc">
          {/* Tripé de suporte da mesa */}
          <line x1="135" y1="340" x2="120" y2="410" stroke="#475569" strokeWidth="2.5" />
          <line x1="155" y1="340" x2="170" y2="410" stroke="#475569" strokeWidth="2.5" />

          {/* Caixa de válvulas e manômetros */}
          <path d="M 125 295 L 180 280 L 185 340 L 130 350 Z" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
          
          {/* 3 Manômetros analógicos redondos (Avanço, Rotação, Morsa) */}
          <circle cx="145" cy="305" r="7" fill="#0F172A" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="163" cy="300" r="7" fill="#0F172A" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="152" cy="322" r="6" fill="#0F172A" stroke="#F59E0B" strokeWidth="1" />

          {/* Ponteiro animado do manômetro de pressão de avanço */}
          <line x1="145" y1="305" x2="149" y2="300" stroke="#38BDF8" strokeWidth="1.5" className="anim-ponteiro" />

          {/* Alavancas de acionamento DHC com manoplas pretas */}
          <line x1="138" y1="290" x2="132" y2="272" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="131" cy="270" r="3.5" fill="#EF4444" />
          <line x1="148" y1="286" x2="144" y2="268" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="143" cy="266" r="3.5" fill="#10B981" />
          <line x1="170" y1="282" x2="170" y2="264" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="170" cy="262" r="3.5" fill="#F59E0B" />
        </g>

        {/* 4. MANGOTES HIDRÁULICOS (Hose Bundle flexível do PU/DHC até a sonda) */}
        <g id="mangotes-hidraulicos">
          {/* Mangote de alta pressão flexível que curva até o cabeçote */}
          <path
            d="M 120 330 C 160 380, 220 380, 265 320"
            stroke="#0F172A"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 120 330 C 160 380, 220 380, 265 320"
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeDasharray="5 2"
          />
          {/* Mangote de injeção de água (azul) */}
          <path
            d="M 115 340 C 170 400, 250 390, 290 310"
            stroke="#0284C7"
            strokeWidth="2.5"
            opacity="0.85"
          />
        </g>

        {/* 5. COLUNA DE MONTAGEM E CRUSETA (Rig Mounting Column & Turret Diamec) */}
        <g id="coluna-montagem">
          {/* Sapata de fixação no piso com parafusos chumbadores */}
          <rect x="235" y="398" width="80" height="12" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <circle cx="247" cy="404" r="3" fill="#0F172A" stroke="#94A3B8" />
          <circle cx="303" cy="404" r="3" fill="#0F172A" stroke="#94A3B8" />

          {/* Coluna estrutural vertical cilíndrica */}
          <rect x="265" y="270" width="22" height="130" fill="url(#gradChassiEpiroc)" stroke="#475569" strokeWidth="1.5" />
          
          {/* Fuso mecânico rosqueado de elevação */}
          <line x1="276" y1="280" x2="276" y2="390" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Cruzeta / Berço articulado (Turret swivel com anel graduador de ângulo) */}
          <circle cx="276" cy="270" r="24" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="276" cy="270" r="14" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
          <circle cx="276" cy="270" r="5" fill="#F59E0B" />
          {/* Marcas de grau de inclinação */}
          <line x1="276" y1="250" x2="276" y2="254" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="294" y1="260" x2="290" y2="263" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="294" y1="280" x2="290" y2="277" stroke="#94A3B8" strokeWidth="1.5" />
        </g>

        {/* 6. CONJUNTO DE AVANÇO ROTACIONADO (Feed Frame, Cabeçote, Mandril e Morsa da Diamec 232) */}
        {/* Ângulo de furação de -22° (furo ascendente/horizontal típico de galeria) */}
        <g transform="translate(200, 280) rotate(-22)">
          {/* ============================================================== */}
          {/* VIGA DE AVANÇO (FEED FRAME DIAMEC 232) */}
          {/* ============================================================== */}
          <g id="feed-frame">
            {/* Viga mestre perfilada em amarelo Epiroc */}
            <rect x="-30" y="-14" width="370" height="28" rx="4" fill="url(#epirocYellow)" stroke="#B45309" strokeWidth="1.5" />
            
            {/* Trilho interno de deslizamento (grafite escuro) */}
            <rect x="-20" y="-6" width="340" height="12" fill="#0F172A" stroke="#334155" strokeWidth="1" />

            {/* Escala métrica graduada de penetração na viga (0 a 850 mm) */}
            <g stroke="#1E293B" strokeWidth="1" opacity="0.75">
              <line x1="0" y1="-14" x2="0" y2="-10" />
              <line x1="40" y1="-14" x2="40" y2="-10" />
              <line x1="80" y1="-14" x2="80" y2="-10" />
              <line x1="120" y1="-14" x2="120" y2="-10" />
              <line x1="160" y1="-14" x2="160" y2="-10" />
              <line x1="200" y1="-14" x2="200" y2="-10" />
              <line x1="240" y1="-14" x2="240" y2="-10" />
            </g>

            {/* Cilindro hidráulico de avanço direto Diamec (Direct Feed Cylinder) */}
            <rect x="-15" y="16" width="180" height="10" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            <rect x="165" y="18" width="110" height="6" fill="url(#gradCromo)" />

            {/* Roldana de topo / Guia wireline traseiro */}
            <circle cx="-25" cy="0" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="-25" cy="0" r="4" fill="#F59E0B" />
          </g>

          {/* ============================================================== */}
          {/* MORSA HIDRÁULICA DE HASTES (ROD HOLDER DIAMEC 232) */}
          {/* ============================================================== */}
          <g id="rod-holder" transform="translate(310, -22)">
            {/* Bloco articulado bi-partido da morsa frontal */}
            <rect x="0" y="0" width="36" height="44" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
            {/* Cilindro de abertura/fechamento por mola */}
            <rect x="6" y="-8" width="24" height="8" rx="2" fill="#334155" stroke="#64748B" />
            {/* Mordentes de fixação da haste */}
            <rect x="12" y="18" width="12" height="8" fill="#F59E0B" />
            {/* Pino da dobradiça de abertura rápida */}
            <circle cx="6" cy="6" r="3" fill="#E2E8F0" />
            <text x="2" y="38" fill="#94A3B8" fontSize="6" fontFamily="sans-serif" fontWeight="bold">RH-232</text>
          </g>

          {/* ============================================================== */}
          {/* COLUNA DE HASTES & TUBO TESTEMUNHEIRO */}
          {/* ============================================================== */}
          <g id="coluna-hastes">
            {/* Haste de perfuração de aço passando pelo mandril e morsa em direção à rocha */}
            <line
              x1="-35"
              y1="0"
              x2="450"
              y2="0"
              stroke="url(#gradHasteDiamec)"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            {/* Linhas indicativas de alta rotação da coluna */}
            <line
              x1="-35"
              y1="0"
              x2="450"
              y2="0"
              stroke="#F8FAFC"
              strokeWidth="2"
              className="anim-haste"
              opacity="0.9"
            />
          </g>

          {/* ============================================================== */}
          {/* CABEÇOTE DE ROTAÇÃO E MANDRIL DIAMEC 232 (ANIMAÇÃO DE AVANÇO) */}
          {/* ============================================================== */}
          <g id="cabecote-rotativo" className="anim-cabecote" transform="translate(10, 0)">
            {/* Carro de deslizamento sobre os trilhos */}
            <rect x="0" y="-18" width="85" height="36" rx="4" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
            
            {/* Bloco principal do redutor de engrenagens (Epiroc Yellow) */}
            <rect x="12" y="-36" width="62" height="32" rx="4" fill="url(#epirocYellow)" stroke="#B45309" strokeWidth="1.5" />
            
            {/* Motor hidráulico montado na carcaça superior */}
            <rect x="18" y="-56" width="34" height="20" rx="3" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
            {/* Aletas de refrigeração do motor */}
            <line x1="24" y1="-52" x2="24" y2="-40" stroke="#475569" strokeWidth="1" />
            <line x1="30" y1="-52" x2="30" y2="-40" stroke="#475569" strokeWidth="1" />
            <line x1="36" y1="-52" x2="36" y2="-40" stroke="#475569" strokeWidth="1" />
            <line x1="42" y1="-52" x2="42" y2="-40" stroke="#475569" strokeWidth="1" />
            
            {/* Swivel / Cabeça de injeção de água na traseira da haste */}
            <rect x="-10" y="-10" width="18" height="20" rx="3" fill="#334155" stroke="#94A3B8" strokeWidth="1" />
            <circle cx="-1" cy="0" r="4" fill="#0284C7" />

            {/* MANDRIL HIDRÁULICO (HYDRAULIC CHUCK DIAMEC) */}
            {/* Cilindro do mandril frontal com mordentes cônicos */}
            <rect x="74" y="-16" width="28" height="32" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
            <rect x="94" y="-12" width="8" height="24" rx="2" fill="url(#epirocYellow)" />
            {/* Castanhas/mordentes do mandril */}
            <rect x="90" y="-6" width="14" height="12" fill="#E2E8F0" />

            {/* Conexão com o tirante do pistão de avanço */}
            <rect x="30" y="18" width="24" height="8" rx="2" fill="#334155" stroke="#64748B" />
          </g>

          {/* ============================================================== */}
          {/* PONTO DE PERFURAÇÃO NA ROCHA (SPRAY DE ÁGUA E LAMA) */}
          {/* ============================================================== */}
          <g id="colar-furo-rocha" transform="translate(365, 0)">
            {/* Colar / Guia de emboque na rocha */}
            <ellipse cx="0" cy="0" rx="5" ry="12" fill="#0F172A" stroke="#475569" strokeWidth="2" />
            
            {/* Névoa de água de circulação / Slurry spray */}
            <g className="anim-spray">
              <ellipse cx="-8" cy="-4" rx="16" ry="10" fill="#38BDF8" opacity="0.35" filter="url(#glowLuz)" />
              <circle cx="-12" cy="8" r="3" fill="#93C5FD" opacity="0.6" />
              <circle cx="-18" cy="-6" r="2.5" fill="#60A5FA" opacity="0.7" />
              <circle cx="-15" cy="14" r="2" fill="#93C5FD" opacity="0.5" />
              <circle cx="-6" cy="-12" r="2" fill="#BAE6FD" opacity="0.8" />
            </g>
          </g>
        </g>

        {/* 7. BADGES TÉCNICOS & INDICADORES HUD */}
        <g id="hud-tecnico">
          {/* Badge Epiroc Diamec 232 no canto superior esquerdo */}
          <g transform="translate(24, 24)">
            <rect x="0" y="0" width="170" height="42" rx="8" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
            {/* Bloco amarelo com logotipo */}
            <rect x="8" y="8" width="6" height="26" rx="2" fill="url(#epirocYellow)" />
            <text x="22" y="21" fill="#F8FAFC" fontSize="12" fontFamily="sans-serif" fontWeight="900" letterSpacing="1">
              EPIROC
            </text>
            <text x="22" y="32" fill="#F59E0B" fontSize="9" fontFamily="sans-serif" fontWeight="bold" letterSpacing="0.5">
              DIAMEC 232 • CORE DRILL
            </text>
          </g>

          {/* Status operacional no canto superior direito */}
          <g transform="translate(500, 24)">
            <rect x="0" y="0" width="190" height="38" rx="8" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
            <circle cx="16" cy="19" r="4.5" fill="#10B981" className="anim-led" filter="url(#glowLuz)" />
            <text x="28" y="17" fill="#E2E8F0" fontSize="10" fontFamily="monospace" fontWeight="bold">
              STATUS: DRILLING CYCLE
            </text>
            <text x="28" y="28" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              FEED TRAVEL: 850 mm | DHC
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
