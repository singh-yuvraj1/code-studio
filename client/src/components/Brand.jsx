import { Braces } from "lucide-react";
import { Link } from "react-router-dom";

export default function Brand({ compact = false }) {
  return (
    <Link className="brand" to="/" aria-label="CodeSync AI home">
      <span className="brand-mark">
        <Braces size={20} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="brand-name">
          CodeSync<span> AI</span>
        </span>
      )}
    </Link>
  );
}
