const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Fix header role switch so missing profile role does not block development
code = code.replace(
`  const changeRole = (nextRole) => {
    if (cloudMode && user && profile?.role !== 'admin' && nextRole !== profile?.role) {
      alert(\`This account is registered as \${profile?.role}. Admin accounts can switch views for testing.\`);
      return;
    }
    setRole(nextRole);
    setPage(defaultPageForRole(nextRole));
  };`,
`  const changeRole = (nextRole) => {
    const currentProfileRole = profile?.role ? cleanRole(profile.role) : null;

    if (cloudMode && user && currentProfileRole && currentProfileRole !== 'admin' && nextRole !== currentProfileRole) {
      alert(\`This account is registered as \${currentProfileRole}. Admin accounts can switch views for testing.\`);
      return;
    }

    setRole(nextRole);
    setPage(defaultPageForRole(nextRole));
  };`
);

// Replace updateProfileRole with upsert instead of update
code = code.replace(
/  const updateProfileRole = async \(nextRole\) => \{[\s\S]*?  \};\n\n  const logout = async \(\) => \{/,
`  const updateProfileRole = async (nextRole) => {
    if (!user || !cloudMode) {
      alert('You must be logged in first.');
      return;
    }

    const safeRole = cleanRole(nextRole);

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
      role: safeRole,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Role update failed:', error);
      setNotice(\`Role update failed: \${error.message}\`);
      alert(\`Role update failed: \${error.message}\`);
      return;
    }

    setProfile(data);
    setRole(cleanRole(data.role));
    setPage(defaultPageForRole(cleanRole(data.role)));
    setNotice(\`Profile role updated to \${data.role}.\`);
    alert(\`Role updated to \${data.role}.\`);
  };

  const logout = async () => {`
);

fs.writeFileSync(file, code);
console.log("? Profile role fix applied.");
