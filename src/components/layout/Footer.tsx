export function Footer() {
  return (
    <footer className="h-8 flex items-center justify-between px-6 text-[11px] text-muted-foreground border-t border-border bg-background">
      <span>Devalok Design Pvt. Ltd.</span>
      <span>{new Date().getFullYear()}</span>
    </footer>
  )
}
