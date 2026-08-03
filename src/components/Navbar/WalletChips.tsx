import { useWallet } from "../../context/WalletContext";
import { CURRENCIES } from "../../config/currencies";

interface WalletChipsProps {
  // "navbar"   → the compact pill row next to the avatar button, desktop only.
  // "dropdown" → same chips, mobile only, meant to sit inside the hamburger
  //              dropdown menu where there's no room for the navbar row.
  variant?: "navbar" | "dropdown";
}

// Compact read-only wallet display for the Navbar, next to the avatar button.
// Reads from WalletContext (fetched once, shared app-wide) instead of
// fetching its own copy — both this and the dropdown variant render the
// same already-loaded value instantly, with no per-instance loading flash.
const WalletChips = ({ variant = "navbar" }: WalletChipsProps) => {
  const { wallet } = useWallet();

  if (!wallet) return null;

  const chips = CURRENCIES.map(({ key, label, icon: Icon, textClasses }) => (
    <div
      key={key}
      title={label}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100/80 text-xs font-semibold text-gray-700"
    >
      <Icon size={14} className={textClasses} />
      {wallet[key]}
    </div>
  ));

  if (variant === "dropdown") {
    return <div className="flex flex-wrap items-center gap-1.5">{chips}</div>;
  }

  return <div className="hidden sm:flex items-center gap-1.5 pr-1">{chips}</div>;
};

export default WalletChips;
