import { ChevronRight } from "lucide-react";

type ModelActivityProps = {
  readonly details?: string;
  readonly label: string;
};

export function ModelActivity({ details, label }: ModelActivityProps) {
  const status = <span className="shimmer text-muted-foreground">{label}</span>;

  if (!details) {
    return (
      <article aria-label={label} className="pt-3 pb-8" role="status">
        {status}
      </article>
    );
  }

  return (
    <details className="group pb-4">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        {status}
      </summary>
      <p className="mt-3 ml-5 max-w-3xl whitespace-pre-wrap border-l pl-4 text-muted-foreground">
        {details}
      </p>
    </details>
  );
}
