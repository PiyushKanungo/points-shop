import { ShopError, UNAVAILABLE_MESSAGE } from "@/lib/errors";

export function ErrorNotice({ error }: { error: unknown }) {
  const message =
    error instanceof ShopError && error.code !== "UNAVAILABLE" && error.code !== "INTERNAL"
      ? error.message
      : UNAVAILABLE_MESSAGE;
  return (
    <div role="alert" className="card border-[#f5d0a9] bg-warn-soft p-5">
      <p className="font-semibold">Something&apos;s not right</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
