import { FaCrown } from "react-icons/fa6";

export function VictoryCrown() {
  return (
    <div className="victory-crown" aria-hidden>
      <span className="victory-crown__backdrop" />
      <span className="victory-crown__halo" />
      <FaCrown className="victory-crown__icon" />
    </div>
  );
}
