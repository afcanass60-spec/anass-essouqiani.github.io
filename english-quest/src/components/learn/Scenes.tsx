/* Illustrations originales pour l'exercice « Décrire une image ». */

function Person({ x, y, shirt, skin = "#f2c7a5", hair = "#3b2a20", sitting, children }: { x: number; y: number; shirt: string; skin?: string; hair?: string; sitting?: boolean; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="-58" r="14" fill={skin} />
      <path d="M-14 -62a14 14 0 0 1 28 0c0-10-6-16-14-16s-14 6-14 16z" fill={hair} />
      <rect x="-17" y="-42" width="34" height={sitting ? 34 : 46} rx="12" fill={shirt} />
      {!sitting ? (
        <>
          <rect x="-13" y="2" width="11" height="34" rx="5" fill="#2b3557" />
          <rect x="2" y="2" width="11" height="34" rx="5" fill="#2b3557" />
        </>
      ) : null}
      {children}
    </g>
  );
}

function Cafe() {
  return (
    <svg viewBox="0 0 640 380" role="img" aria-label="Un café animé : un serveur apporte des boissons, deux amies discutent à une table, un homme travaille sur son ordinateur près de la fenêtre, une file d'attente au comptoir.">
      <rect width="640" height="380" fill="#2a2140" />
      <rect y="270" width="640" height="110" fill="#3a2d26" />
      {/* fenêtre */}
      <rect x="30" y="40" width="200" height="150" rx="8" fill="#7cc4ff" opacity=".35" />
      <path d="M130 40v150M30 115h200" stroke="#1d1830" strokeWidth="6" />
      <circle cx="80" cy="80" r="18" fill="#ffd36e" opacity=".8" />
      {/* tableau menu */}
      <rect x="430" y="40" width="170" height="100" rx="8" fill="#14251c" />
      <text x="515" y="70" fill="#e8ebfa" fontSize="16" textAnchor="middle" fontFamily="sans-serif">MENU</text>
      <path d="M455 88h120M455 106h90M455 124h105" stroke="#9fd5b5" strokeWidth="3" strokeLinecap="round" />
      {/* comptoir */}
      <rect x="400" y="200" width="240" height="80" fill="#6b4a3a" />
      <rect x="560" y="160" width="40" height="40" rx="6" fill="#c0c7d6" />
      <Person x={470} y={235} shirt="#ff7ab6" />
      <Person x={530} y={238} shirt="#ffb547" hair="#b5651d" />
      {/* table des amies */}
      <rect x="230" y="250" width="140" height="10" rx="4" fill="#d1a17a" />
      <rect x="295" y="258" width="10" height="50" fill="#a07858" />
      <Person x={250} y={268} shirt="#3d7bff" sitting />
      <Person x={350} y={268} shirt="#2fd58b" hair="#e8c070" sitting />
      <rect x="268" y="236" width="14" height="16" rx="3" fill="#fff" />
      <rect x="320" y="236" width="14" height="16" rx="3" fill="#fff" />
      {/* homme à l'ordinateur */}
      <rect x="60" y="250" width="110" height="10" rx="4" fill="#d1a17a" />
      <Person x={90} y={268} shirt="#9b6bff" sitting />
      <path d="M110 250l14-26h40l-6 26z" fill="#c0c7d6" />
      {/* serveur */}
      <Person x={190} y={230} shirt="#e8ebfa" hair="#111">
        <rect x="14" y="-40" width="40" height="6" rx="3" fill="#c0c7d6" />
        <rect x="20" y="-56" width="10" height="16" rx="2" fill="#fff" />
        <rect x="36" y="-56" width="10" height="16" rx="2" fill="#ffb547" />
      </Person>
    </svg>
  );
}

function Street() {
  return (
    <svg viewBox="0 0 640 380" role="img" aria-label="Une rue de ville sous la pluie : des passants avec des parapluies, un bus à l'arrêt, une femme qui court, un livreur à vélo et un magasin éclairé.">
      <rect width="640" height="380" fill="#1b2340" />
      <rect x="0" y="40" width="150" height="230" fill="#26305a" />
      <rect x="160" y="80" width="180" height="190" fill="#2d376a" />
      <rect x="350" y="20" width="140" height="250" fill="#232c52" />
      <rect x="500" y="70" width="140" height="200" fill="#2a3462" />
      {[30, 70, 110].map((x) => [70, 120, 170].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="22" height="28" fill="#ffd36e" opacity=".55" />))}
      <rect x="180" y="190" width="140" height="80" fill="#ffb547" opacity=".85" />
      <text x="250" y="180" fill="#e8ebfa" fontSize="16" textAnchor="middle" fontFamily="sans-serif">BOOKSHOP</text>
      <rect y="270" width="640" height="110" fill="#30385c" />
      <rect y="300" width="640" height="6" fill="#e8ebfa" opacity=".2" />
      {/* bus */}
      <rect x="380" y="200" width="230" height="90" rx="14" fill="#ff5d73" />
      <rect x="395" y="215" width="190" height="34" rx="6" fill="#9fd5ff" opacity=".7" />
      <circle cx="420" cy="292" r="16" fill="#111" />
      <circle cx="570" cy="292" r="16" fill="#111" />
      {/* passants */}
      <Person x={80} y={300} shirt="#2fd58b">
        <path d="M-40 -84a40 26 0 0 1 80 0z" fill="#3d7bff" />
        <path d="M0 -84v40" stroke="#ccc" strokeWidth="3" />
      </Person>
      <Person x={150} y={300} shirt="#9b6bff" hair="#b5651d">
        <path d="M-36 -84a36 24 0 0 1 72 0z" fill="#ffb547" />
        <path d="M0 -84v40" stroke="#ccc" strokeWidth="3" />
      </Person>
      <g transform="translate(300 300) rotate(-8)">
        <Person x={0} y={0} shirt="#ff7ab6" hair="#111" />
      </g>
      {/* vélo */}
      <circle cx="240" cy="350" r="18" stroke="#e8ebfa" strokeWidth="4" fill="none" />
      <circle cx="300" cy="350" r="18" stroke="#e8ebfa" strokeWidth="4" fill="none" />
      <path d="M240 350l25-30h25l10 30M265 320l-8-12" stroke="#e8ebfa" strokeWidth="4" fill="none" />
      <rect x="276" y="300" width="28" height="24" rx="4" fill="#2fd58b" />
      {/* pluie */}
      {Array.from({ length: 70 }).map((_, i) => (
        <path key={i} d={`M${(i * 53) % 640} ${(i * 37) % 260} l-6 16`} stroke="#9fd5ff" strokeWidth="2" opacity=".5" />
      ))}
    </svg>
  );
}

function Office() {
  return (
    <svg viewBox="0 0 640 380" role="img" aria-label="Une réunion de bureau : une femme présente un graphique en baisse sur un écran, un homme croise les bras d'un air sceptique, une collègue prend des notes, un autre regarde son téléphone.">
      <rect width="640" height="380" fill="#202848" />
      <rect x="380" y="40" width="220" height="140" rx="10" fill="#0f1530" stroke="#3d7bff" strokeWidth="4" />
      <path d="M400 80l40 20 40-10 40 40 40 30" stroke="#ff5d73" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M400 160h180" stroke="#4a5385" strokeWidth="3" />
      <rect x="40" y="250" width="420" height="16" rx="6" fill="#c9a37f" />
      <rect x="60" y="266" width="12" height="80" fill="#9a7a5e" />
      <rect x="430" y="266" width="12" height="80" fill="#9a7a5e" />
      <Person x={520} y={290} shirt="#9b6bff" hair="#111">
        <path d="M15 -30l40-40" stroke="#f2c7a5" strokeWidth="8" strokeLinecap="round" />
      </Person>
      <Person x={110} y={262} shirt="#3d7bff" sitting>
        <path d="M-16 -30h32" stroke="#f2c7a5" strokeWidth="9" strokeLinecap="round" />
      </Person>
      <Person x={220} y={262} shirt="#2fd58b" hair="#b5651d" sitting>
        <rect x="10" y="-20" width="26" height="18" rx="2" fill="#fff" />
      </Person>
      <Person x={330} y={262} shirt="#ffb547" hair="#555" sitting>
        <rect x="-26" y="-26" width="12" height="20" rx="3" fill="#111" />
      </Person>
      <rect x="150" y="234" width="20" height="16" rx="3" fill="#e8ebfa" />
      <rect x="250" y="236" width="40" height="14" rx="2" fill="#e8ebfa" opacity=".8" />
    </svg>
  );
}

export function Scene({ name }: { name: string }) {
  const S = name === "street" ? Street : name === "office" ? Office : Cafe;
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <S />
    </div>
  );
}
