const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-admin-users.jsx", code);

// 1. Add Admin Users menu item
if (!code.includes("['adminUsers', UserRound, 'Users']")) {
  code = code.replace(
    `['adminOverview', LayoutDashboard, 'Overview'],`,
    `['adminOverview', LayoutDashboard, 'Overview'],
    ['adminUsers', UserRound, 'Users'],`
  );
}

// 2. Add AdminUsers component before AdminPlatformSettings or AdminAffiliates
if (!code.includes("function AdminUsers")) {
  const insertBefore = code.includes("function AdminPlatformSettings")
    ? "function AdminPlatformSettings"
    : "function AdminAffiliates";

  const component = `function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadProfiles = async () => {
    setLoading(true);
    setMessage('Loading users...');

    try {
      if (!supabase) throw new Error('Supabase is not configured.');

      const request = supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      const { data, error } = typeof withSupabaseTimeout === 'function'
        ? await withSupabaseTimeout(request, 'Load users')
        : await request;

      if (error) throw error;

      setProfiles(data || []);
      setMessage('Users loaded.');
    } catch (err) {
      console.error('User load failed:', err);
      setMessage('User load failed: ' + (err?.message || err));
      alert('User load failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const updateUserRole = async (profile, nextRole) => {
    const cleanNextRole = cleanRole(nextRole);

    if (!profile?.id) {
      alert('Missing profile ID.');
      return;
    }

    const confirmChange = window.confirm(
      'Change ' + (profile.email || profile.full_name || 'this user') + ' to ' + cleanNextRole + '?'
    );

    if (!confirmChange) return;

    setMessage('Updating user role...');

    try {
      const request = supabase
        .from('profiles')
        .update({
          role: cleanNextRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select('*')
        .single();

      const { data, error } = typeof withSupabaseTimeout === 'function'
        ? await withSupabaseTimeout(request, 'Update user role')
        : await request;

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((item) => item.id === profile.id ? data : item)
      );

      setMessage('User role updated.');
      alert('User role updated.');
    } catch (err) {
      console.error('Role update failed:', err);
      setMessage('Role update failed: ' + (err?.message || err));
      alert('Role update failed: ' + (err?.message || err));
    }
  };

  const roleCounts = profiles.reduce((acc, profile) => {
    const role = cleanRole(profile.role);
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, { clipper: 0, creator: 0, admin: 0 });

  return (
    <section className="admin-users-page">
      <div className="section-head">
        <div>
          <Pill tone="purple"><UserRound size={14} /> User Management</Pill>
          <h2>Manage SoloHub accounts and roles.</h2>
          <p>Promote users to creator or admin, and correct accounts that signed up with the wrong role.</p>
          {message && <p className="form-note affiliate-message">{message}</p>}
        </div>

        <button type="button" className="affiliate-action-btn secondary" onClick={loadProfiles} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh users'}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard icon={UserRound} label="Total Users" value={profiles.length} helper="Registered profiles" />
        <StatCard icon={FileVideo} label="Clippers" value={roleCounts.clipper || 0} helper="Clip submitters" />
        <StatCard icon={Megaphone} label="Creators" value={roleCounts.creator || 0} helper="Campaign owners" />
        <StatCard icon={ShieldCheck} label="Admins" value={roleCounts.admin || 0} helper="Platform managers" />
      </div>

      <div className="table-wrap admin-users-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>M-Pesa</th>
              <th>Updated</th>
              <th>Change Role</th>
            </tr>
          </thead>

          <tbody>
            {profiles.map((profile) => {
              const role = cleanRole(profile.role);

              return (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.full_name || 'Unnamed user'}</strong>
                    <div className="table-subtext">{profile.id}</div>
                  </td>

                  <td>{profile.email || '-'}</td>

                  <td>
                    <Pill tone={role === 'admin' ? 'green' : role === 'creator' ? 'purple' : 'yellow'}>
                      {role}
                    </Pill>
                  </td>

                  <td>
                    <div>{profile.mpesa_name || '-'}</div>
                    <div className="table-subtext">{profile.mpesa_phone || ''}</div>
                  </td>

                  <td>{profile.updated_at ? String(profile.updated_at).slice(0, 10) : '-'}</td>

                  <td>
                    <div className="role-action-row">
                      <button type="button" className="mini-action" onClick={() => updateUserRole(profile, 'clipper')}>
                        Clipper
                      </button>

                      <button type="button" className="mini-action" onClick={() => updateUserRole(profile, 'creator')}>
                        Creator
                      </button>

                      <button type="button" className="mini-action ghost" onClick={() => updateUserRole(profile, 'admin')}>
                        Admin
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!profiles.length && (
              <tr>
                <td colSpan="6">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

`;

  const idx = code.indexOf(insertBefore);
  if (idx === -1) {
    throw new Error("Could not find insert position for AdminUsers.");
  }

  code = code.slice(0, idx) + component + code.slice(idx);
}

// 3. Add route
if (!code.includes("page === 'adminUsers'")) {
  code = code.replace(
`    if (page === 'adminOverview') {`,
`    if (page === 'adminUsers') {
      return isAdmin ? <AdminUsers /> : home;
    }

    if (page === 'adminOverview') {`
  );
}

fs.writeFileSync(file, code);
console.log("? Admin user role management added.");
