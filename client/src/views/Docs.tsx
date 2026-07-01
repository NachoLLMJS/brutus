import { BruteAvatar, type BruteAvatarSubject } from '@/components/BruteAvatar';

const fighters: BruteAvatarSubject[] = [
  {
    id: 'docs-vex',
    gender: 'male',
    body: '1',
    bodyColors: '0',
    appearance: { lpc: { head: 'humanGaunt', hair: 'none', headwear: 'greathelm', torsoArmor: 'plate', armsArmor: 'plate', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'black', wings: 'none' } },
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
];

const toc = [
  ['overview', 'Overview'],
  ['game-loop', 'Game loop'],
  ['blockchain', 'Blockchain layer'],
  ['vault-brawlers', 'Extra brawlers'],
  ['vault-flow', 'Where BNB goes'],
  ['rewards', 'Combat rewards'],
  ['quick-faq', 'Quick FAQ'],
];

const priceRows = [
  ['1st paid extra', '0.01 BNB'],
  ['2nd paid extra', '0.02 BNB'],
  ['3rd paid extra', '0.04 BNB'],
  ['4th paid extra', '0.08 BNB'],
  ['After that', 'doubles per wallet'],
];

function AttackPreview() {
  return (
    <div className="docs-attack-card" aria-label="Vault Brawlers attacking in the arena">
      <div className="docs-attack-stage">
        <div className="docs-impact docs-impact-left">−18</div>
        <div className="docs-slash docs-slash-a" />
        <div className="docs-slash docs-slash-b" />
        <div className="docs-attacker docs-attacker-left">
          <BruteAvatar brute={fighters[0]!} size="lg" anim={{ facing: 'right' }} />
          <strong>Vex Ashguard</strong>
        </div>
        <div className="docs-attacker docs-attacker-right">
          <BruteAvatar brute={fighters[1]!} size="lg" anim={{ facing: 'left' }} />
          <strong>Nyra Vaultwing</strong>
        </div>
      </div>

    </div>
  );
}

function Sidebar() {
  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-card">
        <p>Vault Brawl</p>
        <h3>Docs</h3>
        <nav aria-label="Docs table of contents">
          {toc.map(([id, label]) => (
            <a href={`#${id}`} key={id}>{label}</a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function InfoCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="docs-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function FlowStep({
  title,
  note,
  brute,
  chest,
}: {
  title: string;
  note: string;
  brute: BruteAvatarSubject;
  chest?: boolean;
}) {
  return (
    <div className="docs-flow-step">
      <div className="docs-flow-art">
        <BruteAvatar brute={brute} size="sm" anim={{ facing: 'right' }} />
        {chest && (
          <span className="docs-chest-sprite" aria-label="Vault chest opening">
            <img className="docs-chest-closed" src="/images/docs/chest-closed.png" alt="" />
            <img className="docs-chest-open" src="/images/docs/chest-open.png" alt="" />
          </span>
        )}
      </div>
      <span>{title}</span>
      <small>{note}</small>
    </div>
  );
}

function DocSection({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="docs-section">
      <p className="docs-kicker">{kicker}</p>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Docs() {
  return (
    <div className="docs-page">
      <Sidebar />

      <article className="docs-main">
        <section id="overview" className="docs-hero docs-section">
          <div>
            <p className="docs-kicker">Project docs</p>
            <h1>Vault Brawl explained</h1>
            <p className="docs-lead">
              A dark fantasy auto battler where players create Vault Brawlers, fight rivals, grow their stable,
              and use BNB Mainnet for extra brawlers and transparent reward claims.
            </p>
            <div className="docs-hero-actions">
              <a href="#vault-brawlers">Extra brawlers</a>
              <a href="#rewards">Rewards</a>
            </div>
          </div>
          <AttackPreview />
        </section>

        <DocSection id="game-loop" kicker="01 · Game" title="Core game loop">
          <p className="docs-section-intro">
            The game is built around clear daily choices: grow your brawler, pick fights, and expand your stable when you want more chances to play.
          </p>
          <div className="docs-loop-layout">
            <div className="docs-loop-cards">
              <div className="docs-loop-card">
                <strong>Create</strong>
                <span>Start with a Vault Brawler tied to your wallet session.</span>
              </div>
              <div className="docs-loop-card">
                <strong>Train</strong>
                <span>Use daily training to push stats without risking a fight.</span>
              </div>
              <div className="docs-loop-card">
                <strong>Fight</strong>
                <span>Enter the Board, face rivals, and let the combat engine resolve the battle.</span>
              </div>
              <div className="docs-loop-card">
                <strong>Upgrade</strong>
                <span>Wins and progress unlock new stats, skills, weapons, and beasts.</span>
              </div>
            </div>
            <div className="docs-idle-grid" aria-label="Vault Brawler examples">
              {fighters.slice(1).map((fighter, index) => (
                <div className="docs-mini-brawler" key={fighter.id}>
                  <BruteAvatar brute={fighter} size="md" anim={{ facing: index % 2 === 0 ? 'right' : 'left' }} />
                </div>
              ))}
            </div>
          </div>
        </DocSection>

        <DocSection id="blockchain" kicker="02 · On-chain" title="What the blockchain does">
          <p>
            The blockchain is not used to slow down every click. The normal game remains fast, while BNB Mainnet
            handles the public economy pieces that benefit from being verifiable.
          </p>
          <div className="docs-info-grid">
            <InfoCard label="Wallet" value="MetaMask" note="Connect on BNB Mainnet." />
            <InfoCard label="On-chain action" value="Extra brawlers" note="Paid extras are registered on-chain." />
            <InfoCard label="Vault" value="BNB flow" note="Extra-brawler BNB goes to the Vault." />
            <InfoCard label="Rewards" value="Claims" note="Eligible wins can claim BNB from the reward pool." />
          </div>
        </DocSection>

        <DocSection id="vault-brawlers" kicker="03 · Stable" title="Free brawlers and extra Vault Brawlers">
          <p>
            Every wallet can start with up to <strong>3 base brawlers for free</strong>. After that, players who want a larger
            stable can create paid extra Vault Brawlers. The extra price is calculated per wallet and doubles after each paid extra.
          </p>
          <div className="docs-price-table">
            {priceRows.map(([label, value]) => (
              <div className="docs-price-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="docs-note">
            The first paid extra costs 0.01 BNB. If the same wallet buys another, the next one costs 0.02 BNB, then 0.04 BNB, and so on.
          </p>
        </DocSection>

        <DocSection id="vault-flow" kicker="04 · Vault" title="Where the BNB goes">
          <div className="docs-flow">
            <FlowStep
              title="Player buys extra brawler"
              note="After 3 free brawlers, the wallet can pay for another Vault Brawler."
              brute={fighters[2]!}
            />
            <b>→</b>
            <FlowStep
              title="BNB payment is sent"
              note="MetaMask sends the exact extra-brawler price on BNB Mainnet."
              brute={fighters[3]!}
            />
            <b>→</b>
            <FlowStep
              title="100% goes to the Vault"
              note="The BNB lands in the Vault."
              brute={fighters[1]!}
              chest
            />
          </div>
          <p>
            The in-game Vault Info panel reads the chain and shows the numbers players care about: vault balance,
            extra brawlers on-chain, current extra price, tax received, reward pool, claim amount, hold requirement,
            and token supply.
          </p>
        </DocSection>

        <DocSection id="rewards" kicker="05 · Rewards" title="Combat rewards and claims">
          <p>
            When your wallet holds more than <strong>10,000 $VB</strong> and your own Vault Brawler wins an eligible recorded combat,
            you can claim the combat reward from the reward pool.
          </p>
          <div className="docs-callout-grid">
            <InfoCard label="Claim per eligible win" value="0.001 BNB" note="Shown live in Vault Info." />
            <InfoCard label="Required hold" value="10,000+ $VB" note="The winning wallet must hold more than 10,000 $VB." />
            <InfoCard label="Required win" value="Your brawler" note="The combat must be won by your own Vault Brawler." />
          </div>
        </DocSection>

        <DocSection id="quick-faq" kicker="06 · FAQ" title="Quick FAQ">
          <div className="docs-faq">
            <details open>
              <summary>Do I need to pay to play?</summary>
              <p>No. You can start with base brawlers for free. Paying BNB is only for extra Vault Brawlers after the free stable limit.</p>
            </details>
            <details>
              <summary>Does all BNB go to the Vault?</summary>
              <p>Yes. The paid extra-brawler flow sends the BNB payment to the Vault.</p>
            </details>
            <details>
              <summary>Can every win claim BNB?</summary>
              <p>No. The wallet must hold more than 10,000 $VB and the eligible recorded fight must be won by that wallet’s own Vault Brawler. The reward pool also needs enough BNB, and each fight can only be claimed once.</p>
            </details>
            <details>
              <summary>How many free brawlers can I create?</summary>
              <p>Each wallet can start with up to 3 base Vault Brawlers. Extra brawlers after that use the paid on-chain flow.</p>
            </details>
            <details>
              <summary>How does extra brawler pricing work?</summary>
              <p>The first paid extra costs 0.01 BNB. After each paid extra from the same wallet, the next price doubles: 0.02, 0.04, 0.08 BNB, and so on.</p>
            </details>
            <details>
              <summary>What is $VB used for?</summary>
              <p>$VB is the game token used for the reward eligibility gate. To claim a BNB combat reward, the winning wallet must hold more than 10,000 $VB.</p>
            </details>
            <details>
              <summary>Can I claim the same fight twice?</summary>
              <p>No. Once a recorded fight reward is claimed, that fight is marked as claimed and cannot pay again.</p>
            </details>
          </div>
        </DocSection>
      </article>
    </div>
  );
}
