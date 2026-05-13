const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
/  const updateProfileRole = async \(nextRole\) => \{[\s\S]*?\n  \};\n\n  const logout/,
`  const updateProfileRole = async (nextRole) => {
    if (!user || !cloudMode) return;

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
    setRole(data.role);
    setPage(defaultPageForRole(data.role));
    setNotice(\`Profile role updated to \${data.role}.\`);
    alert(\`Role updated to \${data.role}.\`);
  };

  const logout`
);

fs.writeFileSync(file, code);
console.log("? Profile role upsert patch applied.");
