// Background full-bleed para Profile v2.
// Mantiene la capa de fondo/overlay de templo, pero sin la figura decorativa
// del guerrero para no competir visualmente con el Vault Brawler real.

interface BgPortraitProps {
  glowing?: boolean;
}

export function BgPortrait({ glowing: _glowing = true }: BgPortraitProps) {
  return <div className="bg-portrait" aria-hidden />;
}
