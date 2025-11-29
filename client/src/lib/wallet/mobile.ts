/**
 * Mobile Safari → DIRECT Phantom universal link method
 * This bypasses wallet adapter completely on mobile Safari
 * Uses official Phantom universal link (https://phantom.app/ul/v1/connect)
 * so Safari returns to the same tab instead of opening a new one
 */

export function phantomMobileConnect() {
  const appUrl = encodeURIComponent("https://usdfg.pro/app");
  const redirect = encodeURIComponent("https://usdfg.pro/app");

  const url =
    `https://phantom.app/ul/v1/connect?` +
    `app_url=${appUrl}` +
    `&redirect_link=${redirect}` +
    `&cluster=devnet`;

  console.log("📱 Mobile Safari → using Phantom universal link:", url);
  window.location.href = url;
}

