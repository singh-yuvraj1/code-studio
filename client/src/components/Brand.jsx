import { Braces } from "lucide-react";
import { Link } from "react-router-dom";

export default function Brand({ compact = false }) {
  return (
    <Link className="brand" to="/" aria-label="Code Studio home">
      <span className="brand-mark">
        <Braces size={18} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="brand-name">
          Code Studio<span> IDE</span>
        </span>
      )}
    </Link>
  );
}
