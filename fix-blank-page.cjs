const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
`  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(cloudMode);
  const [selectedCampaign, setSelectedCampaign] = useState(null);`,
`  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const cloudMode = isSupabaseConfigured;
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [selectedCampaign, setSelectedCampaign] = useState(null);`
);

code = code.replace(
`  const [notice, setNotice] = useState('');
  const cloudMode = isSupabaseConfigured;`,
`  const [notice, setNotice] = useState('');`
);

fs.writeFileSync(file, code);
console.log("? Blank page auth loading bug fixed.");
