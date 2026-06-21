import { VERSION, GITHUB_REPO } from '../store/appStore';

// Compare semver strings — returns true if remote > current
function isNewer(current, remote) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [rMaj, rMin, rPat] = parse(remote);
  if (rMaj !== cMaj) return rMaj > cMaj;
  if (rMin !== cMin) return rMin > cMin;
  return rPat > cPat;
}

export async function checkForUpdate() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const remoteVersion = data.tag_name?.replace(/^v/, '');
    if (!remoteVersion) return null;
    if (!isNewer(VERSION, remoteVersion)) return null;
    return {
      version: remoteVersion,
      url: data.html_url,
      body: data.body || '',
      publishedAt: data.published_at,
    };
  } catch (_) {
    return null; // silently fail — no internet, rate limit, etc.
  }
}
