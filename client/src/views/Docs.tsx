import { BruteAvatar, type BruteAvatarSubject } from '@/components/BruteAvatar';
import { petAsset, skillAsset, weaponAsset } from '@/lib/assets';

const DOC_ASSETS = {
  logo: '/docs/logo.png',
  banner: '/docs/banner.png',
  introVideo: '/docs/vault-brawl-intro.mp4',
  petsVideo: '/docs/petsystem-video-demo.mp4',
  dungeonBg: '/docs/background1.png',
  purpleBg: '/docs/backgroundmain.png',
};

const fighters: BruteAvatarSubject[] = [
  {
    id: 'docs-vex',
    gender: 'male',
    body: '1',
    bodyColors: '0',
    appearance: { lpc: { head: 'humanGaunt', hair: 'none', headwear: 'greathelm', torsoArmor: 'plate', armsArmor: 'plate', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'black', wings: 'monarchPurple' } },
  },
  {
    id: 'docs-nyra',
    gender: 'male',
    body: '1',
    bodyColors: '0',
    appearance: { lpc: { head: 'humanMale', hair: 'none', headwear: 'jasonHelmet', torsoArmor: 'leather', armsArmor: 'bracers', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'purple', wings: 'monarchPurple' } },
  },
  {
    id: 'docs-orrin',
    gender: 'male',
    body: '1',
    bodyColors: '0',
    appearance: { lpc: { head: 'humanElder', hair: 'long', headwear: 'none', torsoArmor: 'chainmail', armsArmor: 'plate', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'steel', wings: 'none' } },
  },
  {
    id: 'docs-kael',
    gender: 'male',
    body: '1',
    bodyColors: '0',
    appearance: { lpc: { head: 'humanPlump', hair: 'none', headwear: 'barbuta', torsoArmor: 'legion', armsArmor: 'plate', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'bronze', wings: 'none' } },
  },
  {
    id: 'docs-ice',
    gender: 'male',
    body: '1',
    bodyColors: '0',
    appearance: { lpc: { head: 'humanMale', hair: 'none', headwear: 'none', torsoArmor: 'trenchCoat', armsArmor: 'none', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'blue', wings: 'monarchPurple' } },
  },
];

const navGroups = [
  {
    title: 'Start here',
    links: [
      ['overview', 'About Vault Brawl'],
      ['getting-started', 'Getting Started'],
      ['game-loop', 'Game Loop'],
    ],
  },
  {
    title: 'Brawlers',
    links: [
      ['brawler-models', 'Brawler Models'],
      ['combat', 'Combat & Daily Limits'],
      ['progression', 'Progression'],
    ],
  },
  {
    title: 'Systems',
    links: [
      ['pets', 'Pet System'],
      ['vault', 'Vault & Chain'],
      ['fee-flow', 'Fee Flow Diagram'],
      ['rewards', 'Rewards & Claims'],
      ['faq', 'FAQ'],
    ],
  },
];

const gameLoop = [
  ['Connect', 'Use MetaMask on the supported BNB testnet build, then create your first wallet-owned brawler.'],
  ['Forge', 'Pick a name and visual model. The server rolls deterministic starting stats, skills and pets from that creation data.'],
  ['Profile', 'Your Vault Brawler profile shows level, XP, stats, skills, weapons, pets, daily fights and the live Vault Info panel.'],
  ['Fight', 'Choose a real saved opponent from the arena. The server simulates combat and returns a replayable fight log.'],
  ['Upgrade', 'Wins grant XP. When a brawler levels up, the upgrade screen offers real server-generated choices.'],
  ['Expand', 'The first 3 brawlers per wallet are base brawlers. Extra brawlers require an on-chain registry payment.'],
];

const combatFacts = [
  ['Normal fights', '3 per brawler per day. Each normal fight consumes 1 fight.'],
  ['Daily defeat cap', 'The day ends early after 3 normal-fight losses.'],
  ['Training', 'Sparring mode for practice: it does not consume the normal-fight pool and does not produce BNB rewards.'],
  ['Opponents', 'The arena uses real saved brawlers, preferring nearby levels and other wallets when available.'],
  ['Rewards record', 'Only normal wins by a wallet-owned brawler attempt to record an eligible reward fight on-chain.'],
  ['Daily reset', 'A lazy 24h reset restores normal fights and clears defeats today when the brawler is read again.'],
];

const progressionFacts = [
  ['Win XP', '+2 XP for a normal win, +1 XP for a training win.'],
  ['Loss XP', 'Losses grant 0 XP.'],
  ['Level up', 'When XP reaches the level threshold, the server creates level-up choices.'],
  ['Stats', 'HP, Strength, Agility and Speed define the brawler combat profile.'],
  ['Inventory', 'Skills, weapons and pets are part of the brawler snapshot and can change through progression.'],
  ['Rank/Tournament', 'The tournament route supports ascension-style progression while preserving earned loadout data.'],
];

const petRows = [
  ['Doux Dino', '0.0009 BNB', '900 token', petAsset('doux_dino')],
  ['Mort Dino', '0.0018 BNB', '1,800 token', petAsset('mort_dino')],
  ['Tard Dino', '0.0036 BNB', '3,600 token', petAsset('tard_dino')],
  ['Vita Dino', '0.0069 BNB', '6,900 token', petAsset('vita_dino')],
  ['BNB Dino', '0.0138 BNB', '13,800 token', petAsset('bnb_dino')],
];

const iconRows = [
  ['Skills', skillAsset('vampirism'), skillAsset('regeneration'), skillAsset('hammer'), skillAsset('berserk')],
  ['Weapons', weaponAsset('broadsword'), weaponAsset('axe'), weaponAsset('trident'), weaponAsset('katana')],
  ['Beasts', petAsset('doux_dino'), petAsset('mort_dino'), petAsset('vita_dino'), petAsset('bnb_dino')],
];

function Sidebar() {
  return (
    <aside className="docs-sidebar" aria-label="Vault Brawl docs navigation">
      <div className="docs-sidebar-card">
        <p>Vault Brawl</p>
        <h3>Docs</h3>
        {navGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <strong>{group.title}</strong>
            {group.links.map(([id, label]) => (
              <a href={`#${id}`} key={id}>{label}</a>
            ))}
          </nav>
        ))}
      </div>
    </aside>
  );
}

function PageCover({ title, subtitle, variant = 'purple' }: { title: string; subtitle: string; variant?: 'purple' | 'dungeon' | 'banner' }) {
  const style = {
    '--cover-img': `url(${variant === 'dungeon' ? DOC_ASSETS.dungeonBg : variant === 'banner' ? DOC_ASSETS.banner : DOC_ASSETS.purpleBg})`,
  } as React.CSSProperties;
  return (
    <div className={`docs-page-cover ${variant}`} style={style}>
      <span>{subtitle}</span>
      <strong>{title}</strong>
    </div>
  );
}

function DocSection({ id, kicker, title, cover, children }: { id: string; kicker: string; title: string; cover: string; children: React.ReactNode }) {
  return (
    <section id={id} className="docs-section">
      <PageCover title={cover} subtitle={kicker} variant={id === 'combat' || id === 'pets' ? 'dungeon' : 'purple'} />
      <div className="docs-section-body">
        <p className="docs-kicker">{kicker}</p>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function MiniStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="docs-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function FactGrid({ rows }: { rows: string[][] }) {
  return (
    <div className="docs-fact-grid">
      {rows.map(([title, note]) => (
        <div className="docs-fact-card" key={title}>
          <strong>{title}</strong>
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}

function MediaFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="docs-media-frame">
      {children}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function BrawlerStage() {
  return (
    <div className="docs-brawler-stage" aria-label="Vault Brawler models">
      {fighters.map((fighter, index) => (
        <div className="docs-brawler-card" key={fighter.id}>
          <BruteAvatar className="docs-brawler-avatar" brute={fighter} size="sm" anim={{ facing: index % 2 === 0 ? 'right' : 'left' }} />
        </div>
      ))}
    </div>
  );
}

function RightRail() {
  return (
    <aside className="docs-right-rail" aria-label="Docs side panels">
      <div className="docs-social-card">
        <p>Socials</p>
        <a href="https://x.com/VaultBrawl" target="_blank" rel="noreferrer noopener">X / Twitter</a>
        <a href="/docs">Docs</a>
      </div>
      <div className="docs-on-page-card">
        <p>On this page</p>
        {navGroups.flatMap((group) => group.links).map(([id, label]) => (
          <a href={`#${id}`} key={id}>{label}</a>
        ))}
      </div>
    </aside>
  );
}

export function Docs() {
  return (
    <div className="docs-shell">
      <Sidebar />
      <article className="docs-main">
        <section id="overview" className="docs-hero docs-section">
          <PageCover title="Vault Brawl Docs" subtitle="Project documentation" variant="banner" />
          <div className="docs-hero-grid">
            <div>
              <p className="docs-kicker">About Vault Brawl</p>
              <h1>Vault Brawl explained.</h1>
              <p className="docs-lead">
                Forge wallet-owned brawlers, fight real saved opponents, grow through daily combat, equip beasts, and follow a transparent
                BNB vault loop where extra brawlers, pets, tax funding and combat reward claims are separated clearly.
              </p>
              <div className="docs-hero-actions">
                <a href="#getting-started">Start playing</a>
                <a href="#combat">Combat rules</a>
                <a href="#vault">Vault layer</a>
              </div>
            </div>
            <MediaFrame label="Intro video">
              <video src={DOC_ASSETS.introVideo} controls muted playsInline preload="metadata" poster={DOC_ASSETS.banner} />
            </MediaFrame>
          </div>
        </section>

        <DocSection id="getting-started" kicker="01 · Getting started" title="What players need first" cover="Getting Started">
          <div className="docs-two-col">
            <div>
              <p>
                The game flow is intentionally simple: connect a wallet, switch to the supported BNB testnet build, forge a brawler,
                then use the profile and arena screens to progress. The docs should explain mechanics without making players guess
                what is off-chain gameplay and what is on-chain settlement.
              </p>
              <ul className="docs-check-list">
                <li>MetaMask wallet.</li>
                <li>Supported chain in this local build: BNB Smart Chain Testnet.</li>
                <li>A unique brawler name.</li>
                <li>BNB or token only when creating extras after the first 3 base brawlers.</li>
              </ul>
            </div>
            <div className="docs-alert-card">
              <strong>Important</strong>
              <span>The first 3 brawlers per wallet are base brawlers. Paid on-chain creation only starts after that wallet limit is reached.</span>
            </div>
          </div>
        </DocSection>

        <DocSection id="game-loop" kicker="02 · Game loop" title="How a day in Vault Brawl works" cover="Gameplay Loop">
          <div className="docs-loop-grid">
            {gameLoop.map(([title, text], index) => (
              <div className="docs-loop-card" key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <MediaFrame label="Vault Brawl roster banner">
            <img src={DOC_ASSETS.banner} alt="Vault Brawl brawler roster banner" />
          </MediaFrame>
        </DocSection>

        <DocSection id="brawler-models" kicker="03 · Brawlers" title="Characters, models and loadouts" cover="Brawler Models">
          <p>
            Brawlers use the in-game character renderer, not static placeholders. The docs can show the same models players see in
            the forge, profile and fight viewer: armor, helmets, wings, body colors, skills, weapons and pets all keep the game style.
          </p>
          <BrawlerStage />
          <div className="docs-icon-showcase">
            {iconRows.map(([title, ...icons]) => (
              <div key={title}>
                <strong>{title}</strong>
                <div>
                  {icons.map((icon) => <img key={icon} src={icon} alt="" />)}
                </div>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="combat" kicker="04 · Combat" title="Normal fights, training and daily limits" cover="Combat Rules">
          <FactGrid rows={combatFacts} />
          <div className="docs-combat-preview">
            <div className="docs-duel-card">
              <BruteAvatar brute={fighters[0]!} size="lg" anim={{ facing: 'right' }} />
              <b>VS</b>
              <BruteAvatar brute={fighters[1]!} size="lg" anim={{ facing: 'left' }} />
            </div>
            <div>
              <h3>Server-authoritative fights</h3>
              <p>
                The client does not decide the winner. The server loads both brawler snapshots, runs the core combat simulation,
                persists the combat, applies XP, decrements the correct daily counters and sends the replay log to the viewer.
              </p>
            </div>
          </div>
        </DocSection>

        <DocSection id="progression" kicker="05 · Progression" title="XP, levels, skills and equipment" cover="Progression">
          <FactGrid rows={progressionFacts} />
          <div className="docs-stat-row">
            <MiniStat label="Normal win" value="+2 XP" note="Reward-eligible fight type." />
            <MiniStat label="Training win" value="+1 XP" note="No BNB reward recording." />
            <MiniStat label="Normal fights" value="3/day" note="Per brawler, lazy 24h reset." />
            <MiniStat label="Defeat cap" value="3/day" note="Ends that brawler's normal day." />
          </div>
        </DocSection>

        <DocSection id="pets" kicker="06 · Pets" title="Beasts, dino pets and the pet marketplace" cover="Pet System">
          <div className="docs-two-col">
            <div>
              <p>
                Pets are part of a brawler loadout and can join combat as companions. The current marketplace focuses on dino pets,
                with BNB and token purchase paths routed through the Pet Registry. The profile lets players equip up to 3 owned pets.
              </p>
              <div className="docs-pet-table">
                {petRows.map(([name, bnb, token, src]) => (
                  <div className="docs-pet-row" key={name}>
                    <img src={src} alt={name} />
                    <span>{name}</span>
                    <b>{bnb}</b>
                    <small>{token}</small>
                  </div>
                ))}
              </div>
            </div>
            <MediaFrame label="Pet system demo">
              <video src={DOC_ASSETS.petsVideo} controls muted playsInline preload="metadata" poster={DOC_ASSETS.dungeonBg} />
            </MediaFrame>
          </div>
        </DocSection>

        <DocSection id="vault" kicker="07 · On-chain" title="Vault, registry and token reads" cover="Vault Layer">
          <p>
            The normal game stays fast, while verifiable economy actions use the configured BNB testnet contracts. The app reads live
            chain data for the Vault Info panel instead of hardcoding balances.
          </p>
          <div className="docs-stat-row">
            <MiniStat label="Chain" value="BNB Testnet" note="Current supported local build." />
            <MiniStat label="Registry" value="Extra brawlers" note="Price is read per wallet." />
            <MiniStat label="Vault" value="BNB balance" note="Shows vault balance and total received." />
            <MiniStat label="Token" value="Live symbol" note="Reads token symbol, supply and wallet balance." />
          </div>
          <div className="docs-flow-line">
            <span>Wallet reaches 3 base brawlers</span>
            <b>→</b>
            <span>Extra creation reads live BNB/token price</span>
            <b>→</b>
            <span>Registry mints/imports on-chain brawler id</span>
          </div>
        </DocSection>

        <DocSection id="fee-flow" kicker="08 · Economy" title="Fee flow, rewards and token sustain" cover="Fee Flow">
          <p>
            Vault Brawl separates gameplay from treasury flow. Extra brawlers and pet purchases are paid through their own contracts,
            trading tax/tax-forwarding is the long-term BNB source for the combat reward pool, and the token hold requirement makes
            reward claims depend on real $VB ownership instead of pure farm volume.
          </p>
          <div className="docs-economy-map" aria-label="Vault Brawl fee flow diagram">
            <div className="fee-card fee-top">
              <strong>Extra Brawlers</strong>
              <span>After 3 free base brawlers, paid extras read the live per-wallet price.</span>
              <b>BNB / token create flow</b>
            </div>
            <div className="fee-card fee-left-one">
              <strong>Pet Market</strong>
              <span>Dino pets can be bought with BNB or token. Ownership is checked before equipping.</span>
              <b>Pet Registry</b>
            </div>
            <div className="fee-card fee-left-two">
              <strong>Trading Tax</strong>
              <span>Vault tax/reward forwarding is the intended recurring BNB source for reward funding.</span>
              <b>long-term fuel</b>
            </div>
            <div className="fee-card fee-right-one">
              <strong>$VB Hold</strong>
              <span>The token is useful because rewards require holding more than 10,000 $VB.</span>
              <b>claim gate</b>
            </div>
            <div className="fee-card fee-right-two">
              <strong>Combat Wins</strong>
              <span>Normal wins by your own wallet-owned brawler can record a fight id.</span>
              <b>training excluded</b>
            </div>
            <div className="fee-card fee-bottom">
              <strong>Player Claim</strong>
              <span>Eligible recorded wins claim from the reward contract if the pool has BNB.</span>
              <b>0.001 BNB / fight</b>
            </div>
            <div className="fee-vault-core">
              <div>
                <strong>Vault + Reward Pool</strong>
                <span>BNB inflows, registry reads, reward funding and claim checks meet here.</span>
              </div>
            </div>
            <span className="fee-line line-top" />
            <span className="fee-line line-left-one" />
            <span className="fee-line line-left-two" />
            <span className="fee-line line-right-one" />
            <span className="fee-line line-right-two" />
            <span className="fee-line line-bottom" />
          </div>
          <div className="docs-economy-notes">
            <MiniStat label="Extra brawlers" value="3 free" note="Paid extras after the base wallet limit." />
            <MiniStat label="Combat claim" value="0.001 BNB" note="Paid from reward contract if funded." />
            <MiniStat label="Token gate" value="10,000+ $VB" note="Required to claim eligible wins." />
            <MiniStat label="Pet buys" value="BNB / token" note="Pet ownership comes from registry reads." />
          </div>
        </DocSection>

        <DocSection id="rewards" kicker="09 · Rewards" title="Combat reward claims" cover="Rewards">
          <div className="docs-two-col">
            <div>
              <p>
                A normal win by your own wallet-owned brawler attempts to record a reward fight id on-chain. The claim screen then
                checks the Combat Rewards contract before sending the claim transaction.
              </p>
              <ul className="docs-check-list">
                <li>Training wins are explicitly not BNB-reward fights.</li>
                <li>The fight id is derived from the persisted combat id.</li>
                <li>The server operator records the winner when the reward contract is available.</li>
                <li>The client reads claim amount, minimum token hold and claim status from chain.</li>
              </ul>
            </div>
            <div className="docs-alert-card gold">
              <strong>Not a fake counter</strong>
              <span>Vault balance, reward pool, claim amount, token supply, total claimed and wallet balance are read through RPC calls.</span>
            </div>
          </div>
        </DocSection>

        <DocSection id="faq" kicker="10 · FAQ" title="Common questions" cover="FAQ">
          <div className="docs-faq">
            <details open>
              <summary>Do I need to pay to play?</summary>
              <p>No. You can start with up to 3 base Vault Brawlers per wallet. Payment is only needed for extra brawlers after that free stable limit, or for optional pet purchases.</p>
            </details>
            <details>
              <summary>How many free brawlers can I create?</summary>
              <p>Each wallet can create up to 3 base brawlers. After that, extra brawlers use the on-chain paid creation flow.</p>
            </details>
            <details>
              <summary>How does extra brawler pricing work?</summary>
              <p>The price is read live from the registry per wallet. The design starts at 0.01 BNB for the first paid extra and doubles for that wallet after each paid extra.</p>
            </details>
            <details>
              <summary>Can every win claim BNB?</summary>
              <p>No. The fight must be an eligible normal win by your own wallet-owned brawler, the server must record the fight winner, the wallet must pass the token hold check, and the reward pool must have enough BNB.</p>
            </details>
            <details>
              <summary>Are all fights on-chain?</summary>
              <p>No. Combat is simulated server-side for speed and fairness. Chain is used for economy actions like extra brawler creation, pet purchases, reward eligibility reads and claims.</p>
            </details>
            <details>
              <summary>What is $VB used for?</summary>
              <p>$VB is the game token used for reward eligibility and token purchase paths. To claim a BNB combat reward, the winning wallet must hold more than 10,000 $VB.</p>
            </details>
            <details>
              <summary>Can I claim the same fight twice?</summary>
              <p>No. Each recorded fight id can only be claimed once.</p>
            </details>
            <details>
              <summary>Do training fights pay rewards?</summary>
              <p>No. Training is for practice and progression. It does not consume normal-fight attempts and does not create BNB reward eligibility.</p>
            </details>
            <details>
              <summary>Where does claim BNB come from?</summary>
              <p>Claims are paid from the Combat Rewards contract balance. That balance can be directly funded and is designed to be sustained by vault/tax reward forwarding over time.</p>
            </details>
          </div>
        </DocSection>
      </article>
      <RightRail />
    </div>
  );
}
