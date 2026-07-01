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
    appearance: { lpc: { head: 'humanMale', hair: 'bob', headwear: 'none', torsoArmor: 'leather', armsArmor: 'bracers', legsArmor: 'plate', feetArmor: 'plate', armorColor: 'purple', wings: 'monarchPurple' } },
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

const priceRows = [
  ['1st extra', '0.01 BNB'],
  ['2nd extra', '0.02 BNB'],
  ['3rd extra', '0.04 BNB'],
  ['4th extra', '0.08 BNB'],
  ['Then', 'keeps doubling per wallet'],
];

function MiniBrawl() {
  return (
    <div className="docs-brawl-scene" aria-label="Vault Brawlers battling">
      <div className="docs-fighter docs-fighter-left">
        <BruteAvatar brute={fighters[0]!} size="lg" anim={{ facing: 'right' }} />
        <span>Vex Ashguard</span>
      </div>
      <div className="docs-vs">VS</div>
      <div className="docs-fighter docs-fighter-right">
        <BruteAvatar brute={fighters[1]!} size="lg" anim={{ facing: 'left' }} />
        <span>Nyra Vaultwing</span>
      </div>
    </div>
  );
}

function IdleBrawlers() {
  return (
    <div className="docs-idle-row" aria-label="Idle Vault Brawlers">
      {fighters.slice(1).map((fighter, index) => (
        <div className="docs-idle-card" key={fighter.id}>
          <BruteAvatar brute={fighter} size="md" anim={{ facing: index % 2 === 0 ? 'left' : 'right' }} />
        </div>
      ))}
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="docs-panel">
      <p className="docs-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Docs() {
  return (
    <div className="docs-shell">
      <section className="docs-hero">
        <div className="docs-hero-copy">
          <p className="docs-kicker">Vault Brawl Docs</p>
          <h1>Fight, forge, own, and claim from the vault.</h1>
          <p>
            Vault Brawl is a dark-fantasy auto-battler where every player starts with free brawlers,
            fights daily battles, and can use BNB Testnet blockchain actions for extra Vault Brawlers
            and combat rewards.
          </p>
        </div>
        <MiniBrawl />
      </section>

      <div className="docs-grid">
        <Section eyebrow="01" title="The core game loop">
          <p>
            Create a Vault Brawler, train it, enter the Board, and fight rivals. Your brawler grows
            through levels, stats, skills, weapons, and beasts. Battles are automatic: the fun is in
            building a stronger brawler and choosing when to fight, train, or forge upgrades.
          </p>
          <IdleBrawlers />
        </Section>

        <Section eyebrow="02" title="What the blockchain does">
          <p>
            The chain is used only for the parts that should be public and verifiable: paid extra
            Vault Brawlers, vault funding, and claimable BNB rewards after recorded wins. The normal
            game stays fast; the blockchain layer adds ownership and transparent reward accounting.
          </p>
          <ul>
            <li>BNB Testnet wallet connection through MetaMask.</li>
            <li>Extra Vault Brawlers are minted/registered on-chain.</li>
            <li>BNB paid for extras goes into the project vault.</li>
            <li>Winning eligible combats can unlock a BNB reward claim.</li>
          </ul>
        </Section>

        <Section eyebrow="03" title="Free and extra Vault Brawlers">
          <p>
            Each wallet can create up to 3 base brawlers for free. After that, you can create extra
            Vault Brawlers by paying BNB. The price is per wallet and increases with every extra brawler.
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
            Example: your first paid extra costs 0.01 BNB, then 0.02 BNB, then 0.04 BNB, etc.
          </p>
        </Section>

        <Section eyebrow="04" title="Where the BNB goes">
          <p>
            When you buy an extra Vault Brawler, the BNB is sent to the Vault. The Vault Info panel
            shows the important on-chain numbers: vault balance, extra brawlers on-chain, current
            extra price, tax received, reward pool, claim amount, and token supply.
          </p>
          <div className="docs-vault-box">
            <span>Extra brawler payment</span>
            <strong>100% to Vault</strong>
            <small>visible on-chain in Vault Info</small>
          </div>
        </Section>

        <Section eyebrow="05" title="Combat rewards and claims">
          <p>
            When a fight is won and recorded by the game operator, the winner can claim the combat
            reward if the reward pool has enough BNB and the wallet meets the hold requirement.
          </p>
          <ul>
            <li>Current claim per eligible win: 0.001 BNB.</li>
            <li>You need to hold the required amount of the game token to claim.</li>
            <li>Each recorded fight reward can only be claimed once.</li>
            <li>If the pool is empty, the claim waits until rewards are funded again.</li>
          </ul>
        </Section>

        <Section eyebrow="06" title="What players should remember">
          <p>
            You do not need to understand smart contracts to play. Connect a BNB Testnet wallet,
            make brawlers, fight, and use the Vault Info panel to see the live on-chain economy.
            Free brawlers are enough to start; paid extras are for players who want a larger stable
            and to feed the vault economy.
          </p>
          <div className="docs-footer-brawlers">
            <BruteAvatar brute={fighters[2]!} size="md" anim={{ facing: 'right' }} />
            <BruteAvatar brute={fighters[3]!} size="md" anim={{ facing: 'left' }} />
          </div>
        </Section>
      </div>
    </div>
  );
}
