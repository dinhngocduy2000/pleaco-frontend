export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto flex h-14 items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Pleaco. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
