const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-announcements-local-fallback.jsx", code);

function replaceConstFunctionBlock(source, functionName, replacement) {
  const startText = `const ${functionName} = async () => {`;
  const start = source.indexOf(startText);

  if (start === -1) {
    console.log(`⚠️ Could not find ${functionName}. Skipping.`);
    return source;
  }

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      let end = i + 1;
      if (source[end] === ";") end++;

      return source.slice(0, start) + replacement + source.slice(end);
    }
  }

  throw new Error(`Could not find end of ${functionName}`);
}

const helper = `
function getLocalAnnouncementsData() {
  try {
    const saved = JSON.parse(localStorage.getItem('solohub_announcements_fallback_v1') || '[]');

    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}

  if (typeof fallbackAnnouncements === 'function') {
    return fallbackAnnouncements();
  }

  return [
    {
      id: 'local-welcome-announcement',
      title: 'Welcome to SoloHub Private Beta',
      body: 'SoloHub announcements are active. Campaign updates, payout notices, and platform changes will appear here.',
      audience: 'All',
      priority: 'Normal',
      status: 'Published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

function saveLocalAnnouncementsData(items = []) {
  localStorage.setItem('solohub_announcements_fallback_v1', JSON.stringify(Array.isArray(items) ? items : []));
}

`;

if (!code.includes("function getLocalAnnouncementsData")) {
  const insertAt =
    code.indexOf("function AnnouncementsPage") !== -1
      ? code.indexOf("function AnnouncementsPage")
      : code.indexOf("function AdminAnnouncements");

  if (insertAt === -1) {
    throw new Error("Could not find announcements insertion point.");
  }

  code = code.slice(0, insertAt) + helper + code.slice(insertAt);
}

const newLoadAnnouncements = `const loadAnnouncements = async () => {
    setLoading(true);

    try {
      const role = cleanRole(currentRole || 'clipper');
      const localItems = getLocalAnnouncementsData().filter((item) =>
        item.status === 'Published' && ['All', role].includes(item.audience)
      );

      setAnnouncements(localItems);
      setMessage(localItems.length ? 'Announcements loaded.' : 'No announcements yet.');

      if (supabase) {
        const request = supabase
          .from('announcements')
          .select('*')
          .eq('status', 'Published')
          .in('audience', ['All', role])
          .order('created_at', { ascending: false });

        withSupabaseTimeout(request, 'Load announcements', 8000)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Announcement cloud sync skipped:', error);
              return;
            }

            const cloudItems = Array.isArray(data) ? data : [];
            setAnnouncements(cloudItems);
            saveLocalAnnouncementsData(cloudItems);
            setMessage(cloudItems.length ? 'Announcements loaded.' : 'No announcements yet.');
          })
          .catch((err) => {
            console.warn('Announcement cloud sync skipped:', err);
          });
      }
    } catch (err) {
      console.error('Announcements local fallback failed:', err);
      setAnnouncements([]);
      setMessage('No announcements yet.');
    } finally {
      setLoading(false);
    }
  };`;

const newLoadAdminAnnouncements = `const loadAdminAnnouncements = async () => {
    setLoading(true);

    try {
      const localItems = getLocalAnnouncementsData();

      setAnnouncements(localItems);
      setMessage(localItems.length ? 'Announcements loaded.' : 'No announcements yet.');

      if (supabase) {
        const request = supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        withSupabaseTimeout(request, 'Load admin announcements', 8000)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Admin announcement cloud sync skipped:', error);
              return;
            }

            const cloudItems = Array.isArray(data) ? data : [];
            setAnnouncements(cloudItems);
            saveLocalAnnouncementsData(cloudItems);
            setMessage('Announcements loaded.');
          })
          .catch((err) => {
            console.warn('Admin announcement cloud sync skipped:', err);
          });
      }
    } catch (err) {
      console.error('Admin announcements local fallback failed:', err);
      setAnnouncements([]);
      setMessage('No announcements yet.');
    } finally {
      setLoading(false);
    }
  };`;

code = replaceConstFunctionBlock(code, "loadAnnouncements", newLoadAnnouncements);
code = replaceConstFunctionBlock(code, "loadAdminAnnouncements", newLoadAdminAnnouncements);

fs.writeFileSync(file, code);

console.log("✅ Announcements now load local-first with optional cloud sync.");
