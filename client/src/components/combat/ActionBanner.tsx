// Banner DOM grande overlay sobre el canvas: "¡CRÍTICO!" / "¡BLOQUEO!" /
// "¡ESQUIVA!". Se renderiza solo cuando `text` no es null. La animación CSS
// dura ~1.2s — el parent debe limpiar `text` cuando termine.

interface ActionBannerProps {
  text: string | null;
}

export function ActionBanner({ text }: ActionBannerProps) {
  if (!text) return null;
  // key={text + epoch} obliga a re-mount para reiniciar la animación CSS si se
  // dispara dos veces seguidas con el mismo texto. El epoch lo provee el parent.
  return (
    <div className="action-banner" key={text}>
      {text}
    </div>
  );
}
