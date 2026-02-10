import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="flex h-10 w-full items-center justify-between border-b border-foreground/5 bg-background px-3 text-[13px] font-medium shrink-0 select-none">
      {/* Logo */}
      <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
        <span className="text-2xl font-serif italic font-bold tracking-tighter leading-none mb-1">
          f.
        </span>
      </Link>

      {/* Auth buttons */}
      <div className="flex items-center gap-1.5">
        <Link to="/login">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal"
          >
            Sign in
          </Button>
        </Link>

        <Link to="/signup">
          <Button
            size="sm"
            className="h-8 px-4 text-[13px] font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-md shadow-sm border-none"
          >
            Sign up
          </Button>
        </Link>
      </div>
    </header>
  );
}
