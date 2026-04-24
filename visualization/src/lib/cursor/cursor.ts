/**
 * Custom cursor system — DISABLED.
 *
 * We previously replaced the native cursor with a themed radial gradient
 * dot. In practice it made the app feel broken (users saw no cursor,
 * thought the site was frozen). The native cursor is cheaper in UX,
 * more accessible, and more honest. The file stays so other imports
 * don't break; `installCursor` is now a no-op.
 */

export function installCursor(): void {
  // no-op — native cursor wins.
}
