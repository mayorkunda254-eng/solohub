const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-repair-direct-rpc.jsx", code);

function replaceFunctionBlock(source, functionName, replacement) {
  const startText = `async function ${functionName}`;
  const start = source.indexOf(startText);

  if (start === -1) {
    throw new Error(`Could not find ${functionName}`);
  }

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      return source.slice(0, start) + replacement + source.slice(i + 1);
    }
  }

  throw new Error(`Could not find end of ${functionName}`);
}

const newFunction = `async function solohubDirectRpc(functionName, payload = {}, ms = 12000) {
  const url = import.meta.env.VITE_SUPABASE_URL || supabase?.supabaseUrl;
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    supabase?.supabaseKey ||
    supabase?.anonKey;

  if (!url || !key) {
    return { data: null, error: new Error('Missing Supabase URL or anon key.') };
  }

  const getTokenFromLocalStorage = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.includes('auth-token')) continue;

        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;

        const parsed = JSON.parse(raw);

        const token =
          parsed?.access_token ||
          parsed?.currentSession?.access_token ||
          parsed?.session?.access_token;

        if (token) return token;
      }
    } catch {}

    return null;
  };

  const getSessionTokenFast = async () => {
    const localToken = getTokenFromLocalStorage();
    if (localToken) return localToken;

    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getSession timed out')), 1500)
        )
      ]);

      return sessionResult?.data?.session?.access_token || null;
    } catch {
      return null;
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    const accessToken = await getSessionTokenFast();
    const bearer = accessToken || key;

    const response = await fetch(url + '/rest/v1/rpc/' + functionName, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + bearer,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        text ||
        functionName + ' failed with status ' + response.status;

      return { data: null, error: new Error(message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: new Error(
        err?.name === 'AbortError'
          ? functionName + ' timed out after ' + Math.round(ms / 1000) + ' seconds'
          : err?.message || String(err)
      )
    };
  } finally {
    clearTimeout(timeoutId);
  }
}`;

code = replaceFunctionBlock(code, "solohubDirectRpc", newFunction);

fs.writeFileSync(file, code, "utf8");

console.log("✅ solohubDirectRpc repaired with fast auth token lookup.");
